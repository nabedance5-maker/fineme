# Threads API 連携 — セットアップ手順（でお作業）＆ 実装メモ

<!-- SOURCE: でお × Claude Code / 最終更新: 2026-07-10 -->

> 目的：Threadsの**自動投稿・分析・PDCA自走**。コードは実装済みだが、**でおのセットアップ（Metaアプリ＋トークン＋env）が無いと動かない**（安全側に env gated）。
> 参考：https://developers.facebook.com/docs/threads

## でおがやること（順番に・1回だけ）
1. **Metaアプリ作成**：developers.facebook.com → アプリ作成 → ユースケース「**Threads API**」を選択。
2. **権限（スコープ）を有効化**：`threads_basic` / `threads_content_publish` / `threads_manage_replies` / `threads_read_replies` / `threads_manage_insights`。
3. **自分のThreadsアカウントをテスターに追加**して承認（アプリ設定→Threadsテスター）。
4. **長期トークン発行**：Authorization Window で短期トークン取得 → 長期トークン(60日)に交換。ユーザーIDも控える（`GET /me?fields=id,username`）。
5. **Vercel の環境変数に登録**：
   - `THREADS_ACCESS_TOKEN`＝長期トークン（機密・他人に渡さない）
   - `THREADS_USER_ID`＝自分のThreadsユーザーID
   - （分析だけ先に試すならここまででOK。自動投稿は下の6を設定するまで発火しない）
   - `THREADS_AUTOPOST=1`＝**自動投稿をONにする時だけ**設定（未設定なら従来どおりメール下書きのみ）
6. **SQLを本番Supabaseで実行**：`supabase-threads-posts.sql` を SQL Editor で実行（threads_posts テーブル）。実行後ファイル先頭に「✅本番適用済 日付」を追記。
7. 再デプロイ（envは反映に再デプロイが必要）。

## 実装（コード側・実装済み）
- `lib/threads-api.js`：投稿(コンテナ作成→publish)・リプ連結・インサイト取得・トークン延長。全て env gated。
- `app/api/cron/threads-draft`：`THREADS_AUTOPOST=1` の時、生成した各スレッド（本文→リプ①→リプ②）を**自動投稿**し `threads_posts` に記録。未設定ならメール下書きのみ（従来通り）。
- `app/api/cron/threads-insights`（毎日1:00 JST）：直近14日の投稿インサイト(views/likes/replies/reposts/quotes)を更新。**日曜は実データからPDCA**＝「効いた/外れた切り口」を分析し `sns_posts(channel='threads_strategy')` に来週方針を保存（threads-draftが翌週読む）＋週次アナリティクスをメール。
- `app/api/cron/threads-token-refresh`（毎月1日）：長期トークンを延長し、新トークンをメール（でおが env 更新）。

## 分析でわかること
- 投稿ごと：views / likes / replies / reposts / quotes、近似エンゲージ率(eng%)。
- アカウント：フォロワー数・インプレ。
- 自走PDCA：伸びた/外れた切り口をAIが毎週要約→翌週の生成方針に自動反映（でおの手動feedbackが不要に）。
- ※Threadsは"保存数"を直接返さない → eng%(いいね＋返信/リポスト/引用の重み付け ÷ view)で近似。プロフクリックはThreadsアプリのインサイトで確認。

## 注意
- **自動投稿はAI生成をそのまま公開する**ため、最初は `THREADS_AUTOPOST` を付けずに数日メール下書きで質を確認 → 納得したらONを推奨。
- トークンは機密。DBには保存せず env 管理（token-refreshは新トークンをメールするだけ）。
- 未設定でも既存のThreads下書きメール運用は無傷（全て env gated）。
