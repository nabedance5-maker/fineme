-- ✅ 本番適用済 2026-09-14
-- スクール業態特化：定員制クラスの名簿管理＋進級管理（でお要望2026-09-14：
-- hacomono機能比較で判明した不足機能。「在籍制・定員制クラスの管理や進級結果の管理」
-- 相当機能）。既存の予約カレンダー（reservations）とは独立した、ダンス・スイミング・
-- 空手等のスクール業態向け名簿・進級記録に特化した軽量な機能として実装する。

-- クラス（コース）定義
create table if not exists provider_classes (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  description text,
  capacity int,
  -- 進級ラベルの並び（例：["白帯","黄帯","緑帯","黒帯"]）。空なら進級管理を使わないクラス。
  level_labels jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_classes_provider on provider_classes(provider_id, sort_order);

-- 在籍（会員 or 非会員の生徒）
create table if not exists provider_class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references provider_classes(id) on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid, -- Fineme会員なら紐付け、非会員はnullのままstudent_nameのみで管理
  student_name text not null,
  current_level text,
  status text not null default 'active' check (status in ('active', 'waitlisted', 'withdrawn')),
  enrolled_at timestamptz not null default now()
);
create index if not exists idx_provider_class_enrollments_class on provider_class_enrollments(class_id, status);

-- 進級履歴（いつ・誰が・何から何になったか）
create table if not exists provider_class_progressions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references provider_class_enrollments(id) on delete cascade,
  from_level text,
  to_level text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_class_progressions_enrollment on provider_class_progressions(enrollment_id, created_at desc);

alter table provider_classes enable row level security;
alter table provider_class_enrollments enable row level security;
alter table provider_class_progressions enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）
