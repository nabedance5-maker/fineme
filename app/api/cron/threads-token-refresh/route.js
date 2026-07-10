// GET /api/cron/threads-token-refresh
// 月1回、Threads 長期トークン(60日)を延長し、新トークンをオーナーにメール（Vercel envへ貼り替え）。
// Schedule: "0 0 1 * *"（毎月1日）
// env gated：未設定なら何もしない。※トークンはDBに保存せず、でおが env を更新する運用（安全側）
import { threadsConfigured, refreshLongLivedToken } from '@/lib/threads-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!threadsConfigured()) return Response.json({ skipped: 'threads not configured' });

  try {
    const data = await refreshLongLivedToken();
    const newToken = data.access_token;
    const days = Math.round((data.expires_in || 0) / 86400);
    if (process.env.RESEND_API_KEY && newToken) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Fineme Threads <noreply@fineme.me>', to: OWNER_EMAIL,
        subject: '【Fineme Threads】長期トークンを延長しました（env更新をお願い）',
        html: `<div style="font-family:sans-serif">
          <p>Threadsの長期トークンを延長しました（有効 約${days}日）。</p>
          <p>Vercel の環境変数 <b>THREADS_ACCESS_TOKEN</b> を、下の新しい値に貼り替えてください（機密・他人に共有しない）：</p>
          <div style="background:#f4f4f5;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:12px;word-break:break-all">${newToken.replace(/</g, '&lt;')}</div>
          <p style="font-size:12px;color:#999">※貼り替え後に再デプロイで反映。</p>
        </div>`,
      });
    }
    return Response.json({ success: true, expires_in_days: days, emailed: !!process.env.RESEND_API_KEY });
  } catch (e) {
    console.error('[threads-token-refresh] error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
