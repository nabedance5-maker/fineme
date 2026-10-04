// PATCH /api/provider/invoices/[id] → { action: 'cancel' | 'mark_paid' }
//   cancel   : 未払いの請求を取り消す（お支払いリンクも使えなくなる）
//   mark_paid: 現金などで受け取った請求を入金済みにする（売上管理にも記録）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { markInvoicePaid } from '@/lib/invoices';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProvider(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { action } = await request.json().catch(() => ({}));

  const { data: inv } = await supabase.from('provider_invoices').select('id, status').eq('id', id).eq('provider_id', provider.id).maybeSingle();
  if (!inv) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (inv.status !== 'unpaid') return Response.json({ error: '未払いの請求のみ操作できます' }, { status: 409 });

  if (action === 'cancel') {
    const { error } = await supabase.from('provider_invoices').update({ status: 'canceled' }).eq('id', id).eq('status', 'unpaid');
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }
  if (action === 'mark_paid') {
    const paid = await markInvoicePaid(supabase, id, { method: 'offline' });
    if (!paid) return Response.json({ error: '既に処理されています' }, { status: 409 });
    return Response.json({ ok: true });
  }
  return Response.json({ error: 'action が不正です' }, { status: 400 });
}

export const PATCH = withAudit(__PATCH);
