// 姿勢分析AI（でお要望2026-09-25）。店舗スタッフが来店時に撮影した写真を分析し、
// 姿勢スコア・気になる癖・凝っていそうな筋肉部位を返す。Mirror分析（app/api/mirror/analyze）
// と同じ「事実に基づく観察のみ・断定しない・医療診断はしない」方針をそのまま踏襲する。
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `あなたは、店舗スタッフ向けに姿勢の写真を観察するアシスタントです。
医師ではないため医学的診断はせず、見た目の観察に基づく気づきのみを提供します。

【厳守】
- 写真から実際に確認できる事実のみを述べる。写っていないことは推測しない
- 「〜のように見えます」「〜の可能性があります」等、言い切らない表現を使う
- 医療的診断（「側弯症」「椎間板ヘルニア」等の病名）は絶対に使わない
- 決めつけ・断定的な表現をしない

以下のJSON形式のみで出力してください（コードブロックなし、JSONだけ）:
{
  "score": 0から100の整数（姿勢の良し悪しの総合スコア。100が理想的な姿勢）,
  "findings": [
    "観察された癖や特徴を1文で（例: 右肩がやや前に出ているように見えます）",
    "凝っていそうな筋肉部位の提案を1文で（例: 僧帽筋上部・胸鎖乳突筋周りが緊張している可能性があります）",
    "..."
  ]
}
findingsは3〜5個、それぞれ簡潔な1文で。`;

/**
 * @param {string} photoBase64
 * @param {string} mediaType - image/jpeg 等
 * @returns {Promise<{score: number, findings: string[]}>}
 */
export async function analyzePosturePhoto(photoBase64, mediaType) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: photoBase64 } },
        { type: 'text', text: 'この写真の姿勢を分析してください。' },
      ],
    }],
  });

  const raw = message.content[0]?.text?.trim() || '{}';
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : raw);
  const score = Number.isFinite(parsed.score) ? Math.max(0, Math.min(100, Math.round(parsed.score))) : null;
  const findings = Array.isArray(parsed.findings) ? parsed.findings.map(String).slice(0, 6) : [];
  return { score, findings };
}

/**
 * 写真の分析・Storageアップロード・DB保存を1回でまとめて行う（会員/非会員共通）。
 * app/api/provider/customers/[user_id]/posture-entries と manual/[id]版の両方から呼ぶ。
 * @param {object} opts
 * @param {import('@supabase/supabase-js').SupabaseClient} opts.supabase
 * @param {string} opts.providerId
 * @param {string} [opts.providerSlug] - Storageのファイルパス整理用
 * @param {string|null} opts.userId
 * @param {string|null} opts.manualCustomerId
 * @param {string|null} opts.staffId
 * @param {string|null} opts.note
 * @param {string} opts.photoBase64
 * @param {string} opts.mediaType
 */
export async function createPostureEntry({ supabase, providerId, providerSlug, userId, manualCustomerId, staffId, note, photoBase64, mediaType }) {
  const { score, findings } = await analyzePosturePhoto(photoBase64, mediaType);

  const ext = mediaType === 'image/png' ? 'png' : mediaType === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${providerSlug || providerId}/posture/${Date.now()}.${ext}`;
  const buffer = Buffer.from(photoBase64, 'base64');
  const { error: uploadError } = await supabase.storage
    .from('provider-photos')
    .upload(fileName, buffer, { contentType: mediaType, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage.from('provider-photos').getPublicUrl(fileName);

  const { data, error } = await supabase
    .from('provider_posture_entries')
    .insert({
      provider_id: providerId,
      user_id: userId || null,
      manual_customer_id: manualCustomerId || null,
      staff_id: staffId || null,
      photo_url: publicUrl,
      score,
      findings,
      note: note?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
