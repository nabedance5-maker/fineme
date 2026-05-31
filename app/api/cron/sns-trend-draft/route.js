// GET /api/cron/sns-trend-draft
// 毎週日曜9時JST（0時UTC日曜）にAIが最新SNSトレンドを調査し、
// 最適化したX投稿ドラフト等をオーナーへメール提案する（ハイブリッド：人が承認して投稿）
// Schedule: "0 0 * * 0"
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

const SYSTEM = `あなたはFinemeのSNSグロース戦略家。Finemeは恋愛に悩む男性向けの外見磨きサービス（無料診断 Me Scan / 写真AI分析 Fineme Mirror ¥500・¥780月サブスク）。X運用は @deo_fineme（オーナー「でお」＝元・モテなかった→現役モデル）。
ブランドボイス：変容の旅・地図と羅針盤・誠実で前向き。煽りすぎ・点数化・他者否定はしない。
タスク：いまのX/noteで「メンズ美容・外見磨き・垢抜け・恋愛・自己投資」領域で伸びている投稿の型・フック・書き方のトレンドを調査し、それを取り入れた“今週投稿すべき”最適化ドラフトを作る。`;

const USER = `今週のSNS投稿ドラフトを作ってください。Web検索で直近のトレンド（伸びている投稿の型・フック・話題・ハッシュタグ）を調べてから作成すること。

出力フォーマット（日本語・そのままコピーして投稿できる形）:
■ 今週見つけたトレンド（3点・各1行・なぜ効くか）
■ X投稿ドラフト（4本）
  - 各140字以内・必要に応じ fineme.me/diagnosis か fineme.me/mirror へのリンクとハッシュタグ
  - 内訳：①Mirror訴求 ②Me Scan診断訴求 ③トレンド便乗の思想/共感 ④でおの実体験/ストーリー
■ note記事タイトル案（2本）
各ドラフトは番号付きで、投稿本文だけを明確に区切って出すこと。`;

function extractText(content) {
  if (!Array.isArray(content)) return '';
  return content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

async function generateDrafts() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // まずWeb検索ツールでトレンド調査込み生成を試行
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      system: SYSTEM,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
      messages: [{ role: 'user', content: USER }],
    });
    const text = extractText(msg.content);
    if (text) return { text, searched: true };
  } catch (e) {
    console.error('[sns-trend-draft] web_search failed, fallback:', e.message);
  }
  // フォールバック：Web検索なしで生成
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: SYSTEM + '\n（Web検索は使えないため、一般的に伸びるSNSの型の知識をもとに作成すること）',
    messages: [{ role: 'user', content: USER }],
  });
  return { text: extractText(msg.content), searched: false };
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { text, searched } = await generateDrafts();
    if (!text) return Response.json({ error: 'no draft generated' }, { status: 500 });

    const html = `
      <h2 style="color:#111">📣 今週のSNS最適化ドラフト</h2>
      <p style="color:#666;font-size:13px">AIが${searched ? '最新トレンドを調査して' : '（検索なしで）'}生成した今週の投稿案です。良いものを選んで @deo_fineme から投稿してください。</p>
      <div style="background:#f8f8fb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin:16px 0;max-width:560px;font-size:14px;color:#222;line-height:1.85;white-space:pre-line">${text.replace(/</g, '&lt;')}</div>
      <p style="font-size:12px;color:#999">素材ツール → business/sns-content-gen.html ／ ダッシュボード → fineme.me/admin/mirror</p>
    `;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Fineme SNS <noreply@fineme.me>',
        to: OWNER_EMAIL,
        subject: '【Fineme SNS】今週のトレンド最適化ドラフト',
        html,
      });
    }

    console.log(`[sns-trend-draft] Sent. searched=${searched}`);
    return Response.json({ success: true, searched });
  } catch (e) {
    console.error('[sns-trend-draft] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
