// POST /api/provider/consultant/chat { message } → 道筋・実データ・ボトルネックを踏まえたAI専属コンサルの返答（認証済み）
export const dynamic = 'force-dynamic';
import Anthropic from '@anthropic-ai/sdk';
import { authProvider, loadState, supabase } from '../_lib';
import { STEPS } from '@/lib/consultant-journey';

const HISTORY_LIMIT = 12;

export async function POST(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { message } = await request.json();
  const text = String(message || '').trim().slice(0, 1000);
  if (!text) return Response.json({ error: 'message は必須です' }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'AI機能が現在利用できません' }, { status: 503 });

  const [state, histRes] = await Promise.all([
    loadState(provider),
    supabase.from('provider_consultant_messages').select('role, content').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(HISTORY_LIMIT),
  ]);
  const history = (histRes.data || []).reverse();
  while (history.length && history[0].role !== 'user') history.shift();

  const { ctx } = state;
  const stepLines = state.steps.map(s => `- [${s.status}] ${s.layer === 'customer' ? '客' : '業務'}｜${s.title}${s.progress ? `（${s.progress}）` : ''}`).join('\n');
  const bnLines = state.bottlenecks.filter(b => b.status === 'open').map(b => `- ${b.label}${b.minutes_per_week ? `（週${b.minutes_per_week}分）` : ''}`).join('\n') || '（まだ聞けていません）';

  const system = `あなたはFineme（ファインミ）に組み込まれた、店舗専属のAIコンサルタントです。店舗名: ${provider.name}。
ゴールは「リピート率を上げる」ただ一つ。ホットペッパー等で来たお客様を常連に変えることを支えます。新規集客は他のサービスに任せる前提で、他サービスの批判や「広告費削減」の話はしません。
あわせて、店長だけでなくスタッフ一人一人が、お客様のために使える時間を作れるよう、店舗業務の無駄（シフト作成・予約調整・連絡・記録など）も一緒に減らします。ボトルネックは店舗ごとに違うため、必要なら「今いちばん時間を取られている作業は何か」を聞きます。

【現在の実データ】
登録顧客 ${ctx.customerCount}人 / LINEつながり ${ctx.linkedCount}人 / 休眠(${ctx.noVisitDays}日以上) ${ctx.dormantCount}人 / 直近60日で1回だけ来た客 ${ctx.firstTimerCount}人 / リピート率 ${ctx.repeatRate == null ? '不明' : ctx.repeatRate + '%'}
スタッフ ${ctx.staffCount}人

【道筋の状態】
${stepLines}

【今の一手】
${state.current ? state.current.title : '（全て完了）'}

【時間を取られている作業（ヒアリング済み）】
${bnLines}

【返答のルール】
- 一本の道筋で考える。今の一手を軸に、次に何をすればよいかを具体的に答える。
- Finemeの画面（${STEPS.map(s => s.actionLabel).join('、')}）で今できる操作に結びつける。無い機能を「ある」と言わない。
- 日本語で、短く、やさしく、実務的に。3〜6文程度。専門用語を避ける。絵文字は使わない。
- 実データに無いことを事実として断言しない。分からないことは質問する。`;

  const messages = [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: text }];

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system,
      messages,
    });
    const reply = (res.content[0]?.text || '').trim();
    if (!reply) return Response.json({ error: '返答を生成できませんでした' }, { status: 502 });
    await supabase.from('provider_consultant_messages').insert([
      { provider_id: provider.id, role: 'user', content: text },
      { provider_id: provider.id, role: 'assistant', content: reply },
    ]);
    return Response.json({ reply });
  } catch {
    return Response.json({ error: '返答の生成に失敗しました' }, { status: 502 });
  }
}
