// GET    /api/provider/closed-dates → 自店舗の臨時休業日一覧（今日以降）
// POST   /api/provider/closed-dates → 臨時休業日を追加
// DELETE /api/provider/closed-dates?date=YYYY-MM-DD → 臨時休業日を削除
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const { data, error } = await supabase
    .from('provider_closed_dates')
    .select('date, reason')
    .eq('provider_id', provider.id)
    .gte('date', today)
    .order('date', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { date, reason } = await request.json().catch(() => ({}));
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: '日付を指定してください' }, { status: 400 });

  const { error } = await supabase.from('provider_closed_dates').upsert({ provider_id: provider.id, date, reason: reason || null });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 既にその日に自動生成された空き枠があれば締め切る（でお要望に沿い、臨時休業に
  // したらその日の予約枠は実際に受け付けなくなるようにする）。
  await supabase.from('provider_slots').update({ is_open: false }).eq('provider_id', provider.id).eq('date', date);

  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return Response.json({ error: '日付を指定してください' }, { status: 400 });

  const { error } = await supabase.from('provider_closed_dates').delete().eq('provider_id', provider.id).eq('date', date);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
