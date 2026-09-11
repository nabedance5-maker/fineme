// GET   /api/provider/features → 自店舗の機能ON/OFF設定（未設定キーはデフォルト値で補って返す）
// PATCH /api/provider/features → 部分更新（渡したキーだけ上書き）
// Phase 0（機能ON/OFF基盤）: lib/feature-flags.js の FEATURE_DEFS が唯一の定義元。
import { getSupabase } from '@/lib/supabase';
import { FEATURE_DEFS, resolveFeatures } from '@/lib/feature-flags';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, enabled_features').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  return Response.json({ features: resolveFeatures(provider), defs: FEATURE_DEFS });
}

export async function PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const updates = {};
  for (const [key, value] of Object.entries(body)) {
    if (!(key in FEATURE_DEFS)) continue; // 未定義キーは無視（不正な機能名の混入を防ぐ）
    if (typeof value !== 'boolean') continue;
    updates[key] = value;
  }
  if (!Object.keys(updates).length) {
    return Response.json({ error: '更新する機能を指定してください' }, { status: 400 });
  }

  const merged = { ...resolveFeatures(provider), ...updates };
  const { error } = await supabase
    .from('providers')
    .update({ enabled_features: merged })
    .eq('id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, features: merged });
}
