// POST /api/staff-shift/[token]/submit → スタッフが「これで提出完了です」の合図を送る。
// 個々の希望は選んだ瞬間に自動保存済みのため、ここでは完了の記録(provider_shift_submissions)
// を残すだけ（でお要望2026-09-14：日付ごとの提出ボタンをやめ、最後に1回だけ押す形に）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

import { isDeadlinePassed, DEADLINE_CLOSED_MESSAGE } from '@/lib/shift-deadline';
const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getStaffByToken(token) {
  const { data } = await supabase
    .from('provider_staff')
    .select('id, provider_id')
    .eq('shift_access_token', token)
    .single();
  return data || null;
}

export async function POST(request, { params }) {
  const staff = await getStaffByToken(params.token);
  if (!staff) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { period_id } = body;
  if (!period_id) return Response.json({ error: 'period_idは必須です' }, { status: 400 });

  const { data: period } = await supabase.from('provider_shift_periods').select('id, provider_id, status, request_deadline').eq('id', period_id).single();
  if (!period || period.provider_id !== staff.provider_id) return Response.json({ error: '期間が見つかりません' }, { status: 404 });
  if (period.status !== 'collecting') return Response.json({ error: 'この期間は希望の募集を締め切っています' }, { status: 400 });
  if (isDeadlinePassed(period)) return Response.json({ error: DEADLINE_CLOSED_MESSAGE }, { status: 400 });

  const { error } = await supabase
    .from('provider_shift_submissions')
    .upsert({ period_id, staff_id: staff.id, submitted_at: new Date().toISOString() }, { onConflict: 'period_id,staff_id' });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
