-- ✅ 本番適用済 2026-11-24
-- New Me Log：月の予算（任意）。Muse指示書 第2弾 7-3 を渡邉判断 (b) で実装（2026-11-24）。
-- 現行の Me Scan は予算を聞かないため、Log の「答えた予算と実際の支出」の比較が誰にも出ていなかった。
-- Me Scan のフローには足さず、プロフィールの任意項目として聞く。値は lib/log-axes.js の BUDGET_LABELS と同じ。
-- profiles は既存の RLS（本人のみ）をそのまま使う。書き込みは /api/me/log-prefs（service role・本人のみ）から。
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS log_budget text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_log_budget_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_log_budget_check CHECK (log_budget IS NULL OR log_budget IN ('low','mid','high'));
  END IF;
END $$;
