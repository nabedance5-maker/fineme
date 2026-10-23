// POST /api/staff-shift/[token]/submit → スタッフが「これで提出完了です」の合図を送る。
// 個々の希望は選んだ瞬間に自動保存済みのため、ここでは完了の記録を残すだけ
// （でお要望2026-09-14：日付ごとの提出ボタンをやめ、最後に1回だけ押す形に）。
// 完了は、店舗の提出ルールで区切った期間（period_id＝区切りの開始日）ごとに記録する
// （でお指摘 2026-10-16：期間を先に作らせない）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

import { isDeadlinePassed, LOCKED_MESSAGE } from '@/lib/shift-deadline';
import { notifyShiftSubmitted } from '@/lib/shift-submit-notify';
import { loadCycle, findOpenWindow } from '@/lib/shift-windows';
const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getStaffByToken(token) {
  const { data } = await supabase
    .from('provider_staff')
    .select('id, provider_id')
    .eq('shift_access_token', token)
    .single();
  return data || null;
}

export async function POST(request, props) {
  const params = await props.params;
  const staff = await getStaffByToken(params.token);
  if (!staff) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { period_id } = body;
  if (!period_id) return Response.json({ error: 'period_idは必須です' }, { status: 400 });

  const { cycle } = await loadCycle(supabase, staff.provider_id);
  const win = findOpenWindow(period_id, cycle);
  if (!win) return Response.json({ error: 'この期間はすでに始まっています' }, { status: 400 });
  const key = { provider_id: staff.provider_id, staff_id: staff.id, window_start: win.start };
  if (isDeadlinePassed({ request_deadline: win.deadline })) {
    const { data: already } = await supabase.from('provider_shift_window_submissions').select('staff_id').match(key).maybeSingle();
    if (already) return Response.json({ error: LOCKED_MESSAGE }, { status: 400 });
  }

  const { error } = await supabase
    .from('provider_shift_window_submissions')
    .upsert({ ...key, window_end: win.end, submitted_at: new Date().toISOString() }, { onConflict: 'provider_id,staff_id,window_start' });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 店舗が選んだ先へ提出を知らせる（失敗しても提出自体は完了扱い）
  try {
    await Promise.race([
      notifyShiftSubmitted(supabase, { providerId: staff.provider_id, window: win, staffId: staff.id }),
      new Promise(r => setTimeout(r, 8000)),
    ]);
  } catch (e) { console.error('[shift submit notify]', e); }

  return Response.json({ ok: true });
}
