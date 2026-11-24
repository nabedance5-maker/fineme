// Mirror の「購入」の定義を1か所に揃える（2026-11-24、Muse第2弾 §12-2）。
// 以前は週次レポート（決済IDがあるものだけ＝1件）と管理画面（paid フラグ＝32件・¥16,000）で
// 定義が違った。paid には運営者本人の無料・サブスク・お試し・紹介の解放が混ざり、32件のうち
// 27件は運営者本人のアカウントだった。
//
//   購入        ＝ ¥500 単発の実決済（Stripe の決済ID あり）かつ運営者のテスト購入ではない
//   運営者テスト ＝ 決済ID あり かつ 運営者のメールでの購入（件数は別に出す）
//   無料の解放   ＝ paid だが決済ID なし（運営者本人・サブスク・月1お試し・紹介）
//   プレビューのみ＝ paid でない
export const MIRROR_PRICE = 500;
export const MIRROR_PURCHASE_DEFINITION = '購入＝¥500単発の実決済（Stripeの決済IDあり・運営者のテスト購入を除く）';

export const isMirrorPurchase = (s) => !!s.stripe_payment_intent_id && !s.is_owner_test;
export const isMirrorOwnerTest = (s) => !!s.stripe_payment_intent_id && !!s.is_owner_test;
export const isMirrorFreeUnlock = (s) => !!s.paid && !s.stripe_payment_intent_id;

// 件数だけ数える時の Supabase クエリ条件（決済IDあり・運営者テストを除く）
export function whereMirrorPurchase(q) {
  return q.not('stripe_payment_intent_id', 'is', null).or('is_owner_test.is.null,is_owner_test.eq.false');
}
