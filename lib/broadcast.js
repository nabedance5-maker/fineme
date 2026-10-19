// 店舗のメッセージ配信（でお要望 2026-10-19：hacomono差分 #6）。
// LINE・メール（LINEが無い人はメール）で送り、宛先ごとに届いたか・開いたか・リンクを押したかを残す。
// 今すぐ送る時はAPIから、日時指定はcron（/api/cron/broadcasts）からここを呼ぶ。
import crypto from 'crypto';
import { hasFeature } from '@/lib/feature-flags';
import { sendLinePush } from '@/lib/line-push';
import { sendBroadcastEmail } from '@/lib/email';

const BASE = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';
export const MAX_RECIPIENTS = 1000;
const URL_RE = /https?:\/\/[^\s<>"'（）「」、。]+/g;

export function extractLinks(text) {
  return [...new Set(String(text || '').match(URL_RE) || [])].slice(0, 10);
}

// この店舗とつながっているお客様（顧客一覧に出る人）だけに送る。店舗が無関係なuser_idを渡しても送らない
export async function providerCustomerIds(db, provider) {
  const [logs, res, mem, pkg, kar, prof] = await Promise.all([
    db.from('user_service_logs').select('user_id').eq('provider_slug', provider.slug).eq('active', true),
    db.from('reservations').select('user_id').eq('provider_id', provider.id).not('user_id', 'is', null).limit(10000),
    db.from('provider_memberships').select('user_id').eq('provider_id', provider.id).neq('status', 'draft'),
    db.from('customer_packages').select('user_id').eq('provider_id', provider.id).not('user_id', 'is', null),
    db.from('provider_karte_entries').select('user_id').eq('provider_id', provider.id).not('user_id', 'is', null).limit(10000),
    db.from('provider_customer_profiles').select('user_id').eq('provider_id', provider.id).not('user_id', 'is', null),
  ]);
  const set = new Set();
  [logs, res, mem, pkg, kar, prof].forEach(r => (r.data || []).forEach(x => x.user_id && set.add(x.user_id)));
  return set;
}

const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function withTrackedLinks(text, links, rid, forHtml) {
  // 長いURLから置き換える（短いURLが長いURLの一部の時に壊さないため）
  const order = links.map((u, i) => [u, i]).sort((a, b) => b[0].length - a[0].length);
  let out = forHtml ? esc(text) : text;
  for (const [u, i] of order) {
    const tracked = `${BASE()}/api/b/c/${rid}/${i}`;
    const needle = forHtml ? esc(u) : u;
    out = out.split(needle).join(forHtml ? `<a href="${tracked}" style="color:#111">${esc(u)}</a>` : tracked);
  }
  return out;
}

function emailHtml(b, provider, rid) {
  return `
    <div style="font-size:15px;line-height:1.8;color:#111;white-space:pre-wrap">${withTrackedLinks(b.body_text, b.links || [], rid, true)}</div>
    <hr style="border:none;border-top:1px solid #ddd;margin:28px 0 14px">
    <p style="font-size:12px;color:#111;line-height:1.7;margin:0">このメールは${esc(provider.name)}から、Fineme（ファインミ）を通じてお送りしています。<br>
    今後このお店からの配信メールが不要な場合は <a href="${BASE()}/api/b/u/${rid}" style="color:#111">配信停止</a> の手続きをしてください。</p>
    <img src="${BASE()}/api/b/o/${rid}" width="1" height="1" alt="" style="display:block;border:0">
  `;
}

// 宛先を解決して送る。b は provider_broadcasts の行（status を sending にしてから呼ぶ）
export async function deliverBroadcast(db, b) {
  const { data: provider } = await db.from('providers').select('id, name, slug, plan, enabled_features').eq('id', b.provider_id).single();
  const [customers, { data: optouts }] = await Promise.all([
    providerCustomerIds(db, provider),
    db.from('provider_broadcast_optouts').select('user_id').eq('provider_id', provider.id),
  ]);
  const optout = new Set((optouts || []).map(o => o.user_id));
  const ids = [...new Set(b.user_ids || [])].filter(id => customers.has(id)).slice(0, MAX_RECIPIENTS);

  // LINEの宛先：店舗の公式LINEで友だちなら店舗から、それ以外はFineme公式LINEから
  const wantLine = b.channel !== 'email';
  let storeToken = null; const storeLink = {}; const finemeLine = {};
  if (wantLine && ids.length) {
    if (hasFeature(provider, 'line_channel')) {
      const { data: ch } = await db.from('provider_line_channels').select('channel_access_token, verified_at').eq('provider_id', provider.id).maybeSingle();
      if (ch?.channel_access_token && ch.verified_at) {
        storeToken = ch.channel_access_token;
        const { data: links } = await db.from('provider_customer_line_links').select('user_id, store_line_user_id').eq('provider_id', provider.id).in('user_id', ids);
        (links || []).forEach(l => { if (l.store_line_user_id) storeLink[l.user_id] = l.store_line_user_id; });
      }
    }
    for (let i = 0; i < ids.length; i += 300) {
      const { data: profs } = await db.from('profiles').select('id, line_user_id').in('id', ids.slice(i, i + 300));
      (profs || []).forEach(p => { if (p.line_user_id) finemeLine[p.id] = p.line_user_id; });
    }
  }

  const rows = [];
  const counts = { line_sent: 0, email_sent: 0, skipped: 0, failed: 0 };
  for (const uid of ids) {
    const rid = crypto.randomUUID();
    const row = { id: rid, broadcast_id: b.id, provider_id: provider.id, user_id: uid, channel: null, status: 'skipped', reason: null };
    try {
      let done = false;
      if (wantLine && (storeLink[uid] || finemeLine[uid])) {
        const viaStore = !!storeLink[uid];
        const text = withTrackedLinks(b.body_text, b.links || [], rid, false);
        const r = await sendLinePush(viaStore ? storeLink[uid] : finemeLine[uid], viaStore ? text : `【${provider.name}より】\n${text}`, viaStore ? storeToken : undefined);
        if (r?.ok !== false) { Object.assign(row, { channel: 'line', status: 'sent' }); counts.line_sent++; done = true; }
        else row.reason = 'LINEに送れませんでした';
      }
      if (!done && b.channel !== 'line') {
        if (optout.has(uid)) { Object.assign(row, { status: 'optout', reason: '配信停止中' }); }
        else {
          const { data: { user } = {} } = await db.auth.admin.getUserById(uid);
          const email = user?.email;
          // @line.fineme.me はLINEログインだけの人に割り当てる内部用アドレスで実在しない
          if (email && !email.endsWith('@line.fineme.me')) {
            await sendBroadcastEmail({ to: email, subject: b.subject || `${provider.name}からのお知らせ`, html: emailHtml(b, provider, rid) });
            Object.assign(row, { channel: 'email', status: 'sent', reason: null }); counts.email_sent++; done = true;
          } else row.reason = row.reason || (b.channel === 'email' ? 'メールアドレスが無い' : 'LINE・メールアドレスが無い');
        }
      }
      if (!done && !row.reason) row.reason = 'LINEで届けられる宛先が無い';
    } catch (e) {
      Object.assign(row, { status: 'failed', reason: '送信エラー' });
      console.error('[broadcast]', b.id, e?.message);
    }
    if (row.status === 'skipped' || row.status === 'optout') counts.skipped++;
    if (row.status === 'failed') counts.failed++;
    rows.push(row);
  }
  for (let i = 0; i < rows.length; i += 500) await db.from('provider_broadcast_recipients').insert(rows.slice(i, i + 500));
  await db.from('provider_broadcasts').update({ ...counts, target_count: ids.length, status: 'sent', sent_at: new Date().toISOString() }).eq('id', b.id);
  return { ...counts, target_count: ids.length };
}
