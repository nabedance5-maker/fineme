// Vercel対応のLINEプッシュ通知（SQLite不使用）
const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

export async function sendLinePush(lineUserId, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token || !lineUserId) return { ok: false, reason: 'no-token-or-id' };

  try {
    const res = await fetch(LINE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text }],
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.error('[line-push]', e);
    return { ok: false, error: e.message };
  }
}
