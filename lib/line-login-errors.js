// LINEログインの失敗理由（/login?line_error=...）を、利用者向けの文面に変える。
// 内部のコードはそのまま見せない（Muse指示書 2026-11-24 マイページ残課題 §1）。
// コードを出す側：app/api/auth/line-callback/route.js・app/auth/line-session/page.js

const RETRY = 'もう一度「LINEでログイン」を押してください。続く場合は、メールアドレスとパスワードでログインしてください。';

const MESSAGES = {
  // LINEの画面で「許可しない」を選んだ時など（LINEから error=access_denied 等で戻る）
  access_denied: 'LINEでのログインがキャンセルされました。続ける場合は、もう一度「LINEでログイン」を押してください。',
  user_lookup_failed: 'このLINEアカウントと連携されたFinemeアカウントが見つかりませんでした。メールアドレスとパスワードでログインするか、新規登録してください。',
  user_create_failed: `Finemeアカウントの確認中に問題が起きました。${RETRY}`,
  session_create_failed: `ログインの手続きを完了できませんでした。${RETRY}`,
  session_not_found: `ログインの手続きを完了できませんでした。${RETRY}`,
  state_expired: 'ログインの受付時間（10分）が過ぎました。もう一度「LINEでログイン」を押してください。',
  invalid_state: `ログインの確認ができませんでした。${RETRY}`,
  missing_params: `LINEからの情報を受け取れませんでした。${RETRY}`,
  token_exchange_failed: `LINEとの通信がうまくいきませんでした。${RETRY}`,
  profile_fetch_failed: `LINEのプロフィールを受け取れませんでした。${RETRY}`,
  server_config: 'ただいまLINEでのログインを使えません。メールアドレスとパスワードでログインしてください。',
};

export function lineLoginErrorMessage(code) {
  if (!code) return '';
  return MESSAGES[code] || `LINEでのログインに失敗しました。${RETRY}`;
}
