// 営業パートナーの紹介コードを、申込ページから登録・相談フォームまで引き継ぐ。
// URLの ?ref= が最優先。無い時は、専用申込ページ（/join/[code]）や ?ref= 付きの
// 導入ページを開いた時に保存したクッキーを使う（別のページを回ってから申し込んでも
// 紹介が記録されるように・90日）。ブラウザ専用。
export const REF_COOKIE = 'fineme_ref';
const REF_RE = /^[A-Za-z0-9_-]{1,40}$/;
const MAX_AGE = 60 * 60 * 24 * 90;

export function saveRef(code) {
  if (!REF_RE.test(code || '')) return;
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(code)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;
}

export function readRef() {
  const fromUrl = new URLSearchParams(location.search).get('ref');
  if (REF_RE.test(fromUrl || '')) return fromUrl;
  const m = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]*)`));
  const fromCookie = m ? decodeURIComponent(m[1]) : '';
  return REF_RE.test(fromCookie) ? fromCookie : '';
}
