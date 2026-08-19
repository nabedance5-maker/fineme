-- 未適用（本番Supabaseで実行してください）
-- 店舗が軸ごとに推奨来店周期を設定できるようにする（予約・再来店リマインドSaaS フェーズ3-C）
-- New Me Logで店舗を選んだ時の頻度の自動入力、休眠顧客セグメント（店舗推奨超過判定）に使う。
-- 機密情報を含まないため public read policy を付けてよいが、書き込みはservice_role(APIルート)のみに絞る。

CREATE TABLE IF NOT EXISTS provider_recommended_frequencies (
  provider_id      UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  axis             TEXT NOT NULL,
  frequency_weeks  INTEGER,
  frequency_months INTEGER,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (provider_id, axis)
);
ALTER TABLE provider_recommended_frequencies ENABLE ROW LEVEL SECURITY;

-- 誰でも読める（New Me Logの頻度自動入力に使うため。書き込みはservice_roleのみ＝publicポリシー無し）
CREATE POLICY "public read recommended frequencies"
  ON provider_recommended_frequencies FOR SELECT
  USING (true);
