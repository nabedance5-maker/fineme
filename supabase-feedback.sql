-- ✅ 本番適用済 2026-05-05
-- フィードバックテーブル
CREATE TABLE IF NOT EXISTS public.feedback (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT now(),
  page             TEXT        NOT NULL,            -- 'diagnosis_result' | 'map'
  rating_accuracy  INTEGER     CHECK (rating_accuracy  BETWEEN 1 AND 5),
  rating_usability INTEGER     CHECK (rating_usability BETWEEN 1 AND 5),
  rating_revisit   INTEGER     CHECK (rating_revisit   BETWEEN 1 AND 5),
  comment          TEXT,
  type_code        TEXT,                            -- 例: 'BNV'
  compass_first    TEXT,                            -- 例: 'body'
  user_agent       TEXT
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 誰でも投稿可能（匿名フィードバック）
CREATE POLICY "Anyone can insert feedback"
  ON public.feedback FOR INSERT WITH CHECK (true);

-- 読み取りはサービスロールのみ（APIルート経由）
CREATE POLICY "Service role only read"
  ON public.feedback FOR SELECT USING (false);
