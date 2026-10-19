-- ✅ 本番適用済 2026-10-19
-- 入会フォームの項目を店舗が設定（でお要望 2026-10-19：hacomono差分 #10）。
-- form_fields：項目ごとに hidden（聞かない）/ optional（任意）/ required（必須）。未設定は今までどおりの既定値。
-- custom_fields：店舗が自由に足す質問（アンケートと同じ形 [{id, type: single|multi|text, label, options, required}]）。
alter table provider_membership_settings add column if not exists form_fields jsonb not null default '{}'::jsonb;
alter table provider_membership_settings add column if not exists custom_fields jsonb not null default '[]'::jsonb;

alter table provider_memberships add column if not exists last_name_kana text;
alter table provider_memberships add column if not exists first_name_kana text;
alter table provider_memberships add column if not exists gender text;
alter table provider_memberships add column if not exists custom_answers jsonb;
-- 入会時点の質問（店舗が後で質問を変えても、この申込で何を聞かれたか分かるように）
alter table provider_memberships add column if not exists custom_fields_snapshot jsonb;
