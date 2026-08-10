// でお本人のテスト購入かどうかをメールアドレスで判定する。
// OWNER_TEST_EMAILS（カンマ区切り）未設定時は OWNER_EMAIL 1件のみを既知扱いにする。
export function isOwnerTestEmail(email) {
  if (!email) return false;
  const known = (process.env.OWNER_TEST_EMAILS || process.env.OWNER_EMAIL || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return known.includes(email.trim().toLowerCase());
}
