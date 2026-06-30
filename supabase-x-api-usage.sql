-- X API 従量課金の月次使用量トラッキング（$20ハードキャップのための自己計測）
-- month は 'YYYY-MM'（UTC基準）。est_cost = reads*0.005 + writes_plain*0.015 + writes_link*0.20
-- x-post / x-engage が実行前に当月行を読み、上限手前ならスキップ。実行後に加算。

CREATE TABLE IF NOT EXISTS x_api_usage (
  month        TEXT PRIMARY KEY,           -- 'YYYY-MM'
  reads        INTEGER NOT NULL DEFAULT 0, -- recent search 等の読み取り件数 @ $0.005
  writes_plain INTEGER NOT NULL DEFAULT 0, -- リンクなし投稿 @ $0.015
  writes_link  INTEGER NOT NULL DEFAULT 0, -- リンクあり投稿 @ $0.20
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 当月行を原子的に加算する RPC（競合に強い UPSERT）
CREATE OR REPLACE FUNCTION add_x_usage(
  p_month TEXT,
  p_reads INTEGER,
  p_writes_plain INTEGER,
  p_writes_link INTEGER
) RETURNS x_api_usage AS $$
  INSERT INTO x_api_usage (month, reads, writes_plain, writes_link, updated_at)
  VALUES (p_month, p_reads, p_writes_plain, p_writes_link, now())
  ON CONFLICT (month) DO UPDATE SET
    reads        = x_api_usage.reads        + EXCLUDED.reads,
    writes_plain = x_api_usage.writes_plain + EXCLUDED.writes_plain,
    writes_link  = x_api_usage.writes_link  + EXCLUDED.writes_link,
    updated_at   = now()
  RETURNING *;
$$ LANGUAGE sql;
