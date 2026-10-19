-- ✅ 本番適用済 2026-10-19
-- 体験メニューの印（でお要望 2026-10-19：hacomono差分 #8 体験→入会の追跡）。
-- 体験メニューの予約を起点に、来店・入会（会員プラン）・回数券購入・2回目の来店までを追う。
alter table provider_services add column if not exists is_trial boolean not null default false;
