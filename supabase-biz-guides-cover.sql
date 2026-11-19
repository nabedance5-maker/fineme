-- ✅ 本番適用済 2026-11-19
-- 店舗運営ガイド・営業パートナーガイドの記事ごとの画像（2026-11-19 渡邉指示：画像は運営が管理画面で設定する）
-- 空なら業種ごとの写真を自動で選ぶ（lib/biz-guide-visual.js）
alter table biz_guides add column if not exists cover text;
