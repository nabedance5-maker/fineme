-- ✅ 本番適用済 2026-11-21
-- アカウント作成時に入力してもらう「お住まいの地域」（都道府県・市区町村）をプロフィールへ写す（2026-11-21 渡邉指示）
-- 登録画面は supabase.auth.signUp の options.data に area / city を載せる。メール確認前でも、
-- ユーザー作成の時点でこのトリガーが profiles に入れる。
-- user_metadata は利用者が自由に送れる値なので、長さと文字を絞ってから入れる（API側は lib/user-area.js で同じ確認）。
-- あわせて SECURITY DEFINER 関数の search_path を固定する（別スキーマの同名オブジェクトを使わせない）。

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area text := nullif(btrim(coalesce(new.raw_user_meta_data->>'area', '')), '');
  v_city text := nullif(btrim(regexp_replace(coalesce(new.raw_user_meta_data->>'city', ''), '[[:cntrl:]<>"''`\\]', '', 'g')), '');
begin
  -- 都道府県は「東京」「神奈川」「北海道」の形（2〜4文字）、市区町村は40文字まで。外れたら入れない
  if v_area is not null and (char_length(v_area) not between 2 and 4 or v_area ~ '[^぀-ヿ一-鿿]') then
    v_area := null;
  end if;
  if v_city is not null and char_length(v_city) > 40 then
    v_city := null;
  end if;
  if v_area is null then v_city := null; end if;

  insert into public.profiles (id, display_name, area, city)
  values (new.id, new.raw_user_meta_data->>'display_name', v_area, v_city)
  on conflict (id) do nothing;
  return new;
end;
$$;
