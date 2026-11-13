// 個人のMirror結果にもとづくマッチング結果のページなので、検索の対象にしない。
export const metadata = {
  robots: { index: false, follow: false },
};

export default function MirrorMatchLayout({ children }) {
  return children;
}
