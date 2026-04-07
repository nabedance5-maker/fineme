// GET /api/cron/monthly-report
// Vercel Cron: 毎月1日 0:00 UTC（9:00 JST）に前月のレポートを掲載者へ送信
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 先月の年月を計算
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const lastMonth = new Date(jstNow.getFullYear(), jstNow.getMonth() - 1, 1);
  const lastMonthStr = lastMonth.toISOString().slice(0, 7); // YYYY-MM
  const lastMonthLabel = `${lastMonth.getFullYear()}年${lastMonth.getMonth() + 1}月`;
  const lastMonthStart = `${lastMonthStr}-01`;
  const lastMonthEnd = `${lastMonthStr}-31`;

  const db = getSupabase();

  // アクティブな掲載者を全取得
  const { data: providers, error: pErr } = await db
    .from('providers')
    .select('id, name, line_user_id, email, referral_code')
    .eq('status', 'active');

  if (pErr || !providers?.length) {
    return Response.json({ sent: 0, error: pErr?.message || 'no active providers' });
  }

  const providerIds = providers.map(p => p.id);

  // 先月の閲覧数を一括取得
  const { data: viewRows } = await db
    .from('provider_page_views')
    .select('provider_id, count')
    .in('provider_id', providerIds)
    .gte('date', lastMonthStart)
    .lte('date', lastMonthEnd);

  const viewMap = {};
  (viewRows || []).forEach(r => {
    viewMap[r.provider_id] = (viewMap[r.provider_id] || 0) + (r.count || 0);
  });

  // 先月の予約数（approved）を一括取得
  const { data: reservationRows } = await db
    .from('reservations')
    .select('provider_id, status')
    .in('provider_id', providerIds)
    .in('status', ['approved', 'visited'])
    .gte('reserved_date', lastMonthStart)
    .lte('reserved_date', lastMonthEnd);

  const reservationMap = {};
  (reservationRows || []).forEach(r => {
    reservationMap[r.provider_id] = (reservationMap[r.provider_id] || 0) + 1;
  });

  // 紹介報酬：アクティブな紹介数（referred_by = 自分のreferral_code で billing_started が存在する）
  const { data: referralRows } = await db
    .from('providers')
    .select('referred_by')
    .not('referred_by', 'is', null)
    .not('billing_started', 'is', null)
    .eq('status', 'active');

  const referralCountMap = {};
  (referralRows || []).forEach(r => {
    if (r.referred_by) {
      referralCountMap[r.referred_by] = (referralCountMap[r.referred_by] || 0) + 1;
    }
  });

  let sent = 0;
  let skipped = 0;
  const results = [];

  for (const provider of providers) {
    const views = viewMap[provider.id] || 0;
    const reservations = reservationMap[provider.id] || 0;
    const referralCount = referralCountMap[provider.referral_code] || 0;
    const referralReward = referralCount * 500;

    // データがすべてゼロでも送る（存在確認の意味もある）
    const msg = buildReportMessage({
      providerName: provider.name,
      month: lastMonthLabel,
      views,
      reservations,
      referralCount,
      referralReward,
    });

    let notified = false;

    // LINE優先
    if (provider.line_user_id) {
      const result = await sendLinePush(provider.line_user_id, msg);
      if (result.ok) { sent++; notified = true; }
      results.push({ provider_id: provider.id, channel: 'line', ok: result.ok });
    }

    // LINEがない場合はメール（Resendが設定されていれば）
    if (!notified && provider.email && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Fineme <noreply@fineme.me>',
          to: provider.email,
          subject: `【Fineme】${lastMonthLabel}の掲載レポート`,
          text: msg,
        });
        sent++;
        results.push({ provider_id: provider.id, channel: 'email', ok: true });
      } catch (e) {
        results.push({ provider_id: provider.id, channel: 'email', ok: false, error: e.message });
      }
    }

    if (!provider.line_user_id && !provider.email) skipped++;
  }

  console.log(`[cron/monthly-report] month=${lastMonthStr} providers=${providers.length} sent=${sent} skipped=${skipped}`);
  return Response.json({ sent, skipped, month: lastMonthStr, results });
}

function buildReportMessage({ providerName, month, views, reservations, referralCount, referralReward }) {
  const lines = [
    `【Fineme】${month}の掲載レポート`,
    `${providerName} さん、先月もご掲載ありがとうございました。`,
    '',
    `📊 ${month}の実績`,
    `・ページ閲覧数：${views.toLocaleString()}回`,
    `・予約確定数：${reservations}件`,
  ];

  if (referralCount > 0) {
    lines.push(`・紹介報酬：¥${referralReward.toLocaleString()}（${referralCount}社在籍中）`);
  }

  lines.push('');

  // 状況に応じたメッセージ
  if (reservations >= 5) {
    lines.push('先月は多くのご予約をいただきました。引き続きよろしくお願いします。');
  } else if (reservations >= 1) {
    lines.push('先月は予約が入りました。プロフィールをより充実させると検索上位に表示されやすくなります。');
  } else if (views >= 10) {
    lines.push(`先月は${views}回ページが閲覧されました。プロフィールの「変容ストーリー」を充実させると予約転換率が上がります。`);
  } else {
    lines.push('プロフィールを充実させると診断ユーザーへのマッチング精度が上がります。ダッシュボードから更新してみてください。');
  }

  if (referralCount === 0) {
    lines.push('');
    lines.push('💡 同じ外見磨き系の事業者を1社ご紹介いただくと月¥500の報酬が入ります。10社で掲載費が実質ゼロに。');
  }

  lines.push('');
  lines.push('ダッシュボード：https://www.fineme.me/provider/dashboard');

  return lines.join('\n');
}
