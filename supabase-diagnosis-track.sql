-- ✅ 本番適用済 2026-07-26
-- diagnosis_results を「1ユーザー1行」から「1ユーザー×トラックごとに1行」へ。
--
-- 問題：/api/me/diagnosis が .single() ＋ upsert(onConflict:'user_id') だったため、
-- 男性版 Me Scan を受けたあとに Belle 版を受けると前のデータが上書きされていた。
-- app/mypage/navi/page.js には「gender が一致しなければ採用しない」という
-- クライアント側の対症療法が入っていたが、根本はトラックの概念がDBに無かったこと。
--
-- 未適用でも /api/me/diagnosis は従来通り動く（後方互換フォールバックあり）。

ALTER TABLE public.diagnosis_results
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'fineme'
  CHECK (track IN ('fineme', 'belle'));

-- 既存行の振り分け（raw_data.gender='female' は Belle の Me Scan）
UPDATE public.diagnosis_results
SET track = 'belle'
WHERE raw_data->>'gender' = 'female' AND track = 'fineme';

-- 既存の user_id 単独ユニーク制約があれば外す（無ければ何も起きない）
ALTER TABLE public.diagnosis_results
  DROP CONSTRAINT IF EXISTS diagnosis_results_user_id_key;

-- トラックごとに1行を保証（upsert の onConflict: 'user_id,track' が使えるようになる）
CREATE UNIQUE INDEX IF NOT EXISTS diagnosis_results_user_track_uniq
  ON public.diagnosis_results (user_id, track);
