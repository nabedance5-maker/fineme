// GET /api/me/reservations → ログイン中のお客様の予約（店舗横断）。マイページのホーム・予約履歴で使う（2026-10-22）。
// これまでは「予約時のメールアドレス」で照合していたため、ログインして予約した予約（チケット予約・即時予約など、
// 連絡先にメール以外も入るもの）が出ないことがあった。アカウント（user_id）を正とし、同じメールのゲスト予約も含める。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const COLS = 'id,provider_id,user_id,user_contact,status,reserved_date,start_time,confirmed_date,confirmed_time,counter_date,counter_time,counter_expires_at,provider_comment,note,service_id,class_id,staff_id,created_at';

export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: mine }, { data: byMail }] = await Promise.all([
    supabase.from('reservations').select(COLS).eq('user_id', user.id).order('created_at', { ascending: false }).limit(300),
    user.email ? supabase.from('reservations').select(COLS).is('user_id', null).eq('user_contact', user.email).order('created_at', { ascending: false }).limit(100) : { data: [] },
  ]);
  const rows = [...(mine || []), ...(byMail || [])];
  if (!rows.length) return Response.json([]);
  const pids = [...new Set(rows.map(r => r.provider_id))];
  const sids = [...new Set(rows.map(r => r.service_id).filter(Boolean))];
  const cids = [...new Set(rows.map(r => r.class_id).filter(Boolean))];
  const [{ data: provs }, { data: svcs }, { data: cls }, { data: uses }] = await Promise.all([
    supabase.from('providers').select('id, name, slug').in('id', pids),
    sids.length ? supabase.from('provider_services').select('id, name').in('id', sids) : { data: [] },
    cids.length ? supabase.from('provider_classes').select('id, name').in('id', cids) : { data: [] },
    // チケットを使った予約か（予約のDBトリガーが package_usages に予約IDつきで記録する）
    supabase.from('package_usages').select('reservation_id').in('reservation_id', rows.map(r => r.id)).is('undone_at', null),
  ]);
  const ticketUsed = {};
  (uses || []).forEach(u => { ticketUsed[u.reservation_id] = (ticketUsed[u.reservation_id] || 0) + 1; });
  const P = Object.fromEntries((provs || []).map(p => [p.id, p]));
  const S = Object.fromEntries((svcs || []).map(s => [s.id, s.name]));
  const C = Object.fromEntries((cls || []).map(c => [c.id, c.name]));
  return Response.json(rows.map(r => {
    const menuFromNote = (r.note || '').match(/【メニュー】([^\n]+)/)?.[1] || null;
    return {
      ...r,
      provider_name: P[r.provider_id]?.name || '',
      provider_slug: P[r.provider_id]?.slug || null,
      menu_name: S[r.service_id] || C[r.class_id] || menuFromNote,
      is_lesson: !!r.class_id,
      tickets_used: ticketUsed[r.id] || 0,
      // 実際に行く日時：確定していればその日時、まだならお客様の第1希望
      date: r.confirmed_date || r.reserved_date || null,
      time: String(r.confirmed_time || r.start_time || '').slice(0, 5) || null,
    };
  }));
}
