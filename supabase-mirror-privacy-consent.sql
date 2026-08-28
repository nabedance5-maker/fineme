-- ✅ 本番適用済 2026-08-29
-- Mirror利用前の同意記録: プライバシーポリシー同意（顔写真の第三者送信・保存に関する
-- 明示的な意思表示）を、ログインユーザーについてはサーバー側にも残す。
-- app/api/me/profile が読み書きに使用。ゲストはlocalStorageのみで足りる
-- （分析セッション自体がuser_id無しで完結するため）。
--
-- 手動アクションアイテム: 本SQLを本番Supabaseで実行後、このファイル先頭に
-- `-- ✅ 本番適用済 YYYY-MM-DD` を追記してコミット

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mirror_privacy_consent_at TIMESTAMPTZ DEFAULT NULL;
