// POST /api/provider/consultant/send { stage, body_text, channel?, subject?, scheduled_at?, preview? }
// AI専属コンサルが作った声かけを、その段階のお客様全員へメッセージ配信で送る（認証済み・店舗が押した時だけ）。
// preview: true なら送らずに、送る人数と除く人数だけ返す。直近14日にAIコンサル経由で送った方は除く。
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import { authProvider, supabase, consultantEnabled } from '../_lib';
import { gatherContext } from '@/lib/consultant-journey';
import { gatherInsight, STAGES } from '@/lib/consultant-insight';
import { deliverBroadcast, extractLinks, MAX_RECIPIENTS } from '@/lib/broadcast';
import { outreachLabel, recentOutreachUserIds, COOLDOWN_DAYS } from '@/lib/consultant-outreach';
import { withAudit } from '@/lib/activity-log';

async function __POST(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!consultantEnabled(provider)) return Response.json({ error: 'AI専属コンサルはオフになっています' }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const stage = STAGES.find(s => s.key === b.stage);
  if (!stage) return Response.json({ error: '送る相手の段階を選んでください' }, { status: 400 });

  const ctx = await gatherContext(supabase, provider);
  const insight = await gatherInsight(supabase, provider, ctx);
  const all = insight.stages.find(s => s.key === stage.key)?.ids || [];
  const recent = await recentOutreachUserIds(supabase, provider.id);
  const ids = all.filter(id => !recent.has(id)).slice(0, MAX_RECIPIENTS);
  const excluded = all.length - ids.length;

  if (b.preview) return Response.json({ ok: true, count: ids.length, excluded, cooldownDays: COOLDOWN_DAYS });

  const channel = ['line', 'email', 'line_then_email'].includes(b.channel) ? b.channel : 'line_then_email';
  const body = String(b.body_text || '').trim();
  const subject = String(b.subject || '').trim().slice(0, 120) || `${provider.name}からのお知らせ`;
  if (!body) return Response.json({ error: '本文を入れてください' }, { status: 400 });
  if (body.length > 4000) return Response.json({ error: '本文は4,000文字以内にしてください' }, { status: 400 });
  if (!ids.length) return Response.json({ error: excluded ? `この段階の方には、${COOLDOWN_DAYS}日以内に声かけを送っています` : 'この段階のお客様がいません' }, { status: 400 });

  const when = b.scheduled_at ? new Date(b.scheduled_at) : null;
  if (when && Number.isNaN(when.getTime())) return Response.json({ error: '配信日時が正しくありません' }, { status: 400 });
  if (when && when.getTime() > Date.now() + 60 * 86400000) return Response.json({ error: '配信日時は60日以内にしてください' }, { status: 400 });
  const scheduled = when && when.getTime() > Date.now() + 60000;

  const { data: row, error } = await supabase.from('provider_broadcasts').insert({
    provider_id: provider.id, channel, subject, body_text: body,
    segment_label: outreachLabel(stage.key), user_ids: ids, links: extractLinks(body),
    status: scheduled ? 'scheduled' : 'sending', scheduled_at: scheduled ? when.toISOString() : new Date().toISOString(),
    started_at: scheduled ? null : new Date().toISOString(), created_by: 'AIコンサル', target_count: ids.length,
  }).select().single();
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  if (scheduled) return Response.json({ ok: true, scheduled: true, id: row.id, scheduled_at: row.scheduled_at, count: ids.length, excluded });

  try {
    const r = await deliverBroadcast(supabase, row);
    return Response.json({ ok: true, id: row.id, excluded, ...r });
  } catch (e) {
    console.error('[consultant send]', e?.message);
    await supabase.from('provider_broadcasts').update({ status: 'failed' }).eq('id', row.id);
    return Response.json({ error: '送れませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
  }
}
export const POST = withAudit(__POST);
