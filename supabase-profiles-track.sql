-- ✅ 本番適用済 2026-07-26
-- ユーザー単位のトラック（男性=fineme / 女性=belle）を1箇所で持つためのカラム。
--
-- 背景：これまでトラックは mirror_sessions.gender（セッション単位）と
-- diagnosis_results.raw_data.gender（診断単位）に散っていて、
-- 「このユーザーはどちらの体験を受け取るべきか」という真実がどこにも無かった。
-- そのため /mypage/* は男性向けリンク・男性向け記事を固定で出していた。
--
-- 確定タイミング：初回の Me Scan / Mirror で自動確定（一度入ったら上書きしない）。
-- 変更手段：/mypage/profile の「表示中のトラック」からのみ。
--
-- 未適用でも /api/me/track はエラーを返さず、クライアントは localStorage の
-- 'fineme:track' で体験が成立する（適用すると端末をまたいで引き継がれる）。

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS track TEXT CHECK (track IN ('fineme', 'belle'));

-- 既存ユーザーの推定：女性版 Me Scan を受けたことがある人を belle に寄せる
UPDATE public.profiles p
SET track = 'belle'
WHERE p.track IS NULL
  AND EXISTS (
    SELECT 1 FROM public.diagnosis_results d
    WHERE d.user_id = p.id AND d.raw_data->>'gender' = 'female'
  );
