-- ✅ 本番適用済 2026-10-22
-- 部屋・設備を「予約で使うか」と「お店のページで紹介するか」で分ける（でお要望 2026-10-22）。
-- 部屋／設備・マシン／その他 の種類は保存しているだけでどこにも使っていなかったため、画面からなくす（列は残す）。
-- 予約で使うかどうかは既存の active（false＝予約カレンダー・空き計算・メニューの部屋選びに出さない）。
ALTER TABLE public.provider_resources ADD COLUMN IF NOT EXISTS show_on_page BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.provider_resources ADD COLUMN IF NOT EXISTS description TEXT;
