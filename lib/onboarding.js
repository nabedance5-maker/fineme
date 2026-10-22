// 掲載者管理画面のオンボーディング（初回ログイン時の質問 → 機能のおすすめ設定・AIへの共有）。
//
// でお承認（2026-10-15）：契約後に初めて管理画面を開いた店舗に、業態・規模・運営・目的を聞き、
// 必要な機能を自動でオン/オフし、AI専属コンサルにもお店の前提として覚えさせる。
// 質問の定義とおすすめ判定はここが唯一の定義元（画面 app/provider/dashboard/Onboarding.js と
// API app/api/provider/onboarding/route.js の両方から使う）。
import { FEATURE_DEFS } from '@/lib/feature-flags';

export const BUSINESS_TYPES = [
  { key: 'gym', label: 'パーソナルジム・フィットネス' },
  { key: 'hair', label: 'ヘアサロン' },
  { key: 'eyebrow', label: '眉毛・まつげサロン' },
  { key: 'nail', label: 'ネイルサロン' },
  { key: 'esthetic', label: 'エステ・脱毛' },
  { key: 'bodycare', label: '整体・リラクゼーション' },
  { key: 'school', label: 'スクール・スタジオ（レッスン）' },
  { key: 'other', label: 'その他' },
];

export const STAFF_SIZES = [
  { key: 'solo', label: '自分1人' },
  { key: 'small', label: '2〜3人' },
  { key: 'mid', label: '4〜9人' },
  { key: 'large', label: '10人以上' },
];

export const BOOKING_STYLES = [
  { key: 'instant', label: '空いている枠を選んだら、その場で予約が確定する' },
  { key: 'request', label: 'お客様の希望を受けて、お店が確認してから確定する' },
  { key: 'phone', label: '電話やLINEで受けて、お店が手で入れることが多い' },
];

export const OPERATIONS = [
  { key: 'tickets', label: '回数券・コースを販売している' },
  { key: 'monthly', label: '月額会員（通い放題など）がいる' },
  { key: 'retail', label: '商品の販売（物販）がある' },
  { key: 'group', label: 'グループレッスン・複数人の枠がある' },
  { key: 'rooms', label: '部屋・ベッド・席を複数使い分けている' },
  { key: 'line', label: 'お店のLINE公式アカウントがある' },
];

// key は AI専属コンサルのゴール（lib/consultant-journey.js GOAL_OPTIONS）とそろえてある
export const GOALS = [
  { key: 'second_visit', label: '初めて来たお客様に、2回目も来てもらいたい' },
  { key: 'revive', label: 'しばらく来ていないお客様に、戻ってきてもらいたい' },
  { key: 'frequency', label: '通っているお客様に、もっと定期的に来てもらいたい' },
  { key: 'know', label: 'お客様のことをもっと把握して、接客の質を上げたい' },
  { key: 'time', label: '予約や事務作業を減らして、時間に余裕を作りたい' },
  { key: 'new', label: '新しいお客様を増やしたい' },
  { key: 'numbers', label: '売上やお店の数字を見えるようにしたい' },
];
export const MAX_GOALS = 3;

// key は lib/consultant-journey.js BOTTLENECK_CATEGORIES とそろえてある
export const BURDENS = [
  { key: 'reservation', label: '予約の調整・管理' },
  { key: 'reply', label: 'お客様への連絡・返信' },
  { key: 'shift', label: 'シフト作成・勤怠の集計' },
  { key: 'sales', label: '売上・会計の記録' },
  { key: 'karte', label: 'カルテ・お客様情報の記入' },
];

const pick = (list, key) => list.find(x => x.key === key)?.label || '';

export function normalizeAnswers(raw = {}) {
  const inList = (list, v) => (list.some(x => x.key === v) ? v : null);
  const multi = (list, v, max) => [...new Set((Array.isArray(v) ? v : []).filter(k => list.some(x => x.key === k)))].slice(0, max ?? list.length);
  return {
    business: inList(BUSINESS_TYPES, raw.business),
    businessOther: String(raw.businessOther || '').trim().slice(0, 40),
    staffSize: inList(STAFF_SIZES, raw.staffSize),
    booking: inList(BOOKING_STYLES, raw.booking),
    operations: multi(OPERATIONS, raw.operations),
    goals: multi(GOALS, raw.goals, MAX_GOALS),
    burdens: multi(BURDENS, raw.burdens),
    concern: String(raw.concern || '').trim().slice(0, 300),
  };
}

export function businessLabel(a) {
  return a.business === 'other' ? (a.businessOther || 'その他') : pick(BUSINESS_TYPES, a.business);
}

// 回答 → 機能ごとのおすすめ（on/off と理由）。ここに無い機能は今の設定のまま触らない。
export function recommendFeatures(a) {
  const has = k => a.operations.includes(k);
  const goal = k => a.goals.includes(k);
  const burden = k => a.burdens.includes(k);
  const team = a.staffSize && a.staffSize !== 'solo';
  const out = {};
  const set = (key, on, reason) => { if (FEATURE_DEFS[key]) out[key] = { on, reason }; };

  set('booking_request', true, a.booking === 'instant' ? 'すぐ予約できる時間が無い日でも、希望日時のリクエストを受けられるようにします' : 'お店が確認してから予約を確定できます');
  set('instant_booking', a.booking === 'instant', a.booking === 'instant' ? '空いている時間を選んだらその場で確定する予約の受け方です' : 'お店が確認する受け方なので、今は使いません');
  set('staff_designation', !!team, team ? 'スタッフが複数いるので、指名予約と担当ごとの予約表が使えます' : '1人で運営しているので、今は使いません');
  set('resource_management', has('rooms'), has('rooms') ? '部屋・席の二重予約を防げます' : '部屋を使い分けていないので、今は使いません');
  set('customer_packages', has('tickets') || has('monthly'), has('tickets') ? '回数券の残り回数をお客様ごとに管理できます' : '回数券を販売していないので、今は使いません');
  set('membership_enrollment', has('monthly'), has('monthly') ? '月会費の会員をオンラインで受け付けられます' : '月額会員がいないので、今は使いません');
  set('checkin_qr', has('monthly'), has('monthly') ? '会員の来店を会員証のQRで記録できます' : '通い放題の会員がいないので、今は使いません');
  set('pos', has('retail'), has('retail') ? '商品の会計と在庫をまとめて記録できます' : '物販がないので、今は使いません');
  set('class_management', has('group') || a.business === 'school', has('group') || a.business === 'school' ? 'グループレッスンの開催回と定員を管理できます' : 'グループレッスンがないので、今は使いません');
  set('attendance_confirm', has('group'), has('group') ? 'イベントやレッスンの出欠をLINEで集められます' : 'グループの催しがないので、今は使いません');
  set('shift_management', !!team || burden('shift'), team ? 'スタッフの希望を集めて、シフトを自動で作れます' : '1人で運営しているので、今は使いません');
  set('attendance', !!team, team ? 'お店で登録した端末で出勤・退勤を打刻できます' : '1人で運営しているので、今は使いません');
  set('activity_log', !!team, team ? '誰がいつ何を変えたかを後から確認できます' : '1人で運営しているので、今は使いません');
  set('line_channel', has('line'), has('line') ? 'お店のLINEから予約確認やお知らせを送れます' : 'お店のLINE公式アカウントがないので、今は使いません');
  set('dormant_outreach', true, goal('revive') ? 'しばらく来ていないお客様を見つけて声をかけられます' : 'しばらく来ていないお客様を自動で見つけます');
  set('review_request', true, goal('new') ? '来店後にクチコミをお願いして、新しいお客様につなげます' : '来店後にクチコミをお願いできます');
  set('referral_program', goal('new'), goal('new') ? '今のお客様からの紹介で新しいお客様を増やせます' : '新規集客は目的に入っていないので、今は使いません');
  set('karte_ai', true, goal('know') || burden('karte') ? 'カルテの記録からお客様ごとの傾向をAIがまとめます' : 'カルテの記録からお客様ごとの傾向をAIがまとめます');
  set('posture_analysis', a.business === 'gym' || a.business === 'bodycare', a.business === 'gym' || a.business === 'bodycare' ? '写真から姿勢の変化を記録して、成果を見せられます' : '業態に合わないので、今は使いません');
  set('ai_consultant', true, 'お店の目的に合わせて、今日やることを提案します');
  return out;
}

// 上部のショートカット（最大3つ。lib/dashboard-prefs.js HEADER_SHORTCUT_OPTIONS のキー）
export function recommendShortcuts(a) {
  const list = ['calendar'];
  if (a.goals.includes('second_visit') || a.goals.includes('frequency') || a.goals.includes('know')) list.push('scripts');
  if (a.goals.includes('revive')) list.push('customers');
  if (a.goals.includes('numbers') || a.burdens.includes('sales')) list.push('sales');
  if (a.booking === 'request') list.push('requests');
  list.push('customers', 'sales');
  return [...new Set(list)].slice(0, 3);
}

// AIコンサルに覚えさせる事実（provider_consultant_settings.facts に追記する）
export function onboardingFacts(a) {
  const facts = [];
  if (a.business) facts.push(`業態：${businessLabel(a)}`);
  if (a.staffSize) facts.push(`スタッフ数：${pick(STAFF_SIZES, a.staffSize)}`);
  if (a.booking) facts.push(`予約の受け方：${pick(BOOKING_STYLES, a.booking)}`);
  a.operations.forEach(k => facts.push(`運営：${pick(OPERATIONS, k)}`));
  if (a.burdens.length) facts.push(`時間を取られている作業：${a.burdens.map(k => pick(BURDENS, k)).join('、')}`);
  if (a.concern) facts.push(`いちばん困っていること：${a.concern.slice(0, 120)}`);
  return facts;
}

export function goalNote(a) {
  const lines = a.goals.map(k => pick(GOALS, k));
  if (a.concern) lines.push(`困っていること：${a.concern}`);
  return lines.join('\n');
}

export function answersText(a) {
  return [
    `業態：${businessLabel(a) || '未回答'}`,
    `スタッフ数：${pick(STAFF_SIZES, a.staffSize) || '未回答'}`,
    `予約の受け方：${pick(BOOKING_STYLES, a.booking) || '未回答'}`,
    `運営：${a.operations.map(k => pick(OPERATIONS, k)).join('、') || '特になし'}`,
    `目的：${a.goals.map(k => pick(GOALS, k)).join('、') || '未回答'}`,
    `時間を取られている作業：${a.burdens.map(k => pick(BURDENS, k)).join('、') || '特になし'}`,
    `いちばん困っていること：${a.concern || '（記入なし）'}`,
  ].join('\n');
}

// 最初にやること（最大3つ）。tab は管理画面のタブキー。AIに作文させず、回答から決定的に選ぶ
// （存在しない機能や画面を案内しないため）。
export function firstSteps(a) {
  const team = a.staffSize && a.staffSize !== 'solo';
  const steps = [
    { tab: 'service', title: 'メニューと所要時間を登録する', why: 'お客様が予約できる時間の長さと、売上の記録に使われます' },
    a.booking === 'instant' && { tab: 'slots', title: '営業時間と予約の受け方を決める', why: '予約カレンダーの「予約の受付設定」で、営業時間と、スタッフ・部屋・人数のどれで予約を受けるかを決めると、予約できる時間が自動で計算されます' },
    team && { tab: 'staff', title: 'スタッフを登録する', why: '指名予約・シフト・担当ごとの接客の効果に使われます' },
    (a.operations.includes('tickets') || a.operations.includes('monthly')) && { tab: 'packages', title: '回数券・コースの種類を作る', why: '今のお客様の残り回数を移しておくと、すぐ管理を始められます' },
    a.operations.includes('line') && { tab: 'line-channel', title: 'お店のLINEをつなぐ', why: '予約確認や次回のお知らせが、お店の名前で届くようになります' },
    { tab: 'business-hours', title: '営業時間を設定する', why: '予約を受けられる時間と、公開ページの営業状況に使われます' },
  ].filter(Boolean);
  return steps.slice(0, 3);
}
