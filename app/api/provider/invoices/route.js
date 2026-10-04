// GET  /api/provider/invoices → 請求の一覧（新しい順）と合計
// POST /api/provider/invoices → 請求を作り、お客様へのお支払いリンクを発行（会員にはLINEでも知らせる）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { notifyCustomerLine } from '@/lib/reservation-notify';
import { hasCustomerRelation, payUrl } from '@/lib/invoices';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProvider(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug, name, stripe_connect_id, stripe_connect_status').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('provider_invoices')
    .select('id, user_id, manual_customer_id, customer_name, title, amount, note, due_date, status, paid_method, paid_at, created_at')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    invoices: (data || []).map(i => ({ ...i, pay_url: payUrl(i.id) })),
    online_ready: !!provider.stripe_connect_id && provider.stripe_connect_status === 'active',
  });
}

async function __POST(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = (body.title || '').toString().trim();
  const amount = parseInt(body.amount, 10);
  const note = (body.note || '').toString().trim() || null;
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(body.due_date || '') ? body.due_date : null;
  let userId = body.user_id || null;
  let manualId = body.manual_customer_id || null;
  let customerName = (body.customer_name || '').toString().trim() || null;

  if (!title) return Response.json({ error: '請求の内容を入力してください' }, { status: 400 });
  if (!Number.isInteger(amount) || amount < 1 || amount > 1000000) return Response.json({ error: '金額は1円以上100万円以下で入力してください' }, { status: 400 });
  if (userId && manualId) return Response.json({ error: '対象のお客様は1人だけ指定してください' }, { status: 400 });

  if (userId) {
    if (!(await hasCustomerRelation(supabase, provider.id, userId, provider.slug))) {
      return Response.json({ error: 'この会員は貴店のお客様として確認できません' }, { status: 403 });
    }
    const { data: prof } = await supabase.from('profiles').select('last_name, first_name, display_name').eq('id', userId).single();
    customerName = customerName || [prof?.last_name, prof?.first_name].filter(Boolean).join(' ') || prof?.display_name || null;
  } else if (manualId) {
    const { data: mc } = await supabase.from('provider_manual_customers').select('display_name').eq('id', manualId).eq('provider_id', provider.id).single();
    if (!mc) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });
    customerName = customerName || mc.display_name;
  }

  const { data: invoice, error } = await supabase.from('provider_invoices')
    .insert({ provider_id: provider.id, user_id: userId, manual_customer_id: manualId, customer_name: customerName, title, amount, note, due_date: dueDate })
    .select('id, title, amount').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const url = payUrl(invoice.id);
  let notified = false;
  if (userId) {
    await notifyCustomerLine(supabase, {
      userId, providerId: provider.id,
      message: `${provider.name}より、お支払いのご案内です。\n\n内容：${title}\n金額：¥${amount.toLocaleString()}${dueDate ? `\nお支払い期限：${dueDate}` : ''}\n\n下のリンクからお支払いいただけます。\n${url}`,
    });
    notified = true;
  }
  return Response.json({ id: invoice.id, pay_url: url, notified }, { status: 201 });
}

export const POST = withAudit(__POST);
