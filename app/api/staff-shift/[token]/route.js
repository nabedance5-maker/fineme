// GET    /api/staff-shift/[token]?period=YYYY-MM-DD → スタッフ本人向け：提出ルールで区切った期間の一覧と、選んだ期間の自分の希望
// POST   /api/staff-shift/[token] → 希望を1件、選んだ瞬間に自動保存（type='work'|'off'）
// DELETE /api/staff-shift/[token] → 保存済みの希望を1件取り消す
//
// でお要望2026-10-02：「1日ずつ全部入れるのが大変。複数日付を選んで同じ時間帯を一気に提出したい」
// → POSTは`dates`配列、DELETEは`dates`（カンマ区切り）でまとめて処理できる。
//
// スタッフはFinemeの認証アカウントを持たないため、provider_staff.shift_access_token
// （推測不可能なUUID）を本人確認の代わりに使う認証不要の公開エンドポイント
// （予約確認Webhook等、既存の同種の設計と同じ方針）。
//
// でお指摘2026-09-14：「日付ごとに『提出する』ボタンを押すのがネック」→日付を選んだ
// 瞬間に自動保存する方式に変更（このPOSTは1日1回の自動保存として都度呼ばれる）。
// 「提出」ボタンは全体の完了を知らせる合図として別エンドポイント(submit/route.js)に分離。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

import { isDeadlinePassed, LOCKED_MESSAGE } from '@/lib/shift-deadline';
import { resolveRule, describeRule } from '@/lib/shift-request-format';
import { loadCycle, upcomingWindows, findOpenWindow } from '@/lib/shift-windows';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// でお指摘（2026-10-16）：最初に期間を作らせるのは不要な手間。希望は日付単位で保存し、
// 「どこまで出したか」は店舗の提出ルール（1か月ごと・締切）から自動で決まる区切りで管理する。
// ?period= と period_id には区切りの開始日（YYYY-MM-DD）が入る。
async function ruleFor(requestFormat, staff) {
  const { data: cond } = await supabase.from('provider_shift_staff_conditions').select('employment_type').eq('provider_id', staff.provider_id).eq('staff_id', staff.id).maybeSingle();
  return resolveRule(requestFormat, staff.id, cond?.employment_type || null);
}

async function hasSubmitted(providerId, staffId, windowStart) {
  const { data } = await supabase.from('provider_shift_window_submissions').select('staff_id').eq('provider_id', providerId).eq('staff_id', staffId).eq('window_start', windowStart).maybeSingle();
  return !!data;
}

// 区切りを、締切判定に使える形（request_deadline）で返す
const asPeriod = w => ({ id: w.key, period_start: w.start, period_end: w.end, request_deadline: w.deadline, label: w.label });

// POST/DELETE 共通：区切りが今も希望を出せるもので、締切後に提出済みでないことを確かめる
async function openWindowFor(staff, key) {
  const { cycle, request_format } = await loadCycle(supabase, staff.provider_id);
  const win = key ? findOpenWindow(key, cycle) : null;
  if (!win) return { error: Response.json({ error: 'この期間はすでに始まっているため、希望を変更できません' }, { status: 400 }) };
  const period = asPeriod(win);
  if (isDeadlinePassed(period) && await hasSubmitted(staff.provider_id, staff.id, win.key)) return { error: Response.json({ error: LOCKED_MESSAGE }, { status: 400 }) };
  return { win, period, request_format };
}
async function getStaffByToken(token) {
  // provider_staff⇔providers間にprovider_shift_priorities経由の多対多関係も
  // 生まれたため、あいまいな"providers(name)"だとPGRST201（複数経路エラー）に
  // なる。外部キー名を明示して一意に指定する（でお報告2026-09-14：「リンクが
  // 無効です」と出る不具合の原因。シフト機能を追加した副作用）。
  const { data } = await supabase
    .from('provider_staff')
    .select('id, name, provider_id, line_user_id, providers!provider_staff_provider_id_fkey(name)')
    .eq('shift_access_token', token)
    .single();
  return data || null;
}

export async function GET(request, { params }) {
  const staff = await getStaffByToken(params.token);
  if (!staff) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  const { cycle, request_format } = await loadCycle(supabase, staff.provider_id);
  const windows = upcomingWindows(cycle);
  const { data: subs } = await supabase.from('provider_shift_window_submissions').select('window_start')
    .eq('provider_id', staff.provider_id).eq('staff_id', staff.id).in('window_start', windows.map(w => w.key));
  const submittedSet = new Set((subs || []).map(x => x.window_start));
  const wanted = new URL(request.url).searchParams.get('period');
  const win = windows.find(w => w.key === wanted)
    || windows.find(w => !submittedSet.has(w.key))
    || windows[0];
  // 古い形式（期間ID）のリンクや、もう始まった区切りのリンクで開かれた
  const requestedClosed = !!wanted && !windows.some(w => w.key === wanted);
  const period = asPeriod(win);
  const rule = await ruleFor(request_format, staff);
  const { data: requests } = await supabase.from('provider_shift_requests').select('id, date, type, start_time, end_time, note')
    .eq('provider_id', staff.provider_id).eq('staff_id', staff.id).gte('date', win.start).lte('date', win.end);
  const submitted = submittedSet.has(win.key);

  return Response.json({
    staff: { id: staff.id, name: staff.name, line_connected: !!staff.line_user_id },
    provider: { name: staff.providers?.name || '' },
    period: { ...period, status: 'collecting', pastDeadline: isDeadlinePassed(period), locked: isDeadlinePassed(period) && submitted },
    periods: windows.map(w => ({ ...asPeriod(w), submitted: submittedSet.has(w.key) })),
    requested_closed: requestedClosed,
    rule: { ...rule, label: describeRule(rule) },
    requests: requests || [],
    submitted,
  });
}

export async function POST(request, { params }) {
  const staff = await getStaffByToken(params.token);
  if (!staff) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { period_id, date, type, start_time, end_time, note } = body;
  const isBulk = Array.isArray(body.dates);
  const dates = isBulk ? [...new Set(body.dates)] : (date ? [date] : []);
  if (!period_id || !dates.length || !['work', 'off'].includes(type)) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  }
  if (dates.length > 93 || dates.some(d => typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
    return Response.json({ error: '日付の指定が不正です' }, { status: 400 });
  }
  if (type === 'work' && (!start_time || !end_time)) {
    return Response.json({ error: '出勤希望には開始・終了時刻が必要です' }, { status: 400 });
  }
  // 0:00〜23:59のどこでも可。終了が開始より前なら翌日まで（日付またぎ）。同じ時刻は不可
  if (type === 'work' && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(start_time).slice(0, 5)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(end_time).slice(0, 5)) || String(start_time).slice(0, 5) === String(end_time).slice(0, 5))) {
    return Response.json({ error: '開始・終了時刻が正しくありません（開始と終了を同じ時刻にはできません）' }, { status: 400 });
  }

  const opened = await openWindowFor(staff, period_id);
  if (opened.error) return opened.error;
  const { win, request_format } = opened;
  if (dates.some(d => d < win.start || d > win.end)) {
    return Response.json({ error: '選んだ期間の外の日付が含まれています' }, { status: 400 });
  }

  // 店舗が決めた提出のしかたに合わない希望は受け付けない
  const rule = await ruleFor(request_format, staff);
  if (rule.mode === 'off_only' && type === 'work') return Response.json({ error: 'このお店では休み希望だけを提出してください' }, { status: 400 });
  if (rule.mode === 'work_time' && type === 'off') return Response.json({ error: 'このお店では出勤できる日と時間帯を提出してください（休み希望は不要です）' }, { status: 400 });
  const mine = () => supabase.from('provider_shift_requests');
  if (type === 'off' && rule.max_off_days !== null && rule.max_off_days !== undefined) {
    const { data: offs } = await mine().select('date').eq('provider_id', staff.provider_id).eq('staff_id', staff.id).eq('type', 'off').gte('date', win.start).lte('date', win.end);
    const total = new Set([...(offs || []).map(o => o.date), ...dates]).size;
    if (total > rule.max_off_days) return Response.json({ error: `休み希望は${win.label}で${rule.max_off_days}日までです（いま${(offs || []).length}日選択中）` }, { status: 400 });
  }

  // 同じ日にwork/off両方が残るのはおかしいため、逆typeの既存希望があれば消してから保存する
  const otherType = type === 'work' ? 'off' : 'work';
  // コメント（note）は、送られてきた時だけ書き換える。出勤⇔休みを選び直した時は前のコメントを引き継ぐ
  // （でお要望 2026-10-16：各シフトにコメントを付けたい。時間を変えるたびに消えないように）
  const { data: prevRows } = await mine().select('date, note').eq('provider_id', staff.provider_id).eq('staff_id', staff.id).in('date', dates);
  const prevNote = {};
  (prevRows || []).forEach(r => { if (r.note) prevNote[r.date] = r.note; });
  await mine().delete().eq('provider_id', staff.provider_id).eq('staff_id', staff.id).in('date', dates).eq('type', otherType);

  const now = new Date().toISOString();
  const noteGiven = note !== undefined;
  const cleanNote = noteGiven ? (String(note || '').trim().slice(0, 200) || null) : null;
  const rows = dates.map(d => ({
    provider_id: staff.provider_id, staff_id: staff.id, date: d, type,
    start_time: type === 'work' ? start_time : null,
    end_time: type === 'work' ? end_time : null,
    note: noteGiven ? cleanNote : (prevNote[d] || null),
    updated_at: now,
  }));
  const { data, error } = await mine()
    .upsert(rows, { onConflict: 'provider_id,staff_id,date,type' })
    .select();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(isBulk ? data : data[0]);
}

export async function DELETE(request, { params }) {
  const staff = await getStaffByToken(params.token);
  if (!staff) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const period_id = searchParams.get('period_id');
  const date = searchParams.get('date');
  const type = searchParams.get('type');
  const bulkDates = (searchParams.get('dates') || '').split(',').filter(Boolean);

  if (!period_id) return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  const opened = await openWindowFor(staff, period_id);
  if (opened.error) return opened.error;
  const { win } = opened;
  const targets = bulkDates.length ? bulkDates : (date ? [date] : []);
  if (!targets.length || (!bulkDates.length && !type)) return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  if (targets.some(d => d < win.start || d > win.end)) return Response.json({ error: '選んだ期間の外の日付が含まれています' }, { status: 400 });

  let query = supabase.from('provider_shift_requests').delete().eq('provider_id', staff.provider_id).eq('staff_id', staff.id).in('date', targets);
  if (!bulkDates.length) query = query.eq('type', type);
  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
