-- ✅ 本番適用済 2026-11-09
-- POSの会計後、お客様にレシートをメールで送るか（2026-11-09 渡邉要望：「決済後のレシートはメールで自動で送れると良さそう」）。
-- お客様を選んだ会計で、メールアドレスが分かる時だけ送る。既定はオン
alter table provider_pos_settings add column if not exists email_receipt boolean not null default true;
