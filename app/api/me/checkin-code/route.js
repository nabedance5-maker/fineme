// GET /api/me/checkin-code → ログイン中ユーザーの固定チェックイン用コードを取得（無ければ発行）
// 店舗がこのコードをQR化して読み取ることでチェックインを記録する（hacomono/STORES網羅計画 Phase 4）。
export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id, checkin_code').eq('id', user.id).single();
  if (profile?.checkin_code) return Response.json({ code: profile.checkin_code });

  const code = crypto.randomBytes(16).toString('hex');
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ checkin_code: code })
    .eq('id', user.id)
    .select('checkin_code')
    .single();
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  return Response.json({ code: updated.checkin_code });
}
