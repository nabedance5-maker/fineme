// POST /api/provider/customer-scripts → 「接客の引き出し」をお店専用にパーソナライズ（認証済み）
//
// でお指摘（2026-09-01）: 従来はlib/customer-scripts.jsの7軸汎用スクリプトを
// 全店舗に同じ内容で表示していて、どの店の接客にも合っていない・存在価値が無い状態
// だった。この店舗に実際に来店したお客様のカルテ記録(provider_karte_entries)・
// 承認済み施術事例(provider_cases)・体験談(stories)だけを事実として、
// Claude Haiku 4.5が軸ごとのお店専用の声かけ例・カルテの着眼点を生成する。
//
// 実データが薄い軸は生成しない（無から接客トークを作文しない）。フロント側
// (app/provider/dashboard/page.js)は、生成された軸だけをお店専用の内容で
// 上書きし、それ以外の軸は従来の汎用スクリプトのまま表示する。
export const dynamic = 'force-dynamic';
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const MIN_SIGNAL = 5; // カルテ記録+施術事例+体験談の合計件数がこれ未満なら生成しない

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const force = new URL(request.url).searchParams.get('force') === '1';

  const [{ data: entries }, { data: fields }, { data: cases }, { data: stories }] = await Promise.all([
    supabase.from('provider_karte_entries').select('note, custom_values, created_at').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(80),
    supabase.from('provider_karte_fields').select('id, label').eq('provider_id', provider.id),
    supabase.from('provider_cases').select('axis, before_score, after_score').eq('provider_id', provider.id).eq('approved_by_user', true).limit(40),
    supabase.from('stories').select('concern_before, change_after, tags').eq('provider_id', String(provider.id)).eq('status', 'approved').limit(20),
  ]);

  const entryCount = entries?.length || 0;
  const totalSignal = entryCount + (cases?.length || 0) + (stories?.length || 0);
  if (totalSignal < MIN_SIGNAL) {
    return Response.json({ insufficientData: true, count: totalSignal });
  }

  const labelMap = {};
  (fields || []).forEach(f => { labelMap[f.id] = f.label; });
  const karteText = (entries || []).map(e => {
    const custom = Object.entries(e.custom_values || {}).map(([fid, val]) => `${labelMap[fid] || fid}: ${val}`).join('、');
    return [e.note, custom].filter(Boolean).join(' / ');
  }).filter(Boolean).join('\n');
  const caseText = (cases || []).map(c => `軸:${c.axis} ${c.before_score}→${c.after_score}点`).join('\n');
  const storyText = (stories || []).map(s => `Before: ${s.concern_before} / After: ${s.change_after}`).join('\n');

  const hash = createHash('sha256').update(`${entryCount}|${cases?.length || 0}|${stories?.length || 0}|${entries?.[0]?.created_at || ''}`).digest('hex');

  if (!force) {
    const { data: cached } = await supabase.from('provider_customer_scripts').select('*').eq('provider_id', provider.id).single();
    if (cached && cached.source_hash === hash) {
      return Response.json({ items: cached.items, generatedAt: cached.generated_at });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI機能が現在利用できません' }, { status: 503 });
  }

  const prompt = `あなたは美容・ボディケア系店舗のスタッフ向けに、接客で使える声かけ例とカルテの着眼点を作るアシスタントです。
以下は、ある1店舗に実際に来店した複数のお客様の記録（カルテのメモ・施術事例・体験談）です。
この事実だけから、実際にこの店舗の接客に役立つ「軸ごとの声かけ例」「カルテの着眼点」を作ってください。

【厳守】
- 記録に書かれていない事実（個人名・具体的な個人情報を含む）を作らない、書かないこと
- 個人が特定できる情報は一切出力に含めないこと（傾向として一般化すること）
- 明確な傾向が読み取れない軸は無理に作らず、出力から省くこと（該当軸が無ければ空配列でよい）
- 軸のキーは以下から選ぶ: eyebrow(眉) skin(肌) hair(ヘア) expression(表情) posture(姿勢) body(体型) fashion(ファッション)

【カルテ記録】
${karteText || '（記録なし）'}

【施術事例（軸・スコア変化）】
${caseText || '（記録なし）'}

【体験談】
${storyText || '（記録なし）'}

以下のJSON形式のみで出力してください（他のテキスト不要）:
{ "items": [ { "axis": "eyebrow", "label": "眉", "openers": ["声かけ例1", "声かけ例2"], "notePoints": ["着眼点1", "着眼点2", "着眼点3"] } ] }`;

  let parsed = null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    parsed = null;
  }

  const items = Array.isArray(parsed?.items) ? parsed.items.filter(it => it?.axis && Array.isArray(it.openers) && it.openers.length) : [];
  if (!items.length) {
    return Response.json({ error: 'お店専用の内容を生成できませんでした' }, { status: 502 });
  }

  const generatedAt = new Date().toISOString();
  await supabase.from('provider_customer_scripts').upsert({
    provider_id: provider.id, items, source_hash: hash, generated_at: generatedAt,
  }, { onConflict: 'provider_id' });

  return Response.json({ items, generatedAt });
}
