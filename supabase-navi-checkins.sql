-- ✅ 本番適用済 2026-11-22
-- 羅針盤「今週の1点」のチェックイン（今週分と直近8週の履歴）をサーバーにも持つ
-- （Muse指示書 2026-11-22 §1-4）。端末の localStorage だけにあり、別端末・保存消去で
-- 継続の判定（直近3週）が消えていた。{ current: {...}, history: [{weekStart, status}] }
alter table profiles add column if not exists navi_checkins jsonb;
