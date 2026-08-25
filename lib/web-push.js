import webpush from 'web-push';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

// subscription: { endpoint, p256dh, auth }
// payload: { title, body, url }
export async function sendWebPush(subscription, payload) {
  if (!process.env.VAPID_PRIVATE_KEY) return { ok: false, reason: 'no-vapid-key' };
  ensureConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (e) {
    // 410/404 = 購読が失効（ブラウザ側で解除済み等）
    return { ok: false, status: e.statusCode, reason: e.message, expired: e.statusCode === 410 || e.statusCode === 404 };
  }
}
