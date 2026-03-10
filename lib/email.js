// メール送信モジュール（Resend使用）
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'Fineme <noreply@fineme.me>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.me';

async function send({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY が未設定のためスキップ:', subject, '→', to);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}

function fmtDate(d) {
  try { return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return String(d); }
}

// ── ① 予約リクエスト作成：掲載者に通知 ────────────────────────
export async function sendReservationCreatedEmails({ reservation: r, providerEmail, providerName }) {
  if (providerEmail) {
    await send({
      to: providerEmail,
      subject: '【Fineme】新規予約リクエストが届きました',
      html: `
        <h2 style="color:#111">新規予約リクエスト</h2>
        <p>${providerName || '掲載者'} 様</p>
        <p>Fineme経由で予約リクエストが届きました。管理画面から確認・対応してください。</p>
        <table style="border-collapse:collapse;width:100%;max-width:500px;margin:16px 0">
          <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666;width:120px">お客様</td><td style="padding:10px;border-bottom:1px solid #eee">${r.user_name}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">連絡先</td><td style="padding:10px;border-bottom:1px solid #eee">${r.user_contact}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">希望日</td><td style="padding:10px;border-bottom:1px solid #eee">${fmtDate(r.preferred_date)}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">希望時間</td><td style="padding:10px;border-bottom:1px solid #eee">${r.preferred_time}</td></tr>
          <tr><td style="padding:10px;color:#666">メッセージ</td><td style="padding:10px">${r.message || 'なし'}</td></tr>
        </table>
        <p style="margin-top:24px">
          <a href="${SITE_URL}/pages/provider/index.html" style="background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700">管理画面で対応する</a>
        </p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
        <p style="color:#999;font-size:12px">Fineme（<a href="${SITE_URL}">${SITE_URL}</a>）</p>
      `,
    });
  }

  // ユーザーへの受付確認（メールアドレスの場合のみ）
  if (r.user_contact?.includes('@')) {
    await send({
      to: r.user_contact,
      subject: '【Fineme】予約リクエストを受け付けました',
      html: `
        <h2 style="color:#111">予約リクエスト受付完了</h2>
        <p>${r.user_name} 様</p>
        <p>以下の内容で予約リクエストを受け付けました。掲載者からの返答をお待ちください。</p>
        <table style="border-collapse:collapse;width:100%;max-width:500px;margin:16px 0">
          <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666;width:120px">希望日</td><td style="padding:10px;border-bottom:1px solid #eee">${fmtDate(r.preferred_date)}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">希望時間</td><td style="padding:10px;border-bottom:1px solid #eee">${r.preferred_time}</td></tr>
          <tr><td style="padding:10px;color:#666">メッセージ</td><td style="padding:10px">${r.message || 'なし'}</td></tr>
        </table>
        <p style="color:#666;font-size:14px">承認・変更・お断りがあった場合は、こちらのメールアドレスにご連絡します。</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
        <p style="color:#999;font-size:12px">Fineme（<a href="${SITE_URL}">${SITE_URL}</a>）</p>
      `,
    });
  }
}

// ── ② ステータス変更通知：ユーザーに通知 ──────────────────────
export async function sendReservationStatusEmail({ reservation: r, status, counterProposal, providerName }) {
  if (!r.user_contact?.includes('@')) return;

  const statusConfig = {
    approved: {
      subject: '【Fineme】予約リクエストが承認されました',
      heading: '予約が承認されました ✓',
      body: `<strong>${providerName || '掲載者'}様</strong>から予約が承認されました。直接連絡を取って詳細を確認してください。`,
    },
    rejected: {
      subject: '【Fineme】予約リクエストについてご連絡',
      heading: '予約リクエストについて',
      body: `申し訳ありませんが、<strong>${providerName || '掲載者'}様</strong>からご希望の日時での対応が難しいとのご連絡がありました。${counterProposal ? '<br><br><strong>掲載者からのメッセージ：</strong><br>' + counterProposal : ''}`,
    },
    counter_proposed: {
      subject: '【Fineme】代替日時の提案が届きました',
      heading: '代替日時の提案があります',
      body: `<strong>${providerName || '掲載者'}様</strong>から代替のご提案が届きました。<br><br><strong>提案内容：</strong><br>${counterProposal || ''}`,
    },
  };

  const config = statusConfig[status];
  if (!config) return;

  await send({
    to: r.user_contact,
    subject: config.subject,
    html: `
      <h2 style="color:#111">${config.heading}</h2>
      <p>${r.user_name} 様</p>
      <p>${config.body}</p>
      <table style="border-collapse:collapse;width:100%;max-width:500px;margin:16px 0">
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666;width:120px">希望日</td><td style="padding:10px;border-bottom:1px solid #eee">${fmtDate(r.preferred_date)}</td></tr>
        <tr><td style="padding:10px;color:#666">希望時間</td><td style="padding:10px">${r.preferred_time}</td></tr>
      </table>
      <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">Fineme（<a href="${SITE_URL}">${SITE_URL}</a>）</p>
    `,
  });
}

// ── ③ 来店確認後：体験談依頼メール ────────────────────────────
export async function sendVisitConfirmedEmail({ reservation: r, userEmail, userName, providerName, serviceName }) {
  if (!userEmail) return;
  const storyUrl = `${SITE_URL}/pages/user/story-submit.html?reservationId=${r.id}&providerId=${r.provider_id}`;
  await send({
    to: userEmail,
    subject: '【Fineme】来店ありがとうございます。体験談を聞かせてください',
    html: `
      <h2 style="color:#111">来店ありがとうございます！</h2>
      <p>${userName} 様</p>
      <p><strong>${providerName || '掲載者'}様</strong>（${serviceName || 'サービス'}）への来店が確認されました。</p>
      <p style="margin-top:16px">あなたの体験は、同じ悩みを持つ誰かの「最初の一歩」になります。<br>良かったことも、気になったことも、率直に聞かせてください。<strong>3分で入力できます。</strong></p>
      <p style="margin-top:24px">
        <a href="${storyUrl}" style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700">体験談を書く（3分）</a>
      </p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">Fineme（<a href="${SITE_URL}">${SITE_URL}</a>）</p>
    `,
  });
}

// ── ④ 承認通知（後方互換）────────────────────────────────────
export async function sendReservationApprovedEmail({ reservation: r, userEmail, userName, providerName, serviceComment }) {
  if (!userEmail) return;
  await sendReservationStatusEmail({
    reservation: { ...r, user_contact: userEmail },
    status: 'approved',
    counterProposal: serviceComment,
    providerName,
  });
}
