-- ✅ 本番適用済 2026-11-09
-- POSのレシートのメール：会計の画面で宛先を確かめて変えられるように・お客様を選ばない会計でも手で入れて送れるように（2026-11-09）
alter table provider_pos_pending_checkouts add column if not exists receipt_email text;
alter table provider_pos_pending_checkouts add column if not exists save_receipt_email boolean not null default false;
alter table provider_pos_transactions add column if not exists receipt_email text;
