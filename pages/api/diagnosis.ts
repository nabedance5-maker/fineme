import type { NextApiRequest, NextApiResponse } from 'next';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

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

// ---- Sanitize ----
function sanitize(s: unknown, max = 200): string {
  if (typeof s !== 'string') s = String(s ?? '');
  return (s as string).replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, max);
}

// ---- Build prompt ----
function buildPrompt(payload: Record<string, unknown>): string {
  const scores = payload.scores as Record<string, number> ?? {};
  const drills = payload.drills as Record<string, string[]> ?? {};
  const context = payload.context as { reasons?: string[]; budget?: string; area?: string } ?? {};
  const vagueItems = payload.vagueItems as string[] ?? [];

  // Sanitized scores
  const scoreLines = Object.entries(scores)
    .filter(([k]) => ALLOWED_SCORE_KEYS.has(k))
    .map(([k, v]) => {
      const score = Math.max(1, Math.min(10, Math.round(Number(v) || 5)));
      return `- ${ITEM_LABELS[k] ?? k}: ${score}/10`;
    })
    .join('\n');

  // Sanitized drills
  const drillLines = Object.entries(drills)
    .filter(([k]) => ALLOWED_SCORE_KEYS.has(k))
    .map(([k, opts]) => {
      const safe = (Array.isArray(opts) ? opts : [])
        .map(o => sanitize(o, 100))
        .filter(Boolean)
        .slice(0, 6);
      return `- ${ITEM_LABELS[k] ?? k}の悩み: ${safe.join(' / ')}`;
    })
    .filter(line => line.includes(':') && !line.endsWith(': '))
    .join('\n');

  const hasVague = vagueItems.length > 0;
  const vagueNote = hasVague
    ? `\n※ 以下の項目では「なんとなくダメな気がするけど言語化できない」という感覚が報告されています: ${vagueItems.map(k => ITEM_LABELS[k] ?? k).join('、')}`
    : '';

  const contextNote = [
    context.reasons?.length ? `変えたい理由: ${context.reasons.slice(0,4).map(r => sanitize(r, 40)).join('、')}` : '',
    context.budget ? `予算: ${sanitize(context.budget, 30)}` : '',
    context.area ? `エリア: ${sanitize(context.area, 30)}` : '',
  ].filter(Boolean).join('\n');

  return `あなたは「Fineme」という外見磨きサービス検索ポータルの、パーソナル外見コンサルタントAIです。
Finemeのミッションは「外見を起点に、自信を再設計する人を増やす」ことです。

ユーザーが8項目について自己採点した結果と、各項目の具体的な悩みを基に、
このユーザー専用の「変容ロードマップ」を生成してください。

【現状スコア（1〜10点、10が満点）】
${scoreLines}

【各項目の具体的な悩み】
${drillLines || '（回答なし）'}
${vagueNote}

【文脈情報】
${contextNote || '（回答なし）'}

【出力指示】
以下の厳密なJSONのみを返してください。余分な説明は不要です。

{
  "badge": "（ユーザーの現状を一言で表す称号。例: 清潔感覚醒前夜、外見再設計フェーズ1 など。20文字以内）",
  "heading": "（診断結果の見出し。ユーザーの最大課題に触れながら前向きに。30文字以内）",
  "sub": "（見出しを補足する一文。40文字以内）",
  "priorities": [
    {
      "title": "（優先課題1のタイトル。例: 髪型を変えて第一印象をリセットする）",
      "desc": "（具体的なアドバイス。なぜこれが優先なのかを含める。80文字以内）"
    },
    {
      "title": "（優先課題2）",
      "desc": "（アドバイス。80文字以内）"
    },
    {
      "title": "（優先課題3）",
      "desc": "（アドバイス。80文字以内）"
    }
  ],
  "scenario": "（3ヶ月後のシナリオ文章。このユーザーが取り組んだ先に何が変わるかを具体的かつ感情に響く言葉で描く。150文字以内）",
  "serviceKeys": ["（推奨サービスカテゴリのキー。eyebrow/hair/body/skin/hair_removal/teeth/nail/makeup/consultant/photo から最大3つ）"]
}

【重要な指示】
- vagueItems（言語化できない悩みがある項目）が存在する場合は、serviceKeys に必ず "consultant" を含めること
- スコアが低い項目を優先するが、文脈（変えたい理由・予算・エリア）も考慮すること
- 「このユーザーのための答え」を出すこと。一般論にしない
- 文章は温かく、背中を押す口調で。批判的・否定的な表現は避けること`;
}

// ---- OpenAI call ----
async function callOpenAI(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28_000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a JSON-only responder. Return strict JSON with no extra text.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    return String(data?.choices?.[0]?.message?.content ?? '');
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Handler ----
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY が設定されていません' });
  if (!rateLimit(req)) return res.status(429).json({ error: 'しばらくしてからお試しください' });

  try {
    const body = req.body as Record<string, unknown>;

    // Validate scores exist
    const scores = body?.scores as Record<string, unknown> ?? {};
    const hasScores = ALLOWED_SCORE_KEYS.size > 0 &&
      Object.keys(scores).some(k => ALLOWED_SCORE_KEYS.has(k));
    if (!hasScores) {
      return res.status(400).json({ error: 'スコアデータが不足しています' });
    }

    const prompt = buildPrompt(body);
    const content = await callOpenAI(prompt);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'AIの応答が不正です', raw: content.slice(0, 500) });
    }

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(jsonMatch[0]); }
    catch { return res.status(502).json({ error: 'JSONパースに失敗しました' }); }

    // Validate required fields
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
