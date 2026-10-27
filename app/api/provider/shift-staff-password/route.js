// POST /api/provider/shift-staff-password { staff_id, password | null } → シフト希望の提出リンクに入るためのパスワード（4〜8桁の数字）を決める
// （でお要望 2026-10-27：提出リンクはお店に1本。Finemeのスタッフアカウントが無い人は、名前を選んでこのパスワードで入る）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { hashPin } from '@/lib/attendance';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: provider } = await supabase.from('providers').select('id').eq('email', user.email).single();
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.password !== null && !/^\d{4,8}$/.test(String(body.password || ''))) return Response.json({ error: 'パスワードは4〜8桁の数字にしてください' }, { status: 400 });
  const { data: staff } = await supabase.from('provider_staff').select('id').eq('id', body.staff_id).eq('provider_id', provider.id).maybeSingle();
  if (!staff) return Response.json({ error: 'スタッフが見つかりません' }, { status: 404 });
  const { error } = await supabase.from('provider_staff')
    .update({ shift_pin_hash: body.password === null ? null : hashPin(body.password), shift_pin_failures: 0, shift_pin_locked_until: null }).eq('id', staff.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
export const POST = withAudit(__POST);
