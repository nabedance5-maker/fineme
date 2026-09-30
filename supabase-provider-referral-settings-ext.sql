-- ✅ 本番適用済 2026-09-30
-- 友達紹介プログラムの表示内容を店舗が自由に編集できるように（でお要望2026-09-30：
-- 「ここに書く内容も編集できるようにして、特典も設定できるようにしてほしい。
-- 画像を入れられたりボタンをつけたりも自由に編集できるようにしてほしい」）。
-- reward_text（特典文言）は既存。今回は紹介文言本文・バナー画像・任意ボタンを追加する。
alter table provider_referral_settings
  add column if not exists message_text text,
  add column if not exists image_url text,
  add column if not exists button_label text,
  add column if not exists button_url text;
