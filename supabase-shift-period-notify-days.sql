-- ✅ 本番適用済 2026-10-02
-- シフト希望の提出締切の何日前に店舗へ未提出者を通知するか（0=締切当日）。
-- でお要望2026-10-02：前日以外にも任意の日数前に通知、締切当日にも通知。
ALTER TABLE provider_shift_periods
  ADD COLUMN IF NOT EXISTS notify_days_before INT[] NOT NULL DEFAULT '{1,0}';
