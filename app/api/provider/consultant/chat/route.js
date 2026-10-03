// POST /api/provider/consultant/chat { message } → ゴール・実データ・今日の時期を踏まえたAI専属コンサルの返答。
// 会話の中でタスクの追加・完了・見送り、ゴールの更新、店舗の事実の記憶も実行する（認証済み）
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import Anthropic from '@anthropic-ai/sdk';
import { authProvider, loadState, supabase, consultantEnabled } from '../_lib';
import { CONSULTANT_ROLE, buildContext, tabGuide } from '@/lib/consultant-prompt';
import { VALID_TABS, periodKeys, jstNow } from '@/lib/consultant-insight';

const HISTORY_LIMIT = 14;
const MODEL = 'claude-sonnet-4-6';

const TOOLS = [
  {
    name: 'add_task',
    description: '店舗がやることを決めた時、または提案に店舗が同意した時に、タスクとして記録する',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '誰が・何をするかが分かる一文' },
        why: { type: 'string' },
        cadence: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'once'] },
        due_in_days: { type: 'integer', description: 'once の時だけ' },
        tab: { type: 'string', description: `関係する画面のキー。無ければ空。${tabGuide()}` },
      },
      required: ['title', 'cadence'],
    },
  },
  { name: 'complete_task', description: '店舗が「やった」と伝えたタスクを完了にする', input_schema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'skip_task', description: '店舗が「やらない・合わない」と伝えたタスクを見送りにする', input_schema: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'save_goal', description: '店舗が目指すことを言い直した・決めた時に、ゴールを更新する（店舗自身の言葉に近い形で、200字以内）', input_schema: { type: 'object', properties: { goal: { type: 'string' } }, required: ['goal'] } },
  { name: 'remember_fact', description: '店舗の状況について、今後の提案に効く事実（客層・強み・制約・スタッフの事情・やってみた結果など）を一つ記憶する', input_schema: { type: 'object', properties: { fact: { type: 'string' } }, required: ['fact'] } },
];

const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

async function runTool(name, input, ctx) {
  const { provider, state } = ctx;
  if (name === 'add_task') {
    const title = clean(input.title, 120);
    if (!title) return '内容が空です';
    const cadence = ['daily', 'weekly', 'monthly', 'once'].includes(input.cadence) ? input.cadence : 'once';
    let due = null;
    if (cadence === 'once') {
      const days = Math.min(Math.max(parseInt(input.due_in_days, 10) || 3, 0), 60);
      due = new Date(jstNow().getTime() + days * 86400000).toISOString().slice(0, 10);
    }
    const { error } = await supabase.from('provider_consultant_tasks').insert({
      provider_id: provider.id, title, why: clean(input.why, 200) || null, cadence, due_date: due,
      period_key: cadence === 'once' ? null : periodKeys()[cadence],
      tab: VALID_TABS.includes(input.tab) ? input.tab : null, source: 'chat',
    });
    if (error) return '記録に失敗しました';
    ctx.changed = true;
    return '追加しました';
  }
  if (name === 'complete_task' || name === 'skip_task') {
    const target = state.tasks.find(t => t.id === input.task_id && t.status === 'open');
    if (!target) return '該当する未完了タスクが見つかりません';
    const done = name === 'complete_task';
    await supabase.from('provider_consultant_tasks')
      .update({ status: done ? 'done' : 'skipped', done_at: done ? new Date().toISOString() : null })
      .eq('id', target.id).eq('provider_id', provider.id);
    ctx.changed = true;
    return done ? '完了にしました' : '見送りにしました';
  }
  if (name === 'save_goal') {
    const goal = clean(input.goal, 600);
    if (!goal) return '内容が空です';
    const now = new Date().toISOString();
    await supabase.from('provider_consultant_settings').upsert(
      { provider_id: provider.id, goal_note: goal, goals_set_at: now, updated_at: now }, { onConflict: 'provider_id' });
    ctx.changed = true;
    ctx.goalChanged = true;
    return 'ゴールを更新しました。見立てと今日のタスクは次に画面を開いた時に作り直されます';
  }
  if (name === 'remember_fact') {
    const fact = clean(input.fact, 140);
    if (!fact) return '内容が空です';
    const facts = [...state.facts.filter(f => f !== fact), fact].slice(-20);
    const now = new Date().toISOString();
    await supabase.from('provider_consultant_settings').upsert({ provider_id: provider.id, facts, updated_at: now }, { onConflict: 'provider_id' });
    state.facts = facts;
    ctx.changed = true;
    return '覚えました';
  }
  return '不明な操作です';
}

export async function POST(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!consultantEnabled(provider)) return Response.json({ error: 'AI専属コンサルはオフになっています' }, { status: 403 });

  const { message } = await request.json().catch(() => ({}));
  const text = String(message || '').trim().slice(0, 1000);
  if (!text) return Response.json({ error: 'message は必須です' }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'AI機能が現在利用できません' }, { status: 503 });

  const [state, histRes] = await Promise.all([
    loadState(provider),
    supabase.from('provider_consultant_messages').select('role, content').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(HISTORY_LIMIT),
  ]);
  const history = (histRes.data || []).reverse();
  while (history.length && history[0].role !== 'user') history.shift();

  const diagnosis = state.plan?.diagnosis ? `\n\n【これまでの見立て】\n${state.plan.diagnosis}${state.plan.strategy?.focus ? `\n今の焦点：${state.plan.strategy.focus}` : ''}` : '';
  const system = `${CONSULTANT_ROLE}

今回は店舗との会話です。店舗の質問や状況の変化に、上の原則にそって答えます。
- ゴールが未記入なら、無理に提案せず「お店としてどうなりたいか」を聞く。
- 店舗が何かをやると決めたら add_task で記録する。やった・やらないと言われたら complete_task / skip_task（id は未完了タスクの一覧から選ぶ）。目指すことが変わったら save_goal。今後の提案に効く新しい事実が出たら remember_fact。操作した時は、それを一言添えて伝える。
- 無い機能を「ある」と言わない。画面を案内する時は次の名前で言う：${tabGuide()}
- 返答は短く、実務的に。3〜8文程度。必要なら箇条書きも可。

${buildContext(state, provider)}${diagnosis}`;

  const messages = [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: text }];
  const ctx = { provider, state, changed: false, goalChanged: false };

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let reply = '';
    for (let round = 0; round < 4; round++) {
      const res = await client.messages.create({ model: MODEL, max_tokens: 1200, system, tools: TOOLS, messages });
      const texts = res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      const calls = res.content.filter(b => b.type === 'tool_use');
      if (texts) reply = texts;
      if (!calls.length || res.stop_reason !== 'tool_use') break;
      messages.push({ role: 'assistant', content: res.content });
      const results = [];
      for (const c of calls) results.push({ type: 'tool_result', tool_use_id: c.id, content: await runTool(c.name, c.input || {}, ctx) });
      messages.push({ role: 'user', content: results });
    }
    if (!reply) reply = ctx.changed ? '反映しました。' : '';
    if (!reply) return Response.json({ error: '返答を生成できませんでした' }, { status: 502 });
    await supabase.from('provider_consultant_messages').insert([
      { provider_id: provider.id, role: 'user', content: text },
      { provider_id: provider.id, role: 'assistant', content: reply },
    ]);
    return Response.json({ reply, changed: ctx.changed, goalChanged: ctx.goalChanged });
  } catch {
    return Response.json({ error: '返答の生成に失敗しました' }, { status: 502 });
  }
}
