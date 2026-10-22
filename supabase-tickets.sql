-- ✅ 本番適用済 2026-10-22
-- チケット（でお要望 2026-10-22）。hacomono と同じく「チケットを消費して予約する」形にする。
-- ・チケットの種類（provider_tickets）をお店が作る（例：ストレッチチケット）
-- ・メニューごとに「使えるチケット」と「1回の予約で使う枚数」を決める（provider_services.ticket_ids / ticket_cost）
-- ・回数券（service_packages）は「チケットが付く商品」にする（ticket_id）
-- ・持っているチケット＝customer_packages（回数券の購入・月額プランの付与・お店からの付与のどれでも同じ行）
-- ・メニューに「会員には表示しない」（体験など）
-- ・お店の会員（provider_members）：会員登録（無料）とプラン契約は別

CREATE TABLE IF NOT EXISTS provider_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_tickets ENABLE ROW LEVEL SECURITY;

ALTER TABLE provider_services
  ADD COLUMN IF NOT EXISTS ticket_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ticket_cost INT NOT NULL DEFAULT 1 CHECK (ticket_cost BETWEEN 1 AND 20),
  ADD COLUMN IF NOT EXISTS hide_for_members BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE service_packages ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES provider_tickets(id) ON DELETE SET NULL;

ALTER TABLE customer_packages
  ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES provider_tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT,           -- 'package'（回数券）/'plan'（月額プランの付与）/'manual'（お店からの付与）
  ADD COLUMN IF NOT EXISTS membership_id UUID;

-- 1回の予約で使うチケットの枚数（予約中の分の差し引き・来店時の消費に使う）
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS ticket_cost INT NOT NULL DEFAULT 1;

-- ↓ provider_members は既存（スタッフ用）だったためこの CREATE は何もしていない。会員は supabase-store-members.sql の provider_store_members
CREATE TABLE IF NOT EXISTS provider_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'withdrawn')),
  registered_by TEXT NOT NULL DEFAULT 'online' CHECK (registered_by IN ('online', 'store')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider_id, user_id)
);
ALTER TABLE provider_members ENABLE ROW LEVEL SECURITY;

-- 既存の回数券を、同じ名前のチケットに移す（本番は2件のみ）
DO $$
DECLARE r RECORD; tid UUID;
BEGIN
  FOR r IN SELECT * FROM service_packages WHERE ticket_id IS NULL LOOP
    INSERT INTO provider_tickets (provider_id, name) VALUES (r.provider_id, r.name) RETURNING id INTO tid;
    UPDATE service_packages SET ticket_id = tid WHERE id = r.id;
    UPDATE customer_packages SET ticket_id = tid, source = COALESCE(source, 'package') WHERE package_id = r.id;
  END LOOP;
END $$;

-- 「回数券の方だけ」だったメニューは、その店のチケットで予約できるメニューにする
UPDATE provider_services s
   SET ticket_ids = COALESCE((SELECT ARRAY_AGG(p.ticket_id) FROM service_packages p
                               WHERE p.provider_id = s.provider_id AND p.ticket_id IS NOT NULL
                                 AND (COALESCE(array_length(s.eligible_package_ids, 1), 0) = 0 OR p.id = ANY (s.eligible_package_ids))), '{}')
 WHERE s.booking_scope = 'limited' AND s.allow_ticket;

-- 月額プランの付与は、回数券ではなくチケットを付ける
UPDATE provider_membership_plans pl
   SET ticket_grants = COALESCE((SELECT jsonb_agg(jsonb_build_object('ticket_id', sp.ticket_id, 'sessions', g->'sessions', 'timing', g->'timing', 'valid_days', g->'valid_days'))
                                   FROM jsonb_array_elements(pl.ticket_grants) g JOIN service_packages sp ON sp.id::text = g->>'package_id'), '[]'::jsonb)
 WHERE jsonb_array_length(pl.ticket_grants) > 0;

ALTER TABLE provider_membership_ticket_grants ADD COLUMN IF NOT EXISTS ticket_id UUID;
ALTER TABLE provider_membership_ticket_grants ALTER COLUMN package_id DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS provider_membership_ticket_grants_ticket_uq ON provider_membership_ticket_grants (membership_id, ticket_id, period);

COMMENT ON COLUMN provider_services.allow_ticket IS '2026-10-22 廃止：ticket_ids（使えるチケット）に置き換え';
COMMENT ON COLUMN provider_services.eligible_package_ids IS '2026-10-22 廃止：ticket_ids に置き換え';
COMMENT ON COLUMN provider_services.allow_membership IS '2026-10-22 廃止：会員プランはチケットを付与する形に統一';
COMMENT ON COLUMN provider_services.eligible_plan_ids IS '2026-10-22 廃止：会員プランはチケットを付与する形に統一';
COMMENT ON COLUMN provider_services.booking_scope IS '2026-10-22 廃止：ticket_ids が空なら誰でも、あればチケットが必要';
COMMENT ON COLUMN provider_membership_plans.monthly_booking_limit IS '2026-10-22 廃止：毎月付与するチケットの枚数で回数を決める';
COMMENT ON COLUMN reservations.membership_plan_id IS '2026-10-22 廃止：予約はチケットで紐づける';
