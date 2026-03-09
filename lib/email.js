// メール送信モジュール（Resend使用）
// 環境変数: RESEND_API_KEY, FROM_EMAIL（例: noreply@fineme.jp）
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'Fineme <noreply@fineme.jp>';

// ── 共通ヘルパー ────────────────────────────────────────────
function fmtDate(isoOrDate) {
  try { return new Date(isoOrDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return String(isoOrDate); }
}

async function send({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY が未設定のためスキップ:', subject, '→', to);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
}

// ── ① 予約作成：掲載者とユーザー双方に通知 ──────────────────
export async function sendReservationCreatedEmails({ reservation: r, providerEmail, providerName }) {
  const dateStr = fmtDate(r.reserved_date);
  const time = `${r.start_time}${r.end_time ? '〜' + r.end_time : ''}`;

  // 掲載者宛
  if (providerEmail) {
    await send({
      to: providerEmail,
      subject: `【Fineme】新規予約リクエストが届きました`,
      html: `
        <h2>新規予約リクエスト</h2>
        <p>${providerName || '掲載者'} 様</p>
        <p>Fineme経由で予約リクエストが届きました。管理画面から確認・承認してください。</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">お客様</td><td style="padding:8px;border-bottom:1px solid #eee">${r.user_name}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">連絡先</td><td style="padding:8px;border-bottom:1px solid #eee">${r.user_contact}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">サービス</td><td style="padding:8px;border-bottom:1px solid #eee">${r.service_name || '未指定'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">希望日時</td><td style="padding:8px;border-bottom:1px solid #eee">${dateStr} ${time}</td></tr>
          <tr><td style="padding:8px;color:#666">ご要望</td><td style="padding:8px">${r.note || 'なし'}</td></tr>
        </table>
        <p style="margin-top:24px"><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.jp'}/pages/provider/reservations.html" style="background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">管理画面で確認する</a></p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
        <p style="color:#999;font-size:12px">このメールはFineme（<a href="https://fineme.jp">fineme.jp</a>）から自動送信されています。</p>
      `,
    });
  }

  // ユーザー宛（連絡先がメールアドレスの場合）
  if (r.user_contact && r.user_contact.includes('@')) {
    await send({
      to: r.user_contact,
      subject: `【Fineme】予約リクエストを受け付けました`,
      html: `
        <h2>予約リクエスト受付完了</h2>
        <p>${r.user_name} 様</p>
        <p>以下の内容で予約リクエストを受け付けました。掲載者からの承認をお待ちください。</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">サービス</td><td style="padding:8px;border-bottom:1px solid #eee">${r.service_name || '未指定'}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">希望日時</td><td style="padding:8px;border-bottom:1px solid #eee">${dateStr} ${time}</td></tr>
          <tr><td style="padding:8px;color:#666">ご要望</td><td style="padding:8px">${r.note || 'なし'}</td></tr>
        </table>
        <p style="color:#666;font-size:14px;margin-top:16px">承認または変更があった場合は、このメールアドレスにご連絡します。</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
        <p style="color:#999;font-size:12px">Fineme（<a href="https://fineme.jp">fineme.jp</a>）</p>
      `,
    });
  }
}

// ── ② 承認通知：ユーザーに通知 ──────────────────────────────
export async function sendReservationApprovedEmail({ reservation: r, userEmail, userName, providerName, serviceComment }) {
  if (!userEmail) return;
  const dateStr = fmtDate(r.reserved_date);
  const time = `${r.start_time}${r.end_time ? '〜' + r.end_time : ''}`;
  await send({
    to: userEmail,
    subject: `【Fineme】予約が承認されました`,
    html: `
      <h2>予約承認のお知らせ</h2>
      <p>${userName} 様</p>
      <p><strong>${providerName || '掲載者'}様</strong>から予約が承認されました。</p>
      <table style="border-collapse:collapse;width:100%;max-width:480px">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">サービス</td><td style="padding:8px;border-bottom:1px solid #eee">${r.service_name || '未指定'}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">日時</td><td style="padding:8px;border-bottom:1px solid #eee">${dateStr} ${time}</td></tr>
        ${serviceComment ? `<tr><td style="padding:8px;color:#666">掲載者より</td><td style="padding:8px">${serviceComment}</td></tr>` : ''}
      </table>
      <p style="margin-top:24px"><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.jp'}/pages/mypage/reservations.html" style="background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">マイページで確認する</a></p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">Fineme（<a href="https://fineme.jp">fineme.jp</a>）</p>
    `,
  });
}

// ── ③ 来店確認後：体験談依頼メール ──────────────────────────
export async function sendVisitConfirmedEmail({ reservation: r, userEmail, userName, providerName, serviceName }) {
  if (!userEmail) return;
  const storyUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.jp'}/pages/user/story-submit.html?reservationId=${r.id}&providerId=${r.provider_id}`;
  await send({
    to: userEmail,
    subject: `【Fineme】来店ありがとうございます。体験談を聞かせてください`,
    html: `
      <h2>来店ありがとうございます！</h2>
      <p>${userName} 様</p>
      <p><strong>${providerName || '掲載者'}様</strong>（${serviceName || 'サービス'}）への来店が確認されました。</p>
      <p style="margin-top:16px">あなたの体験は、同じ悩みを持つ誰かの「最初の一歩」になります。<br>良かったことも、気になったことも、率直に聞かせてください。<strong>3分で入力できます。</strong></p>
      <p style="margin-top:24px">
        <a href="${storyUrl}" style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700">体験談を書く（3分）</a>
      </p>
      <p style="color:#999;font-size:13px;margin-top:12px">このリンクは7日間有効です。</p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">Fineme（<a href="https://fineme.jp">fineme.jp</a>）</p>
    `,
  });
}
