// GET    /api/staff-shift/[token] → スタッフ本人向け：現在募集中の期間・自分の提出済み希望
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

async function ruleFor(period, staff) {
  const { data: cond } = await supabase.from('provider_shift_staff_conditions').select('employment_type').eq('provider_id', staff.provider_id).eq('staff_id', staff.id).maybeSingle();
  return resolveRule(period.request_format, staff.id, cond?.employment_type || null);
}

async function hasSubmitted(periodId, staffId) {
  const { data } = await supabase.from('provider_shift_submissions').select('staff_id').eq('period_id', periodId).eq('staff_id', staffId).maybeSingle();
  return !!data;
}
const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

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

  // 募集中（collecting）の期間のうち、直近のものを対象にする
  const { data: period } = await supabase
    .from('provider_shift_periods')
    .select('id, period_start, period_end, request_deadline, status, request_format')
    .eq('provider_id', staff.provider_id)
    .eq('status', 'collecting')
    .order('period_start', { ascending: true })
    .limit(1)
    .maybeSingle();

  let requests = [];
  let submitted = false;
  let rule = null;
  if (period) {
    rule = await ruleFor(period, staff);
    const [{ data }, { data: sub }] = await Promise.all([
      supabase.from('provider_shift_requests').select('id, date, type, start_time, end_time, note').eq('period_id', period.id).eq('staff_id', staff.id),
      supabase.from('provider_shift_submissions').select('submitted_at').eq('period_id', period.id).eq('staff_id', staff.id).maybeSingle(),
    ]);
    requests = data || [];
    submitted = !!sub;
  }

  return Response.json({
    staff: { id: staff.id, name: staff.name, line_connected: !!staff.line_user_id },
    provider: { name: staff.providers?.name || '' },
    period: period ? { id: period.id, period_start: period.period_start, period_end: period.period_end, request_deadline: period.request_deadline, status: period.status, pastDeadline: isDeadlinePassed(period), locked: isDeadlinePassed(period) && submitted } : null,
    rule: rule ? { ...rule, label: describeRule(rule) } : null,
    requests,
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

  // この期間が本当に自分の店舗のものか確認（他店舗の期間IDを渡された場合に書き込ませない）
  const { data: period } = await supabase.from('provider_shift_periods').select('id, provider_id, status, period_start, period_end, request_deadline, request_format').eq('id', period_id).single();
  if (!period || period.provider_id !== staff.provider_id) return Response.json({ error: '期間が見つかりません' }, { status: 404 });
  if (period.status !== 'collecting') return Response.json({ error: 'この期間は希望の募集を締め切っています' }, { status: 400 });
  if (isDeadlinePassed(period) && await hasSubmitted(period.id, staff.id)) return Response.json({ error: LOCKED_MESSAGE }, { status: 400 });
  if (dates.some(d => d < period.period_start || d > period.period_end)) {
    return Response.json({ error: '募集期間外の日付が含まれています' }, { status: 400 });
  }

  // 店舗が決めた提出のしかたに合わない希望は受け付けない
  const rule = await ruleFor(period, staff);
  if (rule.mode === 'off_only' && type === 'work') return Response.json({ error: 'この募集では休み希望だけを提出してください' }, { status: 400 });
  if (rule.mode === 'work_time' && type === 'off') return Response.json({ error: 'この募集では出勤できる日と時間帯を提出してください（休み希望は不要です）' }, { status: 400 });
  if (type === 'off' && rule.max_off_days !== null && rule.max_off_days !== undefined) {
    const { data: offs } = await supabase.from('provider_shift_requests').select('date').eq('period_id', period_id).eq('staff_id', staff.id).eq('type', 'off');
    const total = new Set([...(offs || []).map(o => o.date), ...dates]).size;
    if (total > rule.max_off_days) return Response.json({ error: `休み希望は${rule.max_off_days}日までです（いま${(offs || []).length}日選択中）` }, { status: 400 });
  }

  // 同じ日にwork/off両方が残るのはおかしいため、逆typeの既存希望があれば消してから保存する
  // （カレンダーで日付をタップして出勤/休みを選び直す新UIでは、両方残ると混乱するため）
  const otherType = type === 'work' ? 'off' : 'work';
  await supabase.from('provider_shift_requests').delete().eq('period_id', period_id).eq('staff_id', staff.id).in('date', dates).eq('type', otherType);

  const now = new Date().toISOString();
  const rows = dates.map(d => ({
    period_id, staff_id: staff.id, date: d, type,
    start_time: type === 'work' ? start_time : null,
    end_time: type === 'work' ? end_time : null,
    note: note || null,
    updated_at: now,
  }));
  const { data, error } = await supabase
    .from('provider_shift_requests')
    .upsert(rows, { onConflict: 'period_id,staff_id,date,type' })
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
  const { data: period } = await supabase.from('provider_shift_periods').select('id, provider_id, status, request_deadline').eq('id', period_id).single();
  if (!period || period.provider_id !== staff.provider_id) return Response.json({ error: '期間が見つかりません' }, { status: 404 });
  if (period.status !== 'collecting') return Response.json({ error: 'この期間は希望の募集を締め切っています' }, { status: 400 });
  if (isDeadlinePassed(period) && await hasSubmitted(period.id, staff.id)) return Response.json({ error: LOCKED_MESSAGE }, { status: 400 });

  let query = supabase.from('provider_shift_requests').delete().eq('period_id', period_id).eq('staff_id', staff.id);
  if (bulkDates.length) {
    if (!period_id) return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
    query = query.in('date', bulkDates);
  } else {
    if (!period_id || !date || !type) return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
    query = query.eq('date', date).eq('type', type);
  }
  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
