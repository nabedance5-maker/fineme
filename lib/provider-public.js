// 店舗（providers）の行を、誰でも見られる公開API・公開ページに出す前に、非公開の項目を外す。
// 2026-11-11 セキュリティ点検：/api/providers（一覧）が select('*') をそのまま返しており、
// ログイン用メール・通知先メール・Stripe/LINE のID・シフト提出リンクの鍵などが誰でも取れた。
// /api/providers/[slug] は 2026-10-01・10-27 に個別に外していたが、一覧には入っていなかったので一か所にまとめる。
// 新しく非公開の項目を providers に足したら、ここにも足すこと。
export const PRIVATE_PROVIDER_FIELDS = [
  'email', 'notify_emails', 'line_user_id',
  'stripe_customer_id', 'stripe_subscription_id', 'stripe_connect_id', 'stripe_connect_status',
  'referral_code', 'referred_by', 'affiliate_notes',
  'billing_status', 'billing_started', 'billing_unpublished',
  'dashboard_prefs', 'admin_hidden', 'shift_link_token',
];

export function publicProvider(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const k of PRIVATE_PROVIDER_FIELDS) delete out[k];
  return out;
}
