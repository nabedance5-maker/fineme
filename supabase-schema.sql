-- ============================================================
-- Fineme — Supabase スキーマ
-- Supabase ダッシュボード > SQL Editor で実行してください
-- ============================================================

-- ① profiles（ユーザー付加情報）
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  bio          TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分のプロフィールのみ参照" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "自分のプロフィールのみ作成" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "自分のプロフィールのみ更新" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ② diagnosis_results（診断結果）
CREATE TABLE public.diagnosis_results (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scores     JSONB,
  result     JSONB,
  raw_data   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)          -- 1ユーザー1件（最新を upsert で上書き）
);
ALTER TABLE public.diagnosis_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の診断結果のみ参照" ON public.diagnosis_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "自分の診断結果のみ作成" ON public.diagnosis_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自分の診断結果のみ更新" ON public.diagnosis_results
  FOR UPDATE USING (auth.uid() = user_id);

-- ③ reservations（予約）
CREATE TABLE public.reservations (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_id   TEXT NOT NULL,
  service_id    TEXT,
  status        TEXT DEFAULT 'pending',  -- pending / confirmed / cancelled
  reserved_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "自分の予約のみ参照" ON public.reservations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "自分の予約のみ作成" ON public.reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自分の予約のみ更新" ON public.reservations
  FOR UPDATE USING (auth.uid() = user_id);

-- ④ サインアップ時に profiles を自動作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
