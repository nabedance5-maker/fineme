-- ✅ 本番適用済 2026-10-22
-- メニューの決め事を1か所にまとめる（でお要望 2026-10-21：「サービス設定・グループレッスン・体験メニュー・
-- 回数券/会員向けメニューを別々の場所で決めるのは分かりづらい」）。
-- LP設定にあった「体験メニュー」（provider_experience_menus）を、メニュー（provider_services）の「体験」に統合する。
-- 体験メニューが持っていた「対応する悩み（複数）」は provider_services.axes に移す。

ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS axes TEXT[] NOT NULL DEFAULT '{}';

-- 既存の体験メニューを、体験のメニューとして移す（同じ店舗・同じ名前のメニューがあれば、そちらに体験の印と悩みを付ける）
UPDATE provider_services s
   SET is_trial = TRUE,
       axes = (SELECT ARRAY(SELECT DISTINCT unnest(s.axes || e.axes))),
       description = COALESCE(NULLIF(s.description, ''), e.description),
       duration_minutes = COALESCE(s.duration_minutes, e.duration_min),
       image_url = COALESCE(s.image_url, e.images[1])
  FROM provider_experience_menus e
 WHERE e.provider_id = s.provider_id AND e.name = s.name AND e.is_active;

INSERT INTO provider_services (provider_id, name, description, price, duration_minutes, image_url, is_trial, axes, sort_order)
SELECT e.provider_id, e.name, e.description, e.price, e.duration_min, e.images[1], TRUE, COALESCE(e.axes, '{}'), 100 + COALESCE(e.sort_order, 0)
  FROM provider_experience_menus e
 WHERE e.is_active
   AND NOT EXISTS (SELECT 1 FROM provider_services s WHERE s.provider_id = e.provider_id AND s.name = e.name);

COMMENT ON TABLE provider_experience_menus IS '2026-10-22 廃止：provider_services の is_trial・axes に統合済み。どこからも読み書きしない（データは念のため残す）';
