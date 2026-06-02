// GET /api/cron/sns-trend-draft
// 毎週日曜9時JST（0時UTC日曜）にAIが最新SNSトレンドを調査し、
// 最適化したX投稿ドラフト等をオーナーへメール提案する（ハイブリッド：人が承認して投稿）
// Schedule: "0 0 * * 0"
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { computeMirrorStats } from '@/app/api/admin/mirror-stats/route';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

// PDCAのCheck/Act：先週の投稿ログ＋Mirror流入を振り返り「来週の方針」を生成し保存
async function runRetrospective(client) {
  const sb = getSupabase();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  let recentPosts = [];
  try {
    const { data } = await sb.from('sns_posts')
      .select('post_type, text, created_at').eq('channel', 'x')
      .gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(20);
    recentPosts = data || [];
  } catch {}

  let stats = null;
  try { stats = await computeMirrorStats(); } catch {}

  const funnel = stats ? `Mirror直近7日: 分析${stats.last7d.total} / ¥500購入${stats.last7d.purchases} / 転換${stats.last7d.conversionRate}% / 紹介${stats.referral.last7d} / サブスク${stats.subscription.active}` : '（ファネル数値取得不可）';
  const postsDump = recentPosts.length
    ? recentPosts.map(p => `[${p.post_type}] ${String(p.text).replace(/\n/g, ' ').slice(0, 80)}`).join('\n')
    : '（先週の投稿ログなし）';

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: SYSTEM + '\nこのタスクではCSOとして、先週のSNS活動を振り返り「来週の方針」を出す。',
      messages: [{ role: 'user', content: `先週のFineme SNSを振り返って、来週の方針を出してください。\n\n【先週のX投稿ログ】\n${postsDump}\n\n【ファネル】\n${funnel}\n\n出力（日本語・簡潔）:\n■ 振り返り（2文：効いていそうな切り口/被り/弱点）\n■ 来週の方針（箇条書き3つ以内：強化する切り口・避ける言い回し・試す新フック）\n※ X流入の個別計測は無いため、投稿テーマの偏り・トレンド適合・ファネルの動きから推論すること。` }],
    });
    const guidance = msg.content?.[0]?.text?.trim();
    if (guidance) {
      try { await sb.from('sns_posts').insert({ channel: 'strategy', post_type: 'retro', text: guidance }); } catch {}
      return guidance;
    }
  } catch (e) {
    console.error('[sns-trend-draft] retro error:', e.message);
  }
  return null;
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
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // Check/Act：先に先週の振り返り→来週の方針を生成・保存（日次生成が参照する）
    const guidance = await runRetrospective(client);

    const { text, searched } = await generateDrafts();
    if (!text) return Response.json({ error: 'no draft generated' }, { status: 500 });

    const retroHtml = guidance
      ? `<div style="background:#fffaf0;border:1px solid #f0e0b8;border-radius:10px;padding:16px 20px;margin:16px 0;max-width:560px"><div style="font-size:12px;font-weight:700;color:#b8860b;margin-bottom:8px">🔁 先週の振り返り・来週の方針（日次X生成に自動反映）</div><div style="font-size:13px;color:#444;line-height:1.85;white-space:pre-line">${guidance.replace(/</g, '&lt;')}</div></div>`
      : '';

    const html = `
      <h2 style="color:#111">📣 今週のSNS最適化ドラフト</h2>
      ${retroHtml}
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
