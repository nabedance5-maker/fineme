// Claude Code が書いた店舗運営ガイド・営業パートナーガイドの記事（JSON）を検査して biz_guides に入れる。
// 2026-11-18 渡邉指示：記事は API（無料モデル・Claude API）ではなく Claude Code が直接書く。
//
// 使い方：set -a; source .env.local; set +a; node scripts/insert-biz-guides.mjs <articles.json> [--dry]
// JSON は配列。各要素 { slug, audience: 'shop'|'partner', topic_key, title, description, lead,
//   sections: [{ h, p: [..], list: [..] }], fineme, faq: [[q, a], ..], related: [slug, ..] }
// 同じ slug が既にあれば飛ばす。公開後に IndexNow へ送る（ページは1時間以内に作り直される）。
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

const SITE = 'https://www.fineme.me';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '4fbd52dc-784e-4ab8-97c4-f1f99e48b504';
const BASE = { shop: '/shop-guide', partner: '/sales-partner/guide' };

// app/api/cron/biz-guide/route.js の検査と同じ決まり
const BANNED_NAMES = ['ホットペッパー', 'HOT PEPPER', 'ミニモ', 'minimo', 'hacomono', 'リザービア', 'STORES', 'Square', 'Airリザーブ', 'Airレジ', 'じゃらん', '楽天ビューティ', 'クービック', 'RESERVA', 'SALON BOARD', 'サロンボード'];
const BANNED_PATTERNS = [
  [/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, '絵文字'],
  [/弁護士|税理士に|専門家に(相談|確認)/, '専門家への確認を勧める表現'],
  [/お客さん|(?<![お顧集接来乗])客(?=[がをにのはもと、。])/, '「お客様」以外の呼び方'],
  [/必ず(稼|儲|売上が)|確実に(稼|儲)|絶対に(稼|儲)/, '成果の保証'],
  [/月会費[^。]{0,6}(自動)?消化/, '「月会費の消化」'],
  [/一般的な相場|業界(の)?平均|相場と(合|一致)/, '根拠のない相場・業界平均'],
  [/LINE(だけ|のみ)で[^。]{0,10}(支払|決済)/, '「LINEだけで支払い・決済」'],
  [/投資(回収|対効果)[^。]{0,12}(すぐ|見込め|確実)/, '投資回収の約束'],
];

function validate(a) {
  const errs = [];
  if (!/^[a-z0-9-]{3,80}$/.test(a.slug || '')) errs.push('slug');
  if (!BASE[a.audience]) errs.push('audience');
  if (!a.title || a.title.length < 15 || a.title.length > 60) errs.push(`タイトル${a.title?.length}字`);
  if (!a.description || a.description.length < 60) errs.push('要約が短い');
  if (!a.lead || a.lead.length < 50) errs.push('leadが短い');
  if (!Array.isArray(a.sections) || a.sections.length < 4) errs.push('見出し4つ未満');
  if (!a.fineme || a.fineme.length < 80) errs.push('finemeが短い');
  if (!Array.isArray(a.faq) || a.faq.length < 2 || a.faq.some((f) => !Array.isArray(f) || f.length !== 2)) errs.push('faqの形');
  const len = [a.lead, ...(a.sections || []).flatMap((s) => [...(s.p || []), ...(s.list || [])]), ...(a.faq || []).map((f) => f[1])].join('').length;
  if (len < 1200) errs.push(`本文${len}字`);
  const text = JSON.stringify(a);
  for (const n of BANNED_NAMES) if (text.includes(n)) errs.push(`他社名「${n}」`);
  for (const [re, label] of BANNED_PATTERNS) if (re.test(text)) errs.push(label);
  return { errs, len };
}

const [file, flag] = process.argv.slice(2);
if (!file) { console.error('usage: node scripts/insert-biz-guides.mjs <articles.json> [--dry]'); process.exit(1); }
const dry = flag === '--dry';
const articles = JSON.parse(fs.readFileSync(file, 'utf8'));

const c = new Client({ connectionString: process.env.SUPABASE_DB_URL });
await c.connect();
const existing = new Set((await c.query('select slug from biz_guides')).rows.map((r) => r.slug));
// related は実在する記事だけに絞る（手書きの記事 lib/biz-guide.js ＋ DB ＋ 今回入れる記事）
const STATIC_SLUGS = ['second-visit', 'sales-formula', 'dormant-customers', 'personal-gym-retention', 'eyebrow-salon-repeat', 'ticket-membership', 'own-booking-line', 'customer-karte', 'ai-for-shop', 'no-initial-cost', 'stock-commission', 'beginner-saas-referral'];
const known = new Set([...existing, ...STATIC_SLUGS, ...articles.map((a) => a.slug)]);
for (const a of articles) a.related = (a.related || []).filter((s) => known.has(s) && s !== a.slug).slice(0, 3);
const urls = [];
let bad = 0;
for (const a of articles) {
  const { errs, len } = validate(a);
  if (errs.length) { bad++; console.log('NG', a.slug, errs.join(' / ')); continue; }
  if (existing.has(a.slug)) { console.log('SKIP (exists)', a.slug); continue; }
  console.log(dry ? 'OK(dry)' : 'INSERT', a.slug, `${len}字`, a.title);
  if (dry) continue;
  await c.query(
    `insert into biz_guides (slug, audience, topic_key, title, description, lead, sections, fineme, faq, related, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published')`,
    [a.slug, a.audience, a.topic_key || a.slug, a.title, a.description, a.lead, JSON.stringify(a.sections), a.fineme, JSON.stringify(a.faq), JSON.stringify(a.related || [])],
  );
  urls.push(`${SITE}${BASE[a.audience]}/${a.slug}`);
}
await c.end();

if (urls.length) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: 'www.fineme.me', key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: [...urls, `${SITE}/shop-guide`] }),
  });
  console.log('IndexNow', res.status, urls.length);
}
if (bad) process.exit(2);
