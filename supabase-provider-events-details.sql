-- ✅ 本番適用済 2026-09-15
-- 出欠確認イベントに詳細・画像を追加（でお要望2026-09-15：「タイトルだけじゃなくて、
-- 詳細を書けるようにしたり画像を入れたりできるようにしてほしい」）。
-- memo列は既に存在するが、作成フォーム側に入力欄が無かっただけ（今回UIを追加）。
-- image_urlのみ新規カラム。
alter table provider_events add column if not exists image_url text;
