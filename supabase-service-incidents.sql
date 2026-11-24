-- ✅ 本番適用済 2026-11-24
-- 監視（/api/cron/uptime-check）が止まりを検知した記録（2026-11-24、Muse第2弾 §12-3）。
-- 週次レポートのAI分析が、障害の期間を需要の低下と取り違えないよう、期間中の止まりを渡すために使う。
-- 書き込み・読み取りはサーバー（service role）のみ。
create table if not exists service_incidents (
  id          bigserial primary key,
  name        text not null,          -- 止まった所（例：AIの残高（Anthropic・Mirror の写真分析ほか））
  status      text,
  detected_at timestamptz not null default now()
);
create index if not exists service_incidents_detected_idx on service_incidents (detected_at desc);
alter table service_incidents enable row level security;
revoke all on service_incidents from anon, authenticated;
