-- ✅ 本番適用済 2026-08-01
-- New Me Log：「通う（visit）」だけでなく「買う（purchase）」も記録できるようにする。
--
-- 背景：スキンケア用品・ヘアケア用品・プロテインなどの購入も「美容代」に含めて
-- 管理できないと、「月の美容代いくら？」という訴求と実態が一致しない（でお構想 2026-08-01）。
-- 軸（axis）は増やさず既存の8軸をそのまま使い、記録ごとに種別タグだけを持たせる。
--
-- 未適用でも動く後方互換をコード側に入れてある（種別が無効ならデフォルト扱いになるだけ）。

ALTER TABLE user_service_logs
  ADD COLUMN IF NOT EXISTS entry_type TEXT NOT NULL DEFAULT 'visit'
  CHECK (entry_type IN ('visit', 'purchase'));
