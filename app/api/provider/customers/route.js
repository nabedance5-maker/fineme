// GET /api/provider/customers → New Me Logを自店舗に紐づけている顧客の一覧（認証済み）
// ユーザー自身の想定タイミング超過／店舗推奨周期超過のセグメント判定、店舗専用メモ・
// 担当スタッフ割当・来店回数・Mirror/Me Scanの実施状況・休眠ステータスも合わせて返す
// （店舗SaaS実装仕様書 SAAS-001〜SAAS-004, SAAS-008, SAAS-012）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { idealNextDate, daysUntilIdeal } from '@/lib/log-axes';
import { ensureCustomerNumbers } from '@/lib/customer-numbers';
import { withPlanPreview } from '@/lib/feature-flags';
import { isOwnerTestEmail } from '@/lib/is-owner-email';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug, plan').eq('email', user.email).single();
  return data ? { ...data, isOwner: isOwnerTestEmail(user.email) } : null;
}

// ライトプラン（A）はNew Me Log連携の「表示」を先着30人までに制限する
// （でお決定 2026-08-28）。連携自体・本人へのリマインド等は制限しない。
// パッケージ機能の顧客選択など内部用途は scope=all でこの制限を無視する。
const LIGHT_PLAN_VISIBLE_LIMIT = 30;

// 店舗が設定した推奨周期に基づく「目安日」を、ユーザー自身の頻度は無視して計算する
// （lib/log-axes.js の idealNextDate はログ自身の frequency_weeks/months を見るため、
//  店舗推奨だけを見せるログを一時的に組み立てて同じロジックに通す）
function storeIdealNextDate(log, recommended) {
  const rec = recommended[log.axis];
  if (!rec || !log.last_visit) return null;
  return idealNextDate({ ...log, frequency_weeks: rec.frequency_weeks, frequency_months: rec.frequency_months });
}
function storeDaysUntilIdeal(log, recommended) {
  const ideal = storeIdealNextDate(log, recommended);
  if (!ideal) return null;
  return Math.round((new Date(ideal) - new Date()) / 86400000);
}

// 絶対的な未来店日数から active/dormant を判定する（店舗ごとのしきい値・SAAS-012）。
// ユーザー想定/店舗推奨の「そろそろ」判定（相対的）とは別の軸。
// 来店記録が一度も無いログは、登録からの経過日数で判定する。
function computeStatus(log, noVisitDays) {
  const base = log.last_visit || log.created_at;
  if (!base) return 'active';
  const daysSince = Math.floor((Date.now() - new Date(base).getTime()) / 86400000);
  if (daysSince >= noVisitDays * 2) return 'churned';
  if (daysSince >= noVisitDays) return 'dormant';
  return 'active';
}

// New Me Log以外でこの店舗とつながっている会員（予約・オンライン入会・回数券・カルテ・基本情報）
async function loadNonLogCustomers(provider, logUserIds) {
  const [res, mem, pkg, kar, prof] = await Promise.all([
    supabase.from('reservations').select('user_id, user_name, status, reserved_date, confirmed_date, created_at').eq('provider_id', provider.id).not('user_id', 'is', null).limit(5000),
    supabase.from('provider_memberships').select('user_id, last_name, first_name, phone, created_at, status').eq('provider_id', provider.id).neq('status', 'draft'),
    supabase.from('customer_packages').select('user_id, created_at').eq('provider_id', provider.id).not('user_id', 'is', null),
    supabase.from('provider_karte_entries').select('user_id, created_at').eq('provider_id', provider.id).not('user_id', 'is', null).limit(5000),
    supabase.from('provider_customer_profiles').select('user_id, created_at').eq('provider_id', provider.id).not('user_id', 'is', null),
  ]);
  const by = {};
  const phones = {};
  const touch = (uid, at, name) => {
    if (!uid || logUserIds.has(uid)) return;
    const r = by[uid] || (by[uid] = { user_id: uid, created_at: at, customer_name: name || null, last_visit: null, visitCount: 0 });
    if (at && at < r.created_at) r.created_at = at;
    if (!r.customer_name && name) r.customer_name = name;
  };
  (res.data || []).forEach(x => {
    touch(x.user_id, x.created_at, x.user_name);
    const r = by[x.user_id];
    if (r && x.status === 'visited') {
      r.visitCount++;
      const d = x.confirmed_date || x.reserved_date;
      if (d && (!r.last_visit || d > r.last_visit)) r.last_visit = d;
    }
  });
  (mem.data || []).forEach(x => { touch(x.user_id, x.created_at, [x.last_name, x.first_name].filter(Boolean).join(' ')); if (x.phone) phones[x.user_id] = x.phone; });
  (pkg.data || []).forEach(x => touch(x.user_id, x.created_at));
  (kar.data || []).forEach(x => touch(x.user_id, x.created_at));
  (prof.data || []).forEach(x => touch(x.user_id, x.created_at));
  const rows = Object.values(by).map(r => ({
    id: `nolog-${r.user_id}`, user_id: r.user_id, axis: null, name: null, last_visit: r.last_visit, next_visit: null,
    frequency_weeks: null, frequency_months: null, cost: null, created_at: r.created_at,
    customer_name: r.customer_name, visitCount: r.visitCount, no_log: true,
  }));
  return { rows, phones };
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider?.slug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: logs, error } = await supabase
    .from('user_service_logs')
    .select('id, user_id, axis, name, last_visit, next_visit, frequency_weeks, frequency_months, cost, created_at')
    .eq('provider_slug', provider.slug)
    .eq('active', true)
    .order('next_visit', { ascending: true, nullsFirst: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  const extras = await loadNonLogCustomers(provider, new Set((logs || []).map(l => l.user_id)));
  if (!logs?.length && !extras.rows.length) return Response.json([]);

  // 会員番号は連携した順（最初のログ作成日）に採番する
  const firstSeen = {};
  logs.forEach(l => {
    if (!l.user_id) return;
    const t = new Date(l.created_at).getTime();
    if (firstSeen[l.user_id] === undefined || t < firstSeen[l.user_id]) firstSeen[l.user_id] = t;
  });
  extras.rows.forEach(r => { firstSeen[r.user_id] = new Date(r.created_at).getTime(); });
  const userIds = Object.keys(firstSeen).sort((a, b) => firstSeen[a] - firstSeen[b]);
  const logUserIds = new Set(logs.map(l => l.user_id));
  const logIds = logs.map(l => l.id);
  if (!logIds.length) logIds.push('00000000-0000-0000-0000-000000000000');

  const [
    { data: profiles },
    { data: recFreqRows },
    { data: notes },
    { data: dormantSettings },
    { data: staffRows },
    { data: visitRows },
    { data: diagnosisRows },
    { data: profileRows },
    { data: mirrorRows },
    { data: lineLinkRows },
    { data: pkgRows },
    { data: memRows },
    { data: futureRows },
  ] = await Promise.all([
    supabase.from('profiles').select('id, display_name, line_user_id, birthday').in('id', userIds),
    supabase.from('provider_recommended_frequencies').select('axis, frequency_weeks, frequency_months').eq('provider_id', provider.id),
    supabase.from('provider_customer_notes').select('user_id, note, assigned_staff_id').eq('provider_id', provider.id).in('user_id', userIds),
    supabase.from('provider_dormant_settings').select('no_visit_days').eq('provider_id', provider.id).maybeSingle(),
    supabase.from('provider_staff').select('id, name').eq('provider_id', provider.id),
    supabase.from('user_service_log_visits').select('log_id').in('log_id', logIds),
    supabase.from('diagnosis_results').select('user_id, result').in('user_id', userIds),
    supabase.from('provider_customer_profiles').select('user_id, phone, last_name, first_name, gender, birthday').eq('provider_id', provider.id).in('user_id', userIds),
    // report_content全体は大きいので、一覧に使う2項目だけ取り出す（でお報告 2026-10-16：一覧の表示が遅い）
    supabase.from('mirror_sessions')
      .select('user_id, created_at, visual_score:report_content->visual_score, visual_tier:report_content->>visual_tier')
      .in('user_id', userIds)
      .eq('paid', true)
      .not('report_content', 'is', null)
      .order('created_at', { ascending: false }),
    // 顧客一覧の絞り込み用（でお要望 2026-10-17：LINE連携中・回数券・会員プラン・次回予約など）
    supabase.from('provider_customer_line_links').select('user_id').eq('provider_id', provider.id).in('user_id', userIds),
    supabase.from('customer_packages').select('id, user_id, total_sessions, expires_at, package_type, subscription_status').eq('provider_id', provider.id).in('user_id', userIds),
    supabase.from('provider_memberships').select('user_id, status').eq('provider_id', provider.id).eq('status', 'active').in('user_id', userIds),
    supabase.from('reservations').select('user_id, reserved_date, confirmed_date').eq('provider_id', provider.id).in('status', ['pending', 'approved', 'counter_proposed']).in('user_id', userIds).gte('reserved_date', new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10)),
  ]);

  let numberMap = {};
  try { numberMap = (await ensureCustomerNumbers(supabase, provider.id, { userIds })).user; } catch { /* 番号が振れなくても一覧は返す */ }

  const nameMap = {};
  (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });
  // 店舗が登録した基本情報（氏名・電話）を優先する
  const phoneMap = {};
  (profileRows || []).forEach(p => {
    if (p.phone) phoneMap[p.user_id] = p.phone;
    const full = [p.last_name, p.first_name].filter(Boolean).join(' ');
    if (full) nameMap[p.user_id] = full;
  });
  Object.entries(extras.phones).forEach(([uid, ph]) => { if (!phoneMap[uid]) phoneMap[uid] = ph; });
  const recommended = {};
  (recFreqRows || []).forEach(r => { recommended[r.axis] = r; });
  const noteMap = {};
  const assignedStaffMap = {};
  (notes || []).forEach(n => { noteMap[n.user_id] = n.note; assignedStaffMap[n.user_id] = n.assigned_staff_id || null; });
  const staffNameMap = {};
  (staffRows || []).forEach(s => { staffNameMap[s.id] = s.name; });
  const noVisitDays = dormantSettings?.no_visit_days || 90;

  const visitCountByLog = {};
  (visitRows || []).forEach(v => { visitCountByLog[v.log_id] = (visitCountByLog[v.log_id] || 0) + 1; });

  const meScanDoneSet = new Set((diagnosisRows || []).map(d => d.user_id));
  // 1ユーザーが複数トラック行(fineme/belle)を持ちうるため、result(タイプ判定)がある行を優先
  const typeMap = {};
  (diagnosisRows || []).forEach(d => {
    if (d.result?.fullName && !typeMap[d.user_id]) typeMap[d.user_id] = d.result;
  });

  // ユーザーごとの最新Mirror結果（created_at降順で取得済みなので最初の1件を採用）
  const mirrorByUser = {};
  (mirrorRows || []).forEach(m => {
    if (mirrorByUser[m.user_id]) return;
    mirrorByUser[m.user_id] = {
      visualScore: m.visual_score ?? null,
      visualTier: m.visual_tier || null,
    };
  });

  // 絞り込み用の属性
  const todayJst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const storeLine = new Set((lineLinkRows || []).map(x => x.user_id));
  const finemeLine = new Set((profiles || []).filter(p => p.line_user_id).map(p => p.id));
  const genderMap = {}, birthdayMap = {};
  (profiles || []).forEach(p => { if (p.birthday) birthdayMap[p.id] = p.birthday; });
  (profileRows || []).forEach(p => { if (p.gender) genderMap[p.user_id] = p.gender; if (p.birthday) birthdayMap[p.user_id] = p.birthday; });
  const livePkgs = (pkgRows || []).filter(p => (!p.expires_at || p.expires_at.slice(0, 10) >= todayJst) && p.subscription_status !== 'canceled');
  const { data: usageRows } = livePkgs.length
    ? await supabase.from('package_usages').select('customer_package_id').in('customer_package_id', livePkgs.map(p => p.id)).is('undone_at', null)
    : { data: [] };
  const usedOf = {};
  (usageRows || []).forEach(u => { usedOf[u.customer_package_id] = (usedOf[u.customer_package_id] || 0) + 1; });
  const pkgInfo = {};
  livePkgs.forEach(p => {
    const remaining = p.package_type === 'unlimited' ? null : Math.max(0, (p.total_sessions || 0) - (usedOf[p.id] || 0));
    if (remaining === 0) return;
    const cur = pkgInfo[p.user_id] || (pkgInfo[p.user_id] = { count: 0, low: false });
    cur.count++;
    if (remaining != null && remaining <= 1) cur.low = true;
  });
  const memberActive = new Set((memRows || []).map(m => m.user_id));
  const nextBooked = {};
  (futureRows || []).forEach(r => {
    const d = r.confirmed_date || r.reserved_date;
    if (d >= todayJst && (!nextBooked[r.user_id] || d < nextBooked[r.user_id])) nextBooked[r.user_id] = d;
  });
  const attrsOf = uid => ({
    line_store: storeLine.has(uid),
    line_any: storeLine.has(uid) || finemeLine.has(uid),
    gender: genderMap[uid] || null,
    birthday: birthdayMap[uid] || null,
    packages_active: pkgInfo[uid]?.count || 0,
    package_low: !!pkgInfo[uid]?.low,
    membership_active: memberActive.has(uid),
    next_booked_date: nextBooked[uid] || null,
  });

  const result = logs.map(l => {
    const assignedStaffId = assignedStaffMap[l.user_id] || null;
    return {
      ...l,
      customer_name: nameMap[l.user_id] || '(名前未設定)',
      member_number: numberMap[l.user_id] ?? null,
      userOverdueDays: daysUntilIdeal(l),
      storeOverdueDays: storeDaysUntilIdeal(l, recommended),
      hasStoreNote: !!noteMap[l.user_id],
      visitCount: visitCountByLog[l.id] || 0,
      status: computeStatus(l, noVisitDays),
      meScanDone: meScanDoneSet.has(l.user_id),
      meScanType: typeMap[l.user_id] || null, // { fullName, typeCode, displayCode, ... } | null
      mirror: mirrorByUser[l.user_id] || null,
      assignedStaffId,
      assignedStaffName: assignedStaffId ? (staffNameMap[assignedStaffId] || null) : null,
      phone: phoneMap[l.user_id] || null,
      registered_at: new Date(firstSeen[l.user_id]).toISOString(),
      ...attrsOf(l.user_id),
    };
  });
  // New Me Logを連携していないが、予約・入会・回数券・カルテ等でつながっているお客様も一覧に出す
  // （でお指摘 2026-10-16：顧客情報が見えない。一覧がNew Me Log連携者だけだった）
  extras.rows.forEach(r => {
    const assignedStaffId = assignedStaffMap[r.user_id] || null;
    result.push({
      ...r,
      customer_name: nameMap[r.user_id] || r.customer_name || '(名前未設定)',
      member_number: numberMap[r.user_id] ?? null,
      userOverdueDays: null,
      storeOverdueDays: null,
      hasStoreNote: !!noteMap[r.user_id],
      status: computeStatus(r, noVisitDays),
      meScanDone: meScanDoneSet.has(r.user_id),
      meScanType: typeMap[r.user_id] || null,
      mirror: mirrorByUser[r.user_id] || null,
      assignedStaffId,
      assignedStaffName: assignedStaffId ? (staffNameMap[assignedStaffId] || null) : null,
      phone: phoneMap[r.user_id] || r.phone || null,
      registered_at: r.created_at,
      ...attrsOf(r.user_id),
    });
  });

  const { searchParams } = new URL(request.url);
  const bypassCap = searchParams.get('scope') === 'all';

  const effectivePlan = withPlanPreview(provider, request.headers.get('x-plan-preview')).plan;
  if (effectivePlan === 'A' && !bypassCap) {
    // 先着30人（連携＝最初のログ作成日time順）までを表示対象にする。
    // 連携自体・本人への通知は制限しない。表示のみプランで絞る。
    const firstSeenByUser = {};
    result.forEach(r => {
      const t = new Date(r.created_at).getTime();
      if (!firstSeenByUser[r.user_id] || t < firstSeenByUser[r.user_id]) firstSeenByUser[r.user_id] = t;
    });
    const visibleUserIds = new Set(
      Object.entries(firstSeenByUser)
        .sort((a, b) => a[1] - b[1])
        .slice(0, LIGHT_PLAN_VISIBLE_LIMIT)
        .map(([uid]) => uid)
    );
    const totalConnected = Object.keys(firstSeenByUser).length;
    const visible = result.filter(r => visibleUserIds.has(r.user_id));
    return Response.json(visible, {
      headers: {
        'X-Fineme-Total-Connected': String(totalConnected),
        'X-Fineme-Visible-Limit': String(LIGHT_PLAN_VISIBLE_LIMIT),
      },
    });
  }

  return Response.json(result);
}
