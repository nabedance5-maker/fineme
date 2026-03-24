-- ✅ 本番適用済 2026-03-24
-- reservations テーブルにリマインダー送信フラグを追加
-- Vercel Cron によるLINEリマインダーの重複送信を防ぐ

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- インデックス（CronジョブのWHERE条件に使用）
CREATE INDEX IF NOT EXISTS idx_reservations_reminder
  ON reservations (status, reserved_date, reminder_sent)
  WHERE status = 'approved' AND reminder_sent = FALSE;
