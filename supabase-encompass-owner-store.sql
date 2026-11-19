-- ✅ 本番適用済 2026-11-19
-- 渡邉のお店（第一印象コンサル F.N.M.）でも ENCOMPASS を使えるようにする（2026-11-19・売る側の確認用）。encompass_stores に1行足すだけ
INSERT INTO encompass_stores (provider_id, status, note)
VALUES ('564cd22b-1a8d-4ed3-99fa-187a4e1738c6', 'trial', '渡邉のお店（運営・確認用）')
ON CONFLICT (provider_id) DO NOTHING;
