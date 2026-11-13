// AI専属コンサルに渡す「このお店ならでは」の材料（2026-11-13 渡邉指摘：今日やることが、どのお店でも当てはまる
// 当たり前なことばかり。このお店が目標に近づく・もっとリピートしてもらう道筋を立てて実行したい）。
// 実データから、リピートの流れ（初回→2回目）・メニュー別／担当別の2回目に来る率・次回予約を取れている率・来店の間隔・
// キャンセル率・売っているもの（メニュー・回数券・会員プラン）・Finemeのどの道具を使っている／使っていないか、を作る。
// お客様の名前は含めない（無料のAIにも渡すため）。
const DAY = 86400000;
const jst = () => new Date(Date.now() + 9 * 3600000);
const ymd = d => d.toISOString().slice(0, 10);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const median = arr => { if (!arr.length) return null; const s = [...arr].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

export async function deepStoreAnalysis(db, provider) {
  const pid = provider.id;
  const today = ymd(jst());
  const since = ymd(new Date(jst().getTime() - 365 * DAY));
  const d90 = ymd(new Date(jst().getTime() - 90 * DAY));
  const d30 = new Date(Date.now() - 30 * DAY).toISOString();
  const [resRes, svcRes, staffRes, pkgRes, planRes, memRes, bcRes, karteRes, reviewRes] = await Promise.all([
    db.from('reservations').select('user_id, status, reserved_date, confirmed_date, service_id, staff_id, created_at, class_id').eq('provider_id', pid).gte('reserved_date', since).limit(20000),
    db.from('provider_services').select('id, name, price, duration_minutes, is_trial, ticket_only').eq('provider_id', pid).order('sort_order').limit(60),
    db.from('provider_staff').select('id, name, role').eq('provider_id', pid).limit(40),
    db.from('service_packages').select('name, price, total_sessions, package_type, active').eq('provider_id', pid).eq('active', true).limit(30),
    db.from('provider_membership_plans').select('name, monthly_price, active').eq('provider_id', pid).limit(20),
    db.from('provider_memberships').select('status').eq('provider_id', pid).in('status', ['active', 'pending_approval']).limit(5000),
    db.from('provider_broadcasts').select('id', { count: 'exact', head: true }).eq('provider_id', pid).gte('created_at', d30),
    db.from('provider_karte_entries').select('id', { count: 'exact', head: true }).eq('provider_id', pid).gte('created_at', d30),
    db.from('reservations').select('id', { count: 'exact', head: true }).eq('provider_id', pid).eq('google_review_reminder_sent', true).gte('reserved_date', d30.slice(0, 10)),
  ]);
  const svcName = Object.fromEntries((svcRes.data || []).map(s => [s.id, s.name]));
  const staffName = Object.fromEntries((staffRes.data || []).map(s => [s.id, s.name]));
  const rows = (resRes.data || []).filter(r => r.user_id && !r.class_id).map(r => ({ ...r, date: r.confirmed_date || r.reserved_date }));

  // 来店（visited）をお客様ごとに日付順に並べる
  const visits = {};
  rows.filter(r => r.status === 'visited').forEach(r => { (visits[r.user_id] ||= []).push(r); });
  Object.values(visits).forEach(v => v.sort((a, b) => a.date.localeCompare(b.date)));

  // 初回→2回目（初回から90日たった方だけで率を出す。まだ90日たっていない方は「待っている」）
  const firsts = Object.values(visits).map(v => v[0]).filter(f => f.date >= since);
  const matured = firsts.filter(f => f.date <= ymd(new Date(jst().getTime() - 90 * DAY)));
  const second = f => { const v = visits[f.user_id]; return v[1] && (new Date(v[1].date) - new Date(f.date)) / DAY <= 90 ? v[1] : null; };
  const conv = matured.filter(second).length;
  const daysTo2nd = firsts.map(f => { const s = visits[f.user_id][1]; return s ? Math.round((new Date(s.date) - new Date(f.date)) / DAY) : null; }).filter(x => x != null && x > 0);
  const groupConv = key => {
    const g = {};
    matured.forEach(f => { const k = f[key]; if (!k) return; const e = g[k] || (g[k] = { n: 0, c: 0 }); e.n++; if (second(f)) e.c++; });
    return Object.entries(g).filter(([, e]) => e.n >= 3).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  };
  const byMenu = groupConv('service_id').map(([k, e]) => `${svcName[k] || 'メニュー不明'}：${e.n}人中${e.c}人（${pct(e.c, e.n)}%）`);
  const byStaff = groupConv('staff_id').map(([k, e]) => `${staffName[k] || '担当不明'}：${e.n}人中${e.c}人（${pct(e.c, e.n)}%）`);

  // 来店の日に次の予約が入ったか（その日〜翌日に作られた、それより先の予約）
  const allByUser = {};
  rows.forEach(r => { (allByUser[r.user_id] ||= []).push(r); });
  const recentVisits = rows.filter(r => r.status === 'visited' && r.date >= d90);
  const rebooked = recentVisits.filter(v => (allByUser[v.user_id] || []).some(o => o.date > v.date && o.created_at && o.created_at.slice(0, 10) >= v.date && o.created_at.slice(0, 10) <= ymd(new Date(new Date(v.date).getTime() + DAY)))).length;

  // 常連（3回以上）の来店の間隔
  const gaps = Object.values(visits).filter(v => v.length >= 3).flatMap(v => v.slice(1).map((x, i) => Math.round((new Date(x.date) - new Date(v[i].date)) / DAY))).filter(g => g > 0);

  const r90 = rows.filter(r => r.date >= d90 && r.date <= today);
  const cancelled = r90.filter(r => ['cancelled', 'rejected'].includes(r.status)).length;
  const noShow = r90.filter(r => r.status === 'no_show').length;
  const visited90 = r90.filter(r => r.status === 'visited');
  const newVisits90 = visited90.filter(r => visits[r.user_id]?.[0] === r).length;

  const ef = provider.enabled_features || {};
  const on = k => ef[k] === true;
  const lines = [
    '【このお店のリピートの流れ（Finemeの予約と来店記録から。直近1年）】',
    firsts.length
      ? `- 初回のお客様 ${firsts.length}人。うち初回から90日たった ${matured.length}人のうち、90日以内に2回目に来たのは ${conv}人（${pct(conv, matured.length) ?? '—'}%）。2回目までの日数の真ん中 ${median(daysTo2nd) ?? '—'}日`
      : '- 来店記録がまだ少なく、リピートの流れは計算できません（来店確認を続けると見えてきます）',
    byMenu.length ? `- 初回のメニュー別の2回目に来た率：${byMenu.join('／')}` : '',
    byStaff.length ? `- 初回の担当別の2回目に来た率：${byStaff.join('／')}` : '',
    recentVisits.length ? `- 直近90日の来店 ${recentVisits.length}件のうち、その日のうちに次の予約が入ったのは ${rebooked}件（${pct(rebooked, recentVisits.length)}%）` : '',
    gaps.length ? `- 3回以上来ている方の来店の間隔の真ん中 ${median(gaps)}日` : '',
    r90.length ? `- 直近90日：来店 ${visited90.length}件（うち初めての方 ${newVisits90}件）、キャンセル ${cancelled}件（${pct(cancelled, r90.length)}%）、無断キャンセル ${noShow}件` : '',
    '【売っているもの】',
    `- メニュー：${(svcRes.data || []).slice(0, 15).map(s => `${s.name}${s.price ? ` ${Number(s.price).toLocaleString()}円` : ''}${s.duration_minutes ? `・${s.duration_minutes}分` : ''}${s.is_trial ? '（体験）' : ''}${s.ticket_only ? '（チケット専用）' : ''}`).join('、') || 'なし'}`,
    `- 回数券・チケット：${(pkgRes.data || []).map(p => `${p.name}${p.price ? ` ${Number(p.price).toLocaleString()}円` : ''}${p.total_sessions ? `・${p.total_sessions}回` : ''}`).join('、') || 'なし'}`,
    `- 月額の会員プラン：${(planRes.data || []).filter(p => p.active !== false).map(p => `${p.name} ${Number(p.monthly_price || 0).toLocaleString()}円/月`).join('、') || 'なし'}（入会中・承認待ち ${(memRes.data || []).length}人）`,
    '【Finemeの道具を、このお店がどれだけ使っているか（直近30日）】',
    `- 一斉配信 ${bcRes.count ?? 0}回 / カルテ記入 ${karteRes.count ?? 0}件${reviewRes.count != null ? ` / クチコミのお願い ${reviewRes.count}件` : ''}`,
    `- 使える機能：${[on('instant_booking') && '即時予約', on('booking_request') && '予約リクエスト', on('customer_packages') && '回数券', on('membership_enrollment') && '月額の会員プラン', on('line_channel') && 'お店のLINE', on('review_request') && 'クチコミのお願い', on('dormant_outreach') && '休眠の声かけ', on('pos') && 'POSレジ', on('shift_management') && 'シフト', on('referral_program') && '紹介'].filter(Boolean).join('・') || '（不明）'}`,
  ].filter(Boolean);
  return lines.join('\n');
}

// Finemeでお店ができること（リピートに効く道具）。AIが「このお店のこの数字には、この道具で、この手を打つ」と結びつけるための一覧
export const FINEME_TOOLKIT = `【Finemeでできること（打ち手に使える道具。画面のキー）】
- 接客メモと会計時の次回の一言（scripts）：今日来るお客様ごとに、前回の内容・次回の提案を出す。来店の日に次の予約を取る率を上げる道具
- 予約カレンダー（calendar）：会計の場で次回の予約をその場で入れる
- 来店の設定（visit-settings）：メニューごとの来店の目安・休眠の日数。目安を過ぎたお客様に自動のリマインドが行く
- 顧客管理（customers）：段階・最終来店・回数券の残り。1人ずつの声かけ・カルテ
- 一斉配信（broadcast-email）：段階や条件で絞って、LINE・メールを日時指定で送る。届いた・開いた・押した人数が分かる
- AIコンサルの声かけ送信：段階のお客様全員へ、名前入りの文面を送り、その後に予約が入った人数を数える
- 回数券（packages）・月額の会員プラン：通う理由を前払いで作る。2回目以降の来店を約束にする道具
- クチコミのお願い（reviews）：来店後に自動でお願いを送る
- POSレジ（pos）：会計・回数券の販売・登録済みのカードで支払い
- シフト（shift）：人が足りない時間を作らない・予約を受けられる時間を増やす`;
