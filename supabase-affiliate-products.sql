-- affiliate_products: 商品アフィリエイト管理テーブル
-- 診断結果・New Me Map 等でユーザーに合う商品をパーソナライズ表示するためのプール
-- ✅ 本番適用済 2026-04-21

CREATE TABLE IF NOT EXISTS affiliate_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  axis text NOT NULL CHECK (axis IN ('skin','eyebrow','hair','body','teeth','nail','fashion')),
  name text NOT NULL,
  url text NOT NULL,
  level text NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner','intermediate','advanced')),
  price_range text NOT NULL DEFAULT 'low' CHECK (price_range IN ('low','mid','high')),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS: 読み取りは全員OK、書き込みはサービスロールのみ
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliate_products_read_all" ON affiliate_products FOR SELECT USING (true);

-- 既存の AXIS_PRODUCTS データを移行
INSERT INTO affiliate_products (axis, name, url, level, price_range, sort_order) VALUES
-- skin
('skin', '肌ラボ 極潤 洗顔フォーム', 'https://www.amazon.co.jp/s?k=肌ラボ+極潤+洗顔&tag=whero523-22', 'beginner', 'low', 1),
('skin', '肌ラボ 極潤 ヒアルロン液（化粧水）', 'https://www.amazon.co.jp/s?k=肌ラボ+極潤+化粧水&tag=whero523-22', 'beginner', 'low', 2),
('skin', 'ビオレUV アクアリッチ（日焼け止め）', 'https://www.amazon.co.jp/s?k=ビオレUV+アクアリッチ&tag=whero523-22', 'beginner', 'low', 3),
('skin', 'メンズビオレ ONE（オールインワン洗顔）', 'https://www.amazon.co.jp/s?k=メンズビオレ+ONE+洗顔&tag=whero523-22', 'intermediate', 'low', 4),
('skin', 'ピーリングジェル（毛穴ケア・週1）', 'https://www.amazon.co.jp/s?k=ピーリングジェル+メンズ&tag=whero523-22', 'intermediate', 'low', 5),
('skin', 'キュレル 潤浸保湿フェイスクリーム', 'https://www.amazon.co.jp/s?k=キュレル+フェイスクリーム&tag=whero523-22', 'intermediate', 'mid', 6),
('skin', 'WELEDA スキンフード（天然成分・有機認証）', 'https://www.amazon.co.jp/s?k=WELEDA+スキンフード&tag=whero523-22', 'advanced', 'low', 7),
('skin', 'ルルルンプレシャス シートマスク（定期ケア）', 'https://www.amazon.co.jp/s?k=ルルルンプレシャス&tag=whero523-22', 'advanced', 'mid', 8),
-- eyebrow
('eyebrow', 'スクリューブラシ（眉整え・使い捨て）', 'https://www.amazon.co.jp/s?k=スクリューブラシ+眉&tag=whero523-22', 'beginner', 'low', 1),
('eyebrow', '眉用ハサミ（ステンレス）', 'https://www.amazon.co.jp/s?k=眉用はさみ+ステンレス&tag=whero523-22', 'beginner', 'low', 2),
('eyebrow', 'KATE デザイニングアイブロウ3D', 'https://www.amazon.co.jp/s?k=ケイト+デザイニングアイブロウ3D&tag=whero523-22', 'intermediate', 'low', 3),
('eyebrow', 'UZU 眉ペンシル極細（メンズ自然仕上げ）', 'https://www.amazon.co.jp/s?k=UZU+眉ペンシル+メンズ&tag=whero523-22', 'advanced', 'low', 4),
-- hair
('hair', 'BOTANIST ボタニカルシャンプー', 'https://www.amazon.co.jp/s?k=BOTANIST+シャンプー+メンズ&tag=whero523-22', 'beginner', 'low', 1),
('hair', 'ウーノ スーパーハード（スタイリング）', 'https://www.amazon.co.jp/s?k=ウーノ+スーパーハード&tag=whero523-22', 'beginner', 'low', 2),
('hair', '洗い流さないトリートメント（アウトバス）', 'https://www.amazon.co.jp/s?k=洗い流さないトリートメント+メンズ&tag=whero523-22', 'intermediate', 'low', 3),
('hair', 'ルシードエル バームワックス（ナチュラル）', 'https://www.amazon.co.jp/s?k=ルシードエル+バームワックス&tag=whero523-22', 'intermediate', 'low', 4),
('hair', 'パナソニック ヘアドライヤー（速乾・大風量）', 'https://www.amazon.co.jp/s?k=パナソニック+ヘアドライヤー+速乾&tag=whero523-22', 'intermediate', 'mid', 5),
('hair', 'KAMIKA 黒髪クリームシャンプー（オーガニック）', 'https://www.amazon.co.jp/s?k=KAMIKA+クリームシャンプー&tag=whero523-22', 'advanced', 'low', 6),
('hair', 'Nobby ヘアドライヤー（サロン仕様）', 'https://www.amazon.co.jp/s?k=Nobby+ヘアドライヤー+サロン&tag=whero523-22', 'advanced', 'mid', 7),
-- body
('body', 'トレーニングウェア（メンズ）', 'https://www.amazon.co.jp/s?k=メンズ+トレーニングウェア&tag=whero523-22', 'beginner', 'low', 1),
('body', 'プロテインバー（手軽なタンパク源）', 'https://www.amazon.co.jp/s?k=プロテインバー+高タンパク&tag=whero523-22', 'beginner', 'low', 2),
('body', 'ザバス ホエイプロテイン', 'https://www.amazon.co.jp/s?k=ザバスホエイプロテイン&tag=whero523-22', 'intermediate', 'low', 3),
('body', 'フォームローラー（筋膜リリース）', 'https://www.amazon.co.jp/s?k=フォームローラー+筋膜リリース&tag=whero523-22', 'intermediate', 'low', 4),
('body', 'タニタ 体組成計', 'https://www.amazon.co.jp/s?k=タニタ+体組成計&tag=whero523-22', 'intermediate', 'mid', 5),
('body', 'アジャスタブルダンベル（可変式）', 'https://www.amazon.co.jp/s?k=アジャスタブルダンベル+可変式&tag=whero523-22', 'intermediate', 'mid', 6),
('body', 'HMBサプリメント（筋力維持）', 'https://www.amazon.co.jp/s?k=HMB+サプリ+筋トレ&tag=whero523-22', 'advanced', 'mid', 7),
('body', 'スマートウォッチ（活動量・睡眠計測）', 'https://www.amazon.co.jp/s?k=スマートウォッチ+活動量+睡眠&tag=whero523-22', 'advanced', 'high', 8),
-- teeth
('teeth', 'GUM デンタルフロス', 'https://www.amazon.co.jp/s?k=GUM+デンタルフロス&tag=whero523-22', 'beginner', 'low', 1),
('teeth', 'チェックアップ スタンダード（歯磨き粉）', 'https://www.amazon.co.jp/s?k=チェックアップ+歯磨き粉&tag=whero523-22', 'beginner', 'low', 2),
('teeth', 'アパガード プレミオ（ホワイトニング）', 'https://www.amazon.co.jp/s?k=アパガード+プレミオ&tag=whero523-22', 'intermediate', 'low', 3),
('teeth', 'ルシェロ 歯ブラシ（歯科医推奨）', 'https://www.amazon.co.jp/s?k=ルシェロ+歯ブラシ&tag=whero523-22', 'intermediate', 'low', 4),
('teeth', 'オーラルB 電動歯ブラシ', 'https://www.amazon.co.jp/s?k=オーラルB+電動歯ブラシ&tag=whero523-22', 'intermediate', 'mid', 5),
('teeth', 'フィリップス ソニッケアー（上位機種）', 'https://www.amazon.co.jp/s?k=ソニッケアー+電動歯ブラシ&tag=whero523-22', 'advanced', 'high', 6),
-- nail
('nail', 'ニベア リッチケア ハンドクリーム', 'https://www.amazon.co.jp/s?k=ニベア+ハンドクリーム&tag=whero523-22', 'beginner', 'low', 1),
('nail', 'ガラス製爪やすり（水洗いOK）', 'https://www.amazon.co.jp/s?k=ガラス製+爪やすり&tag=whero523-22', 'beginner', 'low', 2),
('nail', 'OPI プロスパ ネイルオイル', 'https://www.amazon.co.jp/s?k=OPI+ネイルオイル&tag=whero523-22', 'intermediate', 'low', 3),
('nail', 'uka ネイルオイル 13:00（天然精油配合）', 'https://www.amazon.co.jp/s?k=uka+ネイルオイル&tag=whero523-22', 'advanced', 'low', 4),
-- fashion
('fashion', '白シャツ（メンズ スリムフィット）', 'https://www.amazon.co.jp/s?k=白シャツ+メンズ+スリム&tag=whero523-22', 'beginner', 'low', 1),
('fashion', 'チノパン（テーパード・ベーシック）', 'https://www.amazon.co.jp/s?k=チノパン+メンズ+テーパード&tag=whero523-22', 'beginner', 'low', 2),
('fashion', 'ステンカラーコート（ベーシック）', 'https://www.amazon.co.jp/s?k=ステンカラーコート+メンズ&tag=whero523-22', 'intermediate', 'mid', 3),
('fashion', '薄型レザーウォレット', 'https://www.amazon.co.jp/s?k=薄型+財布+メンズ+レザー&tag=whero523-22', 'intermediate', 'mid', 4),
('fashion', 'スエードチェルシーブーツ（メンズ）', 'https://www.amazon.co.jp/s?k=チェルシーブーツ+メンズ+スエード&tag=whero523-22', 'advanced', 'mid', 5),
('fashion', 'セットアップ（テーラードジャケット＋パンツ）', 'https://www.amazon.co.jp/s?k=セットアップ+メンズ+テーラード&tag=whero523-22', 'advanced', 'mid', 6);
