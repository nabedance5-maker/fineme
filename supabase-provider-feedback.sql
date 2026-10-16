-- ✅ 本番適用済 2026-10-16
-- 掲載者からFinemeへの意見（でお要望 2026-10-16）。
-- 掲載者ダッシュボードの「使い方」カテゴリー内「Finemeへのご意見」タブから送られ、
-- 運営管理画面（/admin/provider-feedback）に一覧で溜まる。使い勝手の生の声を集めて対応するため。
CREATE TABLE IF NOT EXISTS provider_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  category    TEXT NOT NULL DEFAULT 'usability'
              CHECK (category IN ('usability', 'bug', 'request', 'other')),
  tab         TEXT,          -- どの画面についての意見か（掲載者が選択。未選択ならNULL）
  message     TEXT NOT NULL,
  user_agent  TEXT,
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'in_progress', 'done', 'wontfix')),
  admin_note  TEXT,          -- 運営側の対応メモ（掲載者にも「運営からの返信」として表示する）
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS provider_feedback_created_idx ON provider_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS provider_feedback_provider_idx ON provider_feedback(provider_id, created_at DESC);

ALTER TABLE provider_feedback ENABLE ROW LEVEL SECURITY;
-- 公開読み取りは許可しない。書き込み・読み取りともservice_role（APIルート）のみ。
