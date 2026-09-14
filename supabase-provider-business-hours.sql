-- ✅ 本番適用済 2026-09-14
-- 店舗の営業時間設定（でお要望2026-09-14）。
-- 即時予約の空き枠を手動で1つずつ登録させるのは非効率、という指摘を受け、
-- 営業時間から自動的に空き枠を生成できるようにする。また、予約カレンダーの
-- 表示時間帯（9:00-21:00固定だった）も、設定があればここから動的に決める。
-- {"mon":{"open":"10:00","close":"20:00","closed":false}, "tue":{...}, ...}
ALTER TABLE providers ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}'::jsonb;

-- 自動生成された枠か、店舗が手動で追加した枠かを区別する（自動生成分だけを
-- cronで作り直す・営業時間変更時に一括更新する、といった運用のため）。
ALTER TABLE provider_slots ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;

-- 自動生成する枠の刻み幅（分）。メニューごとの所要時間はdurationがtext型の
-- 自由記述のため数値として扱えず、まずは店舗が選ぶ単一の刻み幅で生成する。
ALTER TABLE providers ADD COLUMN IF NOT EXISTS slot_duration_minutes INT DEFAULT 60;
