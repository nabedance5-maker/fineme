-- ============================================================
-- RLS セキュリティ修正
-- Supabase からの「Table publicly accessible」警告への対応
--
-- 対象テーブル:
--   - provider_page_views (RLS未設定)
--   - video_schedule (RLS明示的に無効化)
--
-- 方針:
--   両テーブルともAPIルート（service_role）からのみ操作する。
--   service_role は RLS をバイパスするため、RLSを有効化しても
--   既存のAPIは影響を受けない。
--   ポリシーは追加しない → anon/authenticated ユーザーはアクセス不可。
-- ============================================================

-- provider_page_views: 掲載者閲覧数（アノンキーからの参照を遮断）
ALTER TABLE public.provider_page_views ENABLE ROW LEVEL SECURITY;

-- video_schedule: 動画スケジュール管理（アノンキーからの参照を遮断）
ALTER TABLE public.video_schedule ENABLE ROW LEVEL SECURITY;
