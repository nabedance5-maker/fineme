-- ✅ 本番適用済 2026-10-19
-- アンケート（でお要望 2026-10-19：hacomono差分 #9）。
-- 店舗が質問を作り、回答ページのリンクをメッセージ配信・QR・LINEで配る。回答はFinemeにログインしていれば
-- お客様に紐づき（顧客情報から見える）、ログインしていなくても名前を書いて答えられる。

create table if not exists provider_surveys (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  title text not null,
  description text,
  questions jsonb not null default '[]'::jsonb,   -- [{id, type: single|multi|text|rating, label, options[], required}]
  status text not null default 'open' check (status in ('open', 'closed')),
  token text not null unique,                      -- 回答ページのURL用（推測されにくい文字列）
  allow_guest boolean not null default true,       -- ログインしていない人も答えられる
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_provider_surveys_p on provider_surveys(provider_id, created_at desc);

create table if not exists provider_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references provider_surveys(id) on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid,
  respondent_name text,
  answers jsonb not null default '{}'::jsonb,      -- {question_id: 値（文字列 / 配列 / 数値）}
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_survey_responses_s on provider_survey_responses(survey_id, created_at desc);
create unique index if not exists uq_provider_survey_responses_user on provider_survey_responses(survey_id, user_id) where user_id is not null;

alter table provider_surveys enable row level security;
alter table provider_survey_responses enable row level security;
-- service_role専用（回答ページもAPI経由）
