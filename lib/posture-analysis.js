// 姿勢分析AI（でお要望2026-09-25）。店舗スタッフが来店時に撮影した写真を分析し、
// 姿勢スコア・気になる癖・凝っていそうな筋肉部位を返す。Mirror分析（app/api/mirror/analyze）
// と同じ「事実に基づく観察のみ・断定しない・医療診断はしない」方針をそのまま踏襲する。
import { uploadCustomerRecordPhoto, withSignedPhotoUrls, CUSTOMER_RECORD_BUCKET } from './customer-record-photos';
import { visionText } from './ai.js';

// でお要望2026-09-25：「10000円のプランに入ってる人しか使えないようにしてほしい
// （特例無料の人も使えるように）」。10000円プラン＝'C'、特例無料アカウント＝'special'
// （本番DB実データで確認：'free'という値は存在せず、admin/providersでも'special'が
// 特例無料の実際のキー。PLAN_LABELSに'free'があるのは未使用の将来キーで実データと
// 一致しない——ここで誤って'free'を使うと、でお自身のテストアカウントも弾かれてしまう）。
const POSTURE_ELIGIBLE_PLANS = ['C', 'special'];
export function isPostureEligiblePlan(plan) {
  return POSTURE_ELIGIBLE_PLANS.includes(plan);
}

const SYSTEM_PROMPT = `あなたは、店舗スタッフ向けに姿勢の写真を観察するアシスタントです。
医師ではないため医学的診断はせず、見た目の観察に基づく気づきのみを提供します。

【厳守】
- 写真から実際に確認できる事実のみを述べる。写っていないことは推測しない
- 「〜のように見えます」「〜の可能性があります」等、言い切らない表現を使う
- 医療的診断（「側弯症」「椎間板ヘルニア」等の病名）は絶対に使わない
- 決めつけ・断定的な表現をしない
- 前回の写真が渡された時は、前回と今回を見比べた変化を書く。撮った角度・距離・服装が違って比べにくい部分は、そう書いて言い切らない
- 良くなった点があれば先に書く。お客様が読んでも前向きになれる言い方にする

以下のJSON形式のみで出力してください（コードブロックなし、JSONだけ）:
{
  "score": 0から100の整数（姿勢の良し悪しの目安。100が理想的な姿勢）,
  "findings": ["今回の写真で観察された癖や特徴、凝っていそうな部位を1文ずつ。3〜5個"],
  "changes": ["前回からの変化を1文ずつ。2〜4個。前回の写真が無ければ空配列"]
}`;

/**
 * 姿勢の写真（正面・横）を読み、前回の写真があれば変化も書く。
 * @param {{ front: {base64, mediaType}, side?: {base64, mediaType}, prevFront?: {base64, mediaType}, prevSide?: {base64, mediaType}, prevDate?: string }} photos
 * @returns {Promise<{score: number|null, findings: string[], changes: string[]}>}
 */
export async function analyzePosturePhotos({ front, side, prevFront, prevSide, prevDate }) {
  const img = p => ({ type: 'image', base64: p.base64, mediaType: p.mediaType });
  const content = [];
  if (prevFront || prevSide) {
    content.push({ type: 'text', text: `【前回の写真（${prevDate || '前回'}）】` });
    if (prevFront) content.push({ type: 'text', text: '前回・正面' }, img(prevFront));
    if (prevSide) content.push({ type: 'text', text: '前回・横' }, img(prevSide));
    content.push({ type: 'text', text: '【今回の写真】' });
  }
  content.push({ type: 'text', text: '今回・正面' }, img(front));
  if (side) content.push({ type: 'text', text: '今回・横' }, img(side));
  content.push({ type: 'text', text: prevFront || prevSide ? '今回の姿勢を観察し、前回からの変化も書いてください。' : 'この写真の姿勢を観察してください。' });

  const raw = (await visionText({ system: SYSTEM_PROMPT, content, max_tokens: 1500 })) || '{}';
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : raw);
  const score = Number.isFinite(parsed.score) ? Math.max(0, Math.min(100, Math.round(parsed.score))) : null;
  const list = v => (Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 6) : []);
  return { score, findings: list(parsed.findings), changes: prevFront || prevSide ? list(parsed.changes) : [] };
}

async function downloadAsBase64(supabase, path) {
  if (!path || /^https?:\/\//.test(path)) return null;
  const { data, error } = await supabase.storage.from(CUSTOMER_RECORD_BUCKET).download(path);
  if (error || !data) return null;
  return { base64: Buffer.from(await data.arrayBuffer()).toString('base64'), mediaType: data.type || 'image/jpeg' };
}

const extOf = t => (t === 'image/png' ? 'png' : t === 'image/webp' ? 'webp' : 'jpg');

/**
 * 写真の分析・Storageアップロード・DB保存を1回でまとめて行う（会員/非会員共通）。
 * app/api/provider/customers/[user_id]/posture-entries と manual/[id]版の両方から呼ぶ。
 * 同じお客様の前回の記録があれば、その写真も一緒にAIへ渡して変化を書かせる（2026-11-12）。
 * お客様のNew Me Logには、お店が「表示する」にした記録だけが出る（shared_with_customer。既定は出さない）。
 */
export async function createPostureEntry({ supabase, providerId, providerSlug, userId, manualCustomerId, staffId, note, photoBase64, mediaType, sidePhotoBase64, sideMediaType }) {
  let prevQuery = supabase.from('provider_posture_entries').select('id, photo_url, side_photo_url, created_at')
    .eq('provider_id', providerId).order('created_at', { ascending: false }).limit(1);
  prevQuery = userId ? prevQuery.eq('user_id', userId) : prevQuery.eq('manual_customer_id', manualCustomerId);
  const { data: prevRows } = await prevQuery;
  const prev = prevRows?.[0] || null;
  const [prevFront, prevSide] = prev ? await Promise.all([downloadAsBase64(supabase, prev.photo_url), downloadAsBase64(supabase, prev.side_photo_url)]) : [null, null];
  const prevDate = prev ? new Date(prev.created_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }) : null;

  const front = { base64: photoBase64, mediaType };
  const side = sidePhotoBase64 ? { base64: sidePhotoBase64, mediaType: sideMediaType || 'image/jpeg' } : null;
  const { score, findings, changes } = await analyzePosturePhotos({ front, side, prevFront, prevSide, prevDate });

  const stamp = Date.now();
  const base = `${providerSlug || providerId}/posture/${stamp}`;
  const fileName = `${base}.${extOf(mediaType)}`;
  await uploadCustomerRecordPhoto(supabase, fileName, Buffer.from(photoBase64, 'base64'), mediaType);
  let sideName = null;
  if (side) {
    sideName = `${base}-side.${extOf(side.mediaType)}`;
    await uploadCustomerRecordPhoto(supabase, sideName, Buffer.from(side.base64, 'base64'), side.mediaType);
  }

  const { data, error } = await supabase
    .from('provider_posture_entries')
    .insert({
      provider_id: providerId,
      user_id: userId || null,
      manual_customer_id: manualCustomerId || null,
      staff_id: staffId || null,
      photo_url: fileName,
      side_photo_url: sideName,
      score,
      findings,
      changes,
      previous_entry_id: prev?.id || null,
      note: note?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const [signed] = await withSignedPhotoUrls(supabase, [data]);
  return signed;
}
