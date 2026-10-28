-- ✅ 本番適用済 2026-10-28
-- 入会の利用規約・同意書を、PDF・画像・リンクで複数置けるように（でお要望 2026-10-28）
-- terms_files：[{ url, name, kind: 'pdf' | 'image' | 'link' }]（並び順のまま入会ページに出す）
-- 1ファイルだけの terms_file_url / terms_file_name は同じ日に作ったばかりで使われていない（0件）ため外す
ALTER TABLE provider_membership_settings ADD COLUMN IF NOT EXISTS terms_files jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE provider_memberships ADD COLUMN IF NOT EXISTS terms_files jsonb;
ALTER TABLE provider_membership_settings DROP COLUMN IF EXISTS terms_file_url;
ALTER TABLE provider_membership_settings DROP COLUMN IF EXISTS terms_file_name;
ALTER TABLE provider_memberships DROP COLUMN IF EXISTS terms_file_url;
