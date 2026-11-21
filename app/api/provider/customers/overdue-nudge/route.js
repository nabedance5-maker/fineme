// POST /api/provider/customers/overdue-nudge { message, user_ids } → 「来店の目安を過ぎたお客様」へ、まとめて声かけを送る（2026-11-21 渡邉判断）。
// 1人ずつの声かけ（customers/[user_id]/nudge）と同じく、LINEに「前回と同じで予約」等のボタンを添える。
// - 店舗のオーナーのみ・スタンダード以上（dormant_outreach：個別の声かけと同じプラン区分）
// - 送れるのはこの店舗の顧客一覧に出るお客様だけ（providerCustomerIds）。画面から届いた user_ids はそこで絞る
// - 直近7日に同じ「まとめて声かけ」を送った方には送らない（続けて送らない）
// - 送った記録はメッセージ配信（provider_broadcasts / recipients）に残す：配信の履歴に出て、声かけから入った予約の判定にも使う
// - 本文の {name} はお客様ごとのお名前に置き換える
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import crypto from 'crypto';
import { getSupabase } from '@/lib/supabase';
import { sendLinePushWithAction } from '@/lib/line-push';
import { storeBookingAction, fetchLastMenu, lastMenuLine } from '@/lib/log-rebook';
import { resolveLineTarget } from '@/lib/line-channel';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { providerCustomerIds } from '@/lib/broadcast';
import { OVERDUE_NUDGE_LABEL } from '@/lib/overdue-nudge';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const MAX = 50;
const COOLDOWN_DAYS = 7;

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name, slug, plan, entity_type, booking_url, enabled_features').eq('email', user.email).single();
  return data || null;
}

async function recentlyNudged(providerId) {
  const since = new Date(Date.now() - COOLDOWN_DAYS * 86400000).toISOString();
  const { data } = await supabase.from('provider_broadcasts').select('user_ids')
    .eq('provider_id', providerId).eq('segment_label', OVERDUE_NUDGE_LABEL).gte('created_at', since).limit(50);
  return new Set((data || []).flatMap(b => b.user_ids || []));
}

async function __POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider?.slug) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'dormant_outreach'); if (locked) return locked; }

  const b = await request.json().catch(() => ({}));
  const message = String(b.message || '').trim();
  if (!message) return Response.json({ error: '本文を入れてください' }, { status: 400 });
  if (message.length > 1000) return Response.json({ error: '本文は1,000文字以内にしてください' }, { status: 400 });
  const asked = Array.isArray(b.user_ids) ? [...new Set(b.user_ids.filter(x => typeof x === 'string'))] : [];
  if (!asked.length) return Response.json({ error: '送る相手がいません' }, { status: 400 });
  if (asked.length > MAX) return Response.json({ error: `一度に送れるのは${MAX}名までです` }, { status: 400 });

  const [customers, recent] = await Promise.all([providerCustomerIds(supabase, provider), recentlyNudged(provider.id)]);
  const ids = asked.filter(id => customers.has(id) && !recent.has(id));
  const skippedRecent = asked.filter(id => customers.has(id) && recent.has(id)).length;
  if (!ids.length) return Response.json({ error: skippedRecent ? `選んだ方には、この${COOLDOWN_DAYS}日以内に声をかけています` : '送る相手が見つかりません' }, { status: 400 });

  const { data: profs } = await supabase.from('profiles').select('id, line_user_id, display_name, last_name, first_name').in('id', ids);
  const prof = Object.fromEntries((profs || []).map(p => [p.id, p]));
  const nameOf = uid => { const p = prof[uid]; return p ? ([p.last_name, p.first_name].filter(Boolean).join(' ') || p.display_name || '') : ''; };
  const bodyFor = uid => message.replace(/\{name\}/g, nameOf(uid) || 'お客様');

  const { data: bc, error: bcErr } = await supabase.from('provider_broadcasts').insert({
    provider_id: provider.id, channel: 'line', subject: null, body_text: message, segment_label: OVERDUE_NUDGE_LABEL,
    user_ids: ids, links: [], status: 'sending', scheduled_at: new Date().toISOString(), started_at: new Date().toISOString(),
    created_by: 'オーナー', target_count: ids.length,
  }).select('id').single();
  if (bcErr) return Response.json({ error: '保存できませんでした' }, { status: 500 });

  const rows = [];
  let sent = 0, noLine = 0, failed = 0;
  for (const uid of ids) {
    const row = { id: crypto.randomUUID(), broadcast_id: bc.id, provider_id: provider.id, user_id: uid, channel: null, status: 'skipped', reason: null };
    try {
      const target = await resolveLineTarget(supabase, { providerSlug: provider.slug, userId: uid, fallbackLineUserId: prof[uid]?.line_user_id });
      if (!target.lineUserId) { row.reason = 'LINEで届けられる宛先が無い'; noLine++; }
      else {
        const lastMenu = await fetchLastMenu(supabase, provider.id, uid);
        const action = storeBookingAction(provider, lastMenu, 'store_nudge');
        const text = target.viaStore ? bodyFor(uid) : `【${provider.name}より】\n${bodyFor(uid)}`;
        const r = await sendLinePushWithAction(target.lineUserId, text, action && { ...action, caption: lastMenuLine(lastMenu) || 'ご予約はこちらから' }, target.token);
        if (r.ok) { Object.assign(row, { channel: 'line', status: 'sent' }); sent++; }
        else { Object.assign(row, { status: 'failed', reason: 'LINEに送れませんでした' }); failed++; }
      }
    } catch (e) {
      Object.assign(row, { status: 'failed', reason: '送信エラー' }); failed++;
      console.error('[overdue-nudge]', e?.message);
    }
    rows.push(row);
  }
  await supabase.from('provider_broadcast_recipients').insert(rows);
  await supabase.from('provider_broadcasts').update({ status: 'sent', sent_at: new Date().toISOString(), line_sent: sent, email_sent: 0, skipped: noLine, failed }).eq('id', bc.id);
  return Response.json({ ok: true, sent, no_line: noLine, failed, skipped_recent: skippedRecent });
}

export const POST = withAudit(__POST);
