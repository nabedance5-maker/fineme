// Supabase Auth の「Send Email」Hook 受け口。
// 純正の確認メールは英語固定で怪しく見えるため、ここで受け取って
// lib/email.js の日本語テンプレートで送り直す（Resend経由）。
// Supabaseダッシュボード側で Authentication → Hooks → Send Email を有効化し、
// このエンドポイントURLとシークレット（SUPABASE_AUTH_HOOK_SECRET）を設定する必要がある。
import crypto from 'crypto';
import { sendAuthActionEmail } from '@/lib/email';

export const runtime = 'nodejs';

// Standard Webhooks方式の署名検証（Supabase Auth Hookが使う仕様）。
// signed_content = "{id}.{timestamp}.{body}" をHMAC-SHA256し、base64で比較する。
function verifySignature(secret, id, timestamp, body, signatureHeader) {
  if (!secret || !id || !timestamp || !signatureHeader) return false;
  const secretBytes = Buffer.from(secret.replace(/^v1,whsec_/, ''), 'base64');
  const signedContent = `${id}.${timestamp}.${body}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
  const candidates = signatureHeader.split(' ').map(s => s.split(',')[1]).filter(Boolean);
  const expectedBuf = Buffer.from(expected);
  return candidates.some(c => {
    try {
      const cBuf = Buffer.from(c);
      return cBuf.length === expectedBuf.length && crypto.timingSafeEqual(cBuf, expectedBuf);
    } catch { return false; }
  });
}

export async function POST(request) {
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET;
  if (!secret) {
    console.error('[send-email-hook] SUPABASE_AUTH_HOOK_SECRET が未設定');
    return Response.json({ error: { http_code: 500, message: 'not configured' } }, { status: 500 });
  }

  const body = await request.text();
  const id = request.headers.get('webhook-id');
  const timestamp = request.headers.get('webhook-timestamp');
  const signature = request.headers.get('webhook-signature');

  // リプレイ攻撃対策：タイムスタンプが5分以上ずれていたら拒否
  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return Response.json({ error: { http_code: 400, message: 'timestamp out of tolerance' } }, { status: 400 });
  }

  if (!verifySignature(secret, id, timestamp, body, signature)) {
    return Response.json({ error: { http_code: 401, message: 'invalid signature' } }, { status: 401 });
  }

  let payload;
  try { payload = JSON.parse(body); } catch {
    return Response.json({ error: { http_code: 400, message: 'invalid json' } }, { status: 400 });
  }

  const { user, email_data } = payload || {};
  try {
    await sendAuthActionEmail({
      to: user?.email,
      actionType: email_data?.email_action_type,
      token: email_data?.token,
      tokenHash: email_data?.token_hash,
      redirectTo: email_data?.redirect_to,
    });
  } catch (e) {
    console.error('[send-email-hook] メール送信失敗:', e);
    return Response.json({ error: { http_code: 500, message: 'メール送信に失敗しました' } }, { status: 500 });
  }

  return Response.json({});
}
