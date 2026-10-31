import { createClient } from '@supabase/supabase-js';

let _client = null;
const SUPABASE_TIMEOUT_MS = 12000;

// ── ログイン確認（auth.getUser）を手元で検証する ──
// Supabaseのアクセストークンは ES256 で署名されており、公開鍵（JWKS）で署名と有効期限を検証できる。
// 全APIが毎回 auth.getUser でSupabaseに問い合わせていたが、データベースのCPUが細く（最小構成）、
// 同時アクセス時に順番待ちになって管理画面の表示が遅くなっていた（2026-10-07実測）。
// 検証できないトークン（形式違い・鍵の更新直後など）は、従来どおりSupabaseに問い合わせる。
const JWKS_TTL_MS = 10 * 60 * 1000;
let jwksCache = { at: 0, keys: new Map() };

function b64urlToBytes(s) {
  const pad = s.length % 4 === 2 ? '==' : s.length % 4 === 3 ? '=' : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getVerifyKey(kid) {
  if (Date.now() - jwksCache.at > JWKS_TTL_MS || !jwksCache.keys.has(kid)) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const { keys = [] } = await res.json();
    const map = new Map();
    for (const jwk of keys) {
      if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') continue;
      const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      map.set(jwk.kid, key);
    }
    jwksCache = { at: Date.now(), keys: map };
  }
  return jwksCache.keys.get(kid) || null;
}

async function verifyAccessTokenLocally(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  if (header.alg !== 'ES256' || !header.kid) return null;
  const key = await getVerifyKey(header.kid);
  if (!key) return null;
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!ok) return { invalid: true };
  const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  const now = Math.floor(Date.now() / 1000);
  if (!claims.sub || !claims.exp || claims.exp <= now) return { invalid: true };
  if (claims.iss && !String(claims.iss).startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL)) return { invalid: true };
  return {
    user: {
      id: claims.sub,
      aud: claims.aud,
      role: claims.role,
      email: claims.email || null,
      phone: claims.phone || null,
      app_metadata: claims.app_metadata || {},
      user_metadata: claims.user_metadata || {},
      is_anonymous: !!claims.is_anonymous,
    },
  };
}

// ── スタッフ個別ログイン（でお要望 2026-10-19） ──
// 店舗のスタッフが自分のメールでログインした時は、その店舗のアカウントとして扱う。
// 全APIは「ログイン中のメール＝providers.email」で店舗を特定しているため、ここで user.email を
// 店舗アカウントのメールに置き換え、本人の情報は user.fineme_member に残す。権限の制限は
// middleware.js（APIの入口）と管理画面のサイドバーで行う。
const MEMBER_TTL_MS = 30 * 1000;
const memberCache = new Map(); // userId -> { at, value }

async function resolveMember(client, user) {
  if (!user?.id) return null;
  const hit = memberCache.get(user.id);
  if (hit && Date.now() - hit.at < MEMBER_TTL_MS) return hit.value;
  let value = null;
  try {
    const email = String(user.email || '').toLowerCase();
    // 本人がどこかの店舗のオーナーなら、そちらを優先する
    const { data: own } = email ? await client.from('providers').select('id').eq('email', user.email).limit(1) : { data: [] };
    if (!own?.length) {
      let { data: rows } = await client.from('provider_members').select('id, provider_id, user_id, email, name, role, status, staff_id, accepted_at').eq('user_id', user.id).limit(1);
      let m = rows?.[0];
      if (!m && email) {
        // 招待されたメールで初めてログインした：ここで本人と結び付ける
        const { data: inv } = await client.from('provider_members').select('id, provider_id, user_id, email, name, role, status, staff_id, accepted_at').ilike('email', email).is('user_id', null).limit(1);
        m = inv?.[0];
        if (m) {
          await client.from('provider_members').update({ user_id: user.id, accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', m.id);
          m.user_id = user.id;
        }
      }
      if (m && m.status === 'active') {
        const { data: prov } = await client.from('providers').select('email').eq('id', m.provider_id).single();
        if (prov?.email) {
          value = { providerEmail: prov.email, member: { id: m.id, provider_id: m.provider_id, name: m.name, role: m.role, staff_id: m.staff_id, email: m.email } };
          client.from('provider_members').update({ last_seen_at: new Date().toISOString() }).eq('id', m.id).then(() => {}, () => {});
        }
      }
    }
  } catch {
    // 一時的な失敗は覚えない（30秒間「スタッフではない」扱いになり、契約者側に入れなくなるため）
    return null;
  }
  memberCache.set(user.id, { at: Date.now(), value });
  return value;
}

export function clearMemberCache(userId) {
  if (userId) memberCache.delete(userId); else memberCache.clear();
}

async function withMember(client, result) {
  const user = result?.data?.user;
  if (!user) return result;
  const m = await resolveMember(client, user);
  if (!m) return result;
  return { ...result, data: { user: { ...user, own_email: user.email, email: m.providerEmail, fineme_member: m.member } } };
}

function withLocalGetUser(client) {
  const remoteGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt) => {
    if (!jwt) return remoteGetUser(jwt);
    try {
      const r = await verifyAccessTokenLocally(jwt);
      if (r?.user) return withMember(client, { data: { user: r.user }, error: null });
      if (r?.invalid) return { data: { user: null }, error: { name: 'AuthApiError', message: 'invalid JWT', status: 401 } };
    } catch {}
    return withMember(client, await remoteGetUser(jwt));
  };
  return client;
}

export function getSupabase() {
  if (!_client) {
    _client = withLocalGetUser(createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        global: {
          // Supabase が応答しない時に、APIが最大5分（Vercelの上限）待ち続けて画面が「読み込み中」のまま止まらないよう、
          // 1回の問い合わせは最大12秒で打ち切る（2026-10-28 Supabase の入口が約80分応答せず、ログイン・管理画面が止まった件）。
          // 読み取り（GET/HEAD）は、つながらない・入口が落ちている（502/503/504/522）時に1回だけやり直す。
          // 1回目は6秒で見切って合計12秒以内に収める（2026-10-29 15:40〜19:40、お客様・お店の画面の失敗が数分ずつ固まって出た件）。
          // 書き込みはやり直すと二重登録になり得るので、従来どおり12秒・やり直しなし。
          fetch: async (url, options = {}) => {
            const method = String(options.method || 'GET').toUpperCase();
            const once = (ms) => {
              const t = AbortSignal.timeout(ms);
              const signal = options.signal ? AbortSignal.any([options.signal, t]) : t;
              return fetch(url, { ...options, cache: 'no-store', signal });
            };
            if (method !== 'GET' && method !== 'HEAD') return once(SUPABASE_TIMEOUT_MS);
            try {
              const res = await once(SUPABASE_TIMEOUT_MS / 2);
              if (![502, 503, 504, 522].includes(res.status)) return res;
            } catch (e) {
              if (options.signal?.aborted) throw e;
            }
            return once(SUPABASE_TIMEOUT_MS / 2);
          },
        },
      }
    ));
  }
  return _client;
}
