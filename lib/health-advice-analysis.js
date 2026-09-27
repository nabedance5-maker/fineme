// AI健診アドバイス（でお要望2026-09-27・今野くん発案）。人間ドック等の結果写真＋
// 任意の補足入力テキスト（数値の読み違い対策）から、生活習慣のアドバイスを返す。
// lib/posture-analysis.jsと同じ「事実に基づく観察のみ・断定しない・医療診断はしない」
// 方針を踏襲する。健康診断結果という性質上、特に医学的診断表現の禁止を厳守する。
import Anthropic from '@anthropic-ai/sdk';
import { getHealthAdviceCategory } from './health-advice-categories';

function buildSystemPrompt(category, axisLabel, hasInputText) {
  return `あなたは、店舗スタッフ向けに健康・美容関連の記録を読み、生活習慣のアドバイスを
提案するアシスタントです。医師ではないため医学的診断は一切せず、一般的な生活習慣の
観点からの気づきのみを提供します。

【対象】${category.label}
${category.guidance}
${hasInputText ? '写真に加えて、スタッフが数値等を補足入力したテキストも渡します。写真の読み取りと食い違う場合はテキストの方を優先してください。' : ''}
${axisLabel ? `【特に重視してほしい観点】${axisLabel}` : ''}

【厳守】
- 写真・入力テキストから実際に確認できる事実のみを述べる。書かれていないことは推測しない
- 「〜のように見えます」「〜を意識すると良いかもしれません」等、言い切らない表現を使う
- 病名・医学的診断（「高血圧症」「脂質異常症」等）は絶対に使わない。数値の異常を指摘する場合も
  「基準値より高め/低めの傾向」という表現に留め、断定・重篤性の評価はしない
- 治療・服薬に関する助言は絶対にしない（「病院に相談することをおすすめします」に留める）
- 決めつけ・断定的な表現をしない

以下のJSON形式のみで出力してください（コードブロックなし、JSONだけ）:
{
  "advice": [
    "気づき・アドバイスを1文で（例: 数値の傾向から、塩分を控えめにした食事を意識すると良いかもしれません）",
    "..."
  ]
}
adviceは3〜5個、それぞれ簡潔な1文で。`;
}

/**
 * @param {string} categoryId
 * @param {string|null} axisId
 * @param {string} photoBase64
 * @param {string} mediaType
 * @param {string|null} inputText
 * @returns {Promise<string[]>}
 */
export async function analyzeHealthAdvice({ categoryId, axisId, photoBase64, mediaType, inputText }) {
  const category = getHealthAdviceCategory(categoryId);
  if (!category) throw new Error('対応していないカテゴリです');
  const axis = category.axes.find(a => a.id === axisId) || null;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const content = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: photoBase64 } },
  ];
  const textParts = [`この${category.label}の結果を分析してください。`];
  if (inputText?.trim()) textParts.push(`補足入力：${inputText.trim()}`);
  content.push({ type: 'text', text: textParts.join('\n') });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: buildSystemPrompt(category, axis?.label, !!inputText?.trim()),
    messages: [{ role: 'user', content }],
  });

  const raw = message.content[0]?.text?.trim() || '{}';
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : raw);
  return Array.isArray(parsed.advice) ? parsed.advice.map(String).slice(0, 6) : [];
}

/**
 * 写真の分析・Storageアップロード・DB保存を1回でまとめて行う（会員/非会員共通）。
 * @param {object} opts
 * @param {import('@supabase/supabase-js').SupabaseClient} opts.supabase
 * @param {string} opts.providerId
 * @param {string} [opts.providerSlug]
 * @param {string|null} opts.userId
 * @param {string|null} opts.manualCustomerId
 * @param {string|null} opts.staffId
 * @param {string} opts.categoryId
 * @param {string|null} opts.axisId
 * @param {string|null} opts.note
 * @param {string|null} opts.inputText
 * @param {string} opts.photoBase64
 * @param {string} opts.mediaType
 */
export async function createHealthAdviceEntry({ supabase, providerId, providerSlug, userId, manualCustomerId, staffId, categoryId, axisId, note, inputText, photoBase64, mediaType }) {
  const advice = await analyzeHealthAdvice({ categoryId, axisId, photoBase64, mediaType, inputText });

  const ext = mediaType === 'image/png' ? 'png' : mediaType === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${providerSlug || providerId}/health-advice/${Date.now()}.${ext}`;
  const buffer = Buffer.from(photoBase64, 'base64');
  const { error: uploadError } = await supabase.storage
    .from('provider-photos')
    .upload(fileName, buffer, { contentType: mediaType, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage.from('provider-photos').getPublicUrl(fileName);

  const { data, error } = await supabase
    .from('provider_health_advice_entries')
    .insert({
      provider_id: providerId,
      user_id: userId || null,
      manual_customer_id: manualCustomerId || null,
      staff_id: staffId || null,
      category: categoryId,
      advice_axis: axisId || null,
      photo_url: publicUrl,
      input_text: inputText?.trim() || null,
      advice,
      note: note?.trim() || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
