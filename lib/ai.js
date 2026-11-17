// AIの呼び出し先を用途で分ける（渡邉判断 2026-11-06：Claude APIの消費が早いため）。
//
// - 'free'：社内向けで個人情報が入らないもの（記事・SNSの下書き・運営の管理画面の分析・ドラマ制作）。
//   OpenRouter の無料モデルで動かし、失敗した時（回数上限・空の返答・JSONが壊れている等）だけ Claude Haiku に切り替える。
// - 店舗の管理画面の機能は Claude Haiku、お客様に有料で出しているもの（Mirror等）は今のモデルのまま（各ファイルで指定）。
//   お客様のカルテ・写真など個人の情報が入るものは、無料モデルに送らない（提供元が保存・学習に使う場合があるため）。
//
// aiClient('free') は new Anthropic() と同じ形（client.messages.create(params)）で使え、返り値も Anthropic の形
// （content: [{ type: 'text', text }], stop_reason, usage）に揃える。
// 道具（web_search 等）・画像を使う呼び出しは無料モデルでは動かないため、はじめから Haiku で呼ぶ。
import Anthropic from '@anthropic-ai/sdk';

export const HAIKU = 'claude-haiku-4-5-20251001';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// 上から順に試す（無料モデルは混み合うと429で断られるため）。日本語の質と速さを見て選んだ。
// 2026-11-13 見直し：前の並び（nemotron-3-ultra・gemma-4-31b）は JSON の崩れ・混み合い（429）・時間切れで全部失敗し、
// AI専属コンサルが返答できなくなっていた。JSON の形を指定（response_format）した上で測り、速くて JSON が崩れない順にした
// （particle-1 約3秒・ernie-5.5-flash 約4秒・nemotron-3.5-super-vl 約9秒）。
// 無料モデルは入れ替わりが早いので、OPENROUTER_FREE_MODELS（カンマ区切り）で差し替えられるようにする
const FREE_MODELS = () => (process.env.OPENROUTER_FREE_MODELS || 'particle-ai/particle-1:free,baidu/ernie-5.5-flash-preview:free,nvidia/nemotron-3.5-super-vl:free,openrouter/free,nvidia/nemotron-3-ultra-550b-a55b:free')
  .split(',').map(s => s.trim()).filter(Boolean);
const FREE_TIMEOUT_MS = 120000;
// 考える過程（reasoning）にもトークンを使うモデルがあり、元の上限のままだと本文が空になるため上乗せする
const REASONING_HEADROOM = 4000;

const textOf = content => (typeof content === 'string'
  ? content
  : (content || []).filter(b => b?.type === 'text').map(b => b.text).join('\n'));
const hasImage = messages => messages.some(m => Array.isArray(m.content) && m.content.some(b => b?.type === 'image' || b?.type === 'document'));

// ```json … ``` で包まれた返答や、前後に説明が付いた返答から JSON 部分だけを取り出す
function extractJson(text) {
  const t = String(text || '').trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1].trim() : t;
  const start = body.search(/[[{]/);
  const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
  if (start < 0 || end < start) return null;
  const json = body.slice(start, end + 1);
  try { JSON.parse(json); return json; } catch { return null; }
}

// Groq の無料枠（2026-11-13 渡邉がキーを発行）。OpenRouter と同じ形（OpenAI互換）で呼べる。
// 測った結果（gpt-oss-120b 約0.7秒・JSONが崩れない）がいちばん速く安定していたため、一番手にする。
// 無料枠は1分あたり・1日あたりの回数と文字数（トークン）に上限があり、超えると429で断られる → 次の候補へ
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = () => (process.env.GROQ_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b').split(',').map(x => x.trim()).filter(Boolean);

async function callFreeModel(model, params, messages, schema, timeoutMs = FREE_TIMEOUT_MS, via = 'openrouter') {
  const groq = via === 'groq';
  const res = await fetch(groq ? GROQ_URL : OPENROUTER_URL, {
    method: 'POST',
    headers: groq
      ? { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }
      : {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.fineme.me',
        'X-Title': 'Fineme',
      },
    // JSON で返してほしい時は、モデル側にも JSON の形を指定する（これが無いと、説明文が混ざって壊れることが多かった）
    body: JSON.stringify({ model, messages, max_tokens: (params.max_tokens || 1024) + REASONING_HEADROOM, ...(schema ? { response_format: { type: 'json_object' } } : {}) }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${groq ? 'groq ' : ''}${model} ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  const choice = data.choices?.[0];
  let text = (choice?.message?.content || '').trim();
  if (!text) throw new Error(`${model} empty response`);
  if (schema) {
    const json = extractJson(text);
    // 会話の返事のように、JSON が崩れても本文だけ使えれば良い呼び出しは、その本文を返事として使う
    if (!json && params.textFallbackKey && text.length > 10 && !/^[[{]/.test(text)) text = JSON.stringify({ [params.textFallbackKey]: text });
    else if (!json) throw new Error(`${model} invalid json`);
    else text = json;
  }
  return {
    id: data.id,
    model: data.model || model,
    role: 'assistant',
    content: [{ type: 'text', text }],
    stop_reason: choice?.finish_reason === 'length' ? 'max_tokens' : 'end_turn',
    usage: { input_tokens: data.usage?.prompt_tokens || 0, output_tokens: data.usage?.completion_tokens || 0 },
  };
}

// OpenRouter が全部だめだった時の控え：Gemini API の無料枠（2026-11-13 渡邉がキーを発行）。
// 請求の設定をしていない Google プロジェクトのキー（GEMINI_FREE_API_KEY）を使う。無料枠は入力が Google の改善に使われうるため、
// 呼ぶのは無料モデルと同じく個人情報を含まない用途だけ（aiClient('free')・freeJson の呼び出し元）。
const GEMINI_URL = m => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`;
const GEMINI_MODELS = () => (process.env.GEMINI_FREE_MODELS || 'gemini-3.5-flash-lite,gemini-3.5-flash').split(',').map(x => x.trim()).filter(Boolean);
const geminiKey = () => process.env.GEMINI_FREE_API_KEY || '';

// Anthropic の形の content（文字列 or ブロックの配列）を Gemini の parts に直す。
// 画像・PDF（base64）は inlineData にする。無料枠の呼び出しには画像は来ない（aiClient('free') が除外している）
function toGeminiParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  const parts = [];
  for (const b of content || []) {
    if (b?.type === 'text') parts.push({ text: b.text });
    else if ((b?.type === 'image' || b?.type === 'document') && b.source?.type === 'base64') parts.push({ inlineData: { mimeType: b.source.media_type, data: b.source.data } });
  }
  return parts.length ? parts : [{ text: '' }];
}

async function callGemini(model, params, system, schema, timeoutMs, key = geminiKey()) {
  const contents = params.messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: toGeminiParts(m.content) }));
  const res = await fetch(GEMINI_URL(model), {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents,
      generationConfig: { maxOutputTokens: (params.max_tokens || 1024) + REASONING_HEADROOM, ...(schema ? { responseMimeType: 'application/json' } : {}) },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`gemini ${model} ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  let text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  if (!text) throw new Error(`gemini ${model} empty response`);
  if (schema) {
    const json = extractJson(text);
    if (!json && params.textFallbackKey && text.length > 10 && !/^[[{]/.test(text)) text = JSON.stringify({ [params.textFallbackKey]: text });
    else if (!json) throw new Error(`gemini ${model} invalid json`);
    else text = json;
  }
  return {
    id: data.responseId || null, model, role: 'assistant',
    content: [{ type: 'text', text }],
    stop_reason: data.candidates?.[0]?.finishReason === 'MAX_TOKENS' ? 'max_tokens' : 'end_turn',
    usage: { input_tokens: data.usageMetadata?.promptTokenCount || 0, output_tokens: data.usageMetadata?.candidatesTokenCount || 0 },
  };
}

const schemaOf = params => (params.output_config?.format?.type === 'json_schema' ? params.output_config.format.schema : null);
function systemWithSchema(params, schema) {
  let system = textOf(params.system);
  if (schema) system += `\n\n【出力形式】次の JSON Schema に合う JSON だけを返してください。前後に説明やコードブロックの記号を付けないでください。\n${JSON.stringify(schema)}`;
  return system;
}

async function callFree(params, budgetMs = 0) {
  const deadline = budgetMs ? Date.now() + budgetMs : 0;
  const schema = schemaOf(params);
  const system = systemWithSchema(params, schema);
  const messages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...params.messages.map(m => ({ role: m.role, content: textOf(m.content) })),
  ];
  const errors = [];
  // 1. Groq（速い）→ 2. OpenRouter の無料モデル → 3. Gemini の無料枠。後ろの候補の時間を残すよう、前の段の待ちを区切る
  const groqDeadline = deadline ? Date.now() + Math.floor(budgetMs / 4) : 0;
  for (const model of process.env.GROQ_API_KEY ? GROQ_MODELS() : []) {
    const left = groqDeadline ? groqDeadline - Date.now() : 30000;
    if (left < 2000) { errors.push('groq: time budget used up'); break; }
    try { return await callFreeModel(model, params, messages, schema, Math.min(left, 30000), 'groq'); } catch (e) { errors.push(e.message); }
  }
  const orDeadline = deadline && geminiKey() ? Date.now() + Math.floor((deadline - Date.now()) / 2) : deadline;
  for (const model of process.env.OPENROUTER_API_KEY ? FREE_MODELS() : []) {
    const left = orDeadline ? orDeadline - Date.now() : FREE_TIMEOUT_MS;
    if (left < 3000) { errors.push('time budget used up'); break; }
    try { return await callFreeModel(model, params, messages, schema, Math.min(left, FREE_TIMEOUT_MS)); } catch (e) { errors.push(e.message); }
  }
  for (const model of geminiKey() ? GEMINI_MODELS() : []) {
    const left = deadline ? deadline - Date.now() : FREE_TIMEOUT_MS;
    if (left < 3000) { errors.push('gemini: time budget used up'); break; }
    try { return await callGemini(model, params, system, schema, Math.min(left, FREE_TIMEOUT_MS)); } catch (e) { errors.push(e.message); }
  }
  throw new Error(errors.join(' / ') || 'no free model configured');
}

// 道具（tool_use）の代わりに JSON で答えさせたい呼び出し用。無料モデルで JSON Schema に合う答えを返し、
// 失敗したら例外を投げる（呼び出し側が元の Claude の呼び方に戻す）。budget_ms は無料モデル全体で待つ上限
// （画面から呼ぶものは、切り替え先の Claude の時間を残すため短くする）。
// AI専属コンサルで使う（渡邉判断 2026-11-10：店舗の管理画面のAIも無料モデルで動かす。お客様の個人名は渡さない）
// text_fallback_key を渡すと、JSON が崩れた時でもモデルの文章をそのキーの値として返す（会話の返事など）
export async function freeJson({ system, messages, schema, max_tokens = 2000, budget_ms = 0, text_fallback_key = null }) {
  if (!process.env.OPENROUTER_API_KEY && !geminiKey() && !process.env.GROQ_API_KEY) throw new Error('no free model key set');
  const res = await callFree({ system, messages, max_tokens, output_config: { format: { type: 'json_schema', schema } }, textFallbackKey: text_fallback_key }, budget_ms);
  return JSON.parse(res.content[0].text);
}

// 無料モデルに失敗した時の切り替え先。構造化出力（output_config）を使う呼び出しは、
// Haiku で同じ指定が通るか確かめていないため、元の指定のまま呼ぶ（週1の記事のみ・失敗時だけ）
function fallbackParams(params) {
  return params.output_config ? params : { ...params, model: HAIKU };
}

export function aiClient(tier, { budgetMs = 0 } = {}) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  if (tier !== 'free') return anthropic;
  return {
    messages: {
      async create(params) {
        const usable = (process.env.OPENROUTER_API_KEY || geminiKey() || process.env.GROQ_API_KEY) && !params.tools?.length && !hasImage(params.messages || []);
        if (usable) {
          try { return await callFree(params, budgetMs); } catch (e) {
            console.warn('[ai] free model failed, fallback to Claude:', e.message);
          }
        }
        return anthropic.messages.create(fallbackParams(params));
      },
    },
  };
}

// 写真を読むAI（姿勢分析・健診アドバイス。2026-11-12）。お客様の体や健診結果の写真は個人の情報のため、
// 無料モデル（OpenRouter）には送らず、Claude API（Anthropic）を直接呼ぶ（渡邉判断 2026-11-12）。
// content：[{ type: 'image', base64, mediaType } | { type: 'text', text }]。返り値は文字列（JSONは呼び出し側で読む）
export async function visionText({ system, content, max_tokens = 1500 }) {
  const anthropic = claudeClient({ personal: true });
  const message = await anthropic.messages.create({
    model: HAIKU,
    max_tokens,
    system,
    messages: [{
      role: 'user',
      content: content.map(b => (b.type === 'image'
        ? { type: 'image', source: { type: 'base64', media_type: b.mediaType, data: b.base64 } }
        : { type: 'text', text: b.text })),
    }],
  });
  return (message.content.find(b => b.type === 'text')?.text || '').trim();
}

// ── Anthropic のクレジット不足の時の回避ルート（渡邉指示 2026-11-18）─────────────────────────
// 2026-11-10 に残高不足で週1の店舗ガイドが止まったため、Claude を直接呼んでいる機能も「残高不足で断られた時だけ」別の会社へ回す。
// それ以外のエラー（混み合い・入力の誤り等）は今まで通りそのまま投げる。
// - personal: false（個人情報が入らないもの：店舗の公開情報・集計の数字など）
//   → Groq → OpenRouter の無料モデル → Gemini 無料枠（callFree と同じ順）。道具（tools）・画像を使う呼び出しは回せないので投げる。
// - personal: true（お客様の写真・カルテ・診断結果・顧客CSVの見本など）
//   → 無料枠は入力が提供元の改善に使われうるため使わない。請求を設定した Google プロジェクトのキー
//     （GEMINI_PAID_API_KEY）がある時だけ、有料の Gemini へ回す。キーが無ければ今まで通りエラーを投げる。
export function isCreditError(e) {
  const msg = String(e?.message || '');
  return /credit balance is too low/i.test(msg) || (e?.status === 400 && /billing/i.test(msg));
}

const GEMINI_PAID_MODELS = () => (process.env.GEMINI_PAID_MODELS || 'gemini-3.5-flash,gemini-3.5-flash-lite').split(',').map(x => x.trim()).filter(Boolean);

async function callPaidGemini(params) {
  const key = process.env.GEMINI_PAID_API_KEY;
  const schema = schemaOf(params);
  const system = systemWithSchema(params, schema);
  const errors = [];
  for (const model of GEMINI_PAID_MODELS()) {
    try { return await callGemini(model, params, system, schema, FREE_TIMEOUT_MS, key); } catch (e) { errors.push(e.message); }
  }
  throw new Error(errors.join(' / '));
}

// new Anthropic() の代わりに使う（client.messages.create(params) の形は同じ）。stream は対応していない
export function claudeClient({ personal = true } = {}) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return {
    messages: {
      async create(params) {
        try {
          return await anthropic.messages.create(params);
        } catch (e) {
          if (!isCreditError(e)) throw e;
          const noTools = !params.tools?.length;
          if (!personal && noTools && !hasImage(params.messages || [])) {
            console.error('[ai] Anthropic credit too low, switching to free models');
            return await callFree(params);
          }
          if (personal && noTools && process.env.GEMINI_PAID_API_KEY) {
            console.error('[ai] Anthropic credit too low, switching to paid Gemini');
            return await callPaidGemini(params);
          }
          console.error('[ai] Anthropic credit too low, no fallback for this call (personal=%s, tools=%s)', personal, !noTools);
          throw e;
        }
      },
    },
  };
}
