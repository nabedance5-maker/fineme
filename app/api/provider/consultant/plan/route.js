// POST /api/provider/consultant/plan { force? } → ゴール×実データ×今日の時期から、戦略・見立て・タスクを作り直す（認証済み）
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
import Anthropic from '@anthropic-ai/sdk';
import { authProvider, loadState, supabase, consultantEnabled } from '../_lib';
import { CONSULTANT_ROLE, buildContext, tabGuide, STAGE_KEYS } from '@/lib/consultant-prompt';
import { VALID_TABS, periodKeys, jstNow } from '@/lib/consultant-insight';

const MODEL = 'claude-sonnet-4-6';

const PLAN_TOOL = {
  name: 'submit_plan',
  description: '店舗のゴールに向けた現状の見立て・今の時期の焦点・お客様の段階別の打ち手・日々のタスクを提出する',
  input_schema: {
    type: 'object',
    properties: {
      diagnosis: { type: 'string', description: '現状の見立て。実データから読み取れること、ゴールまでの距離、いちばんの課題と機会。3〜5文。データが乏しければそう述べる' },
      focus: { type: 'string', description: '今の時期（月初/月末・曜日・季節や行事）を踏まえて、今月・今週に集中すべきこと。2〜3文' },
      stage_actions: {
        type: 'array',
        description: 'お客様の段階ごとの打ち手。人数が0の段階は出さない。多くて6つ',
        items: {
          type: 'object',
          properties: {
            stage: { type: 'string', enum: STAGE_KEYS },
            action: { type: 'string', description: 'この段階のお客様に、いつ・何をするか。具体的に' },
            message_draft: { type: 'string', description: 'LINEで送る短い声かけの文案（2〜3文）。冒頭は「{name}さん、」で始める。売り込みすぎない、押しつけない' },
          },
          required: ['stage', 'action'],
        },
      },
      tasks: {
        type: 'array',
        description: '追加する新しいタスク。毎日の作業は最大3、毎週は最大4、毎月は最大3、単発は最大3。すでに未完了のタスクと重複させない',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '誰が・何をするかが分かる一文（70字以内）' },
            why: { type: 'string', description: 'このタスクがゴールにどう効くか（一文）' },
            cadence: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'once'] },
            due_in_days: { type: 'integer', description: 'cadence が once の時だけ。何日後までにやるか' },
            tab: { type: 'string', description: `作業に使う Fineme の画面があれば、そのキー。無ければ空。選べるキー：${tabGuide()}` },
          },
          required: ['title', 'cadence'],
        },
      },
      drop_task_ids: { type: 'array', items: { type: 'string' }, description: '状況が変わって不要になった未完了タスクのid' },
      questions: { type: 'array', items: { type: 'string' }, description: 'さらに精度を上げるために店舗に聞きたいこと。最大2つ。無ければ空' },
    },
    required: ['diagnosis', 'focus', 'tasks'],
  },
};

const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

export async function POST(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!consultantEnabled(provider)) return Response.json({ error: 'AI専属コンサルはオフになっています' }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'AI機能が現在利用できません' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const state = await loadState(provider);
  if (!state.goalText) return Response.json({ error: 'まずお店のゴールを書いてください' }, { status: 400 });

  const recentlyMade = state.plan?.generated_at && Date.now() - new Date(state.plan.generated_at).getTime() < 45000 && state.plan.goal_text === state.goalText;
  if (!body.force && (!state.stale || recentlyMade)) return Response.json({ ok: true, skipped: true });

  const now = jstNow();
  const keys = periodKeys(now);

  // 期間が過ぎても終わっていないタスクは「やれなかった」として閉じ、AIに事実として渡す
  const missed = state.tasks.filter(t => t.bucket === 'missed');
  if (missed.length) {
    await supabase.from('provider_consultant_tasks').update({ status: 'skipped' }).in('id', missed.map(t => t.id)).eq('provider_id', provider.id);
  }
  const stillOpen = state.tasks.filter(t => t.status === 'open' && t.bucket !== 'missed');

  const context = buildContext({ ...state, tasks: state.tasks.filter(t => t.bucket !== 'missed') }, provider);
  const missedLines = missed.length ? `\n\n【期間内にできなかったタスク（今回閉じた）】\n${missed.slice(0, 12).map(t => `- ${t.title}`).join('\n')}\n同じ内容を繰り返すより、なぜ続かなかったかを考えて、小さくする・担当を変える・やめる判断も含めて組み立て直してください。` : '';
  const prevPlan = state.plan?.diagnosis ? `\n\n【前回の見立て】\n${state.plan.diagnosis}\n前回から状況がどう動いたか（段階の人数・売上・予約・時期の変化）を踏まえて、見立てを更新してください。` : '';

  const system = `${CONSULTANT_ROLE}

今回の仕事：店舗のゴールに向けて、今日の時点での見立て・集中点・段階別の打ち手・タスクを submit_plan で提出する。
タスクの出し方：
- 毎日の作業は、その日にやる小さな習慣だけ（最大3）。毎週・毎月の作業は、そのゴールを達成する営みとして必要なもの。
- すでに未完了のタスクは重複して出さない。不要になったものは drop_task_ids に入れる。
- 業務の効率化（スタッフの時間を作る）も、ゴールに関係する時はタスクに入れる。登録スタッフの名前や役職を使い、誰が担うかまで書く。
- Fineme の設定作業は、ゴールの役に立つ時だけ手段として入れる。tab に指定できるのは submit_plan の tab の説明にあるキーだけ。`;

  const user = `${context}${missedLines}${prevPlan}

上のデータをもとに、submit_plan を提出してください。`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system,
      tools: [PLAN_TOOL],
      tool_choice: { type: 'tool', name: 'submit_plan' },
      messages: [{ role: 'user', content: user }],
    });
    const call = res.content.find(b => b.type === 'tool_use');
    const out = call?.input;
    if (!out?.diagnosis) return Response.json({ error: '見立てを作れませんでした' }, { status: 502 });

    const stageActions = (Array.isArray(out.stage_actions) ? out.stage_actions : [])
      .filter(a => STAGE_KEYS.includes(a.stage) && a.action)
      .slice(0, 8)
      .map(a => ({ stage: a.stage, action: clean(a.action, 300), message_draft: a.message_draft ? String(a.message_draft).trim().slice(0, 400) : '' }));
    const questions = (Array.isArray(out.questions) ? out.questions : []).map(q => clean(q, 200)).filter(Boolean).slice(0, 2);

    const openIds = new Set(stillOpen.map(t => t.id));
    const drop = (Array.isArray(out.drop_task_ids) ? out.drop_task_ids : []).filter(id => openIds.has(id));
    if (drop.length) {
      await supabase.from('provider_consultant_tasks').update({ status: 'skipped' }).in('id', drop).eq('provider_id', provider.id);
    }

    const existing = new Set(stillOpen.filter(t => !drop.includes(t.id)).map(t => t.title));
    const caps = { daily: 3, weekly: 4, monthly: 3, once: 3 };
    const used = { daily: 0, weekly: 0, monthly: 0, once: 0 };
    const rows = [];
    for (const t of Array.isArray(out.tasks) ? out.tasks : []) {
      const title = clean(t.title, 120);
      const cadence = ['daily', 'weekly', 'monthly', 'once'].includes(t.cadence) ? t.cadence : 'once';
      if (!title || existing.has(title) || used[cadence] >= caps[cadence]) continue;
      used[cadence]++;
      existing.add(title);
      let due = null;
      if (cadence === 'once') {
        const days = Math.min(Math.max(parseInt(t.due_in_days, 10) || 3, 0), 60);
        due = new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
      }
      rows.push({
        provider_id: provider.id,
        title,
        why: clean(t.why, 200) || null,
        cadence,
        due_date: due,
        period_key: cadence === 'once' ? null : keys[cadence],
        tab: VALID_TABS.includes(t.tab) ? t.tab : null,
        source: 'plan',
      });
    }
    if (rows.length) {
      const { error } = await supabase.from('provider_consultant_tasks').insert(rows);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }

    const { error: planErr } = await supabase.from('provider_consultant_plans').upsert({
      provider_id: provider.id,
      goal_text: state.goalText,
      diagnosis: clean(out.diagnosis, 1200),
      strategy: { focus: clean(out.focus, 600), stage_actions: stageActions, questions },
      generated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' });
    if (planErr) return Response.json({ error: planErr.message }, { status: 500 });

    return Response.json({ ok: true, added: rows.length });
  } catch {
    return Response.json({ error: '見立ての生成に失敗しました' }, { status: 502 });
  }
}
