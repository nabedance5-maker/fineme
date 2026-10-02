-- 営業パートナー（Fineme Sales Partner）を掲載者から独立した存在として管理する。
--
-- でお方針（2026-10-02・設計方針として恒久的に維持）：
--   ①「掲載者だから営業パートナーになれる」のではなく「掲載者も、希望すれば
--     営業パートナーとして別途登録できる」。掲載者登録と営業パートナー登録は
--     別の契約として扱い、前者を後者の必須条件にしない。
--   ②Finemeに掲載していない人でも営業パートナーとして登録できる。
--   ③紹介報酬は直接紹介にのみ紐づく（多層紹介は作らない・既存方針を維持）。
--   ④報酬率・報酬条件・計算ロジック（referral_rewards等）はこの変更で一切変えない。
--     変えるのは「誰が紹介者として扱われるか」の身元の置き場所だけ。
--
-- 旧実装は providers.referral_code がそのまま「紹介者コード」を兼ねており、
-- 掲載者登録＝自動的に紹介者（営業パートナー）という設計だった。本テーブルを
-- 導入し、紹介者の身元を providers から分離する。

create table if not exists sales_partners (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text,
  referral_code text not null unique,  -- 紹介URL・報酬トラッキングで使う本人のコード
  provider_id   uuid references providers(id) on delete set null, -- 掲載者でもある場合のみ設定。NULL＝掲載していない営業パートナー
  status        text not null default 'active' check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_sales_partners_provider on sales_partners(provider_id);
create index if not exists idx_sales_partners_code on sales_partners(referral_code);

alter table sales_partners enable row level security;
-- service_role（APIルート）からのみ操作するため public ポリシー不要（他のproviders系運用テーブルと同方針）

-- 既存データの後方互換バックフィル：既にreferral_codeを持つ全掲載者（旧モデルで
-- 自動的に紹介者扱いだった21社）を、provider_id紐付きのsales_partnersとして複製する。
-- 既に出回っているFN番号付きの紹介URL・admin画面のreferred_by値がそのまま有効に
-- なるようにするための一度きりの移行。今後の新規掲載者には自動発行しない
-- （掲載者も「希望すれば」別途登録する方式に変更したため）。
insert into sales_partners (name, email, referral_code, provider_id, status)
select p.name, p.email, p.referral_code, p.id, 'active'
from providers p
where p.referral_code is not null
on conflict (referral_code) do nothing;
