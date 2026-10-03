// AI専属コンサル（掲載者ダッシュボード右下の常駐吹き出し）の道筋定義。
// 方針（でお2026-10-03）: ゴールは「リピート率を上げる」一本。ホットペッパーで来た客を常連に変える。
// タブごとに別提案を出さず、1本の道筋の「今の一手」だけを出す。
// 2層: customer＝客に直接取る行動 / operation＝スタッフの時間を作る業務効率化（ボトルネック次第で前倒し）。

export const GOAL = { key: 'repeat_rate', label: 'リピート率を上げる' };

// ボトルネックのカテゴリ（ヒアリングの選択肢）。stepKeyはそれを解消する機能のステップ。
export const BOTTLENECK_CATEGORIES = [
  { key: 'shift', label: 'シフト作成', stepKey: 'shift_on_fineme' },
  { key: 'reservation', label: '予約の調整・管理', stepKey: 'reservation_calendar' },
  { key: 'reply', label: 'お客様への連絡・返信', stepKey: 'line_connect' },
  { key: 'sales', label: '売上・会計の記録', stepKey: 'sales_entry' },
  { key: 'karte', label: 'カルテ・顧客情報の記入', stepKey: 'karte_entries' },
  { key: 'other', label: 'その他', stepKey: null },
];

const DAY = 86400000;

function daysAgo(n) {
  return new Date(Date.now() - n * DAY).toISOString();
}

async function countRows(q) {
  const { count } = await q;
  return count || 0;
}

// 道筋の完了判定に使う実データを集める（全て自店舗スコープ）
export async function gatherContext(supabase, provider) {
  const pid = provider.id;
  const slug = provider.slug;
  const features = provider.enabled_features || {};

  const [
    channelRes,
    linkedCount,
    manualCount,
    freqCount,
    dormantRes,
    logsRes,
    staffCount,
    shiftPeriodCount,
    reservations30,
    sales30,
    karteCount,
  ] = await Promise.all([
    supabase.from('provider_line_channels').select('verified_at').eq('provider_id', pid).maybeSingle(),
    countRows(supabase.from('provider_customer_line_links').select('id', { count: 'exact', head: true }).eq('provider_id', pid)),
    countRows(supabase.from('provider_manual_customers').select('id', { count: 'exact', head: true }).eq('provider_id', pid)),
    countRows(supabase.from('provider_recommended_frequencies').select('axis', { count: 'exact', head: true }).eq('provider_id', pid)),
    supabase.from('provider_dormant_settings').select('no_visit_days').eq('provider_id', pid).maybeSingle(),
    slug
      ? supabase.from('user_service_logs').select('id, user_id, last_visit').eq('provider_slug', slug).eq('active', true).limit(3000)
      : Promise.resolve({ data: [] }),
    countRows(supabase.from('provider_staff').select('id', { count: 'exact', head: true }).eq('provider_id', pid)),
    countRows(supabase.from('provider_shift_periods').select('id', { count: 'exact', head: true }).eq('provider_id', pid)),
    countRows(supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('provider_id', pid).gte('created_at', daysAgo(30))),
    countRows(supabase.from('provider_sales_entries').select('id', { count: 'exact', head: true }).eq('provider_id', pid).gte('created_at', daysAgo(30))),
    countRows(supabase.from('provider_karte_entries').select('id', { count: 'exact', head: true }).eq('provider_id', pid)),
  ]);

  const logs = logsRes.data || [];
  const noVisitDays = dormantRes.data?.no_visit_days || 90;
  const memberCount = new Set(logs.map(l => l.user_id)).size;
  const customerCount = memberCount + manualCount;

  const dormantCutoff = Date.now() - noVisitDays * DAY;
  const dormantCount = logs.filter(l => l.last_visit && new Date(l.last_visit).getTime() < dormantCutoff).length;

  // 来店回数1回だけで直近60日以内の客＝2回目来店を促したい客
  let firstTimerCount = 0;
  let repeaters = 0;
  let visited = 0;
  if (logs.length) {
    const visitCounts = {};
    for (let i = 0; i < logs.length; i += 200) {
      const ids = logs.slice(i, i + 200).map(l => l.id);
      const { data } = await supabase.from('user_service_log_visits').select('log_id').in('log_id', ids);
      (data || []).forEach(v => { visitCounts[v.log_id] = (visitCounts[v.log_id] || 0) + 1; });
    }
    const recentCutoff = Date.now() - 60 * DAY;
    logs.forEach(l => {
      const n = visitCounts[l.id] || 0;
      if (n >= 1) visited++;
      if (n >= 2) repeaters++;
      if (n === 1 && l.last_visit && new Date(l.last_visit).getTime() >= recentCutoff) firstTimerCount++;
    });
  }
  const repeatRate = visited ? Math.round((repeaters / visited) * 100) : null;

  return {
    features,
    lineConnected: !!channelRes.data?.verified_at,
    linkedCount,
    customerCount,
    memberCount,
    freqCount,
    noVisitDays,
    dormantCount,
    firstTimerCount,
    repeatRate,
    visited,
    staffCount,
    shiftPeriodCount,
    reservations30,
    sales30,
    karteCount,
  };
}

// 各ステップ: detect(ctx) => { done, progress? }。done=trueなら道筋から外れる。
export const STEPS = [
  {
    key: 'line_connect',
    layer: 'customer',
    title: '店舗のLINE公式アカウントを連携する',
    why: 'お客様に直接声をかけられる土台です。連携すると、休眠のお客様や2回目来店の声かけが自店のLINEから届きます。',
    tab: 'line-channel',
    actionLabel: 'LINE連携を開く',
    detect: c => ({ done: c.lineConnected }),
  },
  {
    key: 'import_customers',
    layer: 'customer',
    title: 'お客様を登録する（ホットペッパー等で来た客も）',
    why: '道筋の全ての土台です。どのお客様がいつ来たかが分かって初めて、戻ってこない客に手を打てます。',
    tab: 'customers',
    actionLabel: '顧客管理を開く',
    detect: c => ({ done: c.customerCount >= 5, progress: `${c.customerCount}人登録済み` }),
  },
  {
    key: 'visit_cycle',
    layer: 'customer',
    title: '来店サイクル（推奨来店周期）を決める',
    why: '「いつ戻ってきてほしいか」を決めると、周期を過ぎたお客様が自動で見つかります。',
    tab: 'visit-settings',
    actionLabel: '来店設定を開く',
    detect: c => ({ done: c.freqCount > 0, progress: c.freqCount ? `${c.freqCount}軸設定済み` : undefined }),
  },
  {
    key: 'line_friends',
    layer: 'customer',
    title: 'お客様をLINE友だちにする',
    why: '店頭QRや会計時の声かけで、来店したお客様をLINEでつなげます。つながった客にしか次の一手は届きません。',
    tab: 'qr',
    actionLabel: 'QRコードを開く',
    detect: c => {
      const target = Math.max(5, Math.ceil(c.customerCount * 0.3));
      return { done: c.linkedCount >= target, progress: `${c.linkedCount}人つながっています（目標 ${target}人）` };
    },
  },
  {
    key: 'dormant_revive',
    layer: 'customer',
    title: '来なくなったお客様に声をかける',
    why: 'いちばん取り戻しやすいのは、一度来てくれた客です。',
    tab: 'customers',
    actionLabel: '休眠のお客様を見る',
    detect: c => ({ done: c.dormantCount === 0, progress: `${c.noVisitDays}日以上来ていない客が${c.dormantCount}人` }),
  },
  {
    key: 'second_visit',
    layer: 'customer',
    title: '初めて来た客に2回目の来店を促す',
    why: 'リピートが決まるのは2回目の来店です。直近で1回だけ来た客に、早めにひと声かけます。',
    tab: 'customers',
    actionLabel: '顧客一覧を開く',
    detect: c => ({ done: c.firstTimerCount === 0, progress: `直近60日で1回だけ来た客が${c.firstTimerCount}人` }),
  },
  {
    key: 'retention_check',
    layer: 'customer',
    title: 'リピート率を見て、次の一手を決める',
    why: 'ここまでの打ち手が効いているかを数字で見ます。',
    tab: 'stats',
    actionLabel: '概況を開く',
    detect: c => ({ done: false, progress: c.repeatRate == null ? 'まだ来店記録が足りません' : `リピート率 ${c.repeatRate}%（来店記録のある客のうち2回以上来た客）` }),
    ongoing: true,
  },
  {
    key: 'shift_on_fineme',
    layer: 'operation',
    title: 'シフト作成をFinemeに寄せて時間を作る',
    why: 'スタッフの希望集めと調整にかかる時間を減らし、その分をお客様のために使えるようにします。',
    tab: 'shift',
    actionLabel: 'シフト管理を開く',
    detect: c => ({ done: c.staffCount < 2 || c.shiftPeriodCount > 0, progress: c.shiftPeriodCount ? `${c.shiftPeriodCount}期間作成済み` : undefined }),
  },
  {
    key: 'reservation_calendar',
    layer: 'operation',
    title: '予約の管理をFinemeに集める',
    why: '電話・DM・他サイトに散らばった予約を1か所で見られると、確認と調整の手間が減ります。',
    tab: 'calendar',
    actionLabel: '予約カレンダーを開く',
    detect: c => ({ done: c.reservations30 >= 5, progress: `直近30日の予約 ${c.reservations30}件` }),
  },
  {
    key: 'sales_entry',
    layer: 'operation',
    title: '売上の記録をFinemeで済ませる',
    why: '会計後の記録がたまると後でまとめる時間が膨らみます。来店確認と同時に記録できます。',
    tab: 'sales',
    actionLabel: '売上管理を開く',
    detect: c => ({ done: c.sales30 >= 3, progress: `直近30日の売上記録 ${c.sales30}件` }),
  },
  {
    key: 'karte_entries',
    layer: 'operation',
    title: 'カルテをFinemeに残して、次の接客を楽にする',
    why: '前回の内容をスタッフ全員が見られると、引き継ぎと準備の時間が減り、お客様への提案に時間を使えます。',
    tab: 'customers',
    actionLabel: '顧客のカルテを開く',
    detect: c => ({ done: c.karteCount >= 3, progress: `カルテ記録 ${c.karteCount}件` }),
  },
];

// 道筋全体の状態を計算して「今の一手」を決める
export function computeJourney(ctx, { stepStates = [], bottlenecks = [] } = {}) {
  const stateByKey = Object.fromEntries(stepStates.map(s => [s.step_key, s]));
  const now = Date.now();

  const openBottleneckSteps = new Set(
    bottlenecks.filter(b => b.status === 'open')
      .map(b => BOTTLENECK_CATEGORIES.find(c => c.key === b.category)?.stepKey)
      .filter(Boolean)
  );

  const steps = STEPS.map(def => {
    const d = def.detect(ctx);
    const st = stateByKey[def.key];
    let status = d.done ? 'done' : 'todo';
    if (!d.done && st) {
      if (st.status === 'done') status = 'done';
      else if (st.status === 'skipped') status = 'skipped';
      else if (st.status === 'snoozed' && st.until && new Date(st.until).getTime() > now) status = 'snoozed';
    }
    return {
      key: def.key,
      layer: def.layer,
      title: def.title,
      why: def.why,
      tab: def.tab,
      actionLabel: def.actionLabel,
      progress: d.progress || null,
      ongoing: !!def.ongoing,
      status,
      boosted: openBottleneckSteps.has(def.key),
    };
  });

  // 今の一手: ボトルネックに紐づく未完了ステップを最優先、次に道筋の順
  const actionable = steps.filter(s => s.status === 'todo');
  const current = actionable.find(s => s.boosted) || actionable.find(s => !s.ongoing) || actionable[0] || null;

  const total = steps.filter(s => !s.ongoing).length;
  const done = steps.filter(s => !s.ongoing && s.status === 'done').length;

  return { steps, current, progress: { done, total } };
}
