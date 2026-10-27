// シフトを「選んだ日」に対してまとめて操作する（でお指摘 2026-10-27：期間を作らせず、カレンダーで選んだ日を
// まとめて確定・自動作成したい／確定を1つずつやるのはだるい）。
// GET  ?from=&to=            → その範囲の確定した日・必要人数パターン・労働条件チェック
// POST { action, dates | from+to, pattern_id? }
//   confirm         選んだ日を確定（予約の空き時間・勤怠はこの日のシフトを使う）
//   unconfirm       選んだ日の確定を取り消す（シフトは消さない）
//   generate        選んだ日のうち未確定の日を、提出された希望と労働条件から自動で作り直す（手で入れたコマは残す）
//   apply_requests  選んだ日のうち未確定の日に、出勤希望をそのまま入れる（すでに入っている人・時間は飛ばす）
//   set_pattern     選んだ日に必要人数パターンを付ける（pattern_id 空で外す）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { generateShift } from '@/lib/shift-generator';
import { loadAvailability } from '@/lib/shift-implied-requests';
import { resolveRule } from '@/lib/shift-request-format';
import { createLoadTracker, effectiveLimits, evaluateLabor, workingHours } from '@/lib/shift-labor';
import { loadConditions, loadNeighborEntries } from '@/lib/shift-labor-db';
import { spanOf } from '@/lib/time-span';
import { confirmedDaysIn, entriesIn, normalizeDates } from '@/lib/shift-store';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProvider(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

async function laborFor(providerId, dates) {
  const sorted = [...dates].sort();
  const [own, neighbors, conditions, { data: staff }] = await Promise.all([
    entriesIn(supabase, providerId, sorted[0], sorted[sorted.length - 1], 'staff_id, date, start_time, end_time'),
    loadNeighborEntries(supabase, providerId, sorted),
    loadConditions(supabase, providerId),
    supabase.from('provider_staff').select('id, name').eq('provider_id', providerId),
  ]);
  const set = new Set(sorted);
  const mineRows = own.filter(e => set.has(e.date));
  const limitsByStaff = {};
  (staff || []).forEach(s => { limitsByStaff[s.id] = effectiveLimits(conditions.find(c => c.staff_id === s.id) || null); });
  const names = Object.fromEntries((staff || []).map(s => [s.id, s.name]));
  const { violations } = evaluateLabor([...mineRows, ...neighbors], limitsByStaff, id => names[id] || '(不明)');
  const mine = new Set(mineRows.map(e => `${e.staff_id}|${e.date}`));
  return { violations: violations.filter(v => v.dates.some(d => mine.has(`${v.staff_id}|${d}`))), stats: evaluateLabor(mineRows, limitsByStaff).stats };
}

export async function GET(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }
  const sp = new URL(request.url).searchParams;
  const dates = normalizeDates({ from: sp.get('from'), to: sp.get('to') });
  if (!dates.length) return Response.json({ error: 'from・to を指定してください' }, { status: 400 });
  const from = dates[0], to = dates[dates.length - 1];
  const [confirmed, { data: patterns }, labor] = await Promise.all([
    confirmedDaysIn(supabase, provider.id, from, to),
    supabase.from('provider_shift_day_patterns').select('date, pattern_id').eq('provider_id', provider.id).gte('date', from).lte('date', to),
    sp.get('labor') === '1' ? laborFor(provider.id, dates) : null,
  ]);
  return Response.json({ confirmed_days: [...confirmed].sort(), day_patterns: patterns || [], ...(labor ? { labor } : {}) });
}

async function __POST(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }
  const body = await request.json().catch(() => ({}));
  const dates = normalizeDates(body);
  if (!dates.length) return Response.json({ error: '日付を選んでください' }, { status: 400 });
  const from = dates[0], to = dates[dates.length - 1];
  const pid = provider.id;

  if (body.action === 'confirm') {
    const { error } = await supabase.from('provider_shift_confirmed_days').upsert(dates.map(date => ({ provider_id: pid, date })), { onConflict: 'provider_id,date' });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, confirmedCount: dates.length });
  }
  if (body.action === 'unconfirm') {
    const { error } = await supabase.from('provider_shift_confirmed_days').delete().eq('provider_id', pid).in('date', dates);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  if (body.action === 'set_pattern') {
    await supabase.from('provider_shift_day_patterns').delete().eq('provider_id', pid).in('date', dates);
    if (body.pattern_id) {
      const { data: pat } = await supabase.from('provider_shift_patterns').select('id').eq('id', body.pattern_id).eq('provider_id', pid).maybeSingle();
      if (!pat) return Response.json({ error: 'パターンが見つかりません' }, { status: 404 });
      const { error } = await supabase.from('provider_shift_day_patterns').insert(dates.map(date => ({ provider_id: pid, date, pattern_id: pat.id })));
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  // 自動作成・希望の反映は、確定していない日だけを対象にする（確定した日は手で直す）
  const confirmed = await confirmedDaysIn(supabase, pid, from, to);
  const targetDates = dates.filter(d => !confirmed.has(d));
  if (!targetDates.length) return Response.json({ error: '選んだ日はすべて確定済みです。作り直す時は、先に確定を取り消してください' }, { status: 400 });
  const target = new Set(targetDates);
  const tFrom = targetDates[0], tTo = targetDates[targetDates.length - 1];
  const period = { id: null, period_start: tFrom, period_end: tTo };

  const [{ data: settings }, { data: rawRequests }, conditions, neighborEntries, existing] = await Promise.all([
    supabase.from('provider_shift_settings').select('rule_type, request_format').eq('provider_id', pid).maybeSingle(),
    supabase.from('provider_shift_requests').select('staff_id, date, type, start_time, end_time').eq('provider_id', pid).gte('date', tFrom).lte('date', tTo),
    loadConditions(supabase, pid),
    loadNeighborEntries(supabase, pid, targetDates),
    entriesIn(supabase, pid, tFrom, tTo),
  ]);
  const own = existing.filter(e => target.has(e.date));

  if (body.action === 'apply_requests') {
    const offSet = new Set((rawRequests || []).filter(r => r.type === 'off').map(r => `${r.staff_id}|${r.date}`));
    const targets = (rawRequests || []).filter(r => r.type === 'work' && target.has(r.date) && !offSet.has(`${r.staff_id}|${r.date}`) && r.start_time && r.end_time).sort((a, b) => (a.date < b.date ? -1 : 1));
    const limitsByStaff = {};
    (conditions || []).forEach(c => { limitsByStaff[c.staff_id] = effectiveLimits(c); });
    const tracker = createLoadTracker(limitsByStaff);
    const assigned = {};
    const remember = e => {
      tracker.add(e.staff_id, e.date, workingHours(e.start_time, e.end_time));
      const span = spanOf(e.start_time, e.end_time);
      if (span) (assigned[`${e.staff_id}|${e.date}`] = assigned[`${e.staff_id}|${e.date}`] || []).push(span);
    };
    [...neighborEntries, ...own].forEach(remember);
    const rows = [], skipped = [];
    let duplicateCount = 0;
    for (const r of targets) {
      const { s, e } = spanOf(r.start_time, r.end_time) || { s: 0, e: 0 };
      if ((assigned[`${r.staff_id}|${r.date}`] || []).some(a => a.s < e && a.e > s)) { duplicateCount++; continue; }
      const reason = tracker.check(r.staff_id, r.date, workingHours(r.start_time, r.end_time));
      if (reason) { skipped.push({ staff_id: r.staff_id, date: r.date, start_time: r.start_time, end_time: r.end_time, reason }); continue; }
      rows.push({ provider_id: pid, staff_id: r.staff_id, date: r.date, start_time: r.start_time, end_time: r.end_time, source: 'manual' });
      remember(r);
    }
    if (rows.length) { const { error } = await supabase.from('provider_shift_entries').insert(rows); if (error) return Response.json({ error: error.message }, { status: 500 }); }
    return Response.json({ ok: true, appliedCount: rows.length, duplicateCount, skipped, skippedConfirmed: dates.length - targetDates.length });
  }

  if (body.action === 'generate') {
    const [{ data: priorities }, { data: dayPatternRows }, { data: patternRows }, { data: leaves }] = await Promise.all([
      supabase.from('provider_shift_priorities').select('staff_id, priority_score').eq('provider_id', pid),
      supabase.from('provider_shift_day_patterns').select('date, pattern_id').eq('provider_id', pid).gte('date', tFrom).lte('date', tTo),
      supabase.from('provider_shift_patterns').select('id, slots').eq('provider_id', pid),
      supabase.from('provider_paid_leave_requests').select('staff_id, date, unit').eq('provider_id', pid).eq('status', 'approved').gte('date', tFrom).lte('date', tTo),
    ]);
    const leaveKeys = new Set((leaves || []).filter(l => l.unit === 'full').map(l => `${l.staff_id}|${l.date}`));
    const requests = [
      ...(rawRequests || []).filter(r => !leaveKeys.has(`${r.staff_id}|${r.date}`)),
      ...[...leaveKeys].map(k => { const [staff_id, date] = k.split('|'); return { staff_id, date, type: 'off', start_time: null, end_time: null }; }),
    ];
    const dayPatterns = Object.fromEntries((dayPatternRows || []).map(r => [r.date, r.pattern_id]));
    const patternsById = Object.fromEntries((patternRows || []).map(p => [p.id, p]));
    const empOf = Object.fromEntries((conditions || []).map(c => [c.staff_id, c.employment_type]));
    const availability = (await loadAvailability(supabase, pid, period, requests))
      .filter(a => resolveRule(settings?.request_format, a.staff_id, empOf[a.staff_id]).mode !== 'work_time');
    // 選んでいない日・確定した日のコマは「すでにあるもの」として労働時間の計算に入れる
    const keep = existing.filter(e => !target.has(e.date) || e.source === 'manual');
    const { entries, warnings, skipped } = generateShift({
      period, requests, availability, ruleType: settings?.rule_type || 'as_requested', dayPatterns, patternsById,
      priorities: priorities || [], conditions, existingEntries: [...neighborEntries, ...keep],
    });
    const autoIds = own.filter(e => e.source === 'auto').map(e => e.id);
    if (autoIds.length) { const { error } = await supabase.from('provider_shift_entries').delete().in('id', autoIds); if (error) return Response.json({ error: error.message }, { status: 500 }); }
    const rows = entries.filter(e => target.has(e.date)).map(e => ({ ...e, provider_id: pid, period_id: null, source: 'auto' }));
    if (rows.length) { const { error } = await supabase.from('provider_shift_entries').insert(rows); if (error) return Response.json({ error: error.message }, { status: 500 }); }
    return Response.json({ ok: true, createdCount: rows.length, warnings, skipped, skippedConfirmed: dates.length - targetDates.length });
  }

  return Response.json({ error: '操作が不正です' }, { status: 400 });
}

export const POST = withAudit(__POST);
