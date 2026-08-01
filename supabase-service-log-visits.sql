-- ⏳ 未適用（オーナーが本番Supabaseで実行してください）
--
-- New Me Log: 来店1回＝1行の履歴テーブル。
-- user_service_logs は「サービス1件＝1行」で last_visit/next_visit しか持てないため、
-- 「✓ 今日行った」を押すたびに上書きされ、支出推移グラフに必要な時系列が失われていた
-- （lib/log-store.js の updateLog() は完全上書き）。
-- ここは来店のたびに積み上げる履歴専用。親行の last_visit/next_visit は今まで通り
-- 「直近の状態」として使い続ける（通知cronはこのテーブルを見ない・見る必要もない）。
--
-- cost は1回ごとの費用（任意・NULL可）。現状のUIは記録時に金額を聞かないため常にNULLになる。
-- 集計側（lib/log-axes.js の monthlyTrend）は visit.cost が無ければ親ログの現在の cost で
-- 代用し、それも無ければ集計から除外する（わからない金額を捏造しない）。

CREATE TABLE IF NOT EXISTS user_service_log_visits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id     UUID NOT NULL REFERENCES user_service_logs(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_at DATE NOT NULL,
  cost       INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_log_visits_log_id
  ON user_service_log_visits(log_id, visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_log_visits_user_id
  ON user_service_log_visits(user_id, visited_at DESC);

ALTER TABLE user_service_log_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_log_visits_select_own"
  ON user_service_log_visits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "service_log_visits_insert_own"
  ON user_service_log_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_log_visits_delete_own"
  ON user_service_log_visits FOR DELETE
  USING (auth.uid() = user_id);

-- UPDATEポリシーは意図的に作らない（訪問記録は追記のみで、編集UIが無いため）。
-- 将来「金額を後から直す」機能ができたら、その時にUPDATEポリシーだけ追加する
-- 小さなmigrationを切ればよい（supabase-log-freq-months.sql等、既存の増分パッチと同じやり方）。


-- 【任意・推奨】既存ログの last_visit を「最初の1件」としてバックフィルする場合のみ実行。
-- 実在する日付をそのまま1行複製するだけで、金額や回数を水増しするものではない
-- （costは入れない＝集計時に親行の現在のcostで代用される、上のコメントと同じ扱い）。
-- 1回だけ実行してください（再実行すると同じ日付の行が重複します）。
INSERT INTO user_service_log_visits (log_id, user_id, visited_at)
SELECT id, user_id, last_visit
FROM user_service_logs
WHERE last_visit IS NOT NULL
  AND active = true;
