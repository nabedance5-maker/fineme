import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

// ---- Rate limiter ----
const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
function getIp(req: NextApiRequest) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string') return xf.split(',')[0].trim();
  if (Array.isArray(xf)) return xf[0];
  return req.socket?.remoteAddress || 'unknown';
}
function rateLimit(req: NextApiRequest) {
  const ip = getIp(req);
  const now = Date.now();
  const rec = RATE_LIMIT_MAP.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + 60_000; }
  rec.count++;
  RATE_LIMIT_MAP.set(ip, rec);
  return rec.count <= 20;
}

// ---- Allowed keys ----
const ALLOWED_SCORE_KEYS = new Set([
  'eyebrow', 'hair', 'body', 'skin', 'hair_removal', 'teeth', 'nail', 'makeup',
]);
const ITEM_LABELS: Record<string, string> = {
  eyebrow: '眉', hair: '髪', body: '体型', skin: '肌',
  hair_removal: 'ムダ毛', teeth: '歯', nail: '爪', makeup: 'メイク',
};
const VAGUE_LABEL = 'なんとなく気になるけど、何が問題かわからない';

function sanitize(s: unknown, max = 200): string {
  if (typeof s !== 'string') s = String(s ?? '');
  return (s as string).replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, max);
}

function buildPrompt(payload: Record<string, unknown>): string {
  const scores = payload.scores as Record<string, number> ?? {};
  const drills = payload.drills as Record<string, string[]> ?? {};
  const context = payload.context as { reasons?: string[]; budget?: string; area?: string } ?? {};
  const vagueItems = payload.vagueItems as string[] ?? [];

  const scoreLines = Object.entries(scores)
    .filter(([k]) => ALLOWED_SCORE_KEYS.has(k))
    .map(([k, v]) => {
      const score = Math.max(1, Math.min(10, Math.round(Number(v) || 5)));
      return `- ${ITEM_LABELS[k] ?? k}: ${score}/10`;
    }).join('\n');

  const drillLines = Object.entries(drills)
    .filter(([k]) => ALLOWED_SCORE_KEYS.has(k))
    .map(([k, opts]) => {
      const safe = (Array.isArray(opts) ? opts : [])
        .map(o => sanitize(o, 100)).filter(Boolean).slice(0, 6);
      return `- ${ITEM_LABELS[k] ?? k}の悩み: ${safe.join(' / ')}`;
    }).filter(line => !line.endsWith(': ')).join('\n');

  const vagueNote = vagueItems.length
    ? `\n※ 言語化できない漠然とした不満がある項目: ${vagueItems.map(k => ITEM_LABELS[k] ?? k).join('、')}`
    : '';

  const contextNote = [
    context.reasons?.length ? `変えたい理由: ${context.reasons.slice(0, 4).map(r => sanitize(r, 40)).join('、')}` : '',
    context.budget ? `予算: ${sanitize(context.budget, 30)}` : '',
    context.area ? `エリア: ${sanitize(context.area, 30)}` : '',
  ].filter(Boolean).join('\n');

  return `あなたは「Fineme」という外見磨きサービス検索ポータルの、パーソナル外見コンサルタントAIです。
Finemeのミッションは「外見を起点に、自信を再設計する人を増やす」ことです。

ユーザーが8項目について自己採点した結果と、各項目の具体的な悩みをもとに、
このユーザー専用の「変容ロードマップ」を生成してください。

【現状スコア（1〜10点）】
${scoreLines}

【各項目の具体的な悩み】
${drillLines || '（回答なし）'}
${vagueNote}

【文脈情報】
${contextNote || '（回答なし）'}

【出力形式】
以下の厳密なJSONのみを返してください。前後に余分なテキストを含めないこと。

{
  "badge": "ユーザーの現状を一言で表す称号（20文字以内）",
  "heading": "診断結果の見出し（最大課題に触れ前向きに、30文字以内）",
  "sub": "見出しを補足する一文（40文字以内）",
  "priorities": [
    { "title": "優先課題1（30文字以内）", "desc": "具体的アドバイス（80文字以内）" },
    { "title": "優先課題2（30文字以内）", "desc": "具体的アドバイス（80文字以内）" },
    { "title": "優先課題3（30文字以内）", "desc": "具体的アドバイス（80文字以内）" }
  ],
  "scenario": "3ヶ月後のシナリオ。取り組んだ先の変化を感情に響く言葉で（150文字以内）",
  "serviceKeys": ["eyebrow","hair","body","skin","hair_removal","teeth","nail","makeup","consultant","photo" から最大3つ選んで配列で返す]
}

【重要ルール】
- vagueItems（言語化できない不満）がある場合は serviceKeys に必ず "consultant" を含めること
- スコアが低い項目を優先しつつ、文脈（理由・予算・エリア）も考慮する
- 一般論を避け「このユーザーのための答え」を出すこと
- 温かく背中を押す口調で。批判的・否定的な表現は避けること`;
}

async function callClaude(prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY が設定されていません' });
  if (!rateLimit(req)) return res.status(429).json({ error: 'しばらくしてからお試しください' });

  try {
    const body = req.body as Record<string, unknown>;
    const scores = body?.scores as Record<string, unknown> ?? {};
    if (!Object.keys(scores).some(k => ALLOWED_SCORE_KEYS.has(k))) {
      return res.status(400).json({ error: 'スコアデータが不足しています' });
    }

    const prompt = buildPrompt(body);
    const content = await callClaude(prompt);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: 'AIの応答が不正です' });

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(jsonMatch[0]); }
    catch { return res.status(502).json({ error: 'JSONパースに失敗しました' }); }

    if (!parsed.heading || !Array.isArray(parsed.priorities)) {
      return res.status(502).json({ error: 'AIの応答が不完全です' });
    }

    return res.status(200).json({ result: parsed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[diagnosis API]', msg);
    return res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
