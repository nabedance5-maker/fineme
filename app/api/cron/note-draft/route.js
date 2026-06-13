// GET /api/cron/note-draft
// 毎週水曜9時JST（0時UTC水曜）にAIがnote記事ドラフトを1本書いてオーナーへメール
// Schedule: "0 0 * * 3"
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const BASE_URL = 'https://www.fineme.me';

// 毎週ローテーションする評価軸テーマ（でお「抜けアドバイザー」note向け・エバーグリーン）
const TOPICS = [
  '「清潔感がない」と言われる男性が最初に直すべき1か所',
  'マッチングアプリでマッチしない原因は写真の“どこ”にあるか',
  '垢抜けには順番がある — 何から始めれば最短で印象が変わるか',
  '眉を整えるだけで顔の印象が激変する理由と、失敗しない始め方',
  '自己肯定感は外見から上げられる — 鏡の前で誇れる自分の作り方',
  'ジム・美容院・眉サロン…お金をかける前に知るべき優先順位',
  '元・モテなかった僕が現役モデルになるまでに変えた7つのこと',
  'AIに自分の写真を分析させたら、変わるべき場所が一瞬で分かった話',
];

async function generateNote(topic) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = `あなたはFineme代表「でお」（note名義「抜けアドバイザー」）。元・モテなかった→現役モデル。恋愛に悩む男性向けの外見磨きサービスFineme（無料診断 Me Scan / 写真AI分析 Fineme Mirror）を運営。
note記事を書く。読者は「変わりたいが何から始めればいいか分からない男性」。
【トーン】変容の旅・地図と羅針盤・誠実で前向き。上から目線・点数化・他者否定はしない。自分の実体験を交える。
【構成】惹きつける導入 → 共感（読者の痛み）→ 本質（順番・考え方）→ 具体的な一歩 → 自然なCTA。
【CTA】記事末に Me Scan（${BASE_URL}/diagnosis）か Fineme Mirror（${BASE_URL}/lp/mirror）への自然な導線を1つ。押し売りしない。
【長さ】1800〜2600字程度。見出し（##）を3〜5個使う。
出力フォーマット：1行目に「タイトル：〜」、空行のあと本文（Markdown）。`;
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    temperature: 0.9,
    system,
    messages: [{ role: 'user', content: `今週のnote記事テーマ：「${topic}」\nこのテーマで、最後まで読まれて行動につながる記事を1本書いてください。` }],
  });
  return msg.content?.[0]?.text?.trim() || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  // 週ごとにテーマをローテーション
  const week = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (7 * 86400000));
  const topic = TOPICS[week % TOPICS.length];

  try {
    const article = await generateNote(topic);
    if (!article) return Response.json({ error: 'no article generated' }, { status: 500 });

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const html = `
        <h2 style="color:#111">📝 今週のnote記事ドラフト</h2>
        <p style="color:#666;font-size:13px">テーマ：${topic}<br>note（抜けアドバイザー）にコピーして、見出し・改行を整えて公開してください。</p>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:20px 22px;margin:16px 0;max-width:620px;font-size:14px;color:#111;line-height:1.95;white-space:pre-wrap">${article.replace(/</g, '&lt;')}</div>
        <p style="font-size:12px;color:#999">※ note公開後、記事末のリンクが ${BASE_URL}/diagnosis または ${BASE_URL}/lp/mirror になっているか確認を。被リンク獲得にもなります。</p>
      `;
      await resend.emails.send({ from: 'Fineme note <noreply@fineme.me>', to: OWNER_EMAIL, subject: `【Fineme note】今週の記事ドラフト：${topic}`, html });
    }

    console.log(`[note-draft] Sent. topic="${topic}"`);
    return Response.json({ success: true, topic });
  } catch (e) {
    console.error('[note-draft] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
