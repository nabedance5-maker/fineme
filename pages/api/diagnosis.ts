import type { NextApiRequest, NextApiResponse } from 'next';

type Answers = { [k: string]: string };

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// Simple in-memory rate limiter (per IP). For production use a shared store (Redis).
const RATE_LIMIT_MAP = new Map<string, { count: number, resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // allow 20 requests per minute per IP

function getIp(req: NextApiRequest){
  const xf = req.headers['x-forwarded-for'];
  if(typeof xf === 'string') return xf.split(',')[0].trim();
  if(Array.isArray(xf)) return xf[0];
  return req.socket.remoteAddress || 'unknown';
}

function rateLimit(req: NextApiRequest){
  const ip = getIp(req);
  const now = Date.now();
  const rec = RATE_LIMIT_MAP.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if(now > rec.resetAt){ rec.count = 0; rec.resetAt = now + RATE_LIMIT_WINDOW_MS; }
  rec.count++;
  RATE_LIMIT_MAP.set(ip, rec);
  return rec.count <= RATE_LIMIT_MAX;
}

function sanitizeText(s: any, max = 300){
  if(typeof s !== 'string') s = String(s || '');
  // strip control characters
  s = s.replace(/[\x00-\x1F\x7F]/g, '');
  s = s.trim();
  if(s.length > max) s = s.slice(0, max);
  return s;
}

async function callOpenAI(prompt: string){
  const url = 'https://api.openai.com/v1/chat/completions';
  const controller = new AbortController();
  const timeout = setTimeout(()=> controller.abort(), 25_000); // 25s timeout
  try{
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are Fineme assistant that MUST return strict JSON only, no extra commentary.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 400
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if(!res.ok){
      const t = await res.text();
      throw new Error(`OpenAI error: ${res.status}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
    return String(content);
  }finally{ clearTimeout(timeout); }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if(!OPENAI_API_KEY) return res.status(500).json({ error: 'Server not configured: OPENAI_API_KEY missing' });
  if(!rateLimit(req)) return res.status(429).json({ error: 'Rate limit exceeded' });
  try{
    const body = req.body as { answers?: Answers };
    const answers = body?.answers || {};

    // Validate & sanitize allowed keys
    const allowedKeys = new Set(['gender','age','height','personal_color','fashion','impression','prep_time','want_impression','oneword','category']);
    const sanitized: Record<string,string> = {};
    for(const [k,v] of Object.entries(answers)){
      if(!allowedKeys.has(k)) continue;
      if(k === 'age'){
        const n = Number(v);
        if(Number.isNaN(n) || n < 6 || n > 120) return res.status(400).json({ error: 'Invalid age' });
        sanitized[k] = String(Math.floor(n));
      }else if(k === 'height'){
        const n = Number(v);
        if(Number.isNaN(n) || n < 50 || n > 260) return res.status(400).json({ error: 'Invalid height' });
        sanitized[k] = String(Math.floor(n));
      }else if(k === 'personal_color'){
        const allowed = ['春','夏','秋','冬','わからない','spring','summer','autumn','winter'];
        const s = String(v).trim();
        if(!allowed.includes(s) && s.length>50) return res.status(400).json({ error: 'Invalid personal_color' });
        sanitized[k] = sanitizeText(s, 50);
      }else{
        sanitized[k] = sanitizeText(v, 300);
      }
    }

    // Build prompt safely (JSON-encode values)
    const userData = JSON.stringify(sanitized);
    const prompt = `あなたは「Fineme」という外見診断サービスのAIアシスタントです。\n以下のユーザー回答(JSON)をもとに、32タイプのうち最も適切な1つを判定してください。\n出力は必ず厳密なJSONのみで行ってください。\n\n入力(JSON):\n${userData}\n\n出力フォーマット：\n{\n  "type_name": "(タイプ名)",\n  "type_description": "(2〜3行の説明)",\n  "recommendation": "(おすすめ施策・カテゴリへの一言誘導)"\n}\n\n注意：余分な説明や注釈を付けず、必ず JSON のみ返してください。`;

    const content = await callOpenAI(prompt);
    // extract JSON safely
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if(!jsonMatch){
      return res.status(502).json({ error: 'Invalid response from AI', raw: content.slice(0,1000) });
    }
    let parsed;
    try{ parsed = JSON.parse(jsonMatch[0]); }catch(e){
      return res.status(502).json({ error: 'Failed to parse JSON from AI', raw: jsonMatch[0].slice(0,1000) });
    }
    // Basic output validation
    if(!parsed?.type_name || !parsed?.type_description) return res.status(502).json({ error: 'AI returned incomplete data' });
    return res.status(200).json({ result: parsed });
  }catch(err:any){
    // avoid leaking internal error details or secrets
    console.error('diagnosis api error', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
