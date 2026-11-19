-- ✅ 本番適用済 2026-11-19
-- 営業用のデモ店舗（demo-store）でも ENCOMPASS を試せるようにする（2026-11-19）。encompass_stores に1行足すだけ
INSERT INTO encompass_stores (provider_id, status, note)
SELECT id, 'trial', '営業用のデモ店舗' FROM providers WHERE slug = 'demo-store'
ON CONFLICT (provider_id) DO NOTHING;
