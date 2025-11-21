Next.js 移行・デプロイ手順（概要）

このファイルは、プロジェクトを Next.js（app router）で安全に公開するための最低限の手順を示します。

前提
- Node.js 18+（推奨 LTS）
- Git と npm/yarn が使えること

1) 依存関係のインストール

Windows PowerShell で（プロジェクトルート）:

```powershell
npm install
```

2) ローカル開発サーバの起動

```powershell
npm run dev
```

ブラウザで http://localhost:3000 を開く。

3) ビルド（本番確認）

```powershell
npm run build
npm start
```

4) 環境変数（公開先に設定する例）
- LINE_LOGIN_CHANNEL_ID, LINE_LOGIN_CHANNEL_SECRET
- LINE_CHANNEL_ACCESS_TOKEN (line-service の場合)
- UPLOAD_API_KEY, UPLOAD_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY（S3 を使う場合）

5) 推奨デプロイ先
- Vercel（Next.js と相性が良く、環境変数設定が簡単）

6) セキュリティ上の注意
- このリポジトリは多数の静的 HTML を含むため、CSP を導入しました。ただし既存の inline スクリプト/スタイルが多いため、CSP を段階的に厳格化してください（まずは report-only モードで問題を洗い出す）。
- localStorage に機密情報を入れないでください。認証情報は可能なら httpOnly cookie を採用してください。

7) 次のステップ（推奨）
- アプリ全体を app/ の React コンポーネントに移植して、innerHTML を排除する。
- innerHTML を使っている箇所の一覧を作成して、安全化（escapeHtml or safeUrl）を徹底する。
