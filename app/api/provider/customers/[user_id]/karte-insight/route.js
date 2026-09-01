// POST /api/provider/customers/[user_id]/karte-insight → 来店記録ログの履歴からAIが傾向・提案を出す（認証済み）
// オンデマンド呼び出しのみ（cron化・DB保存はしない。毎回最新の履歴で生成し直す）。
export const dynamic = 'force-dynamic';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const MIN_ENTRIES = 3;

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: entries }, { data: fields }] = await Promise.all([
    supabase
      .from('provider_karte_entries')
      .select('note, custom_values, created_at')
      .eq('provider_id', provider.id)
      .eq('user_id', params.user_id)
      .order('created_at', { ascending: true }),
    supabase
      .from('provider_karte_fields')
      .select('id, label, field_type')
      .eq('provider_id', provider.id),
  ]);

  if (!entries || entries.length < MIN_ENTRIES) {
    return Response.json({ insufficientData: true, count: entries?.length || 0 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'AI機能が現在利用できません' }, { status: 503 });
  }

  const labelMap = {};
  (fields || []).forEach(f => { labelMap[f.id] = f.label; });

  const fmtDate = d => new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const historyText = entries.map(e => {
    const custom = Object.entries(e.custom_values || {})
      .map(([fid, val]) => `${labelMap[fid] || fid}: ${val}`)
      .join('、');
    const parts = [e.note ? `メモ: ${e.note}` : null, custom || null].filter(Boolean);
    return `【${fmtDate(e.created_at)}】${parts.join(' / ') || '（記録内容なし）'}`;
  }).join('\n');

  const prompt = `あなたは美容・ボディケア系店舗のスタッフ向けに、顧客の来店記録を要約するアシスタントです。
以下は、ある1人のお客様についての来店記録の履歴です（古い順）。この事実だけから、スタッフが次回の接客で役立つ「気づく傾向・注意点・次回への提案」を3〜5個、簡潔な箇条書きで挙げてください。

【厳守】
- 履歴に書かれていない事実を作らないこと（推測は「〜かもしれません」等の言い切らない表現にする）
- 決めつけ・断定的な診断のような表現をしないこと
- 医療的な助言はしないこと

【来店記録の履歴】
${historyText}

以下のJSON形式のみで出力してください（他のテキスト不要）:
{ "insights": ["...", "..."] }`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    if (!Array.isArray(parsed?.insights) || !parsed.insights.length) {
      return Response.json({ error: '分析結果を生成できませんでした' }, { status: 502 });
    }
    return Response.json({ insights: parsed.insights.map(String) });
  } catch (e) {
    return Response.json({ error: '分析に失敗しました' }, { status: 502 });
  }
}
