-- ✅ 本番適用済 2026-10-27
-- シフト希望の提出リンクをお店に1本にする（でお要望 2026-10-27）。スタッフはリンクを開いて自分の名前を選び、
-- Finemeのスタッフアカウントでログインするか、お店が決めたパスワード（4〜8桁の数字）で入る。
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS shift_pin_hash TEXT;
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS shift_pin_failures INT NOT NULL DEFAULT 0;
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS shift_pin_locked_until TIMESTAMPTZ;
