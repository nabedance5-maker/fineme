// GET /api/cron/mirror-report
// 毎週月曜9時JST（0時UTC）にMirrorファネルの週次サマリーをオーナーへ送信
// Schedule: "0 0 * * 1"
import Anthropic from '@anthropic-ai/sdk';
import { sendLinePush } from '@/lib/line-push';
import { computeMirrorStats } from '@/app/api/admin/mirror-stats/route';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const OWNER_LINE_USER_ID = process.env.OWNER_LINE_USER_ID;

// 週次の数字をClaudeに渡し、CSO視点の分析＋改善提案を生成
async function generateInsight(s) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `あなたはFineme（恋愛に悩む男性向けの外見磨きサービス）のCSO。Fineme Mirror（写真AI分析・¥500単発/¥780月サブスク）の週次数字を読み、忖度なく簡潔に分析する。出力は日本語で、(1)今週の所見を2文以内、(2)最優先の改善アクションを最大3つ（各1行・具体的に）。称賛より課題と打ち手を優先。数字がほぼゼロなら「まず流入を作る」前提で助言する。`,
      messages: [{ role: 'user', content: `今週のMirror数字（JSON）:\n${JSON.stringify({ last7d: s.last7d, last30d: s.last30d, all: s.all, subscription: s.subscription, referral: s.referral, feedback: { count: s.feedback.count, avgAccuracy: s.feedback.avgAccuracy, avgRevisit: s.feedback.avgRevisit } })}` }],
    });
    return msg.content[0]?.text?.trim() || null;
  } catch (e) {
    console.error('[mirror-report] insight error:', e.message);
    return null;
  }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const s = await computeMirrorStats();
    const w = s.last7d;
    const insight = await generateInsight(s);
    const insightHtml = insight
      ? `<div style="background:#fffaf0;border:1px solid #f0e0b8;border-radius:10px;padding:16px 20px;margin:16px 0;max-width:520px"><div style="font-size:12px;font-weight:700;color:#b8860b;margin-bottom:8px">🤖 AIによる分析・改善提案</div><div style="font-size:13px;color:#444;line-height:1.8;white-space:pre-line">${insight}</div></div>`
      : '';

    const html = `
      <h2 style="color:#111">🪞 Fineme Mirror 週次レポート</h2>
      <p style="color:#666">直近7日間のファネル</p>
      <table style="border-collapse:collapse;width:100%;max-width:520px;margin:16px 0;font-size:14px">
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">分析数（利用）</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">${w.total}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">¥500 購入</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">${w.purchases}（¥${w.revenue.toLocaleString()}）</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">無料→課金 転換率</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">${w.conversionRate}%</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">無料アンロック</td><td style="padding:10px;border-bottom:1px solid #eee">${w.freeUnlocks}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">プレビューのみ</td><td style="padding:10px;border-bottom:1px solid #eee">${w.previewOnly}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">紹介成立（7日）</td><td style="padding:10px;border-bottom:1px solid #eee">${s.referral.last7d}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">サブスク加入（active）</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">${s.subscription.active}（MRR ¥${s.subscription.mrr.toLocaleString()}）</td></tr>
        <tr><td style="padding:10px;color:#666">Mirror満足度（的確さ/再訪）</td><td style="padding:10px">★${s.feedback.avgAccuracy || '-'} / ★${s.feedback.avgRevisit || '-'}（${s.feedback.count}件）</td></tr>
      </table>
      <p style="color:#999;font-size:12px">累計：分析${s.all.total} / 購入${s.all.purchases} / サブスク${s.subscription.active}</p>
      ${insightHtml}
      <p style="font-size:13px"><a href="https://www.fineme.me/admin/mirror" style="color:#c9a84c">→ ダッシュボードを開く</a></p>
    `;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Fineme Mirror <noreply@fineme.me>',
        to: OWNER_EMAIL,
        subject: '【Fineme Mirror】週次レポート',
        html,
      });
    }

    if (OWNER_LINE_USER_ID) {
      const lineText = `🪞 Mirror週次レポート\n\n分析: ${w.total}件\n¥500購入: ${w.purchases}件（転換${w.conversionRate}%）\n紹介成立: ${s.referral.last7d}件\nサブスク: ${s.subscription.active}件（MRR¥${s.subscription.mrr.toLocaleString()}）${insight ? `\n\n🤖${insight.slice(0, 180)}` : ''}\n\n詳細→ fineme.me/admin/mirror`;
      await sendLinePush(OWNER_LINE_USER_ID, lineText);
    }

    console.log(`[mirror-report] Sent. 7d total=${w.total}, purchases=${w.purchases}`);
    return Response.json({ success: true, week: w });
  } catch (e) {
    console.error('[mirror-report] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
