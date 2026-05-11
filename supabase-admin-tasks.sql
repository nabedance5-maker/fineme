-- admin_tasks テーブル（オーナー個人のタスク管理）
CREATE TABLE IF NOT EXISTS admin_tasks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL,
  category   text NOT NULL DEFAULT 'その他',
  done       boolean NOT NULL DEFAULT false,
  priority   int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  done_at    timestamptz
);

-- RLS: service_role のみアクセス可（APIルート経由でのみ操作）
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON admin_tasks
  USING (auth.role() = 'service_role');
