#!/usr/bin/env node
// ENCOMPASS（別商品）を作る時に、すでにお客様が使っている店舗SaaSを壊していないかを確かめる（渡邉指示 2026-11-19）。
//
//   node scripts/encompass-guard.mjs            … ①変えたファイル ②SQL ③コードの書き込み先 を確かめる（コミット前に毎回）
//   node scripts/encompass-guard.mjs --smoke    … 上に加えて、本番で SaaS の主要画面・API が今まで通り動くかを確かめる（公開後に毎回）
//   --base <commit>    … どこからの変更を見るか（既定: origin/main。未プッシュのコミット＋作業中の変更を見る）
//   --site <url>       … --smoke の相手（既定: https://www.fineme.me）
//   --allow <path>     … 共通ファイルを、理由を確かめた上で触る時だけ指定（何度でも）
//
// 決まり（~/MyBrain/rules/corrections.md 2026-11-19）
//   - ENCOMPASS は「足すだけ」で作る。新しい表・/encompass・/api/encompass・lib/encompass の追加だけ
//   - 既存の表の列・制約・RLS、既存APIの返す形、providers.plan / feature-flags の判定は変えない（読むだけは可）
//   - 共通ファイルを触る時は --allow で名前を挙げ、変える前後で SaaS の動きが変わらないことを確かめる
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : d; };
const allowed = args.flatMap((a, i) => (a === '--allow' ? [args[i + 1]] : []));
const base = opt('--base', 'origin/main');
const site = opt('--site', 'https://www.fineme.me').replace(/\/$/, '');
const smoke = args.includes('--smoke');

const OWN = [
  /^app\/encompass\//,
  /^app\/api\/encompass\//,
  /^lib\/encompass\//,
  /^supabase-encompass-[\w-]+\.sql$/,
  /^scripts\/encompass-guard\.mjs$/,
  /^public\/business\/fineme-roadmap\.html$/, // 事業ロードマップ（文書。SaaSの動きには関わらない）
  /^\.claude\//,                              // 他セッションの設定（ここでは見ない）
];

let failed = 0;
const ng = msg => { failed++; console.log(`  NG  ${msg}`); };
const ok = msg => console.log(`  OK  ${msg}`);
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();

// ① 変えたファイル
console.log(`\n① 変えたファイル（${base} から＋作業中）`);
let files = [];
try {
  files = [...new Set([
    ...git('diff', '--name-only', `${base}...HEAD`).split('\n'),
    ...git('diff', '--name-only', 'HEAD').split('\n'),
    ...git('ls-files', '--others', '--exclude-standard').split('\n'),
  ].filter(Boolean))];
} catch (e) {
  ng(`git で変更を取れませんでした: ${e.message.split('\n')[0]}`);
}
const shared = files.filter(f => !OWN.some(r => r.test(f)));
const unapproved = shared.filter(f => !allowed.includes(f));
if (!files.length) ok('変更なし');
else ok(`ENCOMPASS 側のファイル ${files.length - shared.length} 件`);
shared.filter(f => allowed.includes(f)).forEach(f => console.log(`  注意 共通ファイル（--allow 済み）: ${f}`));
unapproved.forEach(f => ng(`ENCOMPASS 以外のファイルが変わっています: ${f}（他セッションの作業か、共通ファイルなら理由を確かめて --allow ${f}）`));

// ② SQL：ENCOMPASS の SQL は encompass_ の表だけを作る・触る
console.log('\n② SQL（supabase-encompass-*.sql）');
const sqlFiles = readdirSync('.').filter(f => /^supabase-encompass-[\w-]+\.sql$/.test(f));
if (!sqlFiles.length) ok('ENCOMPASS の SQL なし');
for (const f of sqlFiles) {
  const sql = readFileSync(f, 'utf8').replace(/--[^\n]*/g, '');
  const bad = [];
  const touch = /\b(alter\s+table|drop\s+table|drop\s+index|drop\s+policy|truncate|update|delete\s+from|insert\s+into|create\s+policy\s+\S+\s+on|create\s+trigger\s+\S+[\s\S]*?\bon|comment\s+on\s+table|grant\s+[\w,\s]+\s+on|revoke\s+[\w,\s]+\s+on)\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?("?[\w]+"?)/gi;
  for (const m of sql.matchAll(touch)) {
    const table = m[2].replace(/"/g, '');
    if (!/^encompass_/.test(table)) bad.push(`${m[1].replace(/\s+/g, ' ')} ${table}`);
  }
  for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?("?[\w]+"?)/gi)) {
    const table = m[1].replace(/"/g, '');
    if (!/^encompass_/.test(table)) bad.push(`create table ${table}（名前は encompass_ で始める）`);
    else if (!new RegExp(`alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql)) bad.push(`${table} に RLS がありません`);
  }
  if (/\bgrant\b[^;]*\bto\s+(anon|authenticated|public)\b/i.test(sql)) bad.push('anon / authenticated / public に権限を付けています');
  if (/\bcreate\s+(or\s+replace\s+)?function\b/i.test(sql) && /security\s+definer/i.test(sql)) bad.push('security definer の関数があります（中身を確かめる）');
  if (bad.length) bad.forEach(b => ng(`${f}: ${b}`)); else ok(`${f}`);
}

// ③ コード：ENCOMPASS のコードが既存の表へ書き込んでいないか（読むだけは可）
console.log('\n③ ENCOMPASS のコードの書き込み先');
const walk = d => (existsSync(d) ? readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
const code = ['app/encompass', 'app/api/encompass', 'lib/encompass'].flatMap(walk).filter(p => /\.(m?js|jsx|ts|tsx)$/.test(p));
let writes = 0;
for (const p of code) {
  const src = readFileSync(p, 'utf8');
  // .from('表') から次の .from( か ; までを1つの問い合わせと見る
  for (const m of src.matchAll(/\.from\(\s*['"`]([\w]+)['"`]\s*\)([\s\S]*?)(?=\.from\(|;)/g)) {
    if (/\.(insert|update|upsert|delete)\s*\(/.test(m[2])) {
      writes++;
      if (!/^encompass_/.test(m[1])) ng(`${p}: 既存の表 ${m[1]} に書き込んでいます`);
    }
  }
  if (/\.rpc\(/.test(src)) ng(`${p}: rpc を呼んでいます（既存の関数を動かしていないか確かめる）`);
  if (/@\/lib\/(supabase|feature-flags|plan-features|provider-contract)['"]/.test(src) && /\b(clearMemberCache|setPlan|syncContractVisibility)\b/.test(src)) ng(`${p}: SaaS の契約・権限の状態を変える関数を使っています`);
}
ok(`ENCOMPASS のコード ${code.length} ファイル・書き込み ${writes} か所を確かめました`);

// ④ 本番で SaaS が今まで通り動くか
if (smoke) {
  console.log(`\n④ 本番の確認（${site}）`);
  const hit = async (path, init) => {
    const r = await fetch(site + path, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...init });
    return r.status;
  };
  const checks = [
    // SaaS：画面が開く
    ['SaaS トップ', '/', [200]],
    ['SaaS 店舗のページ', '/provider/fn025', [200]],
    ['SaaS 予約の埋め込み', '/embed/fn025', [200]],
    ['SaaS 店舗の管理画面', '/provider/dashboard', [200]],
    ['SaaS 検索', '/search', [200]],
    ['SaaS ログイン', '/login', [200]],
    // SaaS：ログインなしでは弾く（今まで通り）
    ['SaaS API 店舗情報（ログインなし）', '/api/provider/me', [401]],
    ['SaaS API 顧客一覧（ログインなし）', '/api/provider/customers', [401]],
    // ENCOMPASS：画面が開く・ログインなしでは弾く
    ['ENCOMPASS トップ', '/encompass', [200]],
    ['ENCOMPASS API お店（ログインなし）', '/api/encompass/me', [401]],
    ['ENCOMPASS API メニュー（ログインなし）', '/api/encompass/menus', [401]],
    ['ENCOMPASS API お客様（ログインなし）', '/api/encompass/customers', [401]],
    ['ENCOMPASS API 記録（ログインなし）', '/api/encompass/logs', [401]],
    ['ENCOMPASS API タブレット（でたらめな鍵）', '/api/encompass/board/' + 'x'.repeat(43), [404]],
  ];
  for (const [label, path, want] of checks) {
    try {
      const st = await hit(path);
      if (want.includes(st)) ok(`${label} ${path} → ${st}`);
      else ng(`${label} ${path} → ${st}（期待 ${want.join('/')}）`);
    } catch (e) {
      ng(`${label} ${path} → つながりません（${e.message}）`);
    }
  }
}

console.log(failed ? `\n結果：NG ${failed} 件。直すまでコミット・公開しない。\n` : '\n結果：問題なし。\n');
process.exit(failed ? 1 : 0);
