-- ✅ 本番適用済 2026-11-26
-- 予約カレンダーで、予約ごとに店舗が選んだ色（2026-11-26 渡邉要望「予約の詳細のポップアップの中で色を選べればいい」）
-- 色は画面の style 属性に入るため、#rrggbb（小文字）以外は入れられないようにする。null＝いつもの色
alter table reservations add column if not exists calendar_color text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reservations_calendar_color_hex') then
    alter table reservations add constraint reservations_calendar_color_hex check (calendar_color is null or calendar_color ~ '^#[0-9a-f]{6}$');
  end if;
end $$;
