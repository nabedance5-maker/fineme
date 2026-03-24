-- 掲載相談フォームの問い合わせを保存するテーブル
create table if not exists provider_inquiries (
  id uuid primary key default gen_random_uuid(),
  biz_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  category text,
  contact_pref text default 'email',
  message text,
  created_at timestamptz default now()
);

-- service role からのみ INSERT 可能（RLS は無効にしてserviceロールで管理）
alter table provider_inquiries enable row level security;

-- 管理者（service role）のみ閲覧・操作可能
-- 一般ユーザー・掲載者からは読み書き不可
-- 書き込みはAPIルート（service role）経由で行う
