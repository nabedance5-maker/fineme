// 店舗向けの記事の編集で使うキーの種類。
// admin：管理APIキー（ADMIN_API_KEY）。何でも直せる。
// image：記事の画像だけを扱うキー（GUIDE_IMAGE_KEY・Muse 用、2026-11-19）。画像の設定と公開／非公開の切り替えだけ。本文・タイトルは変えられず、記事も足せない。
// 他の管理API（予約・顧客・決済など）は ADMIN_API_KEY しか受け付けないので、image のキーでは触れない。
export function guideRole(request) {
  const key = request.headers.get('x-admin-key');
  if (!key) return null;
  if (process.env.ADMIN_API_KEY && key === process.env.ADMIN_API_KEY) return 'admin';
  if (process.env.GUIDE_IMAGE_KEY && process.env.GUIDE_IMAGE_KEY.length >= 24 && key === process.env.GUIDE_IMAGE_KEY) return 'image';
  return null;
}
