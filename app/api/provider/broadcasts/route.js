// GET/POST /api/provider/broadcasts → メッセージ配信の履歴・作成（でお要望 2026-10-19：hacomono差分 #6）
// 今すぐ送るならその場で配信、日時を指定したら予約（cronが時刻になったら送る）。
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { deliverBroadcast, extractLinks, MAX_RECIPIENTS } from '@/lib/broadcast';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: rows } = await supabase.from('provider_broadcasts')
    .select('id, channel, subject, body_text, segment_label, status, scheduled_at, sent_at, created_by, target_count, line_sent, email_sent, skipped, failed, created_at, user_ids')
    .eq('provider_id', a.provider.id).order('created_at', { ascending: false }).limit(50);
  const ids = (rows || []).filter(r => r.status === 'sent').map(r => r.id);
  const stats = {};
  if (ids.length) {
    const { data: rec } = await supabase.from('provider_broadcast_recipients').select('broadcast_id, channel, opened_at, clicked_at').in('broadcast_id', ids).not('channel', 'is', null).limit(50000);
    (rec || []).forEach(r => {
      const s = stats[r.broadcast_id] || (stats[r.broadcast_id] = { opened: 0, clicked: 0 });
      if (r.opened_at) s.opened++;
      if (r.clicked_at) s.clicked++;
    });
  }
  return Response.json((rows || []).map(({ user_ids, ...r }) => ({ ...r, planned_count: user_ids?.length || 0, opened: stats[r.id]?.opened || 0, clicked: stats[r.id]?.clicked || 0 })));
}

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const channel = ['line', 'email', 'line_then_email'].includes(b.channel) ? b.channel : 'line_then_email';
  const body = String(b.body_text || '').trim();
  const subject = String(b.subject || '').trim().slice(0, 120);
  const ids = Array.isArray(b.user_ids) ? [...new Set(b.user_ids.filter(x => typeof x === 'string'))] : [];
  if (!body) return Response.json({ error: '本文を入れてください' }, { status: 400 });
  if (body.length > 4000) return Response.json({ error: '本文は4,000文字以内にしてください' }, { status: 400 });
  if (channel !== 'line' && !subject) return Response.json({ error: 'メールの件名を入れてください' }, { status: 400 });
  if (!ids.length) return Response.json({ error: '送る相手がいません' }, { status: 400 });
  if (ids.length > MAX_RECIPIENTS) return Response.json({ error: `一度に送れるのは${MAX_RECIPIENTS}名までです` }, { status: 400 });

  let when = b.scheduled_at ? new Date(b.scheduled_at) : null;
  if (when && Number.isNaN(when.getTime())) return Response.json({ error: '配信日時が正しくありません' }, { status: 400 });
  if (when && when.getTime() > Date.now() + 365 * 86400000) return Response.json({ error: '配信日時は1年以内にしてください' }, { status: 400 });
  const scheduled = when && when.getTime() > Date.now() + 60000;

  const { data: row, error } = await supabase.from('provider_broadcasts').insert({
    provider_id: a.provider.id, channel, subject: subject || null, body_text: body,
    segment_label: String(b.segment_label || '').slice(0, 200) || null, user_ids: ids, links: extractLinks(body),
    status: scheduled ? 'scheduled' : 'sending', scheduled_at: scheduled ? when.toISOString() : new Date().toISOString(),
    started_at: scheduled ? null : new Date().toISOString(), created_by: a.user.fineme_member?.name || 'オーナー', target_count: ids.length,
  }).select().single();
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  if (scheduled) return Response.json({ ok: true, scheduled: true, id: row.id, scheduled_at: row.scheduled_at });

  try {
    const r = await deliverBroadcast(supabase, row);
    return Response.json({ ok: true, id: row.id, ...r });
  } catch (e) {
    console.error('[broadcasts]', e?.message);
    await supabase.from('provider_broadcasts').update({ status: 'failed' }).eq('id', row.id);
    return Response.json({ error: '配信できませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
  }
}
export const POST = withAudit(__POST);
