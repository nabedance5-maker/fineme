// POST /api/provider/consultant/chat { message } → ゴール・実データ・今日の時期を踏まえたAI専属コンサルの返答。
// 会話の中でタスクの追加・完了・見送り、ゴールの更新、店舗の事実の記憶も実行する（認証済み）
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import Anthropic from '@anthropic-ai/sdk';
import { authProvider, loadState, supabase, consultantEnabled } from '../_lib';
import { CONSULTANT_ROLE, buildContext, fixTaskTab, tabGuide } from '@/lib/consultant-prompt';
import { VALID_TABS, periodKeys, jstNow, STAGES } from '@/lib/consultant-insight';
import { recordGoal, maybeSummarize } from '@/lib/consultant-memory';
import { freeJson } from '@/lib/ai';
import { deepStoreAnalysis } from '@/lib/consultant-deep';
import { shiftDates, visitCandidates, findCustomers, FIND_SEGMENTS, todayJst, resolveCustomers, resolveService, resolveStaff, resolvePackage, upcomingReservations, numbersForPrompt } from '@/lib/consultant-actions';

const HISTORY_LIMIT = 14;
// まず OpenRouter の無料モデルで答え、失敗した時だけ Claude Haiku（渡邉判断 2026-11-10。振り分けの考え方は lib/ai.js）。
// 無料モデルでは道具（tool_use）が安定しないため、返答と操作を一つの JSON で返させて、操作はこちらで実行する
const MODEL = 'claude-haiku-4-5-20251001';

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
  {
    name: 'prepare_outreach',
    description: '店舗が、ある段階のお客様に声をかけたい・送ってほしい・文面を作ってほしいと言った時に、その段階の全員へ送る声かけの文面を用意する。画面に「送る」ボタン付きで出し、送るのは店舗が押した時だけ（AIが勝手に送ることはない）',
    input_schema: {
      type: 'object',
      properties: {
        stage: { type: 'string', enum: STAGES.map(s => s.key), description: STAGES.map(s => `${s.key}=${s.label}`).join(' / ') },
        message: { type: 'string', description: 'LINEで送る2〜4文の声かけ。冒頭は「{name}さん、」で始める（お名前に自動で置き換わる）。売り込みすぎず、次の来店の一歩が分かる一文を入れる' },
      },
      required: ['stage', 'message'],
    },
  },
  {
    name: 'make_shift',
    description: '店舗が「◯月のシフトを作って」「来週のシフトを組んで」などと頼んだ時に、その期間のシフトを自動で作る準備をする。画面に「作る」ボタンを出し、押した時だけ作る（確定していない日だけ。作った後は店舗がシフトの画面で確かめて確定する）。期間は今日の日付から考えて YYYY-MM-DD で、最大62日',
    input_schema: { type: 'object', properties: { from: { type: 'string', description: 'YYYY-MM-DD' }, to: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['from', 'to'] },
  },
  {
    name: 'mark_visited',
    description: '店舗が「今日の来店確認をしていない人を来店済みにして」などと頼んだ時に、その日の確定済みで時間が始まった予約を来店済みにする準備をする。画面に対象の人数と「来店済みにする」ボタンを出し、押した時だけ変える。日付を言われなければ今日',
    input_schema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD。無ければ今日' } }, required: [] },
  },
  {
    name: 'find_customers',
    description: '店舗が「最近来ていない人を探して」「休眠の人を見せて」などと頼んだ時に、該当するお客様の一覧を画面に出す（見るだけ）。segment は ' + Object.entries(FIND_SEGMENTS).map(([k, v]) => `${k}=${v.label}`).join(' / '),
    input_schema: { type: 'object', properties: { segment: { type: 'string', enum: Object.keys(FIND_SEGMENTS) } }, required: ['segment'] },
  },
  {
    name: 'book_reservation',
    description: '店舗が「田中さんを明日15時で入れて」などと予約を入れてほしいと言った時に、予約を入れる準備をする。お客様・メニュー・担当はお店の中から名前で探し、画面に内容と「予約を入れる」を出す（押した時だけ入る。シフト・部屋・重なりは管理画面から入れる時と同じく確かめる）',
    input_schema: { type: 'object', properties: { customer: { type: 'string', description: 'お客様の名前（姓だけでも可）' }, date: { type: 'string', description: 'YYYY-MM-DD' }, time: { type: 'string', description: 'HH:MM' }, menu: { type: 'string', description: 'メニュー名（言われなければ空）' }, staff: { type: 'string', description: '担当スタッフ名（言われなければ空）' }, end_time: { type: 'string', description: 'メニューが無い時の終わりの時刻 HH:MM（無ければ空）' } }, required: ['customer', 'date', 'time'] },
  },
  {
    name: 'reschedule_reservation',
    description: '店舗が「田中さんの予約を金曜の14時に変えて」などと言った時に、そのお客様のこれからの予約の日時を変える準備をする。画面で対象の予約を選び「変更する」を押した時だけ変わる',
    input_schema: { type: 'object', properties: { customer: { type: 'string' }, current_date: { type: 'string', description: '今の予約の日 YYYY-MM-DD（分かれば）' }, new_date: { type: 'string', description: 'YYYY-MM-DD' }, new_time: { type: 'string', description: 'HH:MM' }, notify: { type: 'boolean', description: 'お客様に知らせるか（言われなければ true）' } }, required: ['customer', 'new_date', 'new_time'] },
  },
  {
    name: 'grant_ticket',
    description: '店舗が「田中さんに10回券を付けて」などと言った時に、お客様に回数券・チケットを付ける準備をする。画面の「付ける」を押した時だけ付く（代金のやりとりは記録しない。売る時はPOSで）',
    input_schema: { type: 'object', properties: { customer: { type: 'string' }, ticket: { type: 'string', description: '回数券・チケットの名前' } }, required: ['customer', 'ticket'] },
  },
  {
    name: 'change_setting',
    description: '店舗が設定を変えてほしいと言った時に、変える準備をする。今できる設定：dormant_days＝休眠と判断する日数（最終来店からこの日数を超えたら休眠）。画面の「変更する」を押した時だけ変わる',
    input_schema: { type: 'object', properties: { setting: { type: 'string', enum: ['dormant_days'] }, value: { type: 'integer' } }, required: ['setting', 'value'] },
  },
  { name: 'remember_fact', description: '店舗の状況について、今後の提案に効く事実（客層・強み・制約・スタッフの事情・やってみた結果など）を一つ記憶する', input_schema: { type: 'object', properties: { fact: { type: 'string' } }, required: ['fact'] } },
];

const FREE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: '店舗への返答。操作した時はそれを一言添える' },
    actions: {
      type: 'array',
      description: '実行する操作。無ければ空配列。name は ' + TOOLS.map(t => t.name).join(' / ') + ' のどれか',
      items: {
        type: 'object',
        properties: { name: { type: 'string', enum: TOOLS.map(t => t.name) }, input: { type: 'object' } },
        required: ['name', 'input'],
      },
    },
  },
  required: ['reply', 'actions'],
};
const ACTION_GUIDE = TOOLS.map(t => `- ${t.name}：${t.description}。input：${JSON.stringify(t.input_schema.properties)}（必須：${t.input_schema.required.join(', ')}）`).join('\n');

async function freeReply(system, messages, ctx) {
  const out = await freeJson({
    system: `${system}\n\n【操作】次の操作を actions に入れると実行されます。\n${ACTION_GUIDE}`,
    messages,
    schema: FREE_SCHEMA,
    max_tokens: 1200,
    budget_ms: 60000,
    text_fallback_key: 'reply',
  });
  const reply = String(out?.reply || '').trim();
  const actions = (Array.isArray(out?.actions) ? out.actions : []).filter(a => TOOLS.some(t => t.name === a?.name)).slice(0, 6);
  if (!reply && !actions.length) throw new Error('empty');
  for (const a of actions) await runTool(a.name, a.input || {}, ctx);
  return reply;
}

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
      tab: VALID_TABS.includes(input.tab) ? fixTaskTab(title, input.tab) : null, source: 'chat',
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
    await recordGoal(supabase, provider.id, goal, 'chat');
    ctx.changed = true;
    ctx.goalChanged = true;
    return 'ゴールを更新しました。見立てと今日のタスクは次に画面を開いた時に作り直されます';
  }
  if (name === 'prepare_outreach') {
    const st = state.insight.stages.find(x => x.key === input.stage);
    const body = String(input.message || '').trim().slice(0, 800);
    if (!st || !body) return '段階か文面が足りません';
    if (!st.count) return 'この段階のお客様は今いません';
    ctx.proposals.push({ kind: 'outreach', stage: st.key, label: st.label, count: st.count, body });
    return `「${st.label}」の${st.count}人へ送る文面を画面に出しました。店舗が確認して「送る」を押すと届きます`;
  }
  if (name === 'make_shift') {
    const dates = shiftDates(input.from, input.to);
    if (!dates) return '期間が正しくありません（YYYY-MM-DD・最大62日）';
    if (dates[dates.length - 1] < todayJst()) return '過ぎた日のシフトは作れません';
    ctx.proposals.push({ kind: 'shift', from: dates[0], to: dates[dates.length - 1], days: dates.length });
    return `${dates[0]}〜${dates[dates.length - 1]}のシフトを作る準備をしました。店舗が「作る」を押すと作ります`;
  }
  if (name === 'mark_visited') {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date || '') ? input.date : todayJst();
    const list = await visitCandidates(supabase, provider, date);
    ctx.proposals.push({ kind: 'visit', date, count: list.length, people: list.slice(0, 30) });
    return list.length ? `${date}の来店済みにできる予約${list.length}件を画面に出しました。店舗が押すと来店済みになります` : `${date}は、来店済みにできる予約がありません`;
  }
  if (name === 'find_customers') {
    const r = await findCustomers(supabase, provider, state.insight, input.segment);
    ctx.proposals.push({ kind: 'find', segment: input.segment, ...r });
    return `「${r.label}」${r.total}人を画面に出しました`;
  }
  if (name === 'book_reservation' || name === 'reschedule_reservation' || name === 'grant_ticket') {
    const people = await resolveCustomers(supabase, provider, input.customer);
    if (!people.length) {
      ctx.proposals.push({ kind: 'notice', title: `「${clean(input.customer, 30)}」さんが見つかりません`, text: 'メンバーの画面で名前を確かめるか、フルネーム・電話番号で言い直してください。' });
      return 'お客様が見つかりませんでした。名前を言い直してもらってください';
    }
    if (name === 'book_reservation') {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(input.date || '') ? input.date : null;
      const time = /^\d{1,2}:\d{2}$/.test(input.time || '') ? input.time.padStart(5, '0') : null;
      if (!date || !time) return '日付か時刻が正しくありません';
      const [svc, staff] = await Promise.all([input.menu ? resolveService(supabase, provider, input.menu) : null, input.staff ? resolveStaff(supabase, provider, input.staff) : null]);
      const end = /^\d{1,2}:\d{2}$/.test(input.end_time || '') ? input.end_time.padStart(5, '0') : null;
      ctx.proposals.push({
        kind: 'api', title: '予約を入れる', button: '予約を入れる', method: 'POST', path: '/api/provider/reservations/manual', after: 'calendar',
        lines: [['日時', `${date} ${time}${!svc && end ? `〜${end}` : ''}`], ['メニュー', svc ? svc.name : (input.menu ? `「${clean(input.menu, 30)}」は見つかりませんでした（メニューなし）` : 'なし')], ['担当', staff ? staff.name : (input.staff ? `「${clean(input.staff, 20)}」は見つかりませんでした（空いている人を自動で）` : '空いている人を自動で')]],
        options: people.map(c => ({ label: c.name, body: { date, time, ...(svc ? { service_id: svc.id } : end ? { end_time: end } : {}), ...(staff ? { staff_id: staff.id } : {}), user_name: c.name, ...(c.user_id ? { user_id: c.user_id } : {}), note: 'AIコンサルから入力' } })),
      });
      return `予約の内容を画面に出しました${people.length > 1 ? `（同じ名前の候補が${people.length}人。店舗が選びます）` : ''}。店舗が「予約を入れる」を押すと入ります`;
    }
    if (name === 'reschedule_reservation') {
      const nd = /^\d{4}-\d{2}-\d{2}$/.test(input.new_date || '') ? input.new_date : null;
      const nt = /^\d{1,2}:\d{2}$/.test(input.new_time || '') ? input.new_time.padStart(5, '0') : null;
      if (!nd || !nt) return '新しい日付か時刻が正しくありません';
      const opts = [];
      for (const c of people.filter(x => x.user_id)) {
        const rs = await upcomingReservations(supabase, provider, c.user_id, /^\d{4}-\d{2}-\d{2}$/.test(input.current_date || '') ? input.current_date : null);
        rs.slice(0, 5).forEach(r => opts.push({ label: `${c.name}　${r.date} ${r.time} の予約`, body: { action: 'reschedule', date: nd, time: nt, notify: input.notify !== false }, path: `/api/reservations/${r.id}` }));
      }
      if (!opts.length) {
        ctx.proposals.push({ kind: 'notice', title: '変えられる予約が見つかりません', text: 'これからの確定済みの予約だけが対象です。予約カレンダーで確かめてください。' });
        return '対象の予約が見つかりませんでした';
      }
      ctx.proposals.push({ kind: 'api', title: `予約の日時を ${nd} ${nt} に変える`, button: '変更する', method: 'PATCH', after: 'calendar', lines: [['お客様へのお知らせ', input.notify !== false ? 'メール・LINEで送る' : '送らない']], options: opts });
      return '変える予約の候補を画面に出しました。店舗が選んで「変更する」を押すと変わります';
    }
    const pkg = await resolvePackage(supabase, provider, input.ticket);
    if (!pkg) {
      ctx.proposals.push({ kind: 'notice', title: `「${clean(input.ticket, 30)}」という回数券が見つかりません`, text: '回数券・チケットの画面で名前を確かめてください。' });
      return '回数券が見つかりませんでした';
    }
    ctx.proposals.push({
      kind: 'api', title: `「${pkg.name}」を付ける`, button: '付ける', method: 'POST', path: '/api/provider/customer-packages', after: 'customers',
      lines: [['回数券', `${pkg.name}${pkg.total_sessions ? `（${pkg.total_sessions}回）` : ''}`], ['代金', '記録しません（売る時はPOSで）']],
      options: people.map(c => ({ label: c.name, body: { package_id: pkg.id, ...(c.user_id ? { user_id: c.user_id } : { manual_id: c.manual_id }) } })),
    });
    return '回数券を付ける内容を画面に出しました。店舗が「付ける」を押すと付きます';
  }
  if (name === 'change_setting') {
    if (input.setting === 'dormant_days') {
      const v = parseInt(input.value, 10);
      if (!Number.isInteger(v) || v < 14 || v > 730) return '日数は14〜730の間で言ってください';
      ctx.proposals.push({ kind: 'api', title: `休眠と判断する日数を${v}日にする`, button: '変更する', method: 'POST', path: '/api/provider/dormant-settings', after: 'visit-settings', lines: [['今', `${state.ctx?.noVisitDays ?? 90}日`], ['変更後', `${v}日`]], options: [{ label: '', body: { no_visit_days: v } }] });
      return '設定の変更を画面に出しました。店舗が「変更する」を押すと変わります';
    }
    return 'その設定はまだ変えられません';
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
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY && !process.env.GEMINI_FREE_API_KEY && !process.env.GROQ_API_KEY) return Response.json({ error: 'AI機能が現在利用できません' }, { status: 503 });

  const [state, histRes] = await Promise.all([
    loadState(provider),
    supabase.from('provider_consultant_messages').select('role, content').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(HISTORY_LIMIT),
  ]);
  state.deep = await deepStoreAnalysis(supabase, provider).catch(() => '');
  const history = (histRes.data || []).reverse();
  while (history.length && history[0].role !== 'user') history.shift();

  const road = state.plan?.strategy?.roadmap;
  const diagnosis = state.plan?.diagnosis ? `\n\n【これまでの見立て】\n${state.plan.diagnosis}${state.plan.strategy?.focus ? `\n今の焦点：${state.plan.strategy.focus}` : ''}${road?.kpi ? `\n道筋：${road.kpi}を${road.current}から${road.target}へ${road.deadline ? `（${road.deadline}まで）` : ''}。相談への答えも、この道筋に結びつけ、このお店の数字・メニュー・担当を根拠にする（一般論だけで答えない）` : ''}` : '';
  const system = `${CONSULTANT_ROLE}

今回は店舗との会話です。店舗の質問や状況の変化に、上の原則にそって答えます。
- ゴールが未記入なら、無理に提案せず「お店としてどうなりたいか」を聞く。
- 店舗が何かをやると決めたら add_task で記録する。やった・やらないと言われたら complete_task / skip_task（id は未完了タスクの一覧から選ぶ）。目指すことが変わったら save_goal。今後の提案に効く新しい事実が出たら remember_fact（店舗が質問に答えた時、方針・こだわり・できない理由・やってみた結果が語られた時は特に記録する）。お客様への声かけ・連絡・文面づくり・一斉メールの話になったら、助言だけで終わらせず prepare_outreach で送れる文面まで用意する（同じ段階に直近で送っていれば、その結果を踏まえて文面を変える）。
- 管理画面の作業を頼まれたら、やり方の説明で終わらせず、できる操作で実際に進める（今日は${todayJst()}。「明日」「金曜」「1月」などはここから日付にする）：シフトを作って → make_shift（「1月」なら次に来る1月の1日〜末日）、来店確認・来店済みにして → mark_visited、お客様を探して・見せて → find_customers、予約を入れて → book_reservation、予約を変えて → reschedule_reservation、回数券・チケットを付けて → grant_ticket、休眠の日数を変えて → change_setting。変える作業は店舗が画面で押した時に実行されると一言添える。まだ操作が無い作業は、どの画面でできるかを案内する。
- 売上や予約の数字を聞かれたら、下の【数字】だけを使って答える。操作した時は、それを一言添えて伝える。
- 無い機能を「ある」と言わない。画面を案内する時は次の名前で言う：${tabGuide()}
- 返答は短く、実務的に。3〜8文程度。必要なら箇条書きも可。

${buildContext(state, provider)}${diagnosis}

${await numbersForPrompt(supabase, provider).catch(() => '')}`;

  const messages = [...history.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: text }];
  const ctx = { provider, state, changed: false, goalChanged: false, proposals: [] };

  try {
    let reply = '';
    let usedFree = false;
    try {
      reply = await freeReply(system, messages, ctx);
      usedFree = true;
    } catch (e) {
      console.warn('[consultant chat] free model failed, fallback to Claude:', e?.message);
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    for (let round = 0; !usedFree && round < 4; round++) {
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
    try { await maybeSummarize(supabase, provider, state); } catch (e) { console.error('consultant summarize failed:', e?.message); }
    return Response.json({ reply, changed: ctx.changed, goalChanged: ctx.goalChanged, proposals: ctx.proposals.slice(0, 3) });
  } catch (e) {
    // 無料モデルが全部だめで、切り替え先の Claude も使えなかった時（クレジット切れ等）。原因をログに残す
    console.error('[consultant chat] fallback failed:', e?.status || '', String(e?.message || e).slice(0, 200));
    return Response.json({ error: 'AIが混み合っていて返答できませんでした。少し時間をおいてもう一度お試しください' }, { status: 502 });
  }
}
