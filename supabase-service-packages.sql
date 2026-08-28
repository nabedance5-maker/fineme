-- ✅ 本番適用済 2026-08-29
-- 回数券・パッケージの記録機能（決済はFinemeが仲介しない・記録のみ）
-- 店舗が自分で徴収し、Fineme上では「何回分買った・何回消化した」を店舗・顧客双方が確認できる。
-- app/api/provider/packages, app/api/provider/customer-packages,
-- app/api/provider/customer-packages/[id]/usages, app/api/me/packages が使用する。
-- アクセスは全てサービスロール経由のAPIルートで行うためRLSはservice role以外を拒否する。

CREATE TABLE IF NOT EXISTS service_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  total_sessions  INTEGER NOT NULL CHECK (total_sessions > 0),
  price           INTEGER,           -- 参考価格（Fineme決済はしない・表示用）
  validity_days   INTEGER,           -- 有効期限（日数）。NULLは無期限
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_packages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  package_id      UUID REFERENCES service_packages(id) ON DELETE SET NULL,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_name    TEXT NOT NULL,     -- 購入時点の名称スナップショット（定義を後で変えても記録は残る）
  total_sessions  INTEGER NOT NULL CHECK (total_sessions > 0),
  purchased_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS package_usages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id   UUID NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  used_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  undone_at             TIMESTAMPTZ,   -- 店舗の誤操作を戻すための取り消し
  reservation_id        UUID REFERENCES reservations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS service_packages_provider_id_idx ON service_packages(provider_id);
CREATE INDEX IF NOT EXISTS customer_packages_provider_id_idx ON customer_packages(provider_id);
CREATE INDEX IF NOT EXISTS customer_packages_user_id_idx ON customer_packages(user_id);
CREATE INDEX IF NOT EXISTS package_usages_customer_package_id_idx ON package_usages(customer_package_id);

ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_usages ENABLE ROW LEVEL SECURITY;
-- ポリシーは意図的に作成しない：全アクセスはサービスロール（RLSをバイパス）経由の
-- APIルートで権限チェックを行うため、anon/authenticatedからの直接アクセスは常に拒否する。
