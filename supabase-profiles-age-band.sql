-- ✅ 本番適用済 2026-08-05
--
-- ユーザーの年代を1箇所で持つためのカラム。
--
-- 背景：同じ男女トラックでも10代と30代では肌ケア・体づくりへのアプローチが
-- 異なるべきなのに、これまで年代を扱う仕組みがどこにも無かった（でお指摘 2026-08-01）。
-- Me Scan・Mirror開始時に必須で聞き、Me Scanの理想スコア初期値・Mirror分析プロンプト・
-- New Me Mapのステップ生成プロンプトの3箇所で使う（lib/attributes.js が単一の真実）。
--
-- 5区分（10代/20代/30代/40代/50代以上）。10代を含むのは app/privacy/page.js に
-- 既に未成年利用の同意条項があるため。スキップ選択肢は無い（でお「必ず」の指示）。
--
-- 未適用でも /api/me/attributes はエラーを返さず、クライアントは localStorage の
-- 'fineme:attributes' で体験が成立する（適用すると端末をまたいで引き継がれる）。

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS age_band TEXT
  CHECK (age_band IN ('10s', '20s', '30s', '40s', '50s_plus'));
