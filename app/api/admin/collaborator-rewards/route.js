// GET   /api/admin/collaborator-rewards?month=YYYY-MM[&format=csv] → 協業者ごとの月次報酬（admin専用）
// PATCH /api/admin/collaborator-rewards { partner_id, month, status: 'paid'|'pending' } → 月末締め・翌月末払いの支払い管理
//
// 協業者報酬の仕様は lib/collaborator-rewards.js を参照（業務委託契約書第4条）。
// 支払いは当面手動振込（でお方針）。ここでは「支払済」の記録だけを持つ。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const month = url.searchParams.get('month');

  const { data: partners } = await supabase
    .from('sales_partners').select('id, name, referral_code').eq('is_collaborator', true);

  let q = supabase.from('collaborator_rewards')
    .select('id, partner_id, provider_id, reward_month, kind, basis_amount, rate, amount, status, paid_at, note, providers(name)')
    .order('reward_month', { ascending: false });
  if (month) q = q.eq('reward_month', month);
  const { data: rows, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const nameOf = Object.fromEntries((partners || []).map(p => [p.id, p.name]));

  if (url.searchParams.get('format') === 'csv') {
    const head = ['月', '協業者', '掲載者', '種別', '受領額(税抜)', '率', '報酬', '状況', '支払日', '備考'];
    const lines = [head.join(',')].concat((rows || []).map(r => [
      r.reward_month, nameOf[r.partner_id] || r.partner_id, r.providers?.name || '',
      r.kind === 'override' ? '継続10%' : '紹介初月90%', r.basis_amount, r.rate, r.amount,
      r.status, r.paid_at ? r.paid_at.slice(0, 10) : '', r.note || '',
    ].map(csvCell).join(',')));
    return new Response('﻿' + lines.join('\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="collaborator-rewards-${month || 'all'}.csv"` },
    });
  }

  const summary = (partners || []).map(p => {
    const mine = (rows || []).filter(r => r.partner_id === p.id && r.status !== 'void');
    return {
      partner_id: p.id, name: p.name, referral_code: p.referral_code,
      pending: mine.filter(r => r.status === 'pending').reduce((a, r) => a + r.amount, 0),
      paid: mine.filter(r => r.status === 'paid').reduce((a, r) => a + r.amount, 0),
      rows: (rows || []).filter(r => r.partner_id === p.id).map(r => ({
        id: r.id, month: r.reward_month, provider_name: r.providers?.name || '', kind: r.kind,
        basis: r.basis_amount, rate: Number(r.rate), amount: r.amount, status: r.status, paid_at: r.paid_at, note: r.note,
      })),
    };
  });
  return Response.json({ month: month || null, summary });
}

export async function PATCH(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { partner_id, month, status } = await request.json().catch(() => ({}));
  if (!partner_id || !month || !['paid', 'pending'].includes(status)) {
    return Response.json({ error: 'partner_id・month・status(paid/pending)は必須です' }, { status: 400 });
  }
  const { data, error } = await supabase.from('collaborator_rewards')
    .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
    .eq('partner_id', partner_id).eq('reward_month', month).neq('status', 'void')
    .select('id');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ updated: (data || []).length });
}
