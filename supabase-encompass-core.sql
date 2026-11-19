-- ✅ 本番適用済 2026-11-19
-- ENCOMPASS メニューボード（Fineme の店舗SaaSとは別の商品）の表（2026-11-19）
-- 決まり：既存の表には手を入れない。お店（providers）とお客様は読むだけで使い、ENCOMPASS の情報はここの表だけに置く。
-- どの表も RLS を有効にしてポリシーを付けない（ブラウザから直接は読めない。サーバーの API だけが読み書きする）。

-- お店ごとの ENCOMPASS の契約（SaaS の providers.plan とは別に持つ）
CREATE TABLE IF NOT EXISTS encompass_stores (
  provider_id UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'paused')),
  note        TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE encompass_stores ENABLE ROW LEVEL SECURITY;

-- お店のメニュー。customer_ref があればそのお客様用（'u:<user_id>' または 'm:<手入力のお客様id>'）
CREATE TABLE IF NOT EXISTS encompass_menus (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT '',
  items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  on_board     BOOLEAN NOT NULL DEFAULT FALSE,
  customer_ref TEXT CHECK (customer_ref IS NULL OR customer_ref ~ '^[um]:[0-9a-f-]{36}$'),
  created_by   UUID,
  updated_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_encompass_menus_provider ON encompass_menus(provider_id, updated_at DESC);
ALTER TABLE encompass_menus ENABLE ROW LEVEL SECURITY;

-- ジムに置くタブレット用の鍵（ログインなしでお店の「タブレットに出す」メニューだけを見せる）。鍵そのものは持たず、ハッシュだけ持つ
CREATE TABLE IF NOT EXISTS encompass_boards (
  provider_id UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE encompass_boards ENABLE ROW LEVEL SECURITY;

-- やった記録（そのお客様の前回の内容を、次のメニュー作りに使う）
CREATE TABLE IF NOT EXISTS encompass_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  menu_id      UUID REFERENCES encompass_menus(id) ON DELETE SET NULL,
  customer_ref TEXT CHECK (customer_ref IS NULL OR customer_ref ~ '^[um]:[0-9a-f-]{36}$'),
  title        TEXT NOT NULL DEFAULT '',
  items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  memo         TEXT,
  recorded_by  UUID,
  done_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_encompass_logs_customer ON encompass_logs(provider_id, customer_ref, done_at DESC);
ALTER TABLE encompass_logs ENABLE ROW LEVEL SECURITY;

-- ブラウザ用の鍵（anon / authenticated）からは一切触れないようにする
REVOKE ALL ON encompass_stores, encompass_menus, encompass_boards, encompass_logs FROM anon, authenticated;

-- 最初の導入：今野くんのお店「50才からのストレッチ&トレーニング」（試用・料金なし）
INSERT INTO encompass_stores (provider_id, status, note)
VALUES ('3c6a4cce-88f2-4604-8514-336af4e562d2', 'trial', '最初の導入（今野くん）。料金なしの試用')
ON CONFLICT (provider_id) DO NOTHING;
