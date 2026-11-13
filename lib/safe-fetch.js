// 店舗が入れた外部のURL（公式サイト・SNS）を、サーバーから安全に読みに行く（2026-11-13 AIコンサルがお店を学ぶため）。
// サーバーから任意のURLを取りに行くと、内部の住所（127.0.0.1・社内ネットワーク・クラウドのメタデータ 169.254.169.254 等）を
// 読まれる危険がある（SSRF）。次を必ず守る：
// - http/https のみ・ユーザー名やパスワード付きのURLは不可・ポートは 80/443 のみ
// - 名前解決した住所が、すべて公開の住所であること（内部・ループバック・リンクローカル・CGNAT・マルチキャスト等は拒否）
// - 自動の転送（リダイレクト）は使わず、1回ずつ同じ確認をして最大3回まで
// - 8秒で打ち切り・最大1.5MB・HTMLかテキストだけ
import { lookup } from 'dns/promises';
import net from 'net';

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;

function privateV4(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19))
    || a >= 224;
}
function privateV6(ip) {
  const x = ip.toLowerCase();
  if (x === '::' || x === '::1') return true;
  if (x.startsWith('::ffff:')) return privateV4(x.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(x) || x.startsWith('64:ff9b') || x.startsWith('2001:db8');
}
export function isPublicIp(ip) {
  const v = net.isIP(ip);
  if (v === 4) return !privateV4(ip);
  if (v === 6) return !privateV6(ip);
  return false;
}

export function normalizeUrl(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { return null; }
  if (!['http:', 'https:'].includes(u.protocol)) return null;
  if (u.username || u.password) return null;
  if (u.port && !['80', '443'].includes(u.port)) return null;
  if (!u.hostname || net.isIP(u.hostname.replace(/^\[|\]$/g, '')) && !isPublicIp(u.hostname.replace(/^\[|\]$/g, ''))) return null;
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/i.test(u.hostname)) return null;
  u.hash = '';
  return u;
}

async function assertPublicHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) { if (!isPublicIp(host)) throw new Error('この住所には接続できません'); return; }
  const addrs = await lookup(host, { all: true, verbatim: true });
  if (!addrs.length || addrs.some(a => !isPublicIp(a.address))) throw new Error('この住所には接続できません');
}

// 戻り値 { url（最後の）, status, contentType, text }
export async function safeFetchText(raw) {
  let u = normalizeUrl(raw);
  if (!u) throw new Error('URLの形が正しくありません（http/https のみ）');
  for (let hop = 0; hop <= 3; hop++) {
    await assertPublicHost(u.hostname);
    const res = await fetch(u.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinemeStoreReader/1.0; +https://www.fineme.me)', Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9' },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = normalizeUrl(new URL(res.headers.get('location'), u).toString());
      if (!next) throw new Error('転送先のURLに接続できません');
      u = next;
      continue;
    }
    const ct = res.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml|text\/plain/i.test(ct)) throw new Error('HTMLのページではありません');
    const reader = res.body?.getReader();
    const chunks = [];
    let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { try { await reader.cancel(); } catch {} break; }
      chunks.push(value);
    }
    const text = new TextDecoder('utf-8', { fatal: false }).decode(Buffer.concat(chunks.map(c => Buffer.from(c))));
    return { url: u.toString(), status: res.status, contentType: ct, text };
  }
  throw new Error('転送が多すぎます');
}

const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch { return ''; } });
const metaOf = (html, key) => {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, 'i');
  const m = html.match(re);
  return m ? decode(m[1] || m[2] || '').trim() : '';
};

// HTMLから、題名・説明・本文の文字だけを取り出す（スクリプト等は捨てる）。同じサイト内の「メニュー・料金・コンセプト」等のリンクも返す
export function extractPage(html, baseUrl) {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
  const description = metaOf(html, 'description') || metaOf(html, 'og:description');
  const ogTitle = metaOf(html, 'og:title');
  const body = decode(html
    .replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t\r\f\v]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  const links = [];
  let base;
  try { base = new URL(baseUrl); } catch { base = null; }
  if (base) {
    const re = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && links.length < 40) {
      const text = decode(m[2].replace(/<[^>]+>/g, '')).trim();
      try {
        const u = new URL(m[1], base);
        if (u.hostname === base.hostname && /menu|price|about|concept|staff|service|メニュー|料金|コンセプト|について|スタッフ|サービス/i.test(`${u.pathname} ${text}`)) links.push(u.toString());
      } catch {}
    }
  }
  return { title, ogTitle, description, body, links: [...new Set(links)].slice(0, 2) };
}
