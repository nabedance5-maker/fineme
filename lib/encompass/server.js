// ENCOMPASS のサーバー側の共通処理（APIだけで使う）。
// 決まり（渡邉指示 2026-11-19）：店舗SaaSを壊さない。お店・お客様・スタッフの権限は SaaS の表を「読むだけ」で使い、
// 書き込むのは encompass_ の表だけ。SaaS の契約（providers.plan）は見ず、encompass_stores の契約で使えるかを決める。
import { createHash, randomBytes } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import { normalizePerms } from '@/lib/member-perms';

export const db = () => getSupabase();

const json = (body, status) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export const fail = (error, status, code) => json({ error, ...(code ? { code } : {}) }, status);
export const okJson = body => json(body, 200);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isUuid = v => typeof v === 'string' && UUID.test(v);
export const isCustomerRef = v => typeof v === 'string' && /^[um]:/.test(v) && isUuid(v.slice(2));

// ログイン（Bearer）からお店を決める。スタッフの個別ログインは lib/supabase.js がお店のメールに置き換えている。
// 戻り値：{ store, user, role, perms } または { res }（そのまま返す Response）
export async function encompassAuth(request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return { res: fail('ログインしてください', 401, 'login_required') };
  const sb = db();
  const { data: { user } = {}, error } = await sb.auth.getUser(auth.slice(7));
  if (error || !user) return { res: fail('ログインしてください', 401, 'login_required') };

  const { data: provider, error: pErr } = await sb.from('providers').select('id, name, slug, is_demo').eq('email', user.email).maybeSingle();
  if (pErr) return { res: fail('ただいまつながりにくくなっています。少しおいてお試しください', 503) };
  if (!provider) return { res: fail('このアカウントは、お店のアカウントではありません', 403, 'not_store') };

  let { data: contract, error: cErr } = await sb.from('encompass_stores').select('status').eq('provider_id', provider.id).maybeSingle();
  if (cErr) return { res: fail('ただいまつながりにくくなっています。少しおいてお試しください', 503) };
  // 営業用のデモ店舗は、毎晩の初期化（demo_wipe）で encompass_stores の行も消えるため、いつも試用中として扱う
  if (!contract && provider.is_demo === true) contract = { status: 'trial' };
  if (!contract || contract.status === 'paused') return { res: fail('このお店では、メニューボードをまだお使いいただけません', 403, 'not_contracted') };

  const member = user.fineme_member || null;
  let role = 'owner';
  let perms = { customer: true, store: true };
  if (member) {
    role = member.role;
    const { data: row } = await sb.from('provider_role_permissions').select('perms').eq('provider_id', provider.id).eq('role', member.role).maybeSingle();
    perms = normalizePerms(member.role, row?.perms);
  }
  return {
    store: { id: provider.id, name: provider.name, status: contract.status },
    user: { id: user.id, name: member?.name || null },
    role,
    can: {
      customers: !!perms.customer,                      // お客様の名前・記録を見る（SaaS の「顧客情報」権限と同じ）
      board: role === 'owner' || role === 'manager' || !!perms.store, // タブレットの鍵を作り直す
    },
  };
}

// ---- お客様（SaaS の顧客一覧と同じお客様を、名前だけ読む） ----
const joinName = (a, b) => [a, b].filter(Boolean).join(' ').trim();

export async function storeCustomers(providerId) {
  const sb = db();
  const [profiles, memberships, reservations, manual, removals, hidden] = await Promise.all([
    sb.from('provider_customer_profiles').select('user_id, last_name, first_name').eq('provider_id', providerId).not('user_id', 'is', null),
    sb.from('provider_memberships').select('user_id, last_name, first_name').eq('provider_id', providerId).neq('status', 'draft'),
    sb.from('reservations').select('user_id, user_name').eq('provider_id', providerId).not('user_id', 'is', null).limit(5000),
    sb.from('provider_manual_customers').select('id, display_name, linked_user_id').eq('provider_id', providerId),
    sb.from('provider_customer_removals').select('user_id').eq('provider_id', providerId),
    sb.from('provider_hidden_customers').select('user_id, manual_customer_id').eq('provider_id', providerId),
  ]);
  const removed = new Set((removals.data || []).map(r => r.user_id));
  const hiddenU = new Set((hidden.data || []).map(r => r.user_id).filter(Boolean));
  const hiddenM = new Set((hidden.data || []).map(r => r.manual_customer_id).filter(Boolean));

  const names = new Map(); // user_id -> name
  const put = (uid, name) => { if (uid && !names.get(uid) && name) names.set(uid, name); else if (uid && !names.has(uid)) names.set(uid, ''); };
  (profiles.data || []).forEach(r => put(r.user_id, joinName(r.last_name, r.first_name)));
  (memberships.data || []).forEach(r => put(r.user_id, joinName(r.last_name, r.first_name)));
  (reservations.data || []).forEach(r => put(r.user_id, String(r.user_name || '').trim()));

  const missing = [...names].filter(([, n]) => !n).map(([id]) => id);
  if (missing.length) {
    const { data } = await sb.from('profiles').select('id, display_name, last_name, first_name').in('id', missing.slice(0, 1000));
    (data || []).forEach(p => names.set(p.id, joinName(p.last_name, p.first_name) || p.display_name || ''));
  }

  const list = [];
  for (const [uid, name] of names) {
    if (removed.has(uid) || hiddenU.has(uid)) continue;
    list.push({ ref: `u:${uid}`, name: (name || '（名前未設定）').slice(0, 40) });
  }
  for (const m of manual.data || []) {
    if (hiddenM.has(m.id)) continue;
    if (m.linked_user_id && names.has(m.linked_user_id)) continue; // アカウントと結び付いた手入力のお客様は二重に出さない
    list.push({ ref: `m:${m.id}`, name: String(m.display_name || '（名前未設定）').slice(0, 40) });
  }
  list.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  return list;
}

// そのお店のお客様か（他店のお客様のIDを入れられないようにする）
export async function customerOfStore(providerId, ref) {
  if (!isCustomerRef(ref)) return null;
  return (await storeCustomers(providerId)).find(c => c.ref === ref) || null;
}

// ---- タブレットの鍵 ----
export const newBoardToken = () => randomBytes(32).toString('base64url'); // 43文字
export const hashToken = t => createHash('sha256').update(String(t)).digest('hex');
export const isBoardToken = t => typeof t === 'string' && /^[A-Za-z0-9_-]{43}$/.test(t);

// 入力の文字を整える（制御文字を落として長さを切る）
export const cleanText = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
