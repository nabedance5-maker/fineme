// GET /api/cron/mirror-report
// 毎週月曜9時JST（0時UTC）にMirrorファネルの週次サマリーをオーナーへ送信
// Schedule: "0 0 * * 1"
import { sendLinePush } from '@/lib/line-push';
import { computeMirrorStats } from '@/app/api/admin/mirror-stats/route';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const OWNER_LINE_USER_ID = process.env.OWNER_LINE_USER_ID;

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const s = await computeMirrorStats();
    const w = s.last7d;

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
      const lineText = `🪞 Mirror週次レポート\n\n分析: ${w.total}件\n¥500購入: ${w.purchases}件（転換${w.conversionRate}%）\n紹介成立: ${s.referral.last7d}件\nサブスク: ${s.subscription.active}件（MRR¥${s.subscription.mrr.toLocaleString()}）\n\n詳細→ fineme.me/admin/mirror`;
      await sendLinePush(OWNER_LINE_USER_ID, lineText);
    }

    console.log(`[mirror-report] Sent. 7d total=${w.total}, purchases=${w.purchases}`);
    return Response.json({ success: true, week: w });
  } catch (e) {
    console.error('[mirror-report] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
