# Fineme ポータル（MVP）

恋愛に悩む男性向けの外見磨きポータル MVP（Next.js 14 App Router）。検索→一覧→詳細へつながる骨組みを用意しています。

## 主要要件との対応
- サイトマップ: トップ、検索、結果、（今後）サービス詳細/予約/特集/マイページ等
- 検索機能: 地域/カテゴリ/キーワードをローカルJSONでフィルタ
- 将来拡張: Firebase/Supabase, 予約、口コミ、メール、管理画面を段階追加
- UI/UX: モバイルファースト、清潔感のある配色（白×グレー）、構造化のしやすいCSS

## 開発環境
- Node.js 18+ 推奨
- パッケージ: Next 14 / React 18

## 起動方法（Windows PowerShell）
```powershell
# 依存インストール
npm install

# 開発サーバー起動
npm run dev
```
アプリは http://localhost:3000/ で動作します。

## ディレクトリ
- `app/` App Router 配下のページ
- `data/` モックデータ（services.json, articles.json）
- `app/globals.css` デザイントークン/ベーススタイル

## 次の実装候補
1. サービス詳細ページ（/services/[slug]）と予約フロー（/booking）
2. お気に入り（localStorage）とマイページ雛形
3. 掲載者用 管理UI 雛形（/dashboard）
4. 特集/記事（/articles）
5. SEO: メタ/OGP/構造化データの強化

## 免責
画像は Unsplash のデモURLを使用しています。実運用では権利をご確認ください。

## 画像サイズ削減と容量対策（重要）
本プロジェクトでは、管理画面（特集・サービス・スタッフ等）で端末から画像を選択した場合、ブラウザ内で画像を圧縮し、データURL（base64）として保存する機能があります。データURLは手軽ですが、localStorage の上限（ブラウザ/環境により概ね 5〜10MB/オリジン）に達しやすい点に注意してください。

### 自動リサイズ/圧縮の仕様
- 特集（features）
	- サムネイル: 端末から選択時、最大辺 1280px・WebP・quality 0.8 で圧縮して入力欄に反映します。
	- 本文（RTE）: 「画像（端末）」から挿入すると同様に 1280px・WebP・quality 0.8 のデータURLを本文に挿入します。
	- 保存時チェック: データURLのサムネイルが約1MB超の場合は警告を表示します（画像の再圧縮やURL化を推奨）。
- サービス画像（provider-services）: 最大辺 1200px・JPEG・quality 0.85。
- スタッフ写真（provider-staff）: 最大辺 1200px・JPEG・quality 0.85。

これらの既定値は `scripts/admin-features.js`（features）、`scripts/provider-services.js`（services）、`scripts/provider-staff.js`（staff）に実装されています。

### 推奨ワークフロー（容量を抑えるために）
- 可能であれば、本文やサムネイルは「外部URL」または `public/` 配下の静的画像を参照してください（例: `/feature/images/xxx.webp`）。
- 端末から挿入する場合は、自動圧縮後のプレビューサイズを確認し、必要なら再圧縮（より小さい最大辺、低い品質）を行ってください。
- サムネイルの目安は 150〜300KB 程度までを推奨（一覧で多数表示されるため）。
- 本文内の画像を大量に base64 で埋め込むと JSON/ストレージが急増します。できる限り URL 参照に切り替えてください。

### 容量上限と警告
- 近い将来、保存容量が上限に達しそうな場合は、画面上部に警告バナーが表示されます（ストレージヘルスチェック）。
- 保存に失敗した場合は「ブラウザの保存容量を超えました」等のメッセージが出ます。以下をお試しください。
	- サムネイルや本文のデータURL画像をより小さく圧縮し直す（例: 最大辺 960px、quality 0.7 など）。
	- 本文中の `data:image/...` を削除し、外部URLに差し替える。
	- 不要な下書きや旧データを削除する。

### バックアップ/インポート時の注意
- 自動バックアップ（JSONダウンロード）は既定でONです。データURLを含むと JSON ファイルサイズが大きくなります。
- インポート時は重複検出とマージを行い、結果サマリ（追加/更新/スキップ）を表示します。
- 画像を大量に含む JSON をやりとりする場合は、画像を URL 参照にすることでファイルサイズとストレージ使用量を抑えられます。

### トラブルシュート
- サムネイルを URL に変えるには: 特集編集でサムネイル欄に `https://...` または `/feature/images/...` を直接入力し、保存してください。
- 本文の埋め込み画像を URL に差し替えるには: 画像を選択して削除し、「画像（URL）」から差し替えます。
- 自動圧縮の品質/最大辺を変更したい（開発者向け）:
	- 特集: `scripts/admin-features.js` の `compressImageFile` 呼び出しの `maxSize` と `quality` を変更。
	- サービス: `scripts/provider-services.js` の `resizeImageFile` の `maxSize` と `toDataURL` の品質を変更。
	- スタッフ: `scripts/provider-staff.js` の `readAndResizeImage` の `maxSize` と `toDataURL` の品質を変更。

## 通知機能の簡易テスト手順

1. 開発サーバーを起動し、サイトを開く（例: http://localhost:3000/）。
2. サービスのスケジュールページ（例: /pages/user/schedule.html?serviceId=...）を開き、空き枠を選択して予約リクエストを送信する。
3. 送信後、ブラウザの開発者ツールで `localStorage.getItem('glowup:requests')` を確認し、リクエストが追加されていることを確認する。
4. `localStorage.getItem('glowup:notifications')` を確認すると、プロバイダ向けとユーザ向けの通知オブジェクトが追加されているはずです。
5. ヘッダー右上のベルアイコンをクリックすると未読数がバッジ表示され、ドロップダウンで最近の通知が表示されます。
6. 通知のフル一覧は `/pages/notifications.html` で確認できます。ここから既読化も可能です。

注意: 現状の通知はブラウザ localStorage ベースのローカル実装です。実運用でメールやプッシュに連携する場合は、サーバ側のAPI設計と外部配信サービスの組み合わせが必要になります。

