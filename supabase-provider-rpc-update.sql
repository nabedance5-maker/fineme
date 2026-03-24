-- ✅ 本番適用済 2026-03-24
-- ⚠️ 本番適用前: Supabaseダッシュボード → SQL Editorで実行
-- get_provider_by_slug を SELECT * に更新（新カラムを自動的に含める）

CREATE OR REPLACE FUNCTION get_provider_by_slug(p_slug text)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT row_to_json(p)
  FROM providers p
  WHERE p.slug = p_slug
    AND p.published = true
  LIMIT 1;
$$;
