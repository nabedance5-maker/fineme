-- ✅ 本番適用済 2026-11-14
-- 営業用のデモアカウント（2026-11-14 渡邉要望：営業パートナーや営業先の人が同じアカウントに入って、
-- 実際に機能を使えるデモ。セキュリティの問題がないもの）。
-- - providers.is_demo：デモ店舗の印。公開ページ・一覧には出さない（published=false・admin_hidden=true で運用）
-- - demo_invites：入口の招待コード（コードそのものは保存せず sha256 のみ）。営業パートナーごとに発行・停止できる
-- - demo_logins：入室の記録（IPはハッシュのみ）。入口の回数制限にも使う
-- - demo_ai_hits：デモ全体でAIを呼べる回数（1時間ごと）
-- - トリガー：デモ店舗の行に、実在の人へ届く宛先（メール・LINE・通知先）が入らないよう、DBの段階で必ず消す
--   （APIの入口で止め忘れても、PostgREST を直接叩かれても、本物の人には届かない）
-- - demo_wipe()：デモ店舗のデータを全部消す（毎晩の作り直しで、シードを入れ直す前に呼ぶ）

alter table providers add column if not exists is_demo boolean not null default false;

create table if not exists demo_invites (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null,
  label text not null,
  active boolean not null default true,
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table demo_invites enable row level security;
revoke all on demo_invites from anon, authenticated;

create table if not exists demo_logins (
  id bigserial primary key,
  invite_id uuid references demo_invites(id) on delete set null,
  ip_hash text,
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists demo_logins_ip_time on demo_logins (ip_hash, created_at desc);
alter table demo_logins enable row level security;
revoke all on demo_logins from anon, authenticated;

create table if not exists demo_ai_hits (
  hour_key text primary key,
  hits integer not null default 0
);
alter table demo_ai_hits enable row level security;
revoke all on demo_ai_hits from anon, authenticated;

-- この1時間のAIの呼び出しを1つ数え、数えた後の回数を返す（middleware から service role で呼ぶ）
create or replace function demo_ai_hit() returns integer
language plpgsql security definer set search_path = public as $$
declare k text := to_char(now() at time zone 'Asia/Tokyo', 'YYYY-MM-DD"T"HH24'); n integer;
begin
  insert into demo_ai_hits (hour_key, hits) values (k, 1)
  on conflict (hour_key) do update set hits = demo_ai_hits.hits + 1
  returning hits into n;
  delete from demo_ai_hits where hour_key < to_char((now() - interval '2 days') at time zone 'Asia/Tokyo', 'YYYY-MM-DD"T"HH24');
  return n;
end $$;
revoke all on function demo_ai_hit() from public, anon, authenticated;

create or replace function demo_provider_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from providers where is_demo limit 1
$$;
revoke all on function demo_provider_id() from public, anon, authenticated;

-- ── 宛先を消すトリガー ──
create or replace function demo_scrub_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid := demo_provider_id();
begin
  if pid is null or NEW.provider_id is null or NEW.provider_id::text <> pid::text then return NEW; end if;
  if TG_TABLE_NAME = 'reservations' then
    NEW.user_contact := regexp_replace(coalesce(NEW.user_contact, ''), '[^\s/<>,;]+@[^\s/<>,;]+', 'demo@demo.fineme.me', 'g');
  elsif TG_TABLE_NAME = 'provider_customer_profiles' then
    NEW.email := null;
  elsif TG_TABLE_NAME in ('provider_pos_transactions') then
    NEW.receipt_email := null;
  elsif TG_TABLE_NAME = 'provider_pos_pending_checkouts' then
    NEW.receipt_email := null;
  elsif TG_TABLE_NAME = 'provider_staff' then
    NEW.line_user_id := null;
  elsif TG_TABLE_NAME in ('provider_members', 'provider_line_channels', 'provider_customer_line_links', 'sales_partners') then
    raise exception 'デモでは使えません';
  end if;
  return NEW;
end $$;

do $$
declare t text;
begin
  foreach t in array array['reservations','provider_customer_profiles','provider_pos_transactions','provider_pos_pending_checkouts','provider_staff','provider_members','provider_line_channels','provider_customer_line_links','sales_partners'] loop
    execute format('drop trigger if exists demo_scrub on %I', t);
    execute format('create trigger demo_scrub before insert or update on %I for each row execute function demo_scrub_row()', t);
  end loop;
end $$;

-- デモ店舗の行そのもの：ログインメール・通知先・Stripe・LINE を変えさせない
create or replace function demo_scrub_provider() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not OLD.is_demo then return NEW; end if;
  NEW.is_demo := true;
  NEW.email := OLD.email;
  NEW.notify_emails := '{}';
  NEW.line_user_id := null;
  NEW.stripe_customer_id := null;
  NEW.stripe_subscription_id := null;
  NEW.stripe_connect_id := null;
  NEW.stripe_connect_status := null;
  NEW.plan := 'special';
  NEW.published := false;
  NEW.admin_hidden := true;
  return NEW;
end $$;
drop trigger if exists demo_scrub_provider on providers;
create trigger demo_scrub_provider before update on providers for each row execute function demo_scrub_provider();

-- ── デモ店舗のデータを全部消す ──
-- provider_id を持つ表をすべて消す。外部キーの順番は気にせず、消せなかった表は次の周でもう一度試す。
-- provider_id を持たない子の表（明細・利用履歴など）は、親のIDから先に消す。
create or replace function demo_wipe() returns integer
language plpgsql security definer set search_path = public as $$
declare pid uuid := demo_provider_id(); t text; pass int; left_tables text[]; failed text[]; n int; total int := 0;
begin
  if pid is null then raise exception 'デモ店舗がありません'; end if;
  delete from provider_pos_transaction_items where transaction_id in (select id from provider_pos_transactions where provider_id = pid);
  delete from package_usages where customer_package_id in (select id from customer_packages where provider_id = pid)
    or reservation_id in (select id from reservations where provider_id = pid::text);
  delete from customer_package_grants where customer_package_id in (select id from customer_packages where provider_id = pid);
  delete from provider_notice_reads where notice_id in (select id from provider_notices where provider_id = pid);
  delete from provider_class_progressions where enrollment_id in (select id from provider_class_enrollments where provider_id = pid);
  delete from provider_event_attendances where event_id in (select id from provider_events where provider_id = pid);
  delete from provider_shift_period_day_patterns where period_id in (select id from provider_shift_periods where provider_id = pid);
  delete from provider_shift_submissions where period_id in (select id from provider_shift_periods where provider_id = pid);
  delete from stories where reservation_id in (select id from reservations where provider_id = pid::text);

  select array_agg(c.table_name::text) into left_tables
    from information_schema.columns c join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
   where c.table_schema = 'public' and c.column_name = 'provider_id' and tb.table_type = 'BASE TABLE'
     and c.table_name not in ('providers', 'sales_partners', 'collaborator_rewards');
  for pass in 1..10 loop
    failed := '{}';
    foreach t in array left_tables loop
      begin
        execute format('delete from %I where provider_id::text = $1', t) using pid::text;
        get diagnostics n = row_count; total := total + n;
      exception when foreign_key_violation then failed := failed || t;
      end;
    end loop;
    exit when cardinality(failed) = 0;
    left_tables := failed;
  end loop;
  if cardinality(failed) > 0 then raise exception 'demo_wipe: 消せない表 %', failed; end if;
  return total;
end $$;
revoke all on function demo_wipe() from public, anon, authenticated;

-- デモのお客様（demo.fineme.me のアカウント。毎晩の作り直しでも消さずに使い回す）
create or replace function demo_customer_ids() returns table (id uuid, email text)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text from auth.users u where u.email like '%@demo.fineme.me' and u.email <> 'demo-store@demo.fineme.me' order by u.email
$$;
revoke all on function demo_customer_ids() from public, anon, authenticated;

-- デモ店舗のログインを全部切る（毎晩の作り直しの時。招待コードを止めた人も、翌日には入れなくなる）
create or replace function demo_signout() returns integer
language plpgsql security definer set search_path = public, auth as $$
declare n int;
begin
  delete from auth.sessions where user_id in (select u.id from auth.users u where u.email = 'demo-store@demo.fineme.me');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function demo_signout() from public, anon, authenticated;
