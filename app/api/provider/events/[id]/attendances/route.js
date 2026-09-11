// GET  /api/provider/events/[id]/attendances → 出欠状況一覧
// POST /api/provider/events/[id]/attendances → 出欠確認をLINEで送信（招待）
// 既存のLINE往復インフラ（lib/reservation-notify.jsのnotifyCustomerLine・クイックリプライ）を
// そのまま再利用する（hacomono/STORES網羅計画 Phase 5・でお方針：既存コードへの変更は追加のみ）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { notifyCustomerLine } from '@/lib/reservation-notify';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name').eq('email', user.email).single();
  return data || null;
}

async function getOwnedEvent(providerId, id) {
  const { data } = await supabase.from('provider_events').select('*').eq('id', id).eq('provider_id', providerId).single();
  return data || null;
}

export async function GET(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const event = await getOwnedEvent(provider.id, params.id);
  if (!event) return Response.json({ error: 'イベントが見つかりません' }, { status: 404 });

  const { data: rows, error } = await supabase
    .from('provider_event_attendances')
    .select('id, user_id, status, invited_at, responded_at')
    .eq('event_id', event.id)
    .order('invited_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return Response.json([]);

  const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', rows.map(r => r.user_id));
  const nameMap = {};
  (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });

  return Response.json(rows.map(r => ({ ...r, customer_name: nameMap[r.user_id] || '(名前未設定)' })));
}

export async function POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const event = await getOwnedEvent(provider.id, params.id);
  if (!event) return Response.json({ error: 'イベントが見つかりません' }, { status: 404 });

  const { user_ids } = await request.json().catch(() => ({}));
  if (!Array.isArray(user_ids) || !user_ids.length) return Response.json({ error: 'user_idsが必要です' }, { status: 400 });

  // 既に招待済みのユーザーは重複送信しない
  const { data: existing } = await supabase.from('provider_event_attendances').select('user_id').eq('event_id', event.id).in('user_id', user_ids);
  const existingIds = new Set((existing || []).map(r => r.user_id));
  const newUserIds = user_ids.filter(id => !existingIds.has(id));
  if (!newUserIds.length) return Response.json({ sent: 0 });

  const { data: inserted, error } = await supabase
    .from('provider_event_attendances')
    .insert(newUserIds.map(user_id => ({ event_id: event.id, user_id, status: 'invited' })))
    .select();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const whenText = `${event.event_date}${event.start_time ? ' ' + event.start_time : ''}`;
  let sent = 0;
  for (const att of inserted) {
    await notifyCustomerLine(supabase, {
      userId: att.user_id,
      providerId: provider.id,
      message: `【${provider.name}】イベントのご案内\n「${event.title}」（${whenText}）\nご参加いただけますか？`,
      quickReplyItems: [
        { label: '参加する', data: `action=attend_event&aid=${att.id}`, displayText: '参加します' },
        { label: '不参加', data: `action=decline_event&aid=${att.id}`, displayText: '今回は不参加です' },
      ],
    });
    sent++;
  }

  return Response.json({ sent });
}
