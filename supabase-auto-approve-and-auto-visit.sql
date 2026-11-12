-- ✅ 本番適用済 2026-11-12
-- 入会の自動承認・予約の自動来店確認（2026-11-12 渡邉要望）
-- auto_approve：オンにすると、お客様のカード登録が済んだ時点で承認と同じ処理をして入会を確定する（既定はオフ＝今までどおりお店が承認）
alter table provider_membership_settings add column if not exists auto_approve boolean not null default false;
-- auto_visit_hours：予約の終わりの時刻からこの時間が過ぎても来店確認されていない確定済みの予約を、自動で来店済みにする（null＝自動にしない）
alter table providers add column if not exists auto_visit_hours integer default 24 check (auto_visit_hours is null or (auto_visit_hours between 1 and 168));
