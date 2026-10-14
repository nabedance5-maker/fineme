// New Me Log のLINEリマインドに付けるボタン（カルーセルの1カラム＝記録1件）を組み立てる。
//
// でお指摘 2026-10-14：「行った」を記録するボタンしか無い通知は使えない。記録されていない
// ＝まだ行っていない可能性が高いのだから、通知は「行ってもらう」ためのものでないと意味がない。
//
// 通知1件が担う役割：
//   お客様側の面倒  … 予約ページを探す・前回のメニューと担当を思い出す・入力し直す
//                     → ワンタップで「前回と同じメニュー・担当」が選ばれた予約画面に着く
//   店舗側の課題    … 一度来たお客様が戻らない（リピートが店舗SaaSの存在意義）
//                     → ちょうど良い時期に、予約の一歩手前まで連れて行く
//   通知の持続性    … 今は行けない人に毎回同じ催促が届くとブロックされて全部終わる
//                     → 「1週間後にまた」で静かにできる逃げ道を必ず置く
//
// LINEのカルーセルは全カラムのアクション数が揃っていないと送信自体が400で失敗するため、
// どの記録でも必ず3つ（予約／記録／あとで）にする。
import { resolveAxis } from './log-axes';
import { hasFeature } from './feature-flags';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fineme.me').replace(/\/$/, '');
export const SNOOZE_DAYS = 7;

function isHttpUrl(u) {
  return typeof u === 'string' && /^https?:\/\/\S+$/i.test(u) && u.length <= 1000;
}

// LINEのトーク内ブラウザはSafari等とログイン状態が別なので、自サイトのページは
// いつものブラウザで開かせる（ログイン済みなら名前・連絡先の入力が要らない）。
function siteUrl(path, params = {}) {
  const u = new URL(SITE + path);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  u.searchParams.set('openExternalBrowser', '1');
  return u.toString();
}

/**
 * 通知の「予約する／買い足す」ボタンの行き先を決める。
 * @param {object} log       user_service_logs の行（kind/diff 付き）
 * @param {object|null} provider  providers の行（id, slug, entity_type, booking_url, affiliate_url, enabled_features, plan）
 * @param {object|null} lastMenu  前回の予約 { serviceId, serviceName, staffId, staffName }
 * @returns {{ label: string, uri: string }}
 */
export function rebookTarget(log, provider, lastMenu) {
  const isPurchase = log.entry_type === 'purchase';

  // 予約済みで、その日がまだ来ていない → 新しく予約させず、今の予約を確認させる
  if (log.kind === 'reminder' && log.diff >= 0 && provider && provider.entity_type !== 'affiliate') {
    return { label: '予約を確認する', uri: siteUrl('/my-reservations') };
  }

  if (provider && provider.entity_type !== 'affiliate') {
    const b = storeBookingAction(provider, lastMenu, 'log_reminder');
    if (b) return b;
  }
  if (provider?.entity_type === 'affiliate') {
    return { label: isPurchase ? '購入ページを開く' : '予約ページを開く', uri: siteUrl(`/affiliate/${encodeURIComponent(provider.slug)}`) };
  }

  // 店舗がFinemeに無くても、本人が登録した予約・購入ページがあればそこへ
  if (isHttpUrl(log.action_url)) {
    return { label: isPurchase ? '購入ページを開く' : '予約ページを開く', uri: log.action_url };
  }

  // 行き先がまだ無い：一度登録すれば次回からワンタップになる
  if (provider) {
    return { label: 'お店のページを見る', uri: siteUrl(`/provider/${encodeURIComponent(provider.slug)}`, { tab: 'basic' }) };
  }
  return {
    label: isPurchase ? '購入先を登録する' : '予約先を登録する',
    uri: siteUrl('/mypage/log', { edit: log.id, focus: 'action_url' }),
  };
}

/**
 * 店舗の予約画面（Finemeで予約を受けていればそこ、外部予約ページがあればそこ）へのボタン。
 * 予約の手段が何も無い店舗は null。店舗が送る声かけ・誕生日メッセージ等でも共通で使う。
 */
export function storeBookingAction(provider, lastMenu, src) {
  if (!provider || provider.entity_type === 'affiliate') return null;
  const canBook = hasFeature(provider, 'instant_booking') || hasFeature(provider, 'booking_request');
  if (canBook) {
    return {
      label: lastMenu?.serviceId || lastMenu?.staffId ? '前回と同じで予約' : '予約する',
      uri: siteUrl(`/provider/${encodeURIComponent(provider.slug)}`, {
        tab: 'consult',
        service_id: lastMenu?.serviceId,
        staff_id: lastMenu?.staffId,
        menu_name: !lastMenu?.serviceId ? lastMenu?.serviceName : null,
        src,
      }),
    };
  }
  if (isHttpUrl(provider.booking_url)) return { label: '予約ページを開く', uri: provider.booking_url };
  return null;
}

/** そのお客様のその店舗での直近の予約（来店済み・確定）＝「前回のメニュー・担当」 */
export async function fetchLastMenu(db, providerId, userId) {
  if (!providerId || !userId) return null;
  const { data: r } = await db
    .from('reservations')
    .select('service_id, service_name, staff_id')
    .eq('provider_id', providerId)
    .eq('user_id', userId)
    .in('status', ['visited', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!r) return null;
  let staffName = null;
  if (r.staff_id) {
    const { data: st } = await db.from('provider_staff').select('name').eq('id', r.staff_id).maybeSingle();
    staffName = st?.name || null;
  }
  return { serviceId: r.service_id || null, serviceName: r.service_name || null, staffId: r.staff_id || null, staffName };
}

/** 「前回：メニュー・担当 名前」の一文（無ければ null） */
export function lastMenuLine(lastMenu) {
  const parts = [lastMenu?.serviceName, lastMenu?.staffName ? `担当 ${lastMenu.staffName}` : null].filter(Boolean);
  return parts.length ? `前回：${parts.join('・')}` : null;
}

function statusText(log) {
  const isPurchase = log.entry_type === 'purchase';
  if (log.kind === 'reminder') {
    if (log.diff < 0) return `予定日から${-log.diff}日過ぎています`;
    if (log.diff === 0) return '本日が予定日です';
    if (log.diff === 1) return '明日が予定日です';
    return `${log.diff}日後が予定日です`;
  }
  if (log.diff < 0) return `目安から${-log.diff}日過ぎています`;
  return isPurchase ? 'そろそろ買い足しの頃です' : 'そろそろの時期です';
}

/**
 * @param {object[]} logs
 * @param {string} todayStr  YYYY-MM-DD（JST）
 * @param {{ providerBySlug?: object, lastMenuByLogId?: object }} ctx
 */
export function buildLogColumns(logs, todayStr, ctx = {}) {
  const providerBySlug = ctx.providerBySlug || {};
  const lastMenuByLogId = ctx.lastMenuByLogId || {};
  return logs.slice(0, 10).map(l => {
    const def = resolveAxis(l.axis, l.custom_icon);
    const isPurchase = l.entry_type === 'purchase';
    const provider = l.provider_slug ? providerBySlug[l.provider_slug] || null : null;
    const lastMenu = lastMenuByLogId[l.id] || null;
    const target = rebookTarget(l, provider, lastMenu);

    // 「前回どのメニューで誰だったか」を思い出させるのもお客様の手間を減らす一部
    const text = [statusText(l), lastMenuLine(lastMenu)].filter(Boolean).join('\n');

    return {
      title: `${def.icon} ${l.name}`.slice(0, 40),
      text: text.slice(0, 60),
      actions: [
        { type: 'uri', label: target.label, uri: target.uri },
        {
          type: 'datetimepicker', label: isPurchase ? '買った日を記録' : '行った日を記録',
          data: `action=log_visit_pick&lid=${l.id}`, mode: 'date', initial: todayStr, max: todayStr,
        },
        {
          type: 'postback', label: `${SNOOZE_DAYS}日後にまた`,
          data: `action=log_snooze&lid=${l.id}`, displayText: `${l.name}は${SNOOZE_DAYS}日後にまた教えて`,
        },
      ],
    };
  });
}
