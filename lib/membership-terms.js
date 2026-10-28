// 入会の利用規約・同意書のファイル・リンク（でお要望 2026-10-28：PDFだけでなく画像・リンクでも）。
// provider_membership_settings.terms_files に [{ url, name, kind }] で持ち、入会の申込には同意した時点の一覧を写す。
export const TERMS_KINDS = ['pdf', 'image', 'link'];
export const MAX_TERMS_FILES = 10;
export const TERMS_KIND_LABEL = { pdf: 'PDF', image: '画像', link: 'リンク' };

const isHttp = u => { try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; } catch { return false; } };

export function normalizeTermsFiles(list) {
  return (Array.isArray(list) ? list : [])
    .filter(f => f && TERMS_KINDS.includes(f.kind) && isHttp(f.url))
    .map(f => ({ url: new URL(f.url).href.slice(0, 1000), // href にすると " などが符号化され、画面に埋めても崩れない
      name: String(f.name || '').trim().slice(0, 120) || '利用規約', kind: f.kind }))
    .slice(0, MAX_TERMS_FILES);
}

export { isHttp as isHttpUrl };
