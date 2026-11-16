// 回数券・チケットのオンライン購入（Stripe Checkout・mode=payment）の確定処理（2026-11-16 切り出し）。
// 呼び出し元：
//   - app/api/me/customer-packages/confirm/route.js（お客様が支払い完了の画面に戻ってきた時）
//   - app/api/stripe/webhook/route.js（checkout.session.completed。お客様が画面を閉じても確定する）
// どちらが先に来ても1回だけ確定する（customer_packages.stripe_checkout_session_id のユニークインデックス）。
// 確定した側だけが、お店の売上（provider_sales_entries）に1件記録し、お店の活動ログに残す。
// 以前は「戻ってきた時」だけ確定し、売上にも記録していなかった（月会費は記録していた）。
import { logCustomerActivity } from './activity-log.js';

export class PackagePurchaseError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// session：Stripe から取り直した Checkout Session（metadata は Fineme のサーバーが作成時に付けたもの）
// 返り値：{ row, created }（created=false は既に確定済み）
export async function finalizePackagePurchase(db, session) {
  if (session.mode !== 'payment' || session.payment_status !== 'paid') throw new PackagePurchaseError('決済が完了していません', 409);
  const userId = session.metadata?.fineme_user_id;
  const providerId = session.metadata?.fineme_provider_id;
  const packageId = session.metadata?.fineme_package_id;
  if (!userId || !providerId || !packageId) throw new PackagePurchaseError('購入の情報が足りません', 400);

  const { data: existing } = await db.from('customer_packages').select('*').eq('stripe_checkout_session_id', session.id).maybeSingle();
  if (existing) return { row: existing, created: false };

  const { data: pkg } = await db.from('service_packages').select('*').eq('id', packageId).eq('provider_id', providerId).maybeSingle();
  if (!pkg) throw new PackagePurchaseError('チケット定義が見つかりません', 404);

  const expires_at = pkg.validity_days
    ? new Date(Date.now() + pkg.validity_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: created, error } = await db.from('customer_packages').insert({
    provider_id: providerId,
    package_id: pkg.id,
    user_id: userId,
    package_name: pkg.name,
    total_sessions: pkg.total_sessions,
    package_type: pkg.package_type || 'fixed_count',
    expires_at,
    stripe_checkout_session_id: session.id,
    ticket_id: pkg.ticket_id || null, // 回数券＝チケットが付く商品（2026-10-22）
    source: 'package',
  }).select().single();
  if (error) {
    // ユニーク制約違反＝もう一方の経路がちょうど同時に確定した。既存行を返す（売上はそちらが記録する）
    if (error.code === '23505') {
      const { data: raced } = await db.from('customer_packages').select('*').eq('stripe_checkout_session_id', session.id).maybeSingle();
      if (raced) return { row: raced, created: false };
    }
    throw new PackagePurchaseError(error.message, 500);
  }

  const { data: buyer } = await db.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  const amount = Number(session.amount_total) || 0;
  if (amount > 0) {
    const { error: sErr } = await db.from('provider_sales_entries').insert({
      provider_id: providerId,
      entry_date: new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10), // 確定した日（日本時間）
      amount,
      menu_name: `回数券：${pkg.name}`,
      payment_method: 'オンライン決済（回数券）',
      memo: buyer?.display_name || null,
      source: 'manual',
    });
    if (sErr) console.error('[package purchase] sales entry error:', sErr.message);
  }
  await logCustomerActivity({
    providerId, userId, name: buyer?.display_name,
    label: 'お客様が回数券を購入', category: '顧客', targetId: created.id,
    detail: { package_name: pkg.name, total_sessions: pkg.total_sessions },
  });
  return { row: created, created: true };
}
