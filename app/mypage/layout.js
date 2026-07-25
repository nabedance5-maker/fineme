import TrackBadge from './_components/TrackBadge';

// /mypage/* は男性トラックとBelleで共用する。
// トラックごとにページを複製すると片方だけ直し忘れる事故が起きるため、
// 1つのマイページがトラックに応じてリンク・記事・色を切り替える方針（でお決定 2026-07-26）。
export default function MyPageLayout({ children }) {
  return (
    <>
      <TrackBadge />
      {children}
    </>
  );
}
