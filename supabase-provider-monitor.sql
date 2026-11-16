-- ✅ 本番適用済 2026-11-16
-- 無料モニター店舗（2026-11-16）。スタンダード（plan='B'）を3か月無料で使える。
-- billing_status='monitor' の間だけ契約扱い。monitor_until を過ぎると cron（/api/cron/monitor-expiry）が
-- billing_status を null（未契約）に戻す。自動で有料には切り替えない（告知どおり）。
alter table providers add column if not exists monitor_started_at timestamptz;
alter table providers add column if not exists monitor_until timestamptz;
alter table providers add column if not exists monitor_notified_14_at timestamptz;
alter table providers add column if not exists monitor_notified_3_at timestamptz;
alter table providers add column if not exists monitor_ended_at timestamptz;
create index if not exists providers_monitor_until_idx on providers (monitor_until) where billing_status = 'monitor';
