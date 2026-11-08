-- ✅ 本番適用済 2026-11-09
-- POSレジで回数券・チケットを売れるように（2026-11-09 渡邉要望）。会計の明細に回数券を入れ、会計が確定したらお客様に回数券を付ける。
alter table provider_pos_transaction_items add column if not exists package_id uuid references service_packages(id) on delete set null;
-- POSで売った回数券（会計の取り消しで、まだ使っていなければ外す）
alter table customer_packages add column if not exists pos_transaction_id uuid references provider_pos_transactions(id) on delete set null;
create index if not exists idx_customer_packages_pos_tx on customer_packages(pos_transaction_id) where pos_transaction_id is not null;
