-- ✅ 本番適用済 2026-09-14
-- 店舗→会員のセグメント一斉メール配信の送信履歴（でお要望2026-09-14）
-- hacomonoの「メンバータイプ毎の一斉メール配信」相当機能。監査・重複防止用の履歴のみ保持し、
-- 個々の送信先メールアドレスは保存しない（宛先はauth.usersから都度解決するため）。
create table if not exists provider_email_broadcasts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  subject text not null,
  body_text text not null,
  recipient_count int not null default 0,
  skipped_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_email_broadcasts_provider on provider_email_broadcasts(provider_id, created_at desc);

alter table provider_email_broadcasts enable row level security;
-- service_role専用（providers.customer_notes等の既存テーブルと同じ方針：公開readポリシーは作らない）
