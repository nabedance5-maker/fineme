import Link from 'next/link';
import s from './encompass.module.css';

// ENCOMPASS メニューボード（仮称）。渡邉方針 2026-11-19：ドメインは Fineme と同じ、商品は店舗SaaSとは分けて売る。
// 試作のうちは検索に出さない（公開・料金が決まったら外す）。
export const metadata = {
  title: 'ENCOMPASS メニューボード（試作）',
  description: 'ENCOMPASS のメニューを、動画と画像で作って、タブレットに出しっぱなしにできる道具。',
  robots: { index: false, follow: false },
};

export default function EncompassLayout({ children }) {
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link href="/encompass" className={s.brand}>
          メニューボード
          <span className={s.brandSub}>ENCOMPASS 用（試作）</span>
        </Link>
        <Link href="/encompass/saved" className={s.headerLink}>保存したメニュー</Link>
      </header>
      {children}
      <footer className={s.main} style={{ paddingTop: 0 }}>
        <p className={s.note}>
          ENCOMPASS は米 Total Gym 社の製品です。このサービスは Total Gym 社・日本総代理店の公式サービスではありません。
          動画は Total Gym 社などが YouTube に公開しているものを、YouTube のプレイヤーでそのまま表示しています。
        </p>
      </footer>
    </div>
  );
}
