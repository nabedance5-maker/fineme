-- ✅ 本番適用済 2026-10-19
-- メッセージ配信の強化（でお要望 2026-10-19：hacomono差分 #6）。
-- LINE・メール（LINEが無い人はメール）で、今すぐ／日時を指定して配信。宛先ごとに届いたか・開いたか・
-- リンクを押したかを残す。メールには配信停止リンクを付け、停止した人には送らない（特定電子メール法）。
-- 旧 provider_email_broadcasts（メールのみ・件数だけ）は過去の履歴として残す。

create table if not exists provider_broadcasts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  channel text not null check (channel in ('line', 'email', 'line_then_email')),
  subject text,                    -- メールの件名（LINEでは使わない）
  body_text text not null,
  segment_label text,              -- 「LINE連携中・休眠」など、送った時の絞り込みの説明
  user_ids uuid[] not null,
  links jsonb not null default '[]'::jsonb,   -- 本文中のURL（クリック計測の転送先。ここに無いURLへは転送しない）
  status text not null default 'scheduled' check (status in ('scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  sent_at timestamptz,
  created_by text,
  target_count int not null default 0,
  line_sent int not null default 0,
  email_sent int not null default 0,
  skipped int not null default 0,
  failed int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_broadcasts_p on provider_broadcasts(provider_id, created_at desc);
create index if not exists idx_provider_broadcasts_due on provider_broadcasts(status, scheduled_at);

create table if not exists provider_broadcast_recipients (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references provider_broadcasts(id) on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid not null,
  channel text,                    -- 実際に送った手段（line / email）。送れなかった時は null
  status text not null check (status in ('sent', 'skipped', 'failed', 'optout')),
  reason text,                     -- 送れなかった理由（LINE・メールが無い など）
  opened_at timestamptz,           -- メールを開いた（画像が読み込まれた）時刻
  clicked_at timestamptz,          -- 本文のリンクを押した時刻
  created_at timestamptz not null default now(),
  unique (broadcast_id, user_id)
);
create index if not exists idx_provider_broadcast_recipients_b on provider_broadcast_recipients(broadcast_id);

-- お客様が店舗からの配信メールを止めた記録（店舗ごと）
create table if not exists provider_broadcast_optouts (
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (provider_id, user_id)
);

alter table provider_broadcasts enable row level security;
alter table provider_broadcast_recipients enable row level security;
alter table provider_broadcast_optouts enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）
