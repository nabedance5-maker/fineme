// 診断結果は本人のlocalStorageのデータでしか中身が出ない個人用ページ。
// クローラには空状態に見えてソフト404になるため、インデックス対象から外す。
export const metadata = {
  robots: { index: false, follow: true },
};

export default function Layout({ children }) {
  return children;
}
