-- ✅ 本番適用済 2026-10-27
-- 管理画面（店頭）から始めた入会手続きかどうか（でお要望 2026-10-27）。
-- 店舗がメンバーを選んで入会内容を入れ、カード登録の案内を出して進める手続き。
-- お客様が自分で申し込んだもの（false）と区別し、カード登録待ち（draft）の店頭申込を一覧に出して続きから進められるようにする。
alter table provider_memberships add column if not exists created_by_store boolean not null default false;
