// 社内向けのドラマ制作進行ボードなので、検索の対象にしない（配下の /drama/brief も同じ方針）。
export const metadata = {
  robots: { index: false, follow: false },
};

export default function DramaLayout({ children }) {
  return children;
}
