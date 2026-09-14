# Googleカレンダー連携：OAuthクライアント作成手順（でお作業用）

hacomono機能網羅の「Googleカレンダー連携」（スタッフの個人カレンダーとFinemeの予約を双方向同期し、ダブルブッキングを防ぐ）を実装するには、事前にGoogle Cloud Console側でOAuthクライアントを1つ作成し、その認証情報をFinemeの環境変数に設定する必要がある。この作業はでお本人が行う（Claude Codeからは実行できない）。

Googleは2024〜2025年にかけて設定画面の名前を「OAuth同意画面」から「**Google Auth Platform**」に変更した。今アクセスすると下記のような画面構成になっているはず。

## この手順で作るもの

Googleが「Finemeというアプリが、ユーザー（＝掲載店舗のスタッフ）のGoogleカレンダーへの読み書きを求めています」と正しく認識するための「アプリの身分証明書」（client_id / client_secret）。1つ作れば、Fineme全体（全掲載店舗の全スタッフ分）で共用できる。店舗ごとに作り直す必要はない。

---

## STEP 1. プロジェクトを作る

1. https://console.cloud.google.com/ を開く（でお個人のGoogleアカウントでログインでよい）
2. 画面**最上部の中央あたり**に「プロジェクトを選択」（または既存プロジェクト名）というボタンがあるのでクリック
3. 開いたウィンドウの右上「新しいプロジェクト」をクリック
4. 「プロジェクト名」欄に `Fineme` と入力
5. 「作成」をクリック（数秒〜数十秒待つ）
6. 作成が終わったら、STEP2に進む前に**もう一度手順2のボタンを押して、今作った「Fineme」プロジェクトを選択し直す**（新規作成直後は別のプロジェクトが選択されたままのことがある）

## STEP 2. Google Calendar APIを有効にする

1. 画面**左上のハンバーガーメニュー（三本線 ≡）**をクリック
2. 「APIとサービス」→「**ライブラリ**」をクリック
3. 中央の検索窓に `Google Calendar API` と入力してEnter
4. 検索結果に出てくる「Google Calendar API」（カレンダーのアイコン）をクリック
5. 開いた詳細ページの青い「**有効にする**」ボタンをクリック

## STEP 3. Google Auth Platformの初期設定（Branding）

APIを有効にすると、自動的に「まずOAuth同意画面の設定が必要です」という案内が出ることが多い。出なければ、左のハンバーガーメニュー → 「APIとサービス」→「**Google Auth Platform**」→「**Branding**」を自分で開く。

初回はウィザード形式で以下を順番に聞かれる：

1. **App information（アプリ情報）画面**
   - 「App name」欄：`Fineme` と入力
   - 「User support email」欄：プルダウンから自分のGoogleアカウントのメールアドレスを選択
   - 右下「**Next**」をクリック

2. **Audience（対象ユーザー）画面**
   - 「External（外部）」を選ぶ（Fineme店舗スタッフは会社アカウントではなく個人のGoogleアカウントを使うため）
   - 右下「**Next**」をクリック

3. **Contact Information（連絡先）画面**
   - Email addresses欄に自分のメールアドレスを入力（プロジェクトに重要な変更があった時の通知先）
   - 右下「**Next**」をクリック

4. **Finish（完了）画面**
   - 「Google API Services User Data Policy」に同意するチェックボックスにチェック
   - 「**Continue**」→「**Create**」をクリック

これで基本設定は完了。次に左メニューに「Overview」「Branding」「Audience」「Clients」「Data Access」というタブが並んだ画面になる。

## STEP 4. テストユーザーを追加する（Audience）

公開審査が終わるまでは、登録した人しかログインテストできない制限がある。実際に連携させたいスタッフ（まずはでお自身のGoogleアカウントでOK）を登録しておく。

1. 左メニューの「**Audience**」タブをクリック
2. ページ内の「Test users」というセクションを探し、「**+ Add users**」をクリック
3. テストしたいGoogleアカウントのメールアドレスを入力
4. 「**Save**」をクリック

## STEP 5. 必要なスコープ（権限範囲）を追加する（Data Access）

1. 左メニューの「**Data Access**」タブをクリック
2. 「**Add or remove scopes**」をクリック
3. 開いたパネルの検索窓に `calendar` と入力
4. 一覧から「`.../auth/calendar.events` — See, edit, share, and permanently delete events on Google Calendars you have access to」という行を探し、左側のチェックボックスにチェック
5. パネル下部の「**Update**」をクリック
6. 元の画面に戻ったら「**Save**」をクリック

## STEP 6. OAuthクライアントIDを作成する（Clients）

1. 左メニューの「**Clients**」タブをクリック
2. 「**+ Create Client**」（または「認証情報を作成」）をクリック
3. 「Application type」で「**Web application**」を選択
4. 「Name」欄：`Fineme Web` と入力
5. 「Authorized redirect URIs」の「**+ Add URI**」をクリックし、以下をそのまま貼り付け：
   ```
   https://www.fineme.me/api/auth/google-calendar-callback
   ```
   （↑このURLに対応する実装はまだFineme側に無い。実装時にこのパスでAPIルートを作る前提で今から登録しておく。パスを変えたくなった場合は、ここも一緒に更新すること）
6. 「**Create**」をクリック
7. 画面に「Client ID」と「Client secret」が表示される（ポップアップで一度だけ出ることが多い。閉じてしまっても「Clients」タブの一覧から今作ったクライアント名をクリックすればいつでも再確認できる）

## STEP 7. 認証情報をFinemeに渡す

表示された `Client ID` と `Client secret` を、Claude Codeとのチャットで「これGoogleカレンダー連携の認証情報」と言って貼り付ければ、Vercelの環境変数（`GOOGLE_CALENDAR_CLIENT_ID` / `GOOGLE_CALENDAR_CLIENT_SECRET`）に設定して実装を進める。

- **Client secretは機密情報**。Slack等の共有チャンネルに貼らず、Claude Codeとの1対1のやり取りか、直接Vercelダッシュボードに入力する形が望ましい

---

## 本番公開に向けて（後回しでよい）

テストユーザー登録だけの状態だと「連携できるのは登録した数人のGoogleアカウントのみ」という制限が残る。店舗のスタッフ全員が自由に連携できるようにするには、「Audience」タブから「**Publish App**」を押して本番公開に切り替える必要があり、その際Googleの審査（機微なスコープを使う場合は数日〜数週間）が入ることがある。開発・検証段階ではテストユーザー登録のままで問題ない。

## 実装イメージ（着手時の参考。今は未実装）

- スタッフが掲載者ダッシュボードの「スタッフ」タブから「Googleカレンダーと連携する」ボタンを押す
- 上記のクライアントIDを使ってGoogleの認証画面に飛ばし、許可すると `access_token` / `refresh_token` を取得
- `provider_staff` テーブルにGoogle連携用のトークン列を追加（暗号化保存を検討）
- 予約が確定/変更/キャンセルされるたびに、該当スタッフのGoogleカレンダーへ予定を作成/更新/削除するAPI呼び出しを追加
- 双方向にするなら、Googleカレンダー側の変更をFineme側に反映するWebhook（Google Calendar Push通知）も必要——ここは片方向（Fineme→Google）から始めて、必要になったら双方向に拡張する設計でよい
