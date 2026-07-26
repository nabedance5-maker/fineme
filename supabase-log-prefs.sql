-- ⏳ 未適用（Supabase SQL Editor で実行してください）
-- New Me Log の通知設定（声のテイスト・頻度）をユーザー単位で持つ。
--
-- 背景：通知は「うるさい」と感じられた時点でブロックされ、そこで全部終わる。
-- 既定はこちらの推奨（normal）にしつつ、本人が弱められる逃げ道を必ず用意する
-- （でお指摘 2026-07-26）。
--
-- log_voice はマイページで選ぶ通知の声。未設定ならトラックごとの既定
-- （男性=crew / Belle=navigator）が使われる。
--
-- 未適用でもコード側は既定値で動く（設定が保存されないだけ）。

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS log_voice TEXT
  CHECK (log_voice IN ('crew', 'navigator', 'plain'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS log_notify_level TEXT
  CHECK (log_notify_level IN ('often', 'normal', 'few', 'off'));
