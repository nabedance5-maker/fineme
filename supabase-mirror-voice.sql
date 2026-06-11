-- Mirror 声収集フロー用マイグレーション
-- ① mirror_sessions に voice_requested_at カラムを追加
-- ② mirror_feedback テーブルを新規作成

ALTER TABLE mirror_sessions
  ADD COLUMN IF NOT EXISTS voice_requested_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS mirror_feedback (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID REFERENCES mirror_sessions(id) ON DELETE SET NULL,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- admin から読み取れるよう RLS を無効化（サービスロールのみアクセスするため）
ALTER TABLE mirror_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON mirror_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);
