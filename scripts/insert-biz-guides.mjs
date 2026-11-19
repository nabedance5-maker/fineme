// Claude Code が書いた店舗運営ガイド・営業パートナーガイドの記事（JSON）を検査して biz_guides に入れる。
// 2026-11-18 渡邉指示：記事は API（無料モデル・Claude API）ではなく Claude Code が直接書く。
//
// 使い方：set -a; source .env.local; set +a; node scripts/insert-biz-guides.mjs <articles.json> [--dry|--draft]
// --draft：非公開で入れる（2026-11-19 渡邉指示：画像は運営が管理画面で設定してから公開する）。IndexNow にも送らない。
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

import { checkGuide } from '../lib/biz-guide-check.js';

// 検査は運営管理画面の編集と共通（lib/biz-guide-check.js）。ここでは注意（warns）も止める。
function validate(a) {
  const { errs, warns, len } = checkGuide(a);
  return { errs: [...errs, ...warns], len };
}

const [file, flag] = process.argv.slice(2);
if (!file) { console.error('usage: node scripts/insert-biz-guides.mjs <articles.json> [--dry]'); process.exit(1); }
const dry = flag === '--dry';
const draft = flag === '--draft';
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
  console.log(dry ? 'OK(dry)' : draft ? 'INSERT(draft)' : 'INSERT', a.slug, `${len}字`, a.title);
  if (dry) continue;
  await c.query(
    `insert into biz_guides (slug, audience, topic_key, title, description, lead, sections, fineme, faq, related, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [a.slug, a.audience, a.topic_key || a.slug, a.title, a.description, a.lead, JSON.stringify(a.sections), a.fineme, JSON.stringify(a.faq), JSON.stringify(a.related || []), draft ? 'draft' : 'published'],
  );
  if (!draft) urls.push(`${SITE}${BASE[a.audience]}/${a.slug}`);
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
