-- ✅ 本番適用済 2026-09-18
-- 入会手続きで選ばれたロッカーが、既存のロッカー契約台帳（provider_locker_contracts）
-- に一切反映されていなかった不具合を修正（でお質問2026-09-18：「ロッカーを契約したら
-- ちゃんと顧客情報に紐づいて表示されるようになってる？」。調査の結果、入会フローの
-- ロッカー選択は provider_memberships.locker_id に記録されるだけで、ロッカー管理タブの
-- 契約一覧にも顧客情報ポップアップにも一切出てこない状態だった。さらに、空きロッカー
-- 判定もprovider_locker_contractsだけを見ているため、同じロッカーが二重契約される
-- 実害リスクもあった）。承認時にprovider_locker_contractsへ実際の契約行を作成し、
-- 台帳を一本化する。
ALTER TABLE public.provider_locker_contracts ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.provider_memberships(id) ON DELETE SET NULL;
