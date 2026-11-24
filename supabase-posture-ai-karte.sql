-- ✅ 本番適用済 2026-11-24
-- AI姿勢分析の改善（2026-11-24 渡邉承認の指示書 §1〜§3・§9）
-- 1) 姿勢分析の結果に「気になる部位」「次の一手」「部位別の目安」を足す（既存の記録は空のまま）
-- 2) 記録ごとの閲覧リンク（推測できないトークン。DBにはハッシュだけを持つ。有効期限つき・共有OFFで失効）
-- 3) AI健診アドバイスにも「お客様に表示するか」を足す。これまで健診アドバイスは会員のNew Me Logに全件出ていたため、
--    姿勢分析と同じく「お店が表示するにした記録だけ」に揃える（本番の記録は0件の段階で変更）
alter table provider_posture_entries add column if not exists focus_areas jsonb not null default '[]'::jsonb;
alter table provider_posture_entries add column if not exists next_actions jsonb not null default '[]'::jsonb;
alter table provider_posture_entries add column if not exists score_breakdown jsonb;
alter table provider_posture_entries add column if not exists share_token_hash text;
alter table provider_posture_entries add column if not exists share_expires_at timestamptz;
alter table provider_posture_entries add column if not exists is_sample boolean not null default false;
create unique index if not exists provider_posture_entries_share_token_hash on provider_posture_entries (share_token_hash) where share_token_hash is not null;

alter table provider_health_advice_entries add column if not exists shared_with_customer boolean not null default false;

-- 閲覧リンクから会員登録したお客様を、お店の手動顧客に結びつけた経路（'store' = お店が選んだ / 'share_link' = お客様がリンクから登録）
alter table provider_manual_customers add column if not exists linked_via text;
