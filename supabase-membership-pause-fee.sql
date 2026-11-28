-- ✅ 本番適用済 2026-11-28
-- 休会費（休会中の月額）（2026-11-28 渡邉要望「月額会員の休会プランを作れるように。0円プランなど」）
-- これまでの休会は「休会中の月会費を請求しない（Stripeの請求を取り消す）」だけだった。
-- お店ごとに休会費（月額）を決められるようにする。0円なら今までどおり請求なし。
-- 1円以上なら、休会中はプランの明細を休会費に差し替えて毎月請求し、再開でプランの金額に戻す。
alter table provider_membership_settings add column if not exists pause_fee integer not null default 0
  check (pause_fee >= 0 and pause_fee <= 1000000);                       -- 休会費の既定（月額・円）。0＝無料
alter table provider_membership_settings add column if not exists pause_stripe_product_id text; -- Stripeの「休会費」の商品（使い回す）

alter table provider_memberships add column if not exists pause_fee integer
  check (pause_fee is null or (pause_fee > 0 and pause_fee <= 1000000)); -- 休会中に請求している休会費。null＝無料の休会（請求を取り消す方式）
alter table provider_memberships add column if not exists pause_item_id text;         -- 休会費に差し替えたStripeの明細（再開で戻す。戻し済みなら null）
alter table provider_memberships add column if not exists pause_return_price_id text; -- 再開で戻すStripeの価格（休会前のプランの価格）
