// POST /api/provider/customer-card-link { user_id | manual_id, send? } → お客様に、お店のレジで使うカードを登録してもらうURLを作る
// （2026-11-12 渡邉要望：月額会員以外にも、任意のタイミングでカード登録のURLを送れるように）。send なら LINE・メールで送る。
// URLは7日間有効（lib/card-setup-link.js）。登録だけでは請求しない。非会員のお客様は、カードを持てるアカウントを用意して紐づける。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { memberAuth } from '@/lib/provider-members';
import { withAudit } from '@/lib/activity-log';
import { isStoreCustomer, ensureManualLinked } from '@/lib/customer-accounts';
import { cardSetupLink, LINK_DAYS } from '@/lib/card-setup-link';
import { notifyCustomerLine } from '@/lib/reservation-notify';
import { sendCardSetupLinkEmail } from '@/lib/email';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: provider } = await supabase.from('providers').select('id, name, stripe_connect_id, stripe_connect_status').eq('id', a.provider.id).single();
  if (!provider?.stripe_connect_id || provider.stripe_connect_status !== 'active') return Response.json({ error: 'カードでのお支払いの受け付け（決済の設定）が済んでいません' }, { status: 409 });
  const b = await request.json().catch(() => ({}));

  let userId = null, manualEmail = null;
  if (b.user_id && UUID.test(b.user_id)) {
    if (!(await isStoreCustomer(provider.id, b.user_id))) return Response.json({ error: 'このお店のお客様ではありません' }, { status: 404 });
    userId = b.user_id;
  } else if (b.manual_id && UUID.test(b.manual_id)) {
    const { data: mc } = await supabase.from('provider_manual_customers').select('id').eq('id', b.manual_id).eq('provider_id', provider.id).maybeSingle();
    if (!mc) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });
    const r = await ensureManualLinked(provider.id, mc.id).catch(e => ({ error: e.message }));
    if (!r?.userId) return Response.json({ error: 'お客様の準備ができませんでした' }, { status: 500 });
    userId = r.userId;
    const { data: cp } = await supabase.from('provider_customer_profiles').select('email').eq('provider_id', provider.id).eq('manual_customer_id', mc.id).maybeSingle();
    manualEmail = cp?.email || null;
  } else return Response.json({ error: 'お客様を選んでください' }, { status: 400 });

  const url = cardSetupLink(provider.id, userId);
  const sent = { line: false, email: false };
  if (b.send) {
    const { data: prof } = await supabase.from('profiles').select('line_user_id').eq('id', userId).maybeSingle();
    const { data: link } = await supabase.from('provider_customer_line_links').select('store_line_user_id').eq('provider_id', provider.id).eq('user_id', userId).maybeSingle();
    if (prof?.line_user_id || link?.store_line_user_id) {
      await notifyCustomerLine(supabase, { userId, providerId: provider.id, message: `【${provider.name}】お会計用のカードの登録のご案内です。\n登録しておくと、お店で会員証を見せるだけでお支払いできます（登録だけでは請求されません）。\n${url}\n（${LINK_DAYS}日間有効）` });
      sent.line = true;
    }
    const { data: cp } = await supabase.from('provider_customer_profiles').select('email').eq('provider_id', provider.id).eq('user_id', userId).maybeSingle();
    const { data: { user } = {} } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: {} }));
    const authEmail = user?.email && !/@line\.fineme\.me$|\.invalid$/.test(user.email) ? user.email : null;
    const to = cp?.email || manualEmail || authEmail;
    if (to) {
      try { await sendCardSetupLinkEmail({ to, providerName: provider.name, url, days: LINK_DAYS }); sent.email = true; } catch (e) { console.error('[card-link email]', e?.message); }
    }
  }
  return Response.json({ url, user_id: userId, sent, days: LINK_DAYS });
}
export const POST = withAudit(__POST);
