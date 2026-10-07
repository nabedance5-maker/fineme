import { createClient } from '@supabase/supabase-js';

let _client = null;

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
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`, { cache: 'no-store' });
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

function withLocalGetUser(client) {
  const remoteGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = async (jwt) => {
    if (!jwt) return remoteGetUser(jwt);
    try {
      const r = await verifyAccessTokenLocally(jwt);
      if (r?.user) return { data: { user: r.user }, error: null };
      if (r?.invalid) return { data: { user: null }, error: { name: 'AuthApiError', message: 'invalid JWT', status: 401 } };
    } catch {}
    return remoteGetUser(jwt);
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
          fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
        },
      }
    ));
  }
  return _client;
}
