-- ============================================================
-- Fineme providers テーブル
-- Supabase ダッシュボード > SQL Editor で実行してください
-- ============================================================

create table if not exists providers (
  id              uuid default gen_random_uuid() primary key,
  slug            text unique not null,           -- URL用スラッグ (例: tokyo-gym-yamada)
  name            text not null,                  -- 掲載名・店舗名
  catchphrase     text,                           -- キャッチコピー
  description     text,                           -- サービス説明文
  target_desc     text,                           -- こんな人に向いています
  philosophy      text,                           -- このサービスが大切にしていること
  main_category   text not null,                  -- メインカテゴリ
  sub_categories  text[] default '{}',            -- サブカテゴリ
  area            text,                           -- エリア (例: 東京・渋谷)
  price_from      integer,                        -- 最低価格
  booking_url     text,                           -- 外部予約URL (Phase 0)
  photo_url       text,                           -- メイン写真URL
  published       boolean default false,          -- 掲載者が制御 (公開/非公開)
  admin_hidden    boolean default false,          -- 運営が強制非公開
  -- 診断マッチング設定
  suitable_triggers    text[] default '{}',       -- 得意なトリガー
  handles_failure_patterns text[] default '{}',  -- 得意な失敗パターン対応
  provider_style  text,                           -- 提供スタイル
  -- 課金
  plan            text default 'A',               -- A/B/C
  billing_started boolean default false,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  -- 紹介
  referral_code   text unique,
  referred_by     text,                           -- 紹介者のreferral_code
  -- メタ
  created_at      timestamp with time zone default now(),
  updated_at      timestamp with time zone default now()
);

-- RLS 有効化
alter table providers enable row level security;

-- 公開ページ: publishedかつadmin_hiddenでない掲載者は誰でも読める
create policy "public read published providers"
  on providers for select
  using (published = true and admin_hidden = false);

-- 運営 (service_role) はすべて操作可能（ポリシー不要 - service_roleはRLSをバイパス）

-- updated_at 自動更新トリガー
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger providers_updated_at
  before update on providers
  for each row execute function update_updated_at();

-- サンプルデータ (オプション: 動作確認用)
-- insert into providers (slug, name, catchphrase, main_category, area, price_from, published)
-- values ('sample-gym-tokyo', 'サンプルジム 東京', 'テスト用掲載者', 'gym', '東京', 10000, true);
