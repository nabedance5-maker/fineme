-- ✅ 本番適用済 2026-10-15
-- セキュリティ修正（2026-10-15）：ブラウザに埋め込まれた公開キー（anon）やログインユーザーのトークン
-- （authenticated）で、PostgREST から public スキーマのテーブルを直接読み書きできていた問題を塞ぐ。
--
-- 確認した実害の可能性：
--  - providers：公開中の店舗の全カラム（ログイン用メール・Stripe ID・LINE ID・管理画面設定など）を誰でも取得できた
--  - reservations：「誰でも更新可能」「誰でも作成可能」のポリシーがあり、任意の予約のステータス等を書き換えられた
--  - agent_memory / stories / provider_cases など：内部メモや user_id を誰でも取得できた
--  - get_provider_by_slug（全カラムを返すRPC）を anon が直接呼べた
-- アプリはサーバー側で service_role を使って読み書きしており、ブラウザからテーブルを直接使う箇所は
-- 記事作成ツール（public/business/*-gen.html）の features だけ。features は対象外にして従来どおり。
-- auth.users 等の auth スキーマ・Storage（storage スキーマ）は対象外。

-- 1) 危険なポリシーを削除
DROP POLICY IF EXISTS "予約ステータスを誰でも更新可能" ON reservations;
DROP POLICY IF EXISTS "予約リクエストは誰でも作成可能" ON reservations;
DROP POLICY IF EXISTS "anyone can create reservation" ON reservations;

-- 2) features 以外の全テーブル・ビュー・シーケンスから anon / authenticated の権限を外す
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f') AND c.relname <> 'features'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', r.relname);
  END LOOP;
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S'
  LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM anon, authenticated', r.relname);
  END LOOP;
END $$;

-- 3) アプリが service_role から呼ぶ関数・内部用の関数を、anon / authenticated から呼べないようにする
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname IN ('get_provider_by_slug', 'increment_referral_credit', 'add_x_usage', 'assign_provider_number', 'handle_new_user', 'rls_auto_enable', 'increment_provider_page_view')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 4) 今後作るテーブル・シーケンス・関数にも anon / authenticated の権限が自動で付かないようにする
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
