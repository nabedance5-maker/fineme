-- ✅ 本番適用済 2026-11-09
-- 予約の時にお客様のMe Scanの結果（診断結果）を見せて、お店に送れるようにするか（2026-11-09 渡邉要望：店によって表示/非表示を選べるように）
alter table providers add column if not exists show_mescan_on_booking boolean not null default true;
