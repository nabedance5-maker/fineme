# Fineme

外見を起点に、自信を再設計する男性向けプラットフォーム。
「変容の旅のインフラ」として、診断→ロードマップ→サービスマッチングまでを一気通貫で提供する。

## 事業本質

- **商品**: Fineme Mirror（写真1枚で外見変容余地を可視化・¥500）+ Me Scan診断 + New Me Map
- **販売**: Mirror専用LP（作成中）→ /mirror へのCTA
- **集客**: SEO記事・Instagram・X・note

Finemeは「サービス検索ポータル」ではない。外見改善の旅に出る男性に、地図（New Me Map）と羅針盤（Fineme Compass）を渡すプラットフォーム。

## 技術スタック

- **フロント**: Next.js 14 App Router + React 18
- **DB**: Supabase（PostgreSQL）
- **デプロイ**: Vercel
- **決済**: Stripe Checkout（一回払い）
- **AI**: Claude API（Haiku: テキスト生成・マッチング / Vision: Mirror写真分析）
- **デザイン**: 深海ネイビー（#0a0f1e）× 古地図ゴールド（#c9a84c）・大航海時代テーマ

## 開発環境

- Node.js 18+ 推奨

## 起動方法（Windows PowerShell）

```powershell
npm install
npm run dev        # http://localhost:3000
npm run line-server  # LINE OAuth用Expressサーバー（別プロセス）
```

## ディレクトリ構成

```
app/               # Next.js App Router（新スタック）
├── mirror/        # Fineme Mirror（写真分析・¥500）
├── diagnosis/     # Me Scan 7軸診断
├── mypage/navi/   # New Me Map（行動ロードマップ）
├── provider/      # 掲載者公開ページ
├── admin/         # 管理画面
└── api/           # APIルート（mirror/diagnosis/providers等）
pages/             # 静的HTML（レガシースタック・移行中）
scripts/           # レガシーHTML対応のバニラJS
business/          # 社内資料（URL直打ちのみ）
supabase-*.sql     # DBマイグレーションSQL
```

## 主要実装済み機能

- **Me Scan**: 7軸（体型/眉/服/髪/肌/歯/爪）× 4フェーズの外見診断
- **New Me Map**: 診断結果から生成する行動ロードマップ（Fineme Compass付き）
- **Fineme Mirror**: 写真→Claude Vision→7軸変容余地マップ（¥500 Stripe決済）
- **掲載者マッチング**: Claude Haiku生成のai_match_profile + Haversine距離スコアリング
- **商品アフィリエイト**: 43商品・diagnosis/result + naviでパーソナライズ表示
- **SNS生成ツール**: business/sns-content-gen.html（X/note/DM）
- **記事生成ツール**: business/article-gen.html（251本生成済み）

## 現在の優先事項

1. Mirror専用LP（/lp/mirror）作成
2. Vercel Proへの移行後、Mirror Coming Soonを解除
3. 記事・SNSからMirror LPへの流入導線整備

## アーキテクチャ注意点

- フロントから直接Supabase操作禁止 → 必ず `/api/me/*` 経由
- `public/` は編集禁止（ビルド時に `scripts/copy-static.js` が自動生成）
- レガシー `scripts/` のinnerHTML編集時は `escape-html.js` / `sanitize-html.js` を使う
