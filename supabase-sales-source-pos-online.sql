-- ✅ 本番適用済 2026-10-19
-- 不具合修正（2026-10-19）：POSのオンライン決済（Stripe）で確定した会計は売上の source を 'pos_online' で記録するが、
-- CHECK制約が reservation / manual / pos しか許しておらず、支払いが取れても売上の記録に失敗して
-- 会計が「失敗」扱いになっていた。'pos_online' を許可する。
alter table provider_sales_entries drop constraint if exists provider_sales_entries_source_check;
alter table provider_sales_entries add constraint provider_sales_entries_source_check check (source in ('reservation', 'manual', 'pos', 'pos_online'));
