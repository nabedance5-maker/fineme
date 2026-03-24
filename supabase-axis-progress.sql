-- profiles に axis_progress カラムを追加
-- 例: { "body": "active", "eyebrow": "done", "fashion": null }
-- 値: null(未着手) / "active"(取り組み中) / "done"(ひと段落)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS axis_progress JSONB DEFAULT '{}'::jsonb;
