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
    .select('id, name, total_sessions, price, validity_days, expires_on, active, created_at, package_type, combo_ticket_sessions, recurring_sessions')
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

  const { name, total_sessions, price, validity_days, expires_on, package_type, combo_ticket_sessions, recurring_sessions } = await request.json().catch(() => ({}));
  if (!name?.trim()) return Response.json({ error: 'nameは必須です' }, { status: 400 });

  // 複合プラン（hacomono/STORES網羅計画 Phase 2）：通い放題（unlimited）はセッション数の
  // 概念が無いためtotal_sessions不要。fixed_count・comboは従来通り1以上の整数が必須。
  // subscription（でお要望2026-09-14：「月額契約で毎月チケットが自動付与される」仕組み）は
  // total_sessionsを「初回付与分」として使い、recurring_sessionsに毎月の付与数を持たせる。
  const type = ['fixed_count', 'unlimited', 'combo', 'subscription'].includes(package_type) ? package_type : 'fixed_count';
  const sessions = parseInt(total_sessions, 10);
  const comboSessions = parseInt(combo_ticket_sessions, 10);
  // comboは「回数」ではなく「付帯チケット回数」が実際にお客様へ発行されるチケット数
  // （でお指摘2026-09-16：「回数と付帯チケット回数って何が違うの？」を受けて調査した
  // ところ、従来は「回数」を入力させていたのにcustomer_packages発行時は無視され
  // combo_ticket_sessionsも一切使われていない実害バグだった。comboは
  // combo_ticket_sessionsだけを唯一の入力にし、total_sessionsにもそのまま複製する）。
  if (type === 'fixed_count' && (!Number.isInteger(sessions) || sessions <= 0)) {
    return Response.json({ error: '回数（1以上の整数）は必須です' }, { status: 400 });
  }
  if (type === 'subscription' && (!Number.isInteger(sessions) || sessions <= 0)) {
    return Response.json({ error: '初回付与回数（1以上の整数）は必須です' }, { status: 400 });
  }
  if (type === 'combo' && (!Number.isInteger(comboSessions) || comboSessions <= 0)) {
    return Response.json({ error: '付帯チケット回数（1以上の整数）は必須です' }, { status: 400 });
  }
  const recurringSessions = parseInt(recurring_sessions, 10);
  if (type === 'subscription' && (!Number.isInteger(recurringSessions) || recurringSessions <= 0)) {
    return Response.json({ error: '毎月の付与回数（1以上の整数）は必須です' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('service_packages')
    .insert({
      provider_id: provider.id,
      name: name.trim(),
      total_sessions: type === 'unlimited' ? null : (type === 'combo' ? comboSessions : sessions),
      price: Number.isFinite(parseInt(price, 10)) ? parseInt(price, 10) : null,
      // expires_on（カレンダー絶対日付）を設定した場合はvalidity_days（購入からの日数）
      // を使わない。どちらか一方のみ有効にする（下のcustomer-packages側で優先順位を判定）。
      validity_days: expires_on ? null : (Number.isFinite(parseInt(validity_days, 10)) ? parseInt(validity_days, 10) : null),
      expires_on: expires_on || null,
      package_type: type,
      combo_ticket_sessions: type === 'combo' ? comboSessions : null,
      recurring_sessions: type === 'subscription' ? recurringSessions : null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
