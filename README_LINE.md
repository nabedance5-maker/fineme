LINE 通知機能 (ローカルテスト用)
=================================

概要
----
この追加は、LINE Messaging API を使って予約に関する通知を送信するためのローカル用の最小実装です。

重要: 本実装はデモ/ローカル用です。本番運用では、公開可能なサーバ、DB、認証、Webhook の検証、CORS やセキュリティ対策が必要です。

主要ファイル
-----------
- `server/line-service.js` — LINE の push API を叩くヘルパー。
- `server/line-server.js` — Express サーバ。予約作成エンドポイント、プロバイダの承認/キャンセルアクション、リマインドのスケジューラを実装。
- `server/data/reservations.json` — 簡易な予約ストア（JSON ファイル）。
- `.env` — LINE の設定（ローカルに置く。絶対に公開しないこと）。

セットアップと起動
------------------
1. 依存をインストール（既にやっている可能性があります）:

```powershell
cd "C:\Users\nabed\OneDrive\デスクトップ\Fineme"
npm install
```

2. `.env` を確認し、`LINE_CHANNEL_ACCESS_TOKEN` と `LINE_USER_ID`（プロバイダのテスト先）を設定します。

3. line-server を起動:

```powershell
npm run line-server
```

テスト手順（ローカル）
--------------------
1) 予約作成シミュレーション

curl / HTTP クライアントで POST します（例: curl/HTTPie または Postman）:

```powershell
curl -v -H "Content-Type: application/json" -d "{
  \"service\": \"メンズカット\",
  \"store\": \"Fineme 表参道店\",
  \"start\": \"2025-11-02T15:00:00+09:00\",
  \"address\": \"東京都渋谷区神宮前1-1-1\",
  \"access\": \"表参道駅 B2 徒歩5分\",
  \"userId\": \"Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\",
  \"userName\": \"テスト太郎\"
}" http://localhost:4015/line/reservations
```

2) プロバイダに通知が送信されます（`LINE_USER_ID` を設定している場合）。

3) 承認/キャンセルは下記 URL をブラウザで開くことで実行できます（ローカルサーバが動いている必要があります）:

```
http://localhost:4015/line/action?resId=RESERVATION_ID&action=approve
http://localhost:4015/line/action?resId=RESERVATION_ID&action=cancel
```

### ngrok を使った LINE Login のローカル検証

LINE Login のコールバック URL は公開可能な HTTPS ドメインである必要があります。ngrok を使ってローカルサーバを一時公開する手順は下記の通りです。

1. ngrok をインストール（または公式サイトからバイナリを取得）

2. あなたのローカル line-server を起動（例: 4015 ポート）:

```powershell
npm run line-server
```

3. ngrok でポートを公開:

```powershell
ngrok http 4015
```

4. ngrok が発行する HTTPS URL（例: https://abcd1234.ngrok.io）を LINE Developers の LINE Login 設定のコールバック URL に登録します。コールバックは `https://your-ngrok-host/line/callback` です。

5. ブラウザで `https://your-ngrok-host/line/login?returnTo=/pages/user/login.html` を開くと、LINE の認可画面が実行され、認可後には ngrok 経由でローカルサーバの /line/callback に戻り、最終的に `returnTo` にリダイレクトされます。

6. テスト完了後は ngrok セッションを停止してください（Ctrl+C）。
```

備考 / 制限事項
----------------
- この実装は簡易版です。LINE Login の完全な OAuth フロー（redirect URI 登録、アクセストークン取得、ユーザー識別の検証）は、本番での導入に際して追加で設定・公開サーバが必要です。
- Messaging API の push を利用するためには、LINE Developers 側でチャネルを作成しアクセストークンを取得して `.env` に入れてください（既に `.env` に設定済み）。
- ローカルで動かす場合、プロバイダやユーザー側の LINE ID をテスト用に用意するか、友だち登録済みの BOT へ push できるかを確認してください。

次のステップ
---------------
- 本番導入: LINE Login の正規の OAuth フロー、ユーザーとプロバイダの永続的な DB マッピング、Webhook の検証、SSL/HTTPS 公開、認証付き管理画面の統合。
