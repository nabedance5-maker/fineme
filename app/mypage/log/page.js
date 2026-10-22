'use client';
import ServiceLog from '@/app/_components/ServiceLog';
import MypageSideNav from '../_components/MypageSideNav';

// 中身は app/_components/ServiceLog.js。/log（未ログインでも使える入口）と同じ実体を使う。
// トラック対応と同じ理由で複製しない（片方だけ直し忘れる事故を構造的に防ぐ）。
export default function NewMeLogPage() {
  return (
    <main className="section">
      <div className="container mypage-layout">
        <MypageSideNav />

        <section className="mypage-content">
          <ServiceLog />
        </section>
      </div>

      <style>{`
      `}</style>
    </main>
  );
}
