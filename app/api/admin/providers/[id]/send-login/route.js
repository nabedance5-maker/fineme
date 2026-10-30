// POST /api/admin/providers/[id]/send-login - お店にログイン案内（パスワード設定リンク）を送り直す（運営用・2026-10-30）
// リンクの期限が切れた時や、メールが届いていない時に使う。
import { getSupabase } from '@/lib/supabase';
import { sendProviderLoginInvite } from '@/lib/provider-login-invite';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

export async function POST(request, props) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  const { data: provider } = await supabase.from('providers').select('name, email').eq('id', id).maybeSingle();
  if (!provider) return Response.json({ error: 'お店が見つかりません' }, { status: 404 });
  if (!provider.email) return Response.json({ error: 'メールアドレスが登録されていません' }, { status: 400 });
  try {
    await sendProviderLoginInvite(supabase, { email: provider.email, providerName: provider.name });
    return Response.json({ ok: true, email: provider.email });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
