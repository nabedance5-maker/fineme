// GET /api/cron/provider-log-toolkit-announce
// 毎日10時JST(1時UTC)実行。登録済みの掲載者へ「New Me Logをお客様に無料で紹介できます」を
// AIが自動でお知らせする（LINE優先・無ければメール。monthly-reportと同じ通知パターンを流用）。
// 一度案内した掲載者には二度と送らない（sns_postsをdedup台帳として再利用・新規migration不要）。
// 新規providerが増えるたびに自動的に案内が届く設計＝でおが1件ずつ声をかける必要はない。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';

export const dynamic = 'force-dynamic';

const ANNOUNCE_CHANNEL = 'provider_log_toolkit_announce';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();

  const { data: providers, error } = await db
    .from('providers')
    .select('id, name, line_user_id, email, slug')
    .eq('status', 'active');

  if (error || !providers?.length) {
    return Response.json({ sent: 0, error: error?.message || 'no active providers' });
  }

  const { data: alreadySent } = await db
    .from('sns_posts')
    .select('post_type')
    .eq('channel', ANNOUNCE_CHANNEL);
  const announcedIds = new Set((alreadySent || []).map(r => r.post_type));

  const targets = providers.filter(p => !announcedIds.has(p.id));
  if (!targets.length) return Response.json({ sent: 0, alreadyAnnounced: providers.length });

  let sent = 0, skipped = 0;

  for (const provider of targets) {
    const toolkitUrl = 'https://www.fineme.me/provider/log-toolkit';
    let notified = false;

    if (provider.line_user_id) {
      const msg = [
        '【Fineme】New Me Logをお客様に無料で紹介できます',
        `${provider.name} 様`,
        '',
        'お客様の来店サイクル・美容代を無料で覚えておいてくれるツール「New Me Log」を、お店の受付にQRコード1枚置くだけでご案内いただけます。',
        '「そろそろ次のご予約を」を思い出すきっかけになり、再来店の後押しになります。',
        '',
        `ダウンロード・印刷：${toolkitUrl}`,
      ].join('\n');
      const result = await sendLinePush(provider.line_user_id, msg);
      notified = result.ok;
    }

    if (!notified && provider.email && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Fineme <noreply@fineme.me>',
          to: provider.email,
          subject: '【Fineme】New Me Logをお客様に無料で紹介できます',
          html: `
            <p>${provider.name} 様</p>
            <p>お客様の来店サイクル・美容代を無料で覚えておいてくれるツール「New Me Log」を、お店の受付にQRコード1枚置くだけでご案内いただけます。</p>
            <p>「そろそろ次のご予約を」を思い出すきっかけになり、再来店の後押しになります。</p>
            <p><a href="${toolkitUrl}">ダウンロード・印刷はこちら</a></p>
          `,
        });
        notified = true;
      } catch (e) {
        console.error('[provider-log-toolkit-announce] email error:', e.message);
      }
    }

    if (notified) sent++; else skipped++;

    // 成否に関わらず announced として記録（送信手段が無い＝以後も送れないため）
    try {
      await db.from('sns_posts').insert({
        channel: ANNOUNCE_CHANNEL,
        post_type: provider.id,
        text: `announced:${provider.slug || provider.id}`,
        posted: notified,
      });
    } catch {}
  }

  console.log(`[provider-log-toolkit-announce] targets=${targets.length} sent=${sent} skipped=${skipped}`);
  return Response.json({ sent, skipped, targets: targets.length });
}
