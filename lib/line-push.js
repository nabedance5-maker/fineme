// Vercel対応のLINEプッシュ通知（SQLite不使用）
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';
const LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

// token を渡すと店舗の公式LINEチャネルから送信する（フェーズ2・店舗別LINE連携）。
// 省略時は従来通りFineme公式チャネルから送信する。
// quickReplyItems: [{ label, data, displayText? }] を渡すとクイックリプライボタンを付ける
// （予約前日リマインドの「行きます」等・フェーズ3-E）。
export async function sendLinePush(lineUserId, text, token = process.env.LINE_CHANNEL_ACCESS_TOKEN, quickReplyItems = null) {
  if (!token || !lineUserId) return { ok: false, reason: 'no-token-or-id' };

  const message = { type: 'text', text };
  if (quickReplyItems?.length) {
    message.quickReply = {
      items: quickReplyItems.map(q => ({
        type: 'action',
        action: { type: 'postback', label: q.label, data: q.data, displayText: q.displayText || q.label },
      })),
    };
  }

  try {
    const res = await fetch(LINE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [message],
      }),
    });
    if (res.ok) return { ok: true, status: res.status };

    // 失敗理由が分かるようにする。403 は「公式アカウントを友だち追加していない」が主因で、
    // LINE Login で連携しただけのユーザーはここに落ちる（bot_prompt で友だち追加を促している）。
    let detail = '';
    try { detail = (await res.text() || '').slice(0, 300); } catch {}
    const reason = res.status === 403 ? 'not-friend-or-no-permission'
      : res.status === 400 ? 'invalid-request-or-user'
      : `http-${res.status}`;
    console.error('[line-push] failed', { status: res.status, reason, detail });
    return { ok: false, status: res.status, reason, detail };
  } catch (e) {
    console.error('[line-push]', e);
    return { ok: false, error: e.message };
  }
}

// New Me Log のリマインドを、本文＋「行った」ボタン付きカルーセルの2通で送る。
// クイックリプライ（1メッセージに複数ボタン）は、どれか1つ押すと他のボタンも
// 全部消えてしまう仕様のため、複数件を同時に扱えない（でお報告2026-08-27）。
// テンプレートメッセージのボタンは押しても消えずに残るため、カルーセルに置き換えた。
// columns: [{ title, text, actions: [{type,label,data,displayText?,mode?,initial?,max?}] }]（最大10件）
export async function sendLineLogReminder(lineUserId, text, columns, token = process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  if (!token || !lineUserId) return { ok: false, reason: 'no-token-or-id' };

  const messages = [{ type: 'text', text }];
  if (columns?.length) {
    messages.push({
      type: 'template',
      altText: 'ケアの記録をLINEから直接つけられます',
      template: { type: 'carousel', columns: columns.slice(0, 10) },
    });
  }

  try {
    const res = await fetch(LINE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: lineUserId, messages }),
    });
    if (res.ok) return { ok: true, status: res.status };

    let detail = '';
    try { detail = (await res.text() || '').slice(0, 300); } catch {}
    const reason = res.status === 403 ? 'not-friend-or-no-permission'
      : res.status === 400 ? 'invalid-request-or-user'
      : `http-${res.status}`;
    console.error('[line-push] log-reminder failed', { status: res.status, reason, detail });
    return { ok: false, status: res.status, reason, detail };
  } catch (e) {
    console.error('[line-push]', e);
    return { ok: false, error: e.message };
  }
}

// Webhookのreplyトークンに対して返信する（フェーズ3-E・ポストバック応答用）
export async function sendLineReply(replyToken, text, token = process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  if (!token || !replyToken) return { ok: false, reason: 'no-token-or-reply-token' };
  try {
    const res = await fetch(LINE_REPLY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
