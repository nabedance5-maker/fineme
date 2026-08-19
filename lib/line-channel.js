// 店舗別LINE公式アカウント連携（フェーズ2）のヘルパー。
// 送信先の解決：店舗チャネルが連携済みで、かつその顧客が店舗チャネル上のuserIdを
// 連携済みならそちらを優先し、そうでなければFineme公式チャネルへフォールバックする。
// （LINEのuserIdはチャネルごとに別の値になるため、単純にトークンだけ差し替えても送れない）
import { createHmac, timingSafeEqual } from 'crypto';
import { getSupabase } from '@/lib/supabase';

const BOT_INFO_URL = 'https://api.line.me/v2/bot/info';

// Webhook署名検証（LINE公式仕様：チャネルシークレットでHMAC-SHA256→base64）
export function verifyLineSignature(rawBody, signature, channelSecret) {
  if (!signature || !channelSecret) return false;
  const expected = createHmac('sha256', channelSecret).update(rawBody).digest('base64');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// チャネルアクセストークンが有効か確認する（受信者不要・トークンの検証のみ）
export async function validateLineChannelToken(token) {
  if (!token) return { ok: false, reason: 'no-token' };
  try {
    const res = await fetch(BOT_INFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const info = await res.json();
      return { ok: true, displayName: info.displayName, basicId: info.basicId };
    }
    return { ok: false, reason: `http-${res.status}` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

/**
 * 特定providerに紐づくリマインドの送信先を解決する。
 * providerSlug か providerId のどちらか一方を渡す（reservationsはprovider_idを直接持つため
 * slug経由の一段階を省略できる）。
 * @param {object} db - getSupabase()のクライアント
 * @param {object} params
 * @param {string} [params.providerSlug] - user_service_logs.provider_slug
 * @param {string} [params.providerId] - providers.id（分かっている場合はこちらを優先）
 * @param {string} params.userId
 * @param {string} params.fallbackLineUserId - Fineme公式チャネル上のuserId（profiles.line_user_id）
 * @returns {Promise<{lineUserId: string, token: string|undefined, viaStore: boolean, providerId: string|null}>}
 */
export async function resolveLineTarget(db, { providerSlug, providerId, userId, fallbackLineUserId }) {
  const fallback = { lineUserId: fallbackLineUserId, token: undefined, viaStore: false, providerId: null };
  if ((!providerSlug && !providerId) || !userId) return fallback;

  let provider = providerId ? { id: providerId } : null;
  if (!provider) {
    const { data } = await db.from('providers').select('id').eq('slug', providerSlug).single();
    provider = data;
  }
  if (!provider) return fallback;

  const { data: channel } = await db
    .from('provider_line_channels')
    .select('channel_access_token, verified_at')
    .eq('provider_id', provider.id)
    .single();
  if (!channel?.channel_access_token || !channel.verified_at) return { ...fallback, providerId: provider.id };

  const { data: link } = await db
    .from('provider_customer_line_links')
    .select('store_line_user_id')
    .eq('provider_id', provider.id)
    .eq('user_id', userId)
    .single();
  if (!link?.store_line_user_id) return { ...fallback, providerId: provider.id };

  return {
    lineUserId: link.store_line_user_id,
    token: channel.channel_access_token,
    viaStore: true,
    providerId: provider.id,
  };
}
