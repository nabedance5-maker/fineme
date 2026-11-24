-- ✅ 本番適用済 2026-11-25
-- AI姿勢分析の目安スコアの内訳（2026-11-25 渡邉指摘「なんでその点数なのか説明できないなら意味がない」）
-- チェック項目ごとの判定 [{ key, part, label, level(0〜3|null), deduction(0/5/15/25|null), note }] を残し、
-- 点数（score・score_breakdown）はこの判定から計算する（lib/posture-scoring.js）。既存の記録は空のまま
alter table provider_posture_entries add column if not exists score_details jsonb;
