// GET  /api/admin/sales-outreach → 送信状況の集計
// POST /api/admin/sales-outreach → 未送信の店舗に営業メールを送る（admin専用）
//   body: { limit?: number(最大50), rank?: 'A'|'B'|'C', category?: 'gym'|'brow', dryRun?: boolean }
//   dryRun=true は送らずに宛先と文面のプレビューだけ返す。
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { SENDER, buildOutreachEmail } from '@/lib/sales-outreach';

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
function checkAdmin(request) {
  const key = request.headers.get('x-admin-key');
  return Boolean(key && ADMIN_KEY && key === ADMIN_KEY);
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await getSupabase().from('sales_outreach').select('status, rank, category');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const counts = {};
  (data || []).forEach((r) => {
    const k = `${r.status}/${r.rank}/${r.category}`;
    counts[k] = (counts[k] || 0) + 1;
  });
  return Response.json({ total: data?.length || 0, counts, senderAddressSet: Boolean(SENDER.address) });
}

export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 50);
  const dryRun = body.dryRun !== false;

  const sb = getSupabase();
  let q = sb.from('sales_outreach').select('id, email, shop_name, category, rank, unsubscribe_token').eq('status', 'queued');
  if (['A', 'B', 'C'].includes(body.rank)) q = q.eq('rank', body.rank);
  if (['gym', 'brow'].includes(body.category)) q = q.eq('category', body.category);
  const { data: leads, error } = await q.order('rank').order('created_at').limit(limit);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (dryRun) {
    return Response.json({
      dryRun: true,
      count: leads.length,
      preview: leads.slice(0, 3).map((l) => ({ to: l.email, ...buildOutreachEmail(l) })),
      recipients: leads.map((l) => `${l.rank} ${l.category} ${l.shop_name} <${l.email}>`),
    });
  }

  if (!SENDER.address) return Response.json({ error: '送信者の住所が未設定のため送信できません（特定電子メール法の表示義務）' }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return Response.json({ error: 'RESEND_API_KEY未設定' }, { status: 500 });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results = [];
  for (const lead of leads) {
    const { subject, text, html } = buildOutreachEmail(lead);
    const unsubUrl = `https://www.fineme.me/sales-unsubscribe?t=${lead.unsubscribe_token}`;
    try {
      const { data, error: sendError } = await resend.emails.send({
        from: SENDER.from,
        to: lead.email,
        replyTo: SENDER.email,
        subject,
        text,
        html,
        headers: { 'List-Unsubscribe': `<${unsubUrl}>, <mailto:${SENDER.email}?subject=unsubscribe>` },
      });
      if (sendError) throw new Error(sendError.message || JSON.stringify(sendError));
      await sb.from('sales_outreach').update({ status: 'sent', sent_at: new Date().toISOString(), message_id: data?.id || null, error: null }).eq('id', lead.id);
      results.push({ email: lead.email, ok: true });
    } catch (e) {
      await sb.from('sales_outreach').update({ status: 'failed', error: String(e.message).slice(0, 500) }).eq('id', lead.id);
      results.push({ email: lead.email, ok: false, error: e.message });
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return Response.json({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
}
