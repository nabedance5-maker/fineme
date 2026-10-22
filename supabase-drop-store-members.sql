-- ✅ 本番適用済 2026-10-22
-- 「お店ごとの会員登録」（provider_store_members）を廃止（でお指摘 2026-10-22：月額プランに入っているか・回数券（チケット）を
-- 持っているかで判定すれば十分。いちいち会員である必要はない）。会員かどうかは lib/booking-eligibility.js の
-- customerEntitlements（プラン・チケット）で判定する。表は同日に作ったもので、中身はテストの1件のみ。
DROP TABLE IF EXISTS provider_store_members;
