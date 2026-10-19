// お知らせ掲示（でお要望 2026-10-19：hacomono差分 #13）。お客様がつながっている店舗（予約・入会・回数券・New Me Log・
// カルテ・基本情報のどれか）のお知らせだけを見せる。
export async function userProviderIds(db, userId) {
  const [logs, res, mem, pkg, kar, prof] = await Promise.all([
    db.from('user_service_logs').select('provider_slug').eq('user_id', userId).eq('active', true).not('provider_slug', 'is', null),
    db.from('reservations').select('provider_id').eq('user_id', userId).limit(2000),
    db.from('provider_memberships').select('provider_id, status').eq('user_id', userId).neq('status', 'draft'),
    db.from('customer_packages').select('provider_id').eq('user_id', userId),
    db.from('provider_karte_entries').select('provider_id').eq('user_id', userId).limit(2000),
    db.from('provider_customer_profiles').select('provider_id').eq('user_id', userId),
  ]);
  const ids = new Set();
  [res, mem, pkg, kar, prof].forEach(r => (r.data || []).forEach(x => x.provider_id && ids.add(x.provider_id)));
  const slugs = [...new Set((logs.data || []).map(l => l.provider_slug))];
  if (slugs.length) {
    const { data } = await db.from('providers').select('id').in('slug', slugs);
    (data || []).forEach(p => ids.add(p.id));
  }
  const memberOf = new Set((mem.data || []).filter(m => m.status === 'active').map(m => m.provider_id));
  return { ids: [...ids], memberOf };
}

// いま表示してよいお知らせか
export const isLive = (n, now = Date.now()) => new Date(n.publish_at).getTime() <= now && (!n.expires_at || new Date(n.expires_at).getTime() > now);

// 店舗が書いたお知らせの内容を確かめる
export function noticeFields(b) {
  const title = String(b.title || '').trim().slice(0, 100);
  const body = String(b.body || '').trim().slice(0, 4000);
  if (!title || !body) return { error: 'タイトルと本文を入れてください' };
  const at = b.publish_at ? new Date(b.publish_at) : new Date();
  const ex = b.expires_at ? new Date(b.expires_at) : null;
  if (Number.isNaN(at.getTime()) || (ex && Number.isNaN(ex.getTime()))) return { error: '日時が正しくありません' };
  if (ex && ex <= at) return { error: '表示を終える日時は、表示を始める日時より後にしてください' };
  return { row: { title, body, audience: b.audience === 'members' ? 'members' : 'all', pinned: !!b.pinned, publish_at: at.toISOString(), expires_at: ex ? ex.toISOString() : null } };
}

