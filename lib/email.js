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

// ── ⑤ ユーザーキャンセル通知：掲載者に通知 ───────────────────
export async function sendCancelledByUserEmail({ reservation: r, providerEmail, providerName }) {
  if (!providerEmail) return;
  await send({
    to: providerEmail,
    subject: '【Fineme】予約がキャンセルされました',
    html: `
      <h2 style="color:#111">予約キャンセルのお知らせ</h2>
      <p>${providerName || '掲載者'} 様</p>
      <p>以下の予約リクエストがユーザーによってキャンセルされました。</p>
      <table style="border-collapse:collapse;width:100%;max-width:500px;margin:16px 0">
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666;width:120px">お客様</td><td style="padding:10px;border-bottom:1px solid #eee">${r.user_name}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">連絡先</td><td style="padding:10px;border-bottom:1px solid #eee">${r.user_contact}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid #eee;color:#666">希望日</td><td style="padding:10px;border-bottom:1px solid #eee">${fmtDate(r.reserved_date)} ${r.start_time || ''}</td></tr>
        <tr><td style="padding:10px;color:#666">メッセージ</td><td style="padding:10px">${r.note || 'なし'}</td></tr>
      </table>
      <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">Fineme（<a href="${SITE_URL}">${SITE_URL}</a>）</p>
    `,
  });
}

// ── ⑥ Mirror 購入後 24h — 声収集依頼 ──────────────────────────
// D-20260711-1 再撮影ナッジ。phase='14'(2週間) / '30'(1ヶ月)。
// 変化は「並べて初めて見える」→2枚目→毎月の変化比較(¥780サブスク)へ接続。煽らない・簡潔・温かい（ブランドボイス）。
export async function sendMirrorReshootNudgeEmail({ to, mirrorUrl, phase }) {
  if (!to) return;
  const is30 = String(phase) === '30';
  const subject = is30
    ? '【Fineme Mirror】1ヶ月。もう一度、鏡の前へ'
    : '【Fineme Mirror】2週間経ちました。変化は、比べて初めて見える';
  const heading = is30
    ? 'あれから1ヶ月。<br><span style="color:#c9a84c">前回の自分と、並べてみませんか。</span>'
    : '2週間が経ちました。<br><span style="color:#c9a84c">変化は、比べて初めて見える。</span>';
  const bodyText = is30
    ? 'あれから1ヶ月。ここで一度、前回の分析と今を並べてみると、記憶では気づけなかった「動いた場所」が見えてきます。<br><br>この“毎月の変化比較”を続けていくと、変化が一枚ずつ地図になっていく——それが Fineme Mirror の続け方（¥780/月）です。まずは今日の1枚から。'
    : 'この2週間、少しでも動けた実感はありますか。変化って、記憶ではなく「並べたとき」に初めて見えるものです。<br><br>同じ角度でもう1枚だけ撮って、前回の分析と重ねてみませんか。1枚目のときは分からなかった「動いた場所」が見えるはずです。';
  const cta = is30 ? '変化を見る（もう一度撮る）→' : 'もう一度撮る（1分）→';
  await send({
    to,
    subject,
    html: `
      <div style="background:#080d1a;color:#e8e4dc;padding:32px 24px;max-width:560px;margin:0 auto;font-family:-apple-system,sans-serif;border-radius:12px">
        <p style="font-size:14px;color:rgba(201,168,76,0.8);font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin:0 0 16px">🪞 Fineme Mirror</p>
        <h2 style="font-size:20px;font-weight:900;color:#fff;margin:0 0 18px;line-height:1.45">${heading}</h2>
        <p style="font-size:14px;color:rgba(232,228,220,0.65);line-height:1.85;margin:0 0 24px">${bodyText}</p>
        <p style="text-align:center;margin:0 0 28px">
          <a href="${mirrorUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c97a);color:#0a0f1e;font-weight:900;font-size:15px;padding:14px 40px;border-radius:10px;text-decoration:none">${cta}</a>
        </p>
        <p style="font-size:12px;color:rgba(232,228,220,0.3);line-height:1.7;margin:0 0 20px">
          今は必要ないと感じたら、このメールは気にせず無視してください。
        </p>
        <hr style="border:none;border-top:1px solid rgba(201,168,76,0.1);margin:0 0 16px">
        <p style="font-size:11px;color:rgba(232,228,220,0.2)">
          Fineme（<a href="${SITE_URL}" style="color:rgba(201,168,76,0.4)">${SITE_URL}</a>）
        </p>
      </div>
    `,
  });
}

export async function sendMirrorVoiceRequestEmail({ to, feedbackUrl }) {
  if (!to) return;
  await send({
    to,
    subject: '【Fineme Mirror】分析から1日。感想を1分で聞かせてください',
    html: `
      <div style="background:#080d1a;color:#e8e4dc;padding:32px 24px;max-width:560px;margin:0 auto;font-family:-apple-system,sans-serif;border-radius:12px">
        <p style="font-size:14px;color:rgba(201,168,76,0.8);font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin:0 0 16px">🪞 Fineme Mirror</p>
        <h2 style="font-size:20px;font-weight:900;color:#fff;margin:0 0 18px;line-height:1.45">
          分析から1日が経ちました。<br>
          <span style="color:#c9a84c">「気づいたこと」を聞かせてください。</span>
        </h2>
        <p style="font-size:14px;color:rgba(232,228,220,0.65);line-height:1.85;margin:0 0 24px">
          あなたの声は、同じ悩みを持つ誰かの「最初の一歩」になります。<br>
          良かったことも、気になったことも、率直に聞かせてください。<strong style="color:rgba(232,228,220,0.9)">1〜2文でOKです。</strong>
        </p>
        <p style="text-align:center;margin:0 0 28px">
          <a href="${feedbackUrl}" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#e8c97a);color:#0a0f1e;font-weight:900;font-size:15px;padding:14px 40px;border-radius:10px;text-decoration:none">感想を書く（1分）→</a>
        </p>
        <p style="font-size:12px;color:rgba(232,228,220,0.3);line-height:1.7;margin:0 0 20px">
          ご感想の内容は、でおが確認のうえ、ご本人の同意を得てからのみ公開します。<br>
          不要な場合はこのメールを無視してください。
        </p>
        <hr style="border:none;border-top:1px solid rgba(201,168,76,0.1);margin:0 0 16px">
        <p style="font-size:11px;color:rgba(232,228,220,0.2)">
          Fineme（<a href="${SITE_URL}" style="color:rgba(201,168,76,0.4)">${SITE_URL}</a>）
        </p>
      </div>
    `,
  });
}

// ── ⑧ Supabase Auth（確認メール等）を日本語で送る ──────────────
// Supabase純正の確認メールは英語固定で怪しく見えるため、
// Send Email Auth Hook（app/api/auth/send-email-hook/route.js）から呼ばれ、
// 既存のResendパイプラインで日本語メールとして送り直す。
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const AUTH_EMAIL_CONFIG = {
  signup: { subject: '【Fineme】メールアドレスの確認をお願いします', heading: 'ご登録ありがとうございます', body: '以下のボタンから、メールアドレスの確認を完了してください。', cta: 'メールアドレスを確認する' },
  invite: { subject: '【Fineme】招待が届いています', heading: 'Finemeへの招待', body: 'あなたはFinemeに招待されました。以下のボタンから登録を完了してください。', cta: '招待を受けて登録する' },
  magiclink: { subject: '【Fineme】ログイン用リンク', heading: 'ログインリンク', body: '以下のボタンからログインできます。', cta: 'ログインする' },
  recovery: { subject: '【Fineme】パスワード再設定のご案内', heading: 'パスワードの再設定', body: '以下のボタンからパスワードを再設定してください。', cta: 'パスワードを再設定する' },
  email_change: { subject: '【Fineme】メールアドレス変更の確認', heading: 'メールアドレス変更の確認', body: '以下のボタンから、新しいメールアドレスへの変更を確認してください。', cta: 'メールアドレスの変更を確認する' },
};

export async function sendAuthActionEmail({ to, actionType, token, tokenHash, redirectTo }) {
  if (!to) return;

  // reauthentication は本人確認用の6桁コード方式のためリンクではなくコードを送る
  if (actionType === 'reauthentication') {
    await send({
      to,
      subject: '【Fineme】確認コード',
      html: `
        <h2 style="color:#111">確認コード</h2>
        <p>本人確認のための確認コードです。画面に入力してください。</p>
        <p style="font-size:32px;font-weight:900;letter-spacing:6px;background:#f9fafb;border-radius:10px;padding:16px 20px;text-align:center;margin:20px 0">${token}</p>
        <p style="color:#6b7280;font-size:13px">このコードに心当たりがない場合は、このメールを無視してください。</p>
        <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
        <p style="color:#999;font-size:12px">Fineme（<a href="${SITE_URL}">${SITE_URL}</a>）</p>
      `,
    });
    return;
  }

  const config = AUTH_EMAIL_CONFIG[actionType] || AUTH_EMAIL_CONFIG.signup;
  const verifyUrl = `${SUPABASE_URL}/auth/v1/verify?${new URLSearchParams({
    token: tokenHash,
    type: actionType,
    redirect_to: redirectTo || SITE_URL,
  }).toString()}`;

  await send({
    to,
    subject: config.subject,
    html: `
      <h2 style="color:#111">${config.heading}</h2>
      <p>${config.body}</p>
      <p style="margin-top:24px">
        <a href="${verifyUrl}" style="background:#111;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700">${config.cta}</a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:16px">ボタンが押せない場合は、以下のURLをブラウザに貼り付けてください。<br><a href="${verifyUrl}" style="color:#6366f1;word-break:break-all">${verifyUrl}</a></p>
      <p style="color:#9ca3af;font-size:12px">このメールに心当たりがない場合は、無視していただいて問題ありません。</p>
      <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">Fineme（<a href="${SITE_URL}">${SITE_URL}</a>）</p>
    `,
  });
}

// ── ⑦ 承認通知（後方互換）────────────────────────────────────
export async function sendReservationApprovedEmail({ reservation: r, userEmail, userName, providerName, serviceComment }) {
  if (!userEmail) return;
  await sendReservationStatusEmail({
    reservation: { ...r, user_contact: userEmail },
    status: 'approved',
    counterProposal: serviceComment,
    providerName,
  });
}
