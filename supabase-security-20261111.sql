-- ✅ 本番適用済 2026-11-11
-- セキュリティ点検（2026-11-11）：agent_memory（MyBrain の Memory.md＝オーナーの個人情報）が
-- 公開キー（anon）で誰でも読めるポリシー anon_read になっていた。
-- 読み書きはサーバー（service role、RLS を通らない）だけなので、公開の読み取りポリシーを外す。
drop policy if exists anon_read on public.agent_memory;
alter table public.agent_memory enable row level security;

-- features（記事）：公開キー（anon / authenticated）に書き込み・TRUNCATE 等の権限まで付いていた。
-- 書き込みポリシーが無いので RLS で止まってはいたが、TRUNCATE は RLS を通らないため、読み取り以外の権限を外す。
-- 記事の作成・更新は service role（管理画面の API・cron）だけが行う。
revoke insert, update, delete, truncate, references, trigger on public.features from anon, authenticated;
