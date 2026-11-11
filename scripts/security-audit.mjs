// 定期セキュリティ点検（機械的に確かめられる部分）。渡邉依頼 2026-11-11：
// 「今後も定期的にセキュリティを確認してほしい。特に個人情報を扱う場所は徹底的に」。
// ~/fineme/security-audit.sh（毎週）から呼ばれ、結果を JSON で標準出力に出す。修正はしない（報告・相談が先）。
//
//   node scripts/security-audit.mjs [--base https://www.fineme.me]
//
// 確かめること
//   1. 公開APIが個人情報・非公開の項目を返していないか（2026-11-11 に見つけた穴の再発を含む）
//   2. 認証が要るAPIが、認証なしで弾かれるか
//   3. LINEログインの state が署名なしで通らないか
//   4. DB：RLS が切れたテーブル・公開キーで全件読める／書けるポリシー・公開キーへの余計な権限
//   5. セキュリティヘッダー
//   6. 本番の依存パッケージの high / critical の脆弱性
//   7. 認証の印が見当たらない API（新しく増えたものを人が見るための一覧）
import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const BASE = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : 'https://www.fineme.me';
const findings = []; // { level: 'critical'|'high'|'medium'|'info', area, message }
const add = (level, area, message) => findings.push({ level, area, message });

async function http(path, opts = {}) {
  try {
    const res = await fetch(BASE + path, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...opts });
    const text = await res.text().catch(() => '');
    return { status: res.status, location: res.headers.get('location') || '', headers: res.headers, text };
  } catch (e) { return { status: 0, error: e.message, text: '' }; }
}

// ── 1. 公開APIの返す項目 ─────────────────────────────
const PRIVATE_KEY = /(^|_)(email|emails|phone|tel|birthday|password|secret|token|pin_hash|line_user_id|stripe_[a-z_]+|referral_code|referred_by|notes|address_private|dashboard_prefs)$/;
function leakedKeys(obj, path = '', out = new Set()) {
  if (Array.isArray(obj)) { obj.slice(0, 50).forEach(x => leakedKeys(x, path, out)); return out; }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (PRIVATE_KEY.test(k) && v != null && v !== '') out.add(path + k);
      if (v && typeof v === 'object') leakedKeys(v, `${path}${k}.`, out);
    }
  }
  return out;
}
async function checkPublicJson(path) {
  const r = await http(path);
  if (r.status !== 200) return;
  let j; try { j = JSON.parse(r.text); } catch { return; }
  const keys = [...leakedKeys(j)];
  if (keys.length) add('critical', '公開APIの個人情報', `${path} が非公開の項目を返しています：${keys.slice(0, 12).join(', ')}`);
}

// 公開ページ用API（だれでも呼べる）。店舗ページの下のAPIは、公開中の店舗の slug で確かめる
async function publicApis() {
  const list = await http('/api/providers');
  let slug = 'fn010';
  try { slug = JSON.parse(list.text).find(p => p.slug)?.slug || slug; } catch {}
  const paths = [
    '/api/providers', `/api/providers/${slug}`, '/api/stories?status=approved&limit=5', '/api/features',
    ...['staff', 'services', 'packages', 'classes', 'facilities', 'appeal-blocks', 'membership-info', 'recommended-frequencies', 'landing', 'availability']
      .map(x => `/api/providers/${slug}/${x}`),
  ];
  for (const p of paths) await checkPublicJson(p);
}

// ── 2. 認証が要るAPI ─────────────────────────────
const MUST_REJECT = [
  ['GET', '/api/stories?status=pending'],
  ['PATCH', '/api/stories/00000000-0000-0000-0000-000000000000'],
  ['GET', '/api/mirror/sessions?user_id=00000000-0000-0000-0000-000000000000'],
  ['POST', '/api/me/line-connect'],
  ['POST', '/api/provider/line-connect'],
  ['GET', '/api/admin/analytics?range=today'],
  ['GET', '/api/admin/sales-partners'],
  ['GET', '/api/admin/customers'],
  ['GET', '/api/billing/referrals'],
  ['GET', '/api/billing/referrals?provider_id=x'],
  ['GET', '/api/me/profile'],
  ['GET', '/api/provider/me'],
  ['GET', '/api/provider/customers'],
  ['GET', '/api/provider/export'],
  ['GET', '/api/cron/uptime-check?notify=0'],
];
async function authRequired() {
  for (const [method, path] of MUST_REJECT) {
    const r = await http(path, { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
    if (r.status === 0) { add('info', '認証', `${method} ${path} に接続できませんでした（${r.error}）`); continue; }
    if (r.status === 200 || r.status === 201 || r.status === 204) add('critical', '認証', `${method} ${path} が認証なしで ${r.status} を返しました`);
  }
}

// ── 3. LINE の state ─────────────────────────────
async function oauthState() {
  const forged = Buffer.from(JSON.stringify({ link_user_id: '00000000-0000-0000-0000-000000000000', ts: Date.now() })).toString('base64url');
  const r = await http(`/api/auth/line-callback?code=x&state=${forged}`);
  if (!/invalid_state/.test(r.location)) add('critical', 'LINE連携', `署名の無い state が拒否されませんでした（${r.status} ${r.location}）`);
  const fp = Buffer.from(JSON.stringify({ provider_id: 'x', ts: Date.now() })).toString('base64url');
  const r2 = await http(`/api/provider/line-callback?code=x&state=${fp}`);
  if (!/invalid_state/.test(r2.location)) add('critical', 'LINE連携', `店舗の LINE 連携で署名の無い state が拒否されませんでした（${r2.status} ${r2.location}）`);
  const old = await http('/api/me/line-connect?user_id=00000000-0000-0000-0000-000000000000');
  if (/access\.line\.me/.test(old.location)) add('critical', 'LINE連携', 'URL の user_id で LINE 連携を始められる状態に戻っています');
}

// ── 4. DB ─────────────────────────────
async function database() {
  if (!process.env.SUPABASE_DB_URL) { add('info', 'DB', 'SUPABASE_DB_URL が無いので DB の点検を飛ばしました'); return; }
  const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
  await c.connect();
  try {
    const noRls = await c.query("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity");
    for (const r of noRls.rows) add('critical', 'DB', `RLS が切れています：${r.relname}`);
    // 公開キー（anon / authenticated）に付いている権限。SELECT 以外は原則不要（サーバーは service role で動く）
    const grants = await c.query("select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) p from information_schema.table_privileges where table_schema='public' and grantee in ('anon','authenticated') group by 1,2");
    const KNOWN_SELECT = new Set(['features']);
    for (const g of grants.rows) {
      const extra = g.p.split(',').filter(x => x !== 'SELECT');
      if (extra.length) add('high', 'DB', `公開キー（${g.grantee}）に ${g.table_name} の ${extra.join('・')} 権限が付いています`);
      else if (!KNOWN_SELECT.has(g.table_name)) add('medium', 'DB', `公開キー（${g.grantee}）で ${g.table_name} を読めます（中身を確認してください）`);
    }
    // 条件なし（true）のポリシー。権限が付いているテーブルだけが実際に効く
    const granted = new Set(grants.rows.map(g => g.table_name));
    const open = await c.query("select tablename, policyname, cmd from pg_policies where schemaname='public' and (qual='true' or with_check='true') and not (roles::text like '%service_role%')");
    const OK_OPEN = new Set(['feedback|INSERT', 'affiliate_products|SELECT', 'curated_posts|SELECT', 'provider_axis_intros|SELECT', 'provider_recommended_frequencies|SELECT']);
    for (const p of open.rows) {
      if (OK_OPEN.has(`${p.tablename}|${p.cmd}`)) continue;
      add(granted.has(p.tablename) ? 'high' : 'medium', 'DB', `条件なしのポリシー：${p.tablename}.${p.policyname}（${p.cmd}）${granted.has(p.tablename) ? '・公開キーの権限もあるので実際に効きます' : '・いまは公開キーの権限が無いので効いていません'}`);
    }
  } finally { await c.end(); }
}

// ── 5. ヘッダー ─────────────────────────────
async function headers() {
  const r = await http('/');
  if (!r.headers) return;
  for (const h of ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'strict-transport-security', 'referrer-policy']) {
    if (!r.headers.get(h)) add('high', 'ヘッダー', `${h} が付いていません`);
  }
}

// ── 6. 依存パッケージ ─────────────────────────────
function dependencies() {
  let out = '';
  try { out = execSync('npm audit --omit=dev --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 120000 }); }
  catch (e) { out = e.stdout || ''; }
  try {
    const j = JSON.parse(out);
    for (const [name, v] of Object.entries(j.vulnerabilities || {})) {
      if (v.severity === 'critical' || v.severity === 'high') {
        const via = (v.via || []).filter(x => typeof x === 'object').map(x => x.title).slice(0, 2).join(' / ');
        add(v.severity === 'critical' ? 'critical' : 'high', '依存パッケージ', `${name}（${v.severity}）${via}`);
      }
    }
  } catch { add('info', '依存パッケージ', 'npm audit の結果を読めませんでした'); }
}

// ── 7. 認証の印が見当たらない API ─────────────────────────────
// 公開してよいものは許可リストに入れる。ここに無い新しいAPIが出たら、人（Claude）が中身を読んで判断する
const PUBLIC_OK = [
  /^app\/api\/providers\//, /^app\/api\/providers\/route\.js$/, /^app\/api\/features\//, /^app\/api\/features\/route\.js$/, /^app\/api\/og\//,
  /^app\/api\/track\//, /^app\/api\/track\/route\.js$/, /^app\/api\/test-deploy\//, /^app\/api\/feedback\//, /^app\/api\/feedback\/route\.js$/,
  /^app\/api\/video-schedule\//, /^app\/api\/b\//, /^app\/api\/auth\/line-login\//,
  /^app\/api\/pay\/\[id\]\//, /^app\/api\/deposit-pay\/\[id\]\//, /^app\/api\/pos-pay\/\[id\]\//,
  /^app\/api\/mirror\/(result|purchase)\//, /^app\/api\/provider\/(signup|inquiry)\//, /^app\/api\/attendance-kiosk\//,
];
const AUTH_MARK = /checkAdmin|ADMIN_API_KEY|CRON_SECRET|getUser|memberAuth|authProvider|providerFromRequest|getProviderFromRequest|deviceFromRequest|constructEvent|x-line-signature|createHmac|verifyState|[Aa]uthorization|x-admin-key|Auth\(|auth\(/;
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else if (f === 'route.js') out.push(p);
  }
  return out;
}
function unauthRoutes() {
  const list = walk('app/api').filter(p => !PUBLIC_OK.some(re => re.test(p))).filter(p => !AUTH_MARK.test(readFileSync(p, 'utf8')));
  for (const p of list) add('medium', '認証の見当たらないAPI', p);
}

const steps = [publicApis, authRequired, oauthState, database, headers, dependencies, unauthRoutes];
for (const s of steps) {
  try { await s(); } catch (e) { add('info', s.name, `点検中にエラー：${e.message}`); }
}
const order = { critical: 0, high: 1, medium: 2, info: 3 };
findings.sort((a, b) => order[a.level] - order[b.level]);
console.log(JSON.stringify({ base: BASE, at: new Date().toISOString(), counts: Object.fromEntries(Object.keys(order).map(k => [k, findings.filter(f => f.level === k).length])), findings }, null, 2));
