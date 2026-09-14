// GET   /api/provider/business-hours → 自店舗の営業時間・枠の刻み幅設定
// PATCH /api/provider/business-hours → 更新
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

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

export async function PATCH(request) {
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

  const { data, error } = await supabase.from('providers').update(update).eq('id', provider.id).select('business_hours, slot_duration_minutes').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}
