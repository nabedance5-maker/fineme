// GET  /api/provider/packages → 自店舗が作成した回数券・パッケージ定義の一覧
// POST /api/provider/packages → 新規パッケージ定義を作成
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('service_packages')
    .select('id, name, total_sessions, price, validity_days, active, created_at, package_type, combo_ticket_sessions')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, total_sessions, price, validity_days, package_type, combo_ticket_sessions } = await request.json().catch(() => ({}));
  if (!name?.trim()) return Response.json({ error: 'nameは必須です' }, { status: 400 });

  // 複合プラン（hacomono/STORES網羅計画 Phase 2）：通い放題（unlimited）はセッション数の
  // 概念が無いためtotal_sessions不要。fixed_count・comboは従来通り1以上の整数が必須。
  const type = ['fixed_count', 'unlimited', 'combo'].includes(package_type) ? package_type : 'fixed_count';
  const sessions = parseInt(total_sessions, 10);
  if (type !== 'unlimited' && (!Number.isInteger(sessions) || sessions <= 0)) {
    return Response.json({ error: 'total_sessions（1以上の整数）は必須です' }, { status: 400 });
  }
  const comboSessions = parseInt(combo_ticket_sessions, 10);

  const { data, error } = await supabase
    .from('service_packages')
    .insert({
      provider_id: provider.id,
      name: name.trim(),
      total_sessions: type === 'unlimited' ? null : sessions,
      price: Number.isFinite(parseInt(price, 10)) ? parseInt(price, 10) : null,
      validity_days: Number.isFinite(parseInt(validity_days, 10)) ? parseInt(validity_days, 10) : null,
      package_type: type,
      combo_ticket_sessions: type === 'combo' && Number.isInteger(comboSessions) && comboSessions > 0 ? comboSessions : null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
