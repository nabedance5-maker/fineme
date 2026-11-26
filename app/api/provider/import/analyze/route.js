// POST /api/provider/import/analyze { filename, headers: string[], samples: string[][] }
// 他のサービスのCSVの「見出し」と「数行の見本」だけをAIに渡し、どの種類のデータか・どの列がFinemeのどの項目かを決める
// （2026-10-30 渡邉要望：使っていたシステムで項目がバラバラなので、AIでFinemeの情報に割り振る）。
// 全件はAIに送らない。決めた割り振りは、お店が確認画面で直してから /api/provider/import/commit で取り込む。
// 2026-11-26 渡邉要望：「色々まとまってしまっているCSVでも、とりあえず投入すれば上手いこと振り分けて」。
//  - 1行に顧客と回数券など複数の種類の情報が並んでいるファイルは、種類ごとの「取り込み」（parts）に分けて返す
//  - 行ごとに種類が違うファイル（「種別」の列などで分かれる）は、その列の値で行を絞る（filter）。値の候補は、
//    種類の少ない列だけ画面が全行から集めて送る（distinct。個々のお客様の名前・電話は送らない）
//  - どこにも入らない列は extras として返し、お客様のメモに「見出し：値」で残せるようにする（情報を捨てない）
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import { claudeClient } from '@/lib/ai';
import { memberAuth } from '@/lib/provider-members';
import { IMPORT_TYPES, missingRequired, guessNameColumns, MAX_IMPORT_PARTS, EXTRA_TARGETS } from '@/lib/import-schema';

// 店舗の管理画面の機能は Claude Haiku（渡邉判断 2026-11-06：APIの消費を抑える。振り分けの考え方は lib/ai.js）
const MODEL = 'claude-haiku-4-5-20251001';

function schemaText() {
  return Object.entries(IMPORT_TYPES).map(([k, t]) => `■ ${k}（${t.label}：${t.help}）\n${t.fields.map(([f, l]) => `  - ${f}: ${l}`).join('\n')}`).join('\n');
}

export async function POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (a.user.fineme_member?.role === 'staff') return Response.json({ error: 'データの取り込みは、オーナーか店長のログインで行ってください' }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'ただいま自動の割り振りが使えません' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const headers = (Array.isArray(body.headers) ? body.headers : []).slice(0, 80).map(h => String(h ?? '').slice(0, 60));
  const samples = (Array.isArray(body.samples) ? body.samples : []).slice(0, 4).map(r => headers.map((_, i) => String(r?.[i] ?? '').slice(0, 40)));
  if (!headers.length) return Response.json({ error: 'CSVの1行目（見出し）が読めませんでした' }, { status: 400 });
  // 種類の少ない列の値（例：「種別」＝顧客／回数券／来店）。画面が集めたもの。数と長さを絞る
  const distinct = {};
  Object.entries(body.distinct && typeof body.distinct === 'object' ? body.distinct : {}).slice(0, 20).forEach(([k, v]) => {
    const i = Number(k);
    if (Number.isInteger(i) && i >= 0 && i < headers.length && Array.isArray(v)) distinct[i] = v.slice(0, 8).map(x => String(x ?? '').slice(0, 20));
  });

  const table = headers.map((h, i) => `${i}: 「${h}」 例: ${samples.map(r => JSON.stringify(r[i])).join(' / ')}${distinct[i] ? ` ／この列の値はこれだけ: ${distinct[i].map(x => JSON.stringify(x)).join(', ')}` : ''}`).join('\n');
  const client = claudeClient({ personal: true });
  let parsed;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: `あなたは、店舗向けシステムの乗り換えで、他社システムやエクセルから書き出したCSVを、Finemeの項目に割り振る係です。
Finemeが取り込めるデータの種類と項目：
${schemaText()}

CSVは、1つの種類だけとは限りません。次のような「まとまってしまっている」ファイルもあります：
- 1行の中に、お客様の情報と、回数券の残りや会員プランなど別の種類の情報が並んでいる → 種類ごとに parts を分ける（同じ列を別の part で使ってよい。例：お客様の名前の列を customers の name と tickets の customer_name の両方に使う）
- 行ごとに種類が違う（「種別」「区分」などの列で、顧客の行・予約の行などに分かれている）→ part ごとに filter でその列の値を指定して、行を絞る
やること：
1. このCSVに含まれる種類を、上の種類名（英字）から選び、parts にする（最大${MAX_IMPORT_PARTS}つ。いちばん中心の種類を先頭に）。お客様ごとの情報が入っていれば customers も必ず入れる（お客様の情報を先に作るため）。
2. 各 part の項目に、対応する列の番号を割り当てる。対応する列が無い項目は null。1つの part の中では、1つの列を2つの項目に使わない。
   - 姓と名が別の列なら last_name / first_name、ひとつの列なら name を使う（フリガナも同様）。
     「氏」「姓」の列は last_name、「名」の列は first_name。「氏」「名」の2列を name と last_name に割り振らない。
     予約・回数券・会員プランでも、お客様の姓と名が別の列なら customer_last_name / customer_first_name を使う。
   - 日付と時刻が1つの列なら datetime、別々なら date / start_time。
   - 見出しの言葉だけでなく、見本の値の形（電話番号・日付・メールなど）も見て判断する。
3. どの part のどの項目にも入らないが、お店にとって意味のありそうな列（ポイント、来店のきっかけ、肌質、好み、担当メモなど）は extras に列番号を入れる。空っぽ・連番・システムの内部IDだけの列は入れない。
4. Finemeが取り込めない種類だけのファイル（例：商品の在庫表、経費の一覧）なら parts を空にし、notes にそう書く。
5. 割り振りで迷った点・お店に確かめてほしい点を notes に短く日本語で書く。
必ず次のJSONだけを出力する：{"parts":[{"type":"種類名","mapping":{"項目名":列番号またはnull,...},"filter":null または {"column":列番号,"values":["その列の値",...]}}],"extras":[列番号,...],"confidence":"high|medium|low","notes":["..."]}`,
      messages: [{ role: 'user', content: `ファイル名：${String(body.filename || '').slice(0, 80)}\n列（番号: 見出し 例）:\n${table}` }],
    });
    const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
    parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch (e) {
    console.error('[import analyze]', e?.message);
    const mapping = guessNameColumns(headers, 'customers');
    return Response.json({ error: '自動の割り振りに失敗しました。種類と列を手で選んでください', fallback: true, type: 'customers', mapping, parts: [{ type: 'customers', mapping, filter: null, missing: missingRequired('customers', mapping) }], extras: [] }, { status: 200 });
  }

  const validCol = v => Number.isInteger(v) && v >= 0 && v < headers.length;
  const rawParts = Array.isArray(parsed?.parts) ? parsed.parts : (parsed?.type ? [{ type: parsed.type, mapping: parsed.mapping }] : []);
  const parts = [];
  for (const rp of rawParts) {
    if (parts.length >= MAX_IMPORT_PARTS || !IMPORT_TYPES[rp?.type]) continue;
    const type = rp.type;
    const allowed = new Set(IMPORT_TYPES[type].fields.map(f => f[0]));
    // 「氏」「名」「セイ」「メイ」のように見出しで確実に分かる姓・名の列は、AIより見出しを優先する
    const byHeader = ['customers', 'reservations', 'tickets', 'memberships'].includes(type) ? guessNameColumns(headers, type) : {};
    const mapping = { ...byHeader };
    const used = new Set(Object.values(byHeader));
    Object.entries(rp?.mapping || {}).forEach(([k, v]) => {
      if (k in byHeader) return;
      if (allowed.has(k) && validCol(v) && !used.has(v)) { mapping[k] = v; used.add(v); }
    });
    if (!Object.keys(mapping).length) continue;
    const f = rp?.filter;
    const filter = f && validCol(f.column) && Array.isArray(f.values) && f.values.length
      ? { i: f.column, values: f.values.slice(0, 8).map(x => String(x ?? '').slice(0, 20)) } : null;
    // 同じ種類が2つ出たら、絞り込みが違う時だけ残す
    if (parts.some(p => p.type === type && JSON.stringify(p.filter) === JSON.stringify(filter))) continue;
    parts.push({ type, mapping, filter, missing: missingRequired(type, mapping) });
  }
  // お客様の情報を先に作る
  parts.sort((x, y) => (x.type === 'customers' ? -1 : 0) - (y.type === 'customers' ? -1 : 0));

  const usedCols = new Set(parts.flatMap(p => Object.values(p.mapping)).concat(parts.map(p => p.filter?.i).filter(Number.isInteger)));
  const canKeepExtras = parts.some(p => EXTRA_TARGETS.includes(p.type));
  const extras = canKeepExtras ? [...new Set((Array.isArray(parsed?.extras) ? parsed.extras : []).filter(i => validCol(i) && !usedCols.has(i)))].slice(0, 30) : [];
  const first = parts[0] || { type: 'customers', mapping: {} };
  return Response.json({
    parts, extras,
    type: first.type, mapping: first.mapping, // 古い画面向け（先頭の取り込みと同じ）
    unsupported: parts.length === 0,
    confidence: parsed?.confidence || 'medium',
    notes: (Array.isArray(parsed?.notes) ? parsed.notes : []).map(n => String(n).slice(0, 200)).slice(0, 6),
    missing: missingRequired(first.type, first.mapping),
  });
}
