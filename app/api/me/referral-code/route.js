// GET /api/me/referral-code?provider_slug=xxx → ログイン中ユーザーの、その店舗向け
// 紹介コードを取得（無ければ発行）。でお要望2026-09-14：友達紹介プログラム。
export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { getSupabase } from '@/lib/supabase';
import { hasFeature } from '@/lib/feature-flags';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const slug = new URL(request.url).searchParams.get('provider_slug');
  if (!slug) return Response.json({ error: 'provider_slugは必須です' }, { status: 400 });

  const { data: provider } = await supabase.from('providers').select('id, enabled_features').eq('slug', slug).single();
  if (!provider || !hasFeature(provider, 'referral_program')) {
    return Response.json({ error: 'この店舗は友達紹介プログラムを実施していません' }, { status: 404 });
  }

  const { data: settings } = await supabase.from('provider_referral_settings').select('reward_text').eq('provider_id', provider.id).maybeSingle();
  const reward_text = settings?.reward_text || '';

  const { data: existing } = await supabase
    .from('provider_referral_codes')
    .select('code')
    .eq('user_id', user.id)
    .eq('provider_id', provider.id)
    .maybeSingle();
  if (existing?.code) return Response.json({ code: existing.code, reward_text });

  const code = crypto.randomBytes(5).toString('hex');
  const { data: inserted, error: insertError } = await supabase
    .from('provider_referral_codes')
    .insert({ user_id: user.id, provider_id: provider.id, code })
    .select('code')
    .single();
  if (insertError) return Response.json({ error: insertError.message }, { status: 500 });
  return Response.json({ code: inserted.code, reward_text });
}
