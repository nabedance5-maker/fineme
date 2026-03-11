// メール送信モジュール（Resend使用）
import { Resend } from 'resend';

const FROM = process.env.FROM_EMAIL || 'Fineme <noreply@fineme.me>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.me';

let _resend = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

async function send({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY が未設定のためスキップ:', subject, '→', to);
    return;
  }
  const { error } = await getResend().emails.send({ from: FROM, to, subject, html });
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
          <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">希望日</td><td style="padding:10px;border-bottom:1px solid #eee">${fmtDate(r.reserved_date)}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">希望時間</td><td style="padding:10px;border-bottom:1px solid #eee">${r.start_time}</td></tr>
          <tr><td style="padding:10px;color:#666">メッセージ</td><td style="padding:10px">${r.note || 'なし'}</td></tr>
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
          <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666;width:120px">希望日</td><td style="padding:10px;border-bottom:1px solid #eee">${fmtDate(r.reserved_date)}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">希望時間</td><td style="padding:10px;border-bottom:1px solid #eee">${r.start_time}</td></tr>
          <tr><td style="padding:10px;color:#666">メッセージ</td><td style="padding:10px">${r.note || 'なし'}</td></tr>
        </table>
        <p style="color:#666;font-size:14px">承認・変更・お断りがあった場合は、こちらのメールアドレスにご連絡します。</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
        <p style="color:#999;font-size:12px">Fineme（<a href="${SITE_URL}">${SITE_URL}</a>）</p>
      `,
    });
  }
}

// ── ② ステータス変更通知：ユーザーに通知 ──────────────────────
export async function sendReservationStatusEmail({ reservation: r, status, counterProposal, counterDate, counterTime, confirmedDate, confirmedTime, providerName }) {
  if (!r.user_contact?.includes('@')) return;

  const confirmedRow = (confirmedDate || r.confirmed_date)
    ? `<tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666;width:120px;font-weight:700">確定日時</td><td style="padding:10px;border-bottom:1px solid #eee;font-weight:700">${fmtDate(confirmedDate || r.confirmed_date)} ${confirmedTime || r.confirmed_time || ''}</td></tr>`
    : '';
  const counterRow = (counterDate || r.counter_date)
    ? `<tr><td style="padding:10px;border-bottom:1px solid #eee;color:#6366f1;width:120px;font-weight:700">提案日時</td><td style="padding:10px;border-bottom:1px solid #eee;color:#6366f1;font-weight:700">${fmtDate(counterDate || r.counter_date)} ${counterTime || r.counter_time || ''}</td></tr>`
    : '';

  const statusConfig = {
    approved: {
      subject: '【Fineme】予約が承認されました',
      heading: '予約が承認されました ✓',
      body: `<strong>${providerName || '掲載者'}様</strong>から予約が承認されました。確定日時を確認し、直接ご連絡ください。`,
    },
    rejected: {
      subject: '【Fineme】予約リクエストについてご連絡',
      heading: '予約リクエストについて',
      body: `申し訳ありませんが、<strong>${providerName || '掲載者'}様</strong>からご希望の日時での対応が難しいとのご連絡がありました。${counterProposal ? '<br><br>掲載者からのメッセージ：' + counterProposal : ''}`,
    },
    counter_proposed: {
      subject: '【Fineme】代替日時の提案が届きました',
      heading: '代替日時の提案があります',
      body: `<strong>${providerName || '掲載者'}様</strong>から別の日時を提案いただきました。ご確認の上、掲載者へ直接ご連絡ください。${counterProposal ? '<br><br>掲載者からのメッセージ：' + counterProposal : ''}`,
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
        ${confirmedRow}
        ${counterRow}
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666;width:120px">第1希望日</td><td style="padding:10px;border-bottom:1px solid #eee">${fmtDate(r.reserved_date)} ${r.start_time || ''}</td></tr>
        <tr><td style="padding:10px;color:#666">連絡先</td><td style="padding:10px">${r.user_contact}</td></tr>
      </table>
      <p style="margin-top:20px">
        <a href="${SITE_URL}/my-reservations" style="background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700">予約履歴を確認する</a>
      </p>
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

// ── ④ 掲載者登録時の初期ログイン情報メール ────────────────────
export async function sendProviderCredentialsEmail({ email, providerName, password, loginUrl }) {
  await send({
    to: email,
    subject: '【Fineme】掲載者ダッシュボードのログイン情報',
    html: `
      <h2 style="color:#111">Finemeへようこそ！</h2>
      <p>${providerName} 様</p>
      <p>掲載者ダッシュボードへのログイン情報をお送りします。</p>
      <table style="border-collapse:collapse;width:100%;max-width:480px;margin:16px 0;background:#f9fafb;border-radius:10px">
        <tr><td style="padding:12px 16px;color:#666;width:140px">メールアドレス</td><td style="padding:12px 16px;font-weight:700">${email}</td></tr>
        <tr><td style="padding:12px 16px;color:#666">初期パスワード</td><td style="padding:12px 16px;font-weight:700;font-size:18px;letter-spacing:2px">${password}</td></tr>
      </table>
      <p style="color:#374151;font-size:14px">ログイン後、掲載者ダッシュボードの「パスワード変更」からお好きなパスワードに変更してください。</p>
      <p style="color:#6b7280;font-size:13px;margin-top:8px;padding:10px 14px;background:#f9fafb;border-radius:8px">※ このメールアドレスとパスワードは、Finemeのユーザーとしてサービスを利用する際にも同じアカウントとして使用できます。</p>
      <p style="margin-top:24px">
        <a href="${loginUrl}" style="background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700">掲載者ダッシュボードへログイン</a>
      </p>
      <p style="color:#ef4444;font-size:13px;margin-top:16px">このメールは第三者に転送しないでください。</p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">Fineme（<a href="${SITE_URL}">${SITE_URL}</a>）</p>
    `,
  });
}

// ── ⑤ 承認通知（後方互換）────────────────────────────────────
export async function sendReservationApprovedEmail({ reservation: r, userEmail, userName, providerName, serviceComment }) {
  if (!userEmail) return;
  await sendReservationStatusEmail({
    reservation: { ...r, user_contact: userEmail },
    status: 'approved',
    counterProposal: serviceComment,
    providerName,
  });
}
