-- ✅ 本番適用済 2026-10-28
-- お店ごとの会員登録・入会の規約ファイル（でお要望 2026-10-28）
-- ・providers.require_member_registration：ONのお店は、会員登録（無料）を済ませた方だけが予約・入会・回数券の購入をできる
-- ・provider_membership_settings.terms_file_url / terms_file_name：利用規約・同意書をPDFでも置ける（入会ページでお客様が開いて確認）
-- ・provider_memberships.terms_file_url：お客様が同意した時点の規約ファイル（後からお店が差し替えても、どれに同意したか残す）
ALTER TABLE providers ADD COLUMN IF NOT EXISTS require_member_registration boolean NOT NULL DEFAULT false;
ALTER TABLE provider_membership_settings ADD COLUMN IF NOT EXISTS terms_file_url text;
ALTER TABLE provider_membership_settings ADD COLUMN IF NOT EXISTS terms_file_name text;
ALTER TABLE provider_memberships ADD COLUMN IF NOT EXISTS terms_file_url text;
