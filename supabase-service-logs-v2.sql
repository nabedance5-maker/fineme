-- ✅ 本番適用済 2026-07-26
-- New Me Log v2：費用管理・カスタム軸・LINE通知に必要なカラムを追加する。
--
-- 背景：New Me Log は「定期的に通っているものを1枚で管理し、
-- 次のタイミングをLINEで知らせる」ツールとして入口にする（でお構想 2026-07-26）。
-- 予定管理だけならカレンダーで代替できるが、費用の可視化は専用ツールにしかできない。
--
-- axis は既に TEXT で CHECK 制約が無いため、カスタム軸（自由な軸名）は
-- 追加カラム無しでそのまま入る。custom_icon はその表示用。
--
-- 未適用でも動く後方互換をコード側に入れてある（費用・通知だけが無効になる）。

ALTER TABLE user_service_logs ADD COLUMN IF NOT EXISTS custom_icon TEXT;

-- 1回あたりの費用（円）。頻度と組み合わせて月額・年額に換算する。任意入力。
ALTER TABLE user_service_logs ADD COLUMN IF NOT EXISTS cost INTEGER;

-- LINE通知の設定
ALTER TABLE user_service_logs ADD COLUMN IF NOT EXISTS notify_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_service_logs ADD COLUMN IF NOT EXISTS notify_days_before INTEGER DEFAULT 3;

-- 同じ内容を毎日ナグらないための記録（master.md「同じ内容で毎日ナグらない」）
ALTER TABLE user_service_logs ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

-- 通知対象の抽出（active かつ notify_enabled かつ next_visit が近い）を効く形に
CREATE INDEX IF NOT EXISTS idx_service_logs_notify
  ON user_service_logs (next_visit)
  WHERE active = true AND notify_enabled = true;
