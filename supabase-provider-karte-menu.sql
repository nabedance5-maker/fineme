-- ✅ 本番適用済 2026-09-04
-- 来店記録（provider_karte_entries）に利用メニューを追加。カルテ拡張フェーズD。
-- でお要望：来店時のメニューを紐づけたい。ただしreservations.service_idと
-- provider_experience_menus.idはシステム的に綺麗に結びついていない（別々に発展した
-- レガシー構造）ため自動検出はできず、記録追加時に店舗が自店のメニュー一覧
-- （provider_experience_menus）から選ぶ方式にする。
-- メニュー名はIDではなく文字列でスナップショットする（メニューが後から改名・削除
-- されても、過去の記録の表示が壊れない・ID結合が不要なため）。

ALTER TABLE provider_karte_entries ADD COLUMN IF NOT EXISTS menu_name TEXT;
