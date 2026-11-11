// AI専属コンサルが作った声かけを、段階のお客様へそのまま送る仕組みと、送った後の結果（2026-11-11 渡邉要望：
// 「店舗にとってもっとAIコンサルに色々やってもらえるとありがたい。それでこそAIがやってくれてる」）。
// 送信は provider_broadcasts（メッセージ配信）に乗せる。segment_label の先頭で、AIコンサル経由の配信を見分ける。
import { STAGES } from '@/lib/consultant-insight';

export const OUTREACH_PREFIX = 'AIコンサル：';
export const COOLDOWN_DAYS = 14;
const DAY = 86400000;
const stageByLabel = Object.fromEntries(STAGES.map(s => [s.label, s.key]));

export function outreachLabel(stageKey) {
  const s = STAGES.find(x => x.key === stageKey);
  return s ? `${OUTREACH_PREFIX}${s.label}` : null;
}

// 直近 COOLDOWN_DAYS 日にAIコンサル経由で声をかけた（または送る予定の）お客様。続けて送らないために除く
export async function recentOutreachUserIds(db, providerId) {
  const since = new Date(Date.now() - COOLDOWN_DAYS * DAY).toISOString();
  const { data } = await db.from('provider_broadcasts').select('user_ids, status')
    .eq('provider_id', providerId).like('segment_label', `${OUTREACH_PREFIX}%`)
    .in('status', ['scheduled', 'sending', 'sent']).gte('scheduled_at', since).limit(100);
  return new Set((data || []).flatMap(b => b.user_ids || []));
}

// 送った声かけと、その後に予約が入った人数（送った後に作られた予約。キャンセル等は除く）
export async function loadOutreach(db, providerId) {
  const since = new Date(Date.now() - 90 * DAY).toISOString();
  const { data: rows } = await db.from('provider_broadcasts')
    .select('id, segment_label, body_text, status, scheduled_at, sent_at, target_count, line_sent, email_sent, user_ids')
    .eq('provider_id', providerId).like('segment_label', `${OUTREACH_PREFIX}%`)
    .gte('created_at', since).order('created_at', { ascending: false }).limit(20);
  const list = rows || [];
  const sent = list.filter(b => b.status === 'sent' && b.sent_at);
  const delivered = {};
  if (sent.length) {
    const { data: rec } = await db.from('provider_broadcast_recipients').select('broadcast_id, user_id')
      .in('broadcast_id', sent.map(b => b.id)).eq('status', 'sent').limit(20000);
    (rec || []).forEach(r => (delivered[r.broadcast_id] ||= new Set()).add(r.user_id));
  }
  const allUsers = [...new Set(Object.values(delivered).flatMap(s => [...s]))];
  const oldest = sent.reduce((m, b) => (!m || b.sent_at < m ? b.sent_at : m), null);
  const resByUser = {};
  for (let i = 0; oldest && i < allUsers.length; i += 300) {
    const { data: res } = await db.from('reservations').select('user_id, created_at, status')
      .eq('provider_id', providerId).in('user_id', allUsers.slice(i, i + 300)).gte('created_at', oldest)
      .not('status', 'in', '(cancelled,expired,rejected)').limit(5000);
    (res || []).forEach(r => (resByUser[r.user_id] ||= []).push(r.created_at));
  }
  return list.map(b => {
    const label = String(b.segment_label || '').slice(OUTREACH_PREFIX.length);
    const got = delivered[b.id] || new Set();
    const booked = b.sent_at ? [...got].filter(u => (resByUser[u] || []).some(t => t >= b.sent_at)).length : 0;
    return {
      id: b.id, stage: stageByLabel[label] || null, label, status: b.status,
      when: b.sent_at || b.scheduled_at, planned: b.user_ids?.length || 0,
      delivered: got.size, booked, body: String(b.body_text || '').slice(0, 200),
    };
  });
}

export function outreachForPrompt(list) {
  if (!list?.length) return '';
  const lines = list.slice(0, 10).map(o => {
    const day = o.when ? new Date(new Date(o.when).getTime() + 9 * 3600000).toISOString().slice(0, 10) : '';
    if (o.status === 'scheduled') return `- ${day} 予定：「${o.label}」の${o.planned}人へ送る予定`;
    if (o.status !== 'sent') return `- ${day}「${o.label}」：送れなかった`;
    return `- ${day}「${o.label}」：${o.delivered}人に届いた → その後に予約が入ったのは${o.booked}人（文面：${o.body.replace(/\s+/g, ' ').slice(0, 80)}…）`;
  });
  return `\n\n【AIコンサルの声かけを送った結果（Fineme上の予約で数えた事実）】\n${lines.join('\n')}\n予約につながった文面・段階は伸ばし、つながらなかったものは文面か時期を変える。${COOLDOWN_DAYS}日以内に同じお客様へ続けて送らない。`;
}
