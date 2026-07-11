-- D-20260711-1 再撮影ナッジの送信トラッキング列
-- Mirror ¥500 購入者へ購入14日後・30日後に再撮影ナッジを送る（重複送信を防ぐため送信時刻を記録）。
-- ⚠️ 本番Supabase（SQL Editor）で実行してから、この行の下に「✅ 本番適用済 YYYY-MM-DD」を追記すること。

alter table mirror_sessions
  add column if not exists reshoot_nudge_14_at timestamptz,
  add column if not exists reshoot_nudge_30_at timestamptz;
