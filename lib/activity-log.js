// 操作ログ。店舗ダッシュボードから行われた「追加・変更・削除」を記録する。
// 目的：①トラブル時に誰がいつ何をしたか確認する ②AIコンサルが店舗の操作の傾向から効率化や時期の提案を学ぶ。
// app/api/provider/** の変更系ハンドラは withAudit() で包み、成功した操作だけを残す。
import { getSupabase } from '@/lib/supabase';

const db = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const VERB = { POST: '追加', PUT: '変更', PATCH: '変更', DELETE: '削除' };
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const SENSITIVE_KEY = /token|secret|password|passwd|authorization|api_?key|credential|card|email|mail|phone|tel|line_user|channel/i;

// [パス(:idは数値/UUIDの区間), カテゴリー, 操作対象の名前, 動詞の上書き]
const RULES = [
  [/^reservations\/:id\/assign$/, '予約', '予約の担当'],
  [/^reservations\/manual$/, '予約', '予約（手入力）'],
  [/^calendar/, '予約', '予約カレンダー'],
  [/^slots\/auto-generate$/, '予約', '空き枠', { POST: '自動作成' }],
  [/^slots/, '予約', '空き枠'],
  [/^booking-limits/, '予約', '予約の受付上限'],
  [/^closed-dates/, '予約', '休業日'],
  [/^today-blocks/, '予約', '今日の予約ブロック'],
  [/^staff-blocks/, '予約', 'スタッフの予約不可枠'],
  [/^classes\/:id\/enrollments\/:id\/progressions/, '予約', 'クラスの進捗'],
  [/^classes\/:id\/enrollments/, '予約', 'クラスの受講登録'],
  [/^classes\/:id\/sessions\/:id\/attendees/, '予約', 'クラスの出席'],
  [/^classes\/:id\/sessions/, '予約', 'クラスの開催枠'],
  [/^classes/, '予約', 'クラス'],
  [/^events/, '予約', '出欠確認'],
  [/^checkins/, '顧客', 'チェックイン'],
  [/^customer-packages\/:id\/usages/, '顧客', '回数券の消化'],
  [/^customer-packages/, '顧客', '回数券の発行'],
  [/^packages/, '顧客', '回数券メニュー'],
  [/^customers\/manual\/:id\/link/, '顧客', '会員との紐付け'],
  [/^customers\/(manual\/:id|:id)\/karte-entries/, '顧客', 'カルテ記録'],
  [/^customers\/(manual\/:id|:id)\/health-advice-entries/, '顧客', '健康アドバイス記録'],
  [/^customers\/(manual\/:id|:id)\/posture-entries/, '顧客', '姿勢記録'],
  [/^customers\/:id\/note/, '顧客', '顧客メモ'],
  [/^customers\/:id\/locker/, '顧客', 'ロッカー契約'],
  [/^customers\/:id\/nudge/, '顧客', '顧客への声かけ', { POST: '送信' }],
  [/^customers\/broadcast-email/, '顧客', '一斉メール', { POST: '送信' }],
  [/^customers\/manual/, '顧客', '非会員の顧客'],
  [/^customers/, '顧客', '顧客'],
  [/^karte-fields/, '顧客', 'カルテ項目'],
  [/^locker-banks/, '顧客', 'ロッカー配置'],
  [/^lockers/, '顧客', 'ロッカー'],
  [/^memberships\/:id\/approve/, '顧客', '入会手続き', { POST: '承認', PATCH: '承認' }],
  [/^memberships\/:id\/reject/, '顧客', '入会手続き', { POST: 'お断り', PATCH: 'お断り' }],
  [/^memberships/, '顧客', '入会手続き'],
  [/^membership-plans/, '顧客', '会員プラン'],
  [/^membership-settings/, '顧客', '入会設定'],
  [/^recommended-frequencies/, '顧客', '推奨来店周期'],
  [/^dormant-settings/, '顧客', '休眠判定の設定'],
  [/^deposit-settings/, '顧客', '預り金の設定'],
  [/^pos\/checkout/, '売上', 'POS会計', { POST: '実行' }],
  [/^pos\/online-checkout/, '売上', 'オンライン決済'],
  [/^products/, '売上', '商品・在庫'],
  [/^sales-entries/, '売上', '売上記録'],
  [/^ltv-cac-settings/, '売上', 'LTV/CACの設定'],
  [/^profile/, '店舗設定', '店舗プロフィール'],
  [/^business-hours/, '店舗設定', '営業時間'],
  [/^services/, '店舗設定', 'サービス（メニュー）'],
  [/^experience-menus/, '店舗設定', '体験メニュー'],
  [/^resources/, '店舗設定', '部屋・設備'],
  [/^stories/, '店舗設定', '体験談'],
  [/^cases/, '店舗設定', '事例'],
  [/^appeal-blocks/, '店舗設定', 'アピール欄'],
  [/^page-theme/, '店舗設定', 'ページデザイン'],
  [/^features/, '店舗設定', '機能設定'],
  [/^staff/, 'スタッフ・シフト', 'スタッフ'],
  [/^shift-/, 'スタッフ・シフト', 'シフト'],
  [/^line-/, 'アカウント', 'LINE連携'],
  [/^referral|^sales-partner/, '集客', '紹介・営業パートナー'],
  [/^customer-scripts/, '集客', '営業台本'],
  [/^inquiry/, 'アカウント', '運営への問い合わせ', { POST: '送信' }],
];

// 記録しない（AIコンサルの会話など、別の履歴を持つ・操作ではないもの）
const SKIP = /^(consultant\/|upload-|events\/upload-image|analyze|dashboard-prefs|line-callback|customers\/:id\/karte-insight)/;

const RESERVATION_ACTION = {
  approved: '承認', approve: '承認', rejected: 'お断り', cancel_provider: 'お断り',
  counter_proposed: '代替日時の提案', visited: '来店確認',
};

export function normalizePath(pathname) {
  return pathname
    .replace(/^\/api\//, '')
    .split('/')
    .map(seg => (UUID_RE.test(seg) || /^\d+$/.test(seg) ? ':id' : seg))
    .join('/');
}

export function describeRoute(method, key, body) {
  if (key === 'reservations/:id') {
    const verb = RESERVATION_ACTION[body?.action] || RESERVATION_ACTION[body?.status] || '更新';
    return { category: '予約', label: `予約を${verb}` };
  }
  if (key === 'reservations/:id/change-package') return { category: '予約', label: '予約の回数券を変更' };
  const rel = key.replace(/^provider\//, '');
  for (const [re, category, noun, verbs] of RULES) {
    if (re.test(rel)) return { category, label: `${noun}を${verbs?.[method] || VERB[method] || '操作'}` };
  }
  return { category: 'その他', label: `${rel}を${VERB[method] || '操作'}` };
}

// 値は短く、秘密や連絡先らしいキーは残さない
export function sanitizeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const out = {};
  for (const [k, v] of Object.entries(body).slice(0, 25)) {
    if (SENSITIVE_KEY.test(k)) continue;
    if (v == null || typeof v === 'boolean' || typeof v === 'number') out[k] = v;
    else if (typeof v === 'string') out[k] = v.length > 80 ? `${v.slice(0, 80)}…` : v;
    else if (Array.isArray(v)) out[k] = `[${v.length}件]`;
  }
  return Object.keys(out).length ? out : null;
}

function summaryOf(label, detail) {
  const name = detail && (detail.title || detail.name || detail.menu_name || detail.label || detail.product_name);
  return name ? `${label}：${String(name).slice(0, 40)}` : label;
}

const providerCache = new Map();
async function providerIdFromToken(token) {
  const hit = providerCache.get(token);
  if (hit && hit.exp > Date.now()) return hit.id;
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return null;
  const { data } = await db.from('providers').select('id').eq('email', user.email).maybeSingle();
  const id = data?.id || null;
  if (providerCache.size > 500) providerCache.clear();
  providerCache.set(token, { id, exp: Date.now() + 60000 });
  return id;
}

async function record(request, ctx, body) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return;
  const key = normalizePath(new URL(request.url).pathname);
  if (SKIP.test(key.replace(/^provider\//, ''))) return;
  const providerId = await providerIdFromToken(token);
  if (!providerId) return;
  const { category, label } = describeRoute(request.method, key, body);
  const detail = sanitizeBody(body);
  const params = ctx?.params || {};
  const targetId = params.id || params.user_id || null;
  let operator = null;
  try { operator = decodeURIComponent(request.headers.get('x-fineme-operator') || '').trim().slice(0, 40) || null; } catch {}
  await db.from('provider_activity_logs').insert({
    provider_id: providerId,
    operator_name: operator,
    method: request.method,
    route_key: key,
    category,
    action_label: label,
    target_id: targetId ? String(targetId).slice(0, 80) : null,
    summary: summaryOf(label, detail),
    detail,
  });
}

// 成功した変更系リクエストだけを残す。記録に失敗しても本来の処理には影響させない
export function withAudit(handler) {
  return async function audited(request, ctx) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return handler(request, ctx);
    let body = null;
    try {
      if ((request.headers.get('content-type') || '').includes('application/json')) body = await request.clone().json();
    } catch {}
    const res = await handler(request, ctx);
    if (res && res.status >= 200 && res.status < 300) {
      try {
        await Promise.race([record(request, ctx, body), new Promise(r => setTimeout(r, 2000))]);
      } catch (e) {
        console.error('activity log failed:', e?.message);
      }
    }
    return res;
  };
}

const jstParts = iso => {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours(), wd: d.getUTCDay() };
};
const WD = ['日', '月', '火', '水', '木', '金', '土'];

// AIコンサルに渡す、店舗の操作の傾向（直近30日）
export async function activityInsight(supabase, providerId) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await supabase.from('provider_activity_logs')
    .select('occurred_at, category, action_label, operator_name')
    .eq('provider_id', providerId).gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(4000);
  const rows = data || [];
  if (rows.length < 5) return '';

  const tally = (arr, f) => { const m = {}; arr.forEach(r => { const k = f(r); if (k != null) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const byCat = tally(rows, r => r.category).slice(0, 5).map(([k, n]) => `${k}${n}件`).join('、');
  const byAct = tally(rows, r => r.action_label).slice(0, 6).map(([k, n]) => `${k}${n}件`).join('、');

  const parts = rows.map(r => jstParts(r.occurred_at));
  const hours = tally(parts, p => p.hour).slice(0, 3).map(([h, n]) => `${h}時台(${Math.round((n / rows.length) * 100)}%)`).join('、');
  const wds = tally(parts, p => WD[p.wd]).slice(0, 2).map(([w, n]) => `${w}曜(${n}件)`).join('、');

  // 同じ種類の操作が1日に何度も繰り返されている＝手作業が続いている候補
  const perDay = {};
  rows.forEach((r, i) => { const k = `${r.action_label}|${parts[i].day}`; perDay[k] = (perDay[k] || 0) + 1; });
  const repeat = {};
  Object.entries(perDay).forEach(([k, n]) => { const a = k.split('|')[0]; (repeat[a] ||= []).push(n); });
  const repeated = Object.entries(repeat)
    .map(([a, ns]) => ({ a, days: ns.length, avg: ns.reduce((s, n) => s + n, 0) / ns.length }))
    .filter(x => x.days >= 3 && x.avg >= 4)
    .sort((x, y) => y.avg * y.days - x.avg * x.days).slice(0, 3)
    .map(x => `${x.a}（${x.days}日で、1日平均${x.avg.toFixed(1)}回）`).join('、');

  const named = rows.filter(r => r.operator_name);
  const ops = named.length >= 5 ? tally(named, r => r.operator_name).slice(0, 4).map(([k, n]) => `${k}${n}件`).join('、') : '';

  return `【店舗の操作の記録（Fineme上の追加・変更・削除、直近30日、計${rows.length}件）】
- 多い分野：${byCat}
- 多い操作：${byAct}
- 操作が多い時間帯（日本時間）：${hours} / 多い曜日：${wds}${repeated ? `\n- 同じ操作の繰り返しが続いている：${repeated}（まとめて処理できる・自動化できる余地の候補）` : ''}${ops ? `\n- 操作した人：${ops}` : ''}
これは Fineme の画面での操作だけです。店舗の仕事全体ではありません。この傾向から、忙しい時間を避けたタスクの時間帯、繰り返し作業の効率化、使われていない機能を見立てに生かしてください。`;
}
