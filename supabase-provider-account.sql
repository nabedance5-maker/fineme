-- ✅ 本番適用済 2026-10-22
-- 掲載者管理画面のログイン情報と通知先（でお要望 2026-10-22）
-- 1) 通知を受け取るメールアドレスを複数登録できる（空ならログイン用のメールに送る）
ALTER TABLE providers ADD COLUMN IF NOT EXISTS notify_emails TEXT[] NOT NULL DEFAULT '{}';

-- 2) ログイン用メールアドレスの変更：Supabase の確認メールで変更が確定したら、
--    店舗（providers.email で本人を探している）とスタッフのログイン（provider_members.email）を新しいアドレスに合わせる
CREATE OR REPLACE FUNCTION sync_login_email_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email AND OLD.email IS NOT NULL AND NEW.email IS NOT NULL THEN
    UPDATE public.providers SET email = NEW.email WHERE lower(email) = lower(OLD.email);
    UPDATE public.provider_members SET email = NEW.email WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed AFTER UPDATE OF email ON auth.users FOR EACH ROW EXECUTE FUNCTION sync_login_email_change();
