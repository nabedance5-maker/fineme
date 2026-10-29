// GET /api/provider/broadcasts/[id] → 配信の宛先ごとの結果（届いた・開いた・押した・送れなかった理由）
// DELETE → 予約中の配信を取り消す
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: b } = await supabase.from('provider_broadcasts').select('id, status, user_ids').eq('id', id).eq('provider_id', a.provider.id).maybeSingle();
  if (!b) return Response.json({ error: '見つかりません' }, { status: 404 });
  const { data: rec } = await supabase.from('provider_broadcast_recipients').select('user_id, channel, status, reason, opened_at, clicked_at').eq('broadcast_id', id).limit(2000);
  const uids = (rec || []).map(r => r.user_id).concat(b.status === 'scheduled' ? b.user_ids : []);
  const names = {};
  for (let i = 0; i < uids.length; i += 300) {
    const part = uids.slice(i, i + 300);
    const [{ data: prof }, { data: cp }] = await Promise.all([
      supabase.from('profiles').select('id, display_name, last_name, first_name').in('id', part),
      supabase.from('provider_customer_profiles').select('user_id, last_name, first_name').eq('provider_id', a.provider.id).in('user_id', part),
    ]);
    (prof || []).forEach(p => { names[p.id] = [p.last_name, p.first_name].filter(Boolean).join(' ') || p.display_name; });
    (cp || []).forEach(p => { const n = [p.last_name, p.first_name].filter(Boolean).join(' '); if (n) names[p.user_id] = n; });
  }
  return Response.json({
    recipients: (rec || []).map(r => ({ ...r, name: names[r.user_id] || 'お客様' })),
    planned: b.status === 'scheduled' ? b.user_ids.map(u => ({ user_id: u, name: names[u] || 'お客様' })) : [],
  });
}

async function __DELETE(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await supabase.from('provider_broadcasts').update({ status: 'cancelled' }).eq('id', id).eq('provider_id', a.provider.id).eq('status', 'scheduled').select('id').maybeSingle();
  if (!data) return Response.json({ error: 'すでに配信済みか、取り消せない状態です' }, { status: 409 });
  return Response.json({ ok: true });
}
export const DELETE = withAudit(__DELETE);
