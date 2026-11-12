-- ✅ 本番適用済 2026-11-12
-- 姿勢分析を使える道具にする（2026-11-12 渡邉採用）：横からの写真・前回からの変化・お客様に見せるかをお店が選ぶ
alter table provider_posture_entries add column if not exists side_photo_url text;
alter table provider_posture_entries add column if not exists changes jsonb not null default '[]'::jsonb;
alter table provider_posture_entries add column if not exists previous_entry_id uuid references provider_posture_entries(id) on delete set null;
-- 既定は見せない（お店がAIの文を確認してから、記録ごとにお客様のNew Me Logへ出す）
alter table provider_posture_entries add column if not exists shared_with_customer boolean not null default false;
