// GET /api/cron/qanda-scout
// 毎週月曜10時JST(1時UTC)実行。
// Yahoo!知恵袋・ガールズちゃんねる等には投稿用の公式APIが存在せず、自動投稿はToS違反・
// アカウントBAN・なりすまし人格による欺瞞的行為に当たるため実装しない（master.md「健全でない
// 手法は取らない」）。その代わり、でおの負担を「自分で質問を探す」から「見つかった候補に
// 貼るだけ」まで圧縮する：
//   - GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX が設定済み → Google Custom Search APIで対象サイト上の
//     生きていそうな質問を検索し、候補ごとにAIが回答案を書いた状態ででおへメール
//   - 未設定（でおがAPI契約するかどうかはGO制・§8参照）→ テーマ別の回答ストックを
//     メールするフォールバックのみ（note-draftと同じ「コピペ用ストック」方式）
import Anthropic from '@anthropic-ai/sdk';
import { fetchAgentMemory, withMemory } from '@/lib/agent-memory';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY;
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX;

const QUERIES = [
  '清潔感がない 言われる 悩み',
  'マッチングアプリ 写真 マッチしない',
  '垢抜け 何から始める',
  '自分に自信がない 外見',
  '眉毛 整え方 メンズ',
];

const TARGET_SITES = ['chiebukuro.yahoo.co.jp', 'girlschannel.net'];

// フォールバック用の回答ストック（API未設定時）— 誘導リンクは入れず、素の回答として使える形
const STOCK_ANSWERS = [
  {
    theme: '清潔感がないと言われる',
    answer:
      '清潔感って結局「眉・髪・肌・爪」の4点にどれだけ手をかけてるかで9割決まると思う。特に眉は自分では気づきにくいけど、整えるだけで顔の印象が変わる。順番としては、まず眉と髪型を整えて、そのあと肌（保湿・皮脂対策）を見直すのがコスパいい。',
  },
  {
    theme: 'マッチングアプリで全然マッチしない',
    answer:
      '写真、盛れてる1枚より「清潔感が伝わる自然な1枚+全身1枚」の組み合わせの方がマッチ率上がる印象。あと第一印象は顔より「眉・髪型・服のサイズ感」で決まりがちだから、写真を撮り直す前にそこを整えるだけで変わることが多い。',
  },
  {
    theme: '垢抜けたいけど何から始めればいいか分からない',
    answer:
      '垢抜けは同時に全部やろうとすると迷子になる。優先順位は「体型・眉・髪・服」→「肌・脱毛」→「歯・爪」の順で、土台から手をつけるのが遠回りにならないコツ。一気にやらなくていい。',
  },
  {
    theme: '自分に自信が持てない（外見）',
    answer:
      '自信って気合いじゃなくて「変えられる余地がどこにあるか分かってる状態」から生まれると思う。漠然と「自分に自信がない」じゃなくて、外見のどこが引っかかってるのか1つに絞れると、意外と対処できることが多い。',
  },
];

async function generateAnswer(query, snippet) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const memory = await fetchAgentMemory();
    const system = withMemory(
      `あなたは「でお」（元・非モテ→現役モデル）。掲示板の質問に、専門家ぶらず対等な立場で答える。
断定・上から目線・宣伝・リンクの押し付け禁止。素の実体験・持論ベースで簡潔に（4〜6行）。
架空の実体験は書かない（一般論・持論として書く。「〜だと思う」「〜な印象」等）。
出力は回答文のみ（前置き不要）。`,
      memory
    );
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      temperature: 0.7,
      system,
      messages: [{ role: 'user', content: `質問の要旨：${query}\n参考スニペット：${snippet || '（なし）'}\n\nこの質問に対する回答を書いて。` }],
    });
    return msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || null;
  } catch (e) {
    console.error('[qanda-scout] answer gen error:', e.message);
    return null;
  }
}

async function searchCandidates() {
  const candidates = [];
  for (const query of QUERIES) {
    for (const site of TARGET_SITES) {
      try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_CX}&q=${encodeURIComponent(query)}&siteSearch=${encodeURIComponent(site)}&num=1`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const item = data.items?.[0];
        if (item) candidates.push({ query, site, title: item.title, link: item.link, snippet: item.snippet });
      } catch (e) {
        console.error('[qanda-scout] search error:', e.message);
      }
    }
  }
  return candidates;
}

async function emailStockFallback() {
  if (!process.env.RESEND_API_KEY) return;
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const rows = STOCK_ANSWERS.map(s => `
    <div style="margin-bottom:20px;padding:14px;background:#f8f8fb;border:1px solid #e5e7eb;border-radius:10px">
      <p style="font-weight:700;margin:0 0 6px">${s.theme}</p>
      <p style="font-size:14px;color:#333;margin:0;white-space:pre-line">${s.answer}</p>
    </div>`).join('');
  await resend.emails.send({
    from: 'Fineme 借り場 <noreply@fineme.me>',
    to: OWNER_EMAIL,
    subject: '【Fineme】今週の回答ストック（知恵袋・ガールズちゃんねる用）',
    html: `
      <h2 style="color:#111">💬 回答ストック</h2>
      <p style="color:#666;font-size:13px">
        Google Custom Search APIが未設定のため、質問の自動検索はしていません（GOOGLE_CSE_API_KEY / GOOGLE_CSE_CX を設定すると、生きている質問を自動で見つけて個別回答案を送るモードに切り替わります）。<br/>
        以下は該当しそうな質問を見つけたときにそのまま使える回答です。
      </p>
      ${rows}
    `,
  });
}

async function emailCandidates(candidatesWithAnswers) {
  if (!process.env.RESEND_API_KEY) return;
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const rows = candidatesWithAnswers.map(c => `
    <div style="margin-bottom:20px;padding:14px;background:#f8f8fb;border:1px solid #e5e7eb;border-radius:10px">
      <p style="font-size:12px;color:#999;margin:0 0 4px">${c.site}</p>
      <p style="font-weight:700;margin:0 0 6px"><a href="${c.link}">${c.title}</a></p>
      <p style="font-size:13px;color:#333;margin:0 0 8px">${c.snippet || ''}</p>
      <p style="font-size:14px;color:#111;background:#fff;border:1px solid #ddd;border-radius:8px;padding:10px;white-space:pre-line">${c.answer}</p>
    </div>`).join('');
  await resend.emails.send({
    from: 'Fineme 借り場 <noreply@fineme.me>',
    to: OWNER_EMAIL,
    subject: `【Fineme】今週の質問候補${candidatesWithAnswers.length}件（回答案つき）`,
    html: `
      <h2 style="color:#111">🔎 生きていそうな質問候補</h2>
      <p style="color:#666;font-size:13px">
        リンクを開いて、まだ回答受付中であれば下の回答案をコピペしてください。既に解決済み・受付終了の場合はスキップしてOKです。
      </p>
      ${rows}
    `,
  });
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logRun = async (mode, count) => {
    try {
      const sb = getSupabase();
      await sb.from('sns_posts').insert({ channel: 'qanda_scout', post_type: mode, text: `count:${count}`, posted: true });
    } catch {}
  };

  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX) {
    await emailStockFallback();
    await logRun('stock_fallback', STOCK_ANSWERS.length);
    return Response.json({ mode: 'stock_fallback', emailed: !!process.env.RESEND_API_KEY });
  }

  const candidates = await searchCandidates();
  const withAnswers = [];
  for (const c of candidates.slice(0, 8)) {
    const answer = await generateAnswer(c.query, c.snippet);
    if (answer) withAnswers.push({ ...c, answer });
  }

  if (withAnswers.length) await emailCandidates(withAnswers);
  else await emailStockFallback();

  await logRun('live_scout', withAnswers.length);
  return Response.json({ mode: 'live_scout', candidates: candidates.length, withAnswers: withAnswers.length });
}
