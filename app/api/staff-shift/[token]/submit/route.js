// POST /api/staff-shift/[token]/submit → スタッフが「これで提出完了です」の合図を送る。
// 個々の希望は選んだ瞬間に自動保存済みのため、ここでは完了の記録(provider_shift_submissions)
// を残すだけ（でお要望2026-09-14：日付ごとの提出ボタンをやめ、最後に1回だけ押す形に）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

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

  const { data: period } = await supabase.from('provider_shift_periods').select('id, provider_id').eq('id', period_id).single();
  if (!period || period.provider_id !== staff.provider_id) return Response.json({ error: '期間が見つかりません' }, { status: 404 });

  const { error } = await supabase
    .from('provider_shift_submissions')
    .upsert({ period_id, staff_id: staff.id, submitted_at: new Date().toISOString() }, { onConflict: 'period_id,staff_id' });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
