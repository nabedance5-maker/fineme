-- ✅ 本番適用済 2026-11-26
-- 特例無料のお試し期限（2026-11-26 渡邉要望「特例無料に1個だけ期限を付けられるように。商談したお店に1週間ほどお試しで全機能を」）
-- special_until：特例無料（plan='special'）を使える期限。null＝期限なし（これまでどおり）
-- special_trial_ended_at：期限が来て /api/cron/monitor-expiry が未契約に戻した日時
alter table providers add column if not exists special_until timestamptz;
alter table providers add column if not exists special_trial_ended_at timestamptz;
