-- ✅ 本番適用済 2026-06-13
-- Mirror フィードバック LP 承認カラム追加
-- mirror_feedback テーブルに LP 表示用のカラムを追加する
-- lp_approved: LP に表示するか（管理者が承認したもののみ true）
-- lp_meta: 「20代・初挑戦」など表示属性（任意・管理者が入力）

ALTER TABLE mirror_feedback
  ADD COLUMN IF NOT EXISTS lp_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lp_meta text;

CREATE INDEX IF NOT EXISTS idx_mirror_feedback_lp_approved
  ON mirror_feedback (lp_approved)
  WHERE lp_approved = true;
