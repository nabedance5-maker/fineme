# LINEリマインド機能 仕様まとめ（店舗SaaS SAAS-009）

店舗向けSaaSの「次回予約自動リマインド」は実装済み。新規開発ではなく、この文書は既存の4つのcronの仕様をまとめたドキュメント化のみ。

## 送信先の解決（共通ロジック）

全てのリマインドは `lib/line-channel.js` の `resolveLineTarget()` を経由する。

1. 対象provider（`providerSlug`または`providerId`で指定）に`provider_line_channels`の連携（`channel_access_token`＋`verified_at`）があり、
2. かつ対象ユーザーが`provider_customer_line_links`でその店舗チャネル上のuserIdを連携済みなら → **店舗の公式LINEチャネル**から送信
3. どちらか欠けていれば → **Fineme公式LINEチャネル**（`profiles.line_user_id`宛）にフォールバック

送信の実体は `lib/line-push.js` の `sendLinePush(lineUserId, text, token, quickReplyItems)`。

## cron一覧

| cron | ファイル | スケジュール(UTC) | 対象 | 補足 |
|---|---|---|---|---|
| `line-reminder` | `app/api/cron/line-reminder/route.js` | 15:00（毎日） | 翌日の`reservations`（status=approved）／New Me Logの`next_visit`一致 | ユーザー向け通知にクイックリプライ「行きます」「予定が変わりそう」を付与（ノーショー対策）。掲載者本人にも別途通知 |
| `log-reminder` | `app/api/cron/log-reminder/route.js` | 0:00（毎日、月曜除く） | New Me Logの「そろそろ」判定（本人設定頻度 or 軸の目安） | 店舗別チャネル宛と、Fineme公式フォールバック宛の2系統に分けて送信。月曜は`weekly-nudge`に譲る |
| `review-request` | `app/api/cron/review-request/route.js` | 8:00（毎日） | 来店（`status=visited`）から1〜2日後、かつ`providers.google_review_url`設定済み | 未設定の店舗はスキップ（無理にクチコミを求めない） |
| `birthday-nudge` | `app/api/cron/birthday-nudge/route.js` | 1:00（毎日） | `profiles.birthday`の月日が今日と一致、かつNew Me Logで店舗と紐づけ済み | `provider_birthday_nudges`で年1回だけに制限 |

## ノーショー対策のWebhook

`app/api/line/webhook/[providerId]/route.js`が、上記クイックリプライのポストバックを受信する。

- `providerId`は`'fineme'`（Fineme公式チャネル）または`providers.id`（店舗別チャネル）
- 署名検証は`lib/line-channel.js`の`verifyLineSignature()`（HMAC-SHA256）
- `action=confirm`→`reservations.confirmed_by_customer`を更新
- `action=reschedule`→店舗へ直接連絡するよう案内
- `action=log_visit`→New Me Logの来店記録（`recordLineVisit()`）

## テンプレート管理

文面はハードコード（各cronファイル内・`lib/log-voice.js`）。店舗ごとのカスタムテンプレートは現状無い。将来的にテンプレート管理が必要になった場合は、`provider_dormant_settings`と同様の店舗別設定テーブルとして追加する想定。
