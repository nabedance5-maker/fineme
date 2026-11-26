-- ✅ 本番適用済 2026-11-26
-- 初期設定ガイド（2026-11-26 渡邉要望）：店舗管理画面の初期設定の「あとでやる」と「ガイドを閉じた」を店舗ごとに残す。
-- 終わったかどうかは実データ（メニュー・営業時間・顧客など）から毎回判定するので、ここには持たない。
-- provider_onboarding は service role だけが読み書きする表（RLS有効・anon/authenticated の権限なし）のまま。
alter table public.provider_onboarding add column if not exists setup_skipped text[] not null default '{}';
alter table public.provider_onboarding add column if not exists setup_hidden_at timestamptz;
