-- agent_memory: AIエージェントが起動時に読む「第二の脳」メモリ
-- ~/MyBrain/Memory.md の内容をここに同期し、Vercel上のcronエージェントが参照する

CREATE TABLE IF NOT EXISTS agent_memory (
  id TEXT PRIMARY KEY DEFAULT 'main',
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初期レコード（空で作成。sync スクリプトで上書きされる）
INSERT INTO agent_memory (id, content) VALUES ('main', '')
ON CONFLICT (id) DO NOTHING;

-- RLS: サービスロールキーのみ書き込み可。読み取りは anon も可（cronから参照するため）
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read" ON agent_memory
  FOR SELECT USING (true);

CREATE POLICY "service_write" ON agent_memory
  FOR ALL USING (auth.role() = 'service_role');
