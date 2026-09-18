-- ✅ 本番適用済 2026-09-18
-- 予約可能時間の締切（でお確認2026-09-18：「予約可能時間と予約可能数の設定どこ
-- (ex.前日21時まで予約可能、1人同時予約可能数4枠)」。同時予約数の上限は既に
-- max_active_reservationsで実装済みだが、締切時間の設定が存在しなかった）。
-- 「予約開始◯時間前までしか予約を受け付けない」というリードタイム方式にする
-- （固定時刻での締切より、営業時間が曜日で変わる店舗にも汎用的に対応できるため）。
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS booking_cutoff_hours INT NOT NULL DEFAULT 0;
