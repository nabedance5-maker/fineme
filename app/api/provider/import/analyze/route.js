// POST /api/provider/import/analyze { filename, headers: string[], samples: string[][] }
// 他のサービスのCSVの「見出し」と「数行の見本」だけをAIに渡し、どの種類のデータか・どの列がFinemeのどの項目かを決める
// （2026-10-30 渡邉要望：使っていたシステムで項目がバラバラなので、AIでFinemeの情報に割り振る）。
// 全件はAIに送らない。決めた割り振りは、お店が確認画面で直してから /api/provider/import/commit で取り込む。
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import Anthropic from '@anthropic-ai/sdk';
import { memberAuth } from '@/lib/provider-members';
import { IMPORT_TYPES, missingRequired } from '@/lib/import-schema';

const MODEL = 'claude-sonnet-4-6';

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

  const table = headers.map((h, i) => `${i}: 「${h}」 例: ${samples.map(r => JSON.stringify(r[i])).join(' / ')}`).join('\n');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let parsed;
  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: `あなたは、店舗向けシステムの乗り換えで、他社システムから書き出したCSVを、Finemeの項目に割り振る係です。
Finemeが取り込めるデータの種類と項目：
${schemaText()}

やること：
1. このCSVがどの種類か、上の種類名（英字）から1つ選ぶ。
2. その種類の各項目に、対応する列の番号を割り当てる。対応する列が無い項目は null。1つの列を2つの項目に使わない（氏名とフリガナを両方に使う等はしない）。
   - 姓と名が別の列なら last_name / first_name、ひとつの列なら name を使う（フリガナも同様）。
   - 日付と時刻が1つの列なら datetime、別々なら date / start_time。
   - 見出しの言葉だけでなく、見本の値の形（電話番号・日付・メールなど）も見て判断する。
3. 割り振れなかった重要そうな列があれば、notes に短く日本語で書く。
必ず次のJSONだけを出力する：{"type":"種類名","confidence":"high|medium|low","mapping":{"項目名":列番号またはnull,...},"notes":["..."]}`,
      messages: [{ role: 'user', content: `ファイル名：${String(body.filename || '').slice(0, 80)}\n列（番号: 見出し 例）:\n${table}` }],
    });
    const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
    parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  } catch (e) {
    console.error('[import analyze]', e?.message);
    return Response.json({ error: '自動の割り振りに失敗しました。種類と列を手で選んでください', fallback: true }, { status: 200 });
  }
  const type = IMPORT_TYPES[parsed?.type] ? parsed.type : 'customers';
  const allowed = new Set(IMPORT_TYPES[type].fields.map(f => f[0]));
  const used = new Set();
  const mapping = {};
  Object.entries(parsed?.mapping || {}).forEach(([k, v]) => {
    const i = Number.isInteger(v) ? v : null;
    if (allowed.has(k) && i !== null && i >= 0 && i < headers.length && !used.has(i)) { mapping[k] = i; used.add(i); }
  });
  return Response.json({
    type, mapping, confidence: parsed?.confidence || 'medium',
    notes: (Array.isArray(parsed?.notes) ? parsed.notes : []).map(n => String(n).slice(0, 200)).slice(0, 6),
    missing: missingRequired(type, mapping),
  });
}
