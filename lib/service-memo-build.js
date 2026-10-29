// 来店前の接客メモを予約ごとに組み立てる（サーバー専用）。
// 予約・来店履歴・カルテ・固定メモ・回数券・誕生日・Me Scan・周期を1回の並列取得でまとめる。
import {
  ACTIVE_STATUSES, addDays, daysBetween, effDate, effTime, customerKey, normName,
  resolveInterval, factsHash, jstToday,
} from '@/lib/service-memo';

const RES_COLS = 'id, user_id, user_name, user_contact, note, status, service_name, staff_id, reserved_date, start_time, confirmed_date, confirmed_time, counter_date, counter_time, created_at';

function settle(p) {
  return Promise.resolve(p).then(r => r?.data || []).catch(() => []);
}

export async function buildServiceMemos(supabase, provider, { date, reservationId } = {}) {
  const day = date || jstToday();

  // 1) 対象予約。confirmed_date/counter_dateがreserved_dateと違う日になることがあるため3列のどれかで拾ってから絞る
  let targets;
  if (reservationId) {
    const { data } = await supabase.from('reservations').select(RES_COLS)
      .eq('provider_id', provider.id).eq('id', reservationId).limit(1);
    targets = data || [];
  } else {
    const { data } = await supabase.from('reservations').select(RES_COLS)
      .eq('provider_id', provider.id)
      .in('status', ACTIVE_STATUSES)
      .or(`confirmed_date.eq.${day},counter_date.eq.${day},reserved_date.eq.${day}`)
      .limit(500);
    targets = (data || []).filter(r => effDate(r) === day);
  }
  targets.sort((a, b) => effTime(a).localeCompare(effTime(b)));
  if (!targets.length) return { date: day, items: [] };

  const userIds = [...new Set(targets.map(r => r.user_id).filter(Boolean))];
  const names = [...new Set(targets.filter(r => !r.user_id).map(r => r.user_name).filter(Boolean))];
  const nameKeys = new Set(names.map(normName));

  // 2) 付随データを並列取得
  const [
    histByUser, histByName, karteFields, notes, packages, profiles, diagnoses, logs, recFreqs, staff, manualCustomers, aiCache,
  ] = await Promise.all([
    userIds.length ? settle(supabase.from('reservations').select(RES_COLS).eq('provider_id', provider.id).in('user_id', userIds).in('status', ACTIVE_STATUSES).limit(2000)) : [],
    names.length ? settle(supabase.from('reservations').select(RES_COLS).eq('provider_id', provider.id).is('user_id', null).in('user_name', names).in('status', ACTIVE_STATUSES).limit(2000)) : [],
    settle(supabase.from('provider_karte_fields').select('id, label').eq('provider_id', provider.id)),
    userIds.length ? settle(supabase.from('provider_customer_notes').select('user_id, note, assigned_staff_id').eq('provider_id', provider.id).in('user_id', userIds)) : [],
    userIds.length ? settle(supabase.from('customer_packages').select('id, user_id, package_name, total_sessions, expires_at, package_type, subscription_status').eq('provider_id', provider.id).in('user_id', userIds)) : [],
    userIds.length ? settle(supabase.from('profiles').select('id, display_name, last_name, first_name, birthday').in('id', userIds)) : [],
    userIds.length ? settle(supabase.from('diagnosis_results').select('user_id, result').in('user_id', userIds)) : [],
    userIds.length && provider.slug ? settle(supabase.from('user_service_logs').select('user_id, axis, frequency_weeks, frequency_months').eq('provider_slug', provider.slug).eq('active', true).in('user_id', userIds)) : [],
    settle(supabase.from('provider_recommended_frequencies').select('axis, frequency_weeks, frequency_months').eq('provider_id', provider.id)),
    settle(supabase.from('provider_staff').select('id, name').eq('provider_id', provider.id)),
    settle(supabase.from('provider_manual_customers').select('id, display_name, linked_user_id').eq('provider_id', provider.id)),
    settle(supabase.from('provider_service_memo_ai').select('reservation_id, source_hash, content').eq('provider_id', provider.id).in('reservation_id', targets.map(r => r.id))),
  ]);

  // 非会員カルテ（provider_manual_customers）を、会員紐付け or 名前一致で引き当てる
  const manualByKey = {};
  manualCustomers.forEach(m => {
    const key = m.linked_user_id ? `u:${m.linked_user_id}` : `n:${normName(m.display_name)}`;
    if (m.linked_user_id ? userIds.includes(m.linked_user_id) : nameKeys.has(normName(m.display_name))) {
      (manualByKey[key] ||= []).push(m.id);
    }
  });
  const manualIds = Object.values(manualByKey).flat();

  const [karteByUser, karteByManual, usages] = await Promise.all([
    userIds.length ? settle(supabase.from('provider_karte_entries').select('user_id, manual_customer_id, note, custom_values, menu_name, created_at').eq('provider_id', provider.id).in('user_id', userIds).order('created_at', { ascending: false }).limit(300)) : [],
    manualIds.length ? settle(supabase.from('provider_karte_entries').select('user_id, manual_customer_id, note, custom_values, menu_name, created_at').eq('provider_id', provider.id).in('manual_customer_id', manualIds).order('created_at', { ascending: false }).limit(300)) : [],
    packages.length ? settle(supabase.from('package_usages').select('customer_package_id, undone_at').in('customer_package_id', packages.map(p => p.id))) : [],
  ]);

  const labelMap = Object.fromEntries(karteFields.map(f => [f.id, f.label]));
  const staffName = Object.fromEntries(staff.map(s => [s.id, s.name]));
  const recommended = Object.fromEntries(recFreqs.map(r => [r.axis, r]));
  const noteMap = Object.fromEntries(notes.map(n => [n.user_id, n]));
  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
  const typeMap = {};
  diagnoses.forEach(d => { if (d.result?.fullName && !typeMap[d.user_id]) typeMap[d.user_id] = d.result.fullName; });
  const logsByUser = {};
  logs.forEach(l => { (logsByUser[l.user_id] ||= []).push(l); });
  const usedByPkg = {};
  usages.forEach(u => { if (!u.undone_at) usedByPkg[u.customer_package_id] = (usedByPkg[u.customer_package_id] || 0) + 1; });
  const aiMap = Object.fromEntries(aiCache.map(a => [a.reservation_id, a]));

  const histByKey = {};
  [...histByUser, ...histByName].forEach(r => {
    const k = customerKey(r);
    if (k) (histByKey[k] ||= []).push(r);
  });
  const manualToKey = {};
  Object.entries(manualByKey).forEach(([k, ids]) => ids.forEach(id => { manualToKey[id] = k; }));
  const karteByKey = {};
  [...karteByUser, ...karteByManual].forEach(e => {
    const k = e.user_id ? `u:${e.user_id}` : manualToKey[e.manual_customer_id];
    if (k) (karteByKey[k] ||= []).push(e);
  });

  const now = Date.now();
  const thisMonth = Number(day.slice(5, 7));

  const items = targets.map(r => {
    const key = customerKey(r);
    const hist = histByKey[key] || [];
    const pastVisits = hist
      .filter(h => h.id !== r.id && h.status === 'visited' && effDate(h) < day)
      .sort((a, b) => effDate(a).localeCompare(effDate(b)));
    const last = pastVisits[pastVisits.length - 1] || null;
    const futureBooked = hist
      .filter(h => h.id !== r.id && h.status !== 'visited' && effDate(h) > day)
      .sort((a, b) => effDate(a).localeCompare(effDate(b)))[0] || null;

    const visitDates = [...pastVisits.map(effDate), day];
    const interval = resolveInterval({ logs: r.user_id ? (logsByUser[r.user_id] || []) : [], recommended, visitDates });
    const lastDaysAgo = last ? daysBetween(effDate(last), day) : null;

    const karte = (karteByKey[key] || [])
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 3)
      .map(e => ({
        date: e.created_at.slice(0, 10),
        menu: e.menu_name || null,
        note: e.note || '',
        values: Object.entries(e.custom_values || {})
          .filter(([, v]) => v !== '' && v != null)
          .map(([fid, v]) => ({ label: labelMap[fid] || '項目', value: Array.isArray(v) ? v.join('・') : String(v) })),
      }));

    const pkgs = (r.user_id ? packages.filter(p => p.user_id === r.user_id) : [])
      .filter(p => (!p.expires_at || new Date(p.expires_at).getTime() > now) && p.subscription_status !== 'canceled')
      .map(p => {
        const remaining = p.package_type === 'unlimited' ? null : Math.max(0, (p.total_sessions || 0) - (usedByPkg[p.id] || 0));
        return { name: p.package_name, remaining, type: p.package_type || 'fixed_count', expires: p.expires_at ? p.expires_at.slice(0, 10) : null };
      })
      .filter(p => p.remaining == null || p.remaining > 0);

    const profile = r.user_id ? profileMap[r.user_id] : null;
    const bd = profile?.birthday;
    const birthdayThisMonth = bd && Number(bd.slice(5, 7)) === thisMonth ? `${Number(bd.slice(5, 7))}月${Number(bd.slice(8, 10))}日` : null;
    const note = r.user_id ? noteMap[r.user_id] : null;

    const item = {
      reservation_id: r.id,
      date: day,
      time: effTime(r),
      status: r.status,
      user_id: r.user_id || null,
      customer_name: r.user_name || [profile?.last_name, profile?.first_name].filter(Boolean).join(' ') || profile?.display_name || '(お名前未登録)',
      user_contact: r.user_contact || '',
      staff_id: r.staff_id || null,
      staff_name: r.staff_id ? staffName[r.staff_id] || null : null,
      menu: r.service_name || null,
      note: r.note || '',
      visitCount: pastVisits.length,
      isFirst: pastVisits.length === 0,
      lastVisit: last ? { date: effDate(last), menu: last.service_name || null, staff_name: last.staff_id ? staffName[last.staff_id] || null : null, daysAgo: lastDaysAgo } : null,
      interval,
      overdueDays: interval && lastDaysAgo != null ? lastDaysAgo - interval.days : null,
      nextSuggestedDate: interval ? addDays(day, interval.days) : null,
      nextBooked: futureBooked ? { date: effDate(futureBooked), time: effTime(futureBooked) } : null,
      fixedNote: note?.note || '',
      assignedStaffName: note?.assigned_staff_id ? staffName[note.assigned_staff_id] || null : null,
      karte,
      packages: pkgs,
      birthdayThisMonth,
      meScanType: r.user_id ? typeMap[r.user_id] || null : null,
    };
    item.hash = factsHash(item);
    const cached = aiMap[r.id];
    item.ai = cached && cached.source_hash === item.hash ? cached.content : null;
    return item;
  });

  return { date: day, items };
}
