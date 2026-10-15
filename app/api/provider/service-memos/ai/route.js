// POST /api/provider/service-memos/ai → 接客メモのAI部分（今日聞くこと・次回の一言）を生成（認証済み）
// body: { date } または { reservation_id }。事実が変わっていない予約はキャッシュを返す。
//
// AIには lib/service-memo.js の factsText（店舗が持っている事実）だけを渡し、
// 書かれていないことを作らせない。生成できなかった予約は決定的な下書きにフォールバックする。
export const dynamic = 'force-dynamic';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { buildServiceMemos } from '@/lib/service-memo-build';
import { factsText, fallbackAi, mdLabel } from '@/lib/service-memo';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const MAX_PER_CALL = 30;
const CONCURRENCY = 4;

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug, main_category').eq('email', user.email).single();
  return data || null;
}

function promptFor(item, category) {
  const nextHint = item.nextBooked
    ? `次回予約はすでに${mdLabel(item.nextBooked.date)}に入っている。nextLineはその予約を確認する一言にする。`
    : item.nextSuggestedDate
      ? `nextLineには次回の目安日「${mdLabel(item.nextSuggestedDate)}頃」を必ず入れる。`
      : '次回の目安が分からないので、nextLineはお客様に通いやすい間隔を聞いて日にちだけ押さえる提案にする。';
  return `あなたは${category ? `「${category}」の` : ''}店舗スタッフの接客準備を手伝うアシスタントです。
以下は、今日来店するお客様1人について店舗が持っている事実です。この事実だけを使って、接客メモを作ってください。

【厳守】
- 事実に書かれていないこと（体調・家族・職業・好み等）を作らない、推測で断定しない
- 効果や結果を断定・保証しない。医療的な判断をしない
- これは来店前のメモ。今日これから行う施術の内容や結果は分からないので、「今日は〜しました」のように済んだこととして書かない
- カルテの「次回は〜」という記録は、今日確認・提案する材料として扱う（実施済みと書かない）
- お客様を評価・批判する言い方をしない。売り込み口調にしない
- 絵文字・記号の装飾を使わない。敬語で、スタッフがそのまま口に出せる自然な話し言葉にする
- asks は「今日聞くこと」。前回の記録・間隔・回数券などの事実につながる質問を2〜3個（各45字以内）。初来店なら来店のきっかけ・今いちばん気になっていること等
- nextLine は会計時に次回予約を提案する一言（70字以内）。${nextHint}

【事実】
${factsText(item)}

次のJSONだけを出力してください（他のテキスト不要）:
{"asks":["...","..."],"nextLine":"..."}`;
}

async function generate(client, item, category) {
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: promptFor(item, category) }],
    });
    const text = msg.content[0]?.text || '';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    const asks = Array.isArray(parsed.asks) ? parsed.asks.map(a => String(a).trim()).filter(Boolean).slice(0, 3) : [];
    const nextLine = String(parsed.nextLine || '').trim();
    if (!asks.length || !nextLine) return null;
    return { asks, nextLine };
  } catch {
    return null;
  }
}

async function __POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : undefined;
  const reservationId = typeof body.reservation_id === 'string' ? body.reservation_id : undefined;
  const force = body.force === true;

  const { items } = await buildServiceMemos(supabase, provider, { date, reservationId });
  const pending = items.filter(it => force || !it.ai).slice(0, MAX_PER_CALL);

  if (pending.length && process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length) {
        const it = pending[cursor++];
        const ai = await generate(client, it, provider.main_category);
        if (!ai) continue;
        it.ai = { ...ai, generatedAt: new Date().toISOString() };
        await supabase.from('provider_service_memo_ai').upsert({
          reservation_id: it.reservation_id, provider_id: provider.id, source_hash: it.hash, content: it.ai, generated_at: it.ai.generatedAt,
        }, { onConflict: 'reservation_id' });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
  }

  return Response.json({
    items: items.map(it => ({ reservation_id: it.reservation_id, ai: it.ai || null, draft: it.ai ? null : fallbackAi(it) })),
  });
}

export const POST = withAudit(__POST);
