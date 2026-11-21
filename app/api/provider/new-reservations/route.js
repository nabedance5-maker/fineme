// GET /api/provider/new-reservations?since=ISO → since より後にお客様が入れた予約（2026-11-21 渡邉判断）。
// 管理画面が1分ごとに聞きに来て「予約が入りました」を出す。声かけ（1人ずつ・まとめて・メッセージ配信）を
// 送ってから30日以内のお客様の予約には from_outreach を付ける（画面で「声かけから」と出す）。
// - ログイン中の店舗の予約だけ。お店が自分で入れた予約（manual）は出さない
// - 返すのは画面に出す項目だけ（連絡先・メモは返さない）。さかのぼるのは最大24時間・20件まで
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const DAY = 86400000;

export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: provider } = await supabase.from('providers').select('id').eq('email', user.email).single();
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const now = Date.now();
  const raw = new URL(request.url).searchParams.get('since');
  const t = raw ? new Date(raw).getTime() : NaN;
  const since = new Date(Number.isNaN(t) ? now : Math.max(t, now - DAY)).toISOString();

  const { data: rows } = await supabase.from('reservations')
    .select('id, user_id, user_name, status, booking_mode, reserved_date, start_time, confirmed_date, confirmed_time, service_id, created_at')
    .eq('provider_id', provider.id).gt('created_at', since).or('booking_mode.is.null,booking_mode.neq.manual')
    .order('created_at', { ascending: true }).limit(20);
  const list = (rows || []).filter(r => !['cancelled', 'rejected'].includes(r.status));
  if (!list.length) return Response.json({ items: [], now: new Date(now).toISOString() });

  const uids = [...new Set(list.map(r => r.user_id).filter(Boolean))];
  const svcIds = [...new Set(list.map(r => r.service_id).filter(Boolean))];
  const outreachSince = new Date(now - 31 * DAY).toISOString();
  const [{ data: rec }, { data: logs }, { data: svcs }] = await Promise.all([
    uids.length ? supabase.from('provider_broadcast_recipients').select('user_id, created_at').eq('provider_id', provider.id).eq('status', 'sent').in('user_id', uids).gte('created_at', outreachSince).limit(500) : { data: [] },
    uids.length ? supabase.from('provider_activity_logs').select('target_id, occurred_at').eq('provider_id', provider.id).eq('action_label', '顧客への声かけを送信').in('target_id', uids).gte('occurred_at', outreachSince).limit(500) : { data: [] },
    svcIds.length ? supabase.from('provider_services').select('id, name').eq('provider_id', provider.id).in('id', svcIds) : { data: [] },
  ]);
  const touched = {};
  (rec || []).forEach(r => (touched[r.user_id] ||= []).push(new Date(r.created_at).getTime()));
  (logs || []).forEach(l => (touched[l.target_id] ||= []).push(new Date(l.occurred_at).getTime()));
  const svcName = Object.fromEntries((svcs || []).map(s => [s.id, s.name]));

  const items = list.map(r => {
    const created = new Date(r.created_at).getTime();
    const fromOutreach = !!r.user_id && (touched[r.user_id] || []).some(ts => ts <= created && created - ts <= 30 * DAY);
    return {
      id: r.id,
      name: String(r.user_name || '').slice(0, 40),
      date: r.confirmed_date || r.reserved_date || null,
      time: String(r.confirmed_time || r.start_time || '').slice(0, 5) || null,
      menu: svcName[r.service_id] || null,
      instant: r.booking_mode === 'instant',
      from_outreach: fromOutreach,
      created_at: r.created_at,
    };
  });
  return Response.json({ items, now: new Date(now).toISOString() });
}
