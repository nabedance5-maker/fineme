// AI姿勢分析の記録を、お客様に見せる閲覧リンク（2026-11-24 渡邉承認の指示書 §3・§9）。
// - Finemeに登録していないお客様（お店の手動顧客）にも、記録をLINE等で渡せるようにする
// - リンクは推測できないトークン。DBには SHA-256 のハッシュだけを持つ（DBが漏れてもリンクは作れない）
// - 有効期限は発行から90日。お店が「お客様に表示する」をOFFにするとリンクは消える。作り直すと前のリンクは使えなくなる
// - リンクから見られるのは、その1件の写真・気づき・変化・気になる部位・次の一手だけ（お客様の名前・お店のメモ・点数は出さない）
import crypto from 'crypto';
import { withSignedPhotoUrls } from './customer-record-photos';

export const SHARE_LINK_DAYS = 90;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export const hashShareToken = token => crypto.createHash('sha256').update(String(token)).digest('hex');
export const shareUrl = token => `${BASE_URL}/record/posture/${token}`;
const isTokenShape = t => /^[A-Za-z0-9_-]{40,64}$/.test(String(t || ''));

// お店の記録に閲覧リンクを出す（お客様に表示するもONにする）。戻り値 { url, expires_at }
export async function issuePostureShareLink(db, providerId, entryId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SHARE_LINK_DAYS * 86400000).toISOString();
  const { data, error } = await db.from('provider_posture_entries')
    .update({ share_token_hash: hashShareToken(token), share_expires_at: expires, shared_with_customer: true })
    .eq('id', entryId).eq('provider_id', providerId)
    .select('id').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { url: shareUrl(token), expires_at: expires };
}

// 「お客様に表示する」の切り替え。OFFにした時はリンクも消す
export function shareFlagPatch(shared) {
  return shared ? { shared_with_customer: true } : { shared_with_customer: false, share_token_hash: null, share_expires_at: null };
}

// トークンから、今見せてよい記録を探す（無い・期限切れ・共有OFFなら null）
export async function findSharedPostureEntry(db, token) {
  if (!isTokenShape(token)) return null;
  const { data } = await db.from('provider_posture_entries')
    .select('id, provider_id, manual_customer_id, user_id, photo_url, side_photo_url, findings, focus_areas, next_actions, changes, is_sample, created_at, share_expires_at, shared_with_customer')
    .eq('share_token_hash', hashShareToken(token)).maybeSingle();
  if (!data || !data.shared_with_customer || !data.share_expires_at || new Date(data.share_expires_at) <= new Date()) return null;
  return data;
}

// 閲覧ページに渡す形（写真は1時間で切れる署名URL）
export async function publicPostureView(db, entry) {
  const [{ data: provider }, [signed]] = await Promise.all([
    db.from('providers').select('name, slug, published').eq('id', entry.provider_id).maybeSingle(),
    withSignedPhotoUrls(db, [{ photo_url: entry.photo_url, side_photo_url: entry.side_photo_url }]),
  ]);
  let linkedUser = null;
  if (entry.manual_customer_id) {
    const { data: mc } = await db.from('provider_manual_customers').select('linked_user_id').eq('id', entry.manual_customer_id).maybeSingle();
    linkedUser = mc?.linked_user_id || null;
  }
  return {
    provider_name: provider?.name || 'お店',
    provider_slug: provider?.published ? provider.slug : null,
    created_at: entry.created_at,
    expires_at: entry.share_expires_at,
    photo_url: signed?.photo_url || null,
    side_photo_url: signed?.side_photo_url || null,
    findings: entry.findings || [],
    focus_areas: entry.focus_areas || [],
    next_actions: entry.next_actions || [],
    changes: entry.changes || [],
    is_sample: !!entry.is_sample,
    // 自分のNew Me Logに残せるか：会員の記録（すでに本人のLogに出る）でなく、まだ誰にも結びついていない手動顧客の記録だけ
    claimable: !!entry.manual_customer_id && !entry.user_id && !linkedUser,
  };
}

// 閲覧リンクから登録・ログインしたお客様を、その記録の手動顧客に結びつける（§9）。
// 結びつけるのはこの経路だけ（電話番号などでの自動照合はしない）。すでに誰かに結びついている手動顧客は結びつけない。
export async function claimByShareToken(db, token, userId) {
  const entry = await findSharedPostureEntry(db, token);
  if (!entry) return { ok: false, status: 404, error: 'このリンクは期限が切れたか、お店が表示をやめました' };
  if (!entry.manual_customer_id || entry.user_id) return { ok: false, status: 409, error: 'この記録は、すでにお客様のNew Me Logに表示される記録です' };
  const { data, error } = await db.from('provider_manual_customers')
    .update({ linked_user_id: userId, linked_at: new Date().toISOString(), linked_via: 'share_link' })
    .eq('id', entry.manual_customer_id).eq('provider_id', entry.provider_id).is('linked_user_id', null)
    .select('id').maybeSingle();
  if (error) return { ok: false, status: 500, error: '保存できませんでした。時間をおいてもう一度お試しください' };
  if (!data) {
    const { data: mc } = await db.from('provider_manual_customers').select('linked_user_id').eq('id', entry.manual_customer_id).maybeSingle();
    if (mc?.linked_user_id === userId) return { ok: true, already: true };
    return { ok: false, status: 409, error: 'この記録は、すでに別のアカウントに残されています。お店にお問い合わせください' };
  }
  return { ok: true, provider_id: entry.provider_id, manual_customer_id: entry.manual_customer_id };
}
