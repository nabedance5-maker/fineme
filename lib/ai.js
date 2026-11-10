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
// 上から順に試す（無料モデルは混み合うと429で断られるため）。日本語の質を見て選んだ（2026-11-06）。
// 無料モデルは入れ替わりが早いので、OPENROUTER_FREE_MODELS（カンマ区切り）で差し替えられるようにする
const FREE_MODELS = () => (process.env.OPENROUTER_FREE_MODELS || 'nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-31b-it:free,openrouter/free')
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

async function callFreeModel(model, params, messages, schema, timeoutMs = FREE_TIMEOUT_MS) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://www.fineme.me',
      'X-Title': 'Fineme',
    },
    body: JSON.stringify({ model, messages, max_tokens: (params.max_tokens || 1024) + REASONING_HEADROOM }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  const choice = data.choices?.[0];
  let text = (choice?.message?.content || '').trim();
  if (!text) throw new Error(`${model} empty response`);
  if (schema) {
    text = extractJson(text);
    if (!text) throw new Error(`${model} invalid json`);
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

async function callFree(params, budgetMs = 0) {
  const deadline = budgetMs ? Date.now() + budgetMs : 0;
  const schema = params.output_config?.format?.type === 'json_schema' ? params.output_config.format.schema : null;
  let system = textOf(params.system);
  if (schema) system += `\n\n【出力形式】次の JSON Schema に合う JSON だけを返してください。前後に説明やコードブロックの記号を付けないでください。\n${JSON.stringify(schema)}`;
  const messages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...params.messages.map(m => ({ role: m.role, content: textOf(m.content) })),
  ];
  const errors = [];
  for (const model of FREE_MODELS()) {
    const left = deadline ? deadline - Date.now() : FREE_TIMEOUT_MS;
    if (left < 3000) { errors.push('time budget used up'); break; }
    try { return await callFreeModel(model, params, messages, schema, Math.min(left, FREE_TIMEOUT_MS)); } catch (e) { errors.push(e.message); }
  }
  throw new Error(errors.join(' / '));
}

// 道具（tool_use）の代わりに JSON で答えさせたい呼び出し用。無料モデルで JSON Schema に合う答えを返し、
// 失敗したら例外を投げる（呼び出し側が元の Claude の呼び方に戻す）。budget_ms は無料モデル全体で待つ上限
// （画面から呼ぶものは、切り替え先の Claude の時間を残すため短くする）。
// AI専属コンサルで使う（渡邉判断 2026-11-10：店舗の管理画面のAIも無料モデルで動かす。お客様の個人名は渡さない）
export async function freeJson({ system, messages, schema, max_tokens = 2000, budget_ms = 0 }) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');
  const res = await callFree({ system, messages, max_tokens, output_config: { format: { type: 'json_schema', schema } } }, budget_ms);
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
        const usable = process.env.OPENROUTER_API_KEY && !params.tools?.length && !hasImage(params.messages || []);
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
