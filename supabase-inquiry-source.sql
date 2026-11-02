-- ✅ 本番適用済 2026-11-02
-- 問い合わせ・営業パートナー応募の「このページを知ったきっかけ」（2026-11-02）。
-- ChatGPT 等のAI経由で応募が来ているため、経路ごとに数える。値は lib/inquiry-source.js の key。
alter table provider_inquiries add column if not exists source text;
