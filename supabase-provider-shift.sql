-- ✅ 本番適用済 2026-09-13
-- シフト作成・調整機能（でお要望2026-09-13）。
-- スタッフが各自のスマホから次月の出勤希望・休み希望を提出し、店舗側が一覧で確認・
-- 自動作成ボタンで下書きを組み、手動調整して確定する。ルール（希望をそのまま入れるか、
-- 曜日・時間帯ごとの必要人数に沿って優先度で調整するか）は店舗ごとに変更できる。

-- スタッフはFinemeの認証アカウントを持たないため、推測不可能なトークン付きURL
-- （/staff-shift/[token]、認証不要の公開ページ）で本人確認する。既存の予約確認
-- Webhook等と同じ「UUIDの推測不可能性に頼る」設計方針を踏襲。
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS shift_access_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- 店舗ごとのシフト作成ルール設定
CREATE TABLE IF NOT EXISTS provider_shift_settings (
  provider_id UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  -- 'as_requested'：出勤希望をそのまま全部シフトに入れる
  -- 'staffing_target'：曜日・時間帯ごとの必要人数(staffing_targets)に沿って優先度で調整する
  rule_type TEXT NOT NULL DEFAULT 'as_requested' CHECK (rule_type IN ('as_requested', 'staffing_target')),
  -- {"mon":[{"start":"09:00","end":"13:00","required":2}, ...], "tue":[...], ...}
  staffing_targets JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 月次のシフト募集期間（希望募集中→下書き作成済み→確定、の状態を管理）
CREATE TABLE IF NOT EXISTS provider_shift_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  request_deadline DATE,
  status TEXT NOT NULL DEFAULT 'collecting' CHECK (status IN ('collecting', 'draft', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_periods_provider ON provider_shift_periods(provider_id, period_start);

-- スタッフからの希望提出。1日につきwork（出勤したい）かoff（休みたい）のどちらか、
-- または両方とも未提出（=希望なし、店舗の裁量に委ねる）。常に両方の方式を
-- 自由に入力できるようにする（でお指示2026-09-13：店舗ごとに一方に絞らない）。
CREATE TABLE IF NOT EXISTS provider_shift_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES provider_shift_periods(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('work', 'off')),
  start_time TEXT,
  end_time TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_id, staff_id, date, type)
);
CREATE INDEX IF NOT EXISTS idx_shift_requests_period ON provider_shift_requests(period_id, staff_id);

-- 店長・副店長等が裏側で付けられる優先度ポイント（自動作成時、必要人数に対して
-- 希望者が多い枠の調整に使う。高いほど希望が通りやすい）
CREATE TABLE IF NOT EXISTS provider_shift_priorities (
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  priority_score INT NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, staff_id)
);

-- 自動作成 or 手動編集された確定シフトの1コマ
CREATE TABLE IF NOT EXISTS provider_shift_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES provider_shift_periods(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('auto', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_entries_period ON provider_shift_entries(period_id, date);
