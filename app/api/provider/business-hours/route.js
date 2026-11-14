// GET   /api/provider/business-hours → 自店舗の営業時間・枠の刻み幅設定
// PATCH /api/provider/business-hours → 更新
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { activeReservationsBetween, reservationListText, hmToMinutes } from '@/lib/shift-reservation-guard';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase.from('providers').select('business_hours, slot_duration_minutes').eq('id', provider.id).single();

  return Response.json({
    business_hours: data?.business_hours || {},
    slot_duration_minutes: data?.slot_duration_minutes || 60,
  });
}

async function __PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (body.business_hours && typeof body.business_hours === 'object') {
    const cleaned = {};
    WEEKDAYS.forEach(w => {
      const d = body.business_hours[w];
      if (!d) return;
      cleaned[w] = { closed: !!d.closed, open: d.open || null, close: d.close || null };
    });
    update.business_hours = cleaned;
  }
  if (Number.isFinite(body.slot_duration_minutes) && body.slot_duration_minutes > 0) {
    update.slot_duration_minutes = body.slot_duration_minutes;
  }
  if (!Object.keys(update).length) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  // 営業時間を変えると、もう入っている予約が営業時間の外になる時は保存しない（2026-11-15 渡邉要望：あり得ない状態は設定させない）。
  // 元から営業時間の外だった予約（以前の設定のまま残っている分）は、今回の変更のせいではないので止めない。
  if (update.business_hours) {
    const { data: cur } = await supabase.from('providers').select('business_hours').eq('id', provider.id).single();
    const KEY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const inside = (bh, r) => {
      const d = bh?.[KEY[new Date(`${r.date}T00:00:00Z`).getUTCDay()]];
      if (!d) return true; // その曜日の設定が無い＝制限なし
      if (d.closed) return false;
      if (d.open && r.start < hmToMinutes(d.open)) return false;
      if (d.close && r.end > hmToMinutes(d.close)) return false;
      return true;
    };
    const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const until = new Date(Date.now() + (9 + 24 * 366) * 3600000).toISOString().slice(0, 10);
    const list = await activeReservationsBetween(supabase, { providerId: provider.id, from: today, to: until });
    const hit = list.filter(r => !r.class_id && inside(cur?.business_hours || {}, r) && !inside(update.business_hours, r));
    if (hit.length) {
      return Response.json({ error: `この営業時間にすると、営業時間の外になる予約が${hit.length}件あります（${reservationListText(hit)}）。先に予約の日時を変えるか、営業時間をその予約が入る形にしてください。`, reservations: hit }, { status: 409 });
    }
  }

  const { data, error } = await supabase.from('providers').update(update).eq('id', provider.id).select('business_hours, slot_duration_minutes').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}

export const PATCH = withAudit(__PATCH);
