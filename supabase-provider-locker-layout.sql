-- ✅ 本番適用済 2026-10-03
-- ロッカー配置図（でお要望2026-10-02：hacomonoのように、店舗ごとにロッカー全体の図を
-- 段数・横の数・大きさで設定し、どこが空き/契約中/使用不可かを図で見られるようにする）。
-- 1店舗に複数の「ロッカー群」（男子更衣室・女子更衣室・外ロッカー等）を作れる。
-- 各ロッカー（provider_lockers）はロッカー群の中のマス目に置かれ、row_span/col_span で
-- 大きさ・縦長/横長を表す。ロッカーが置かれていないマスは「空きスペース」（形の凹凸表現）。
-- 使用不可は既存の active=false をそのまま使う（入会ページは active=true だけ出すため整合する）。

create table if not exists provider_locker_banks (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  grid_rows int not null default 1 check (grid_rows between 1 and 60),
  grid_cols int not null default 1 check (grid_cols between 1 and 60),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_locker_banks_provider on provider_locker_banks(provider_id, sort_order);
alter table provider_locker_banks enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）

alter table provider_lockers add column if not exists bank_id uuid references provider_locker_banks(id) on delete cascade;
alter table provider_lockers add column if not exists grid_row int;
alter table provider_lockers add column if not exists grid_col int;
alter table provider_lockers add column if not exists row_span int not null default 1 check (row_span between 1 and 60);
alter table provider_lockers add column if not exists col_span int not null default 1 check (col_span between 1 and 60);
create index if not exists idx_provider_lockers_bank on provider_lockers(bank_id);
create unique index if not exists provider_lockers_bank_cell_uq on provider_lockers(bank_id, grid_row, grid_col);

-- 既存ロッカー（配置の概念が無かったもの）を、店舗ごとに「ロッカー」群へ並べて移行する。
-- 横は最大6列、並び順は従来の sort_order・登録順。何度流しても未配置のものだけが対象。
do $$
declare
  p record;
  b_id uuid;
  n int;
  cols int;
begin
  for p in select distinct provider_id from provider_lockers where bank_id is null loop
    select count(*) into n from provider_lockers where provider_id = p.provider_id and bank_id is null;
    cols := least(n, 6);
    insert into provider_locker_banks (provider_id, name, grid_rows, grid_cols)
      values (p.provider_id, 'ロッカー', ceil(n::numeric / cols)::int, cols)
      returning id into b_id;
    update provider_lockers l set
      bank_id = b_id,
      grid_row = (t.rn - 1) / cols + 1,
      grid_col = (t.rn - 1) % cols + 1
    from (
      select id, row_number() over (order by sort_order, created_at, id) as rn
      from provider_lockers where provider_id = p.provider_id and bank_id is null
    ) t
    where l.id = t.id;
  end loop;
end $$;
