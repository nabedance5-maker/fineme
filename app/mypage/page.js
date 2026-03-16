'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseAnon = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

const GOAL_MAP = {
  consulting: 'コンサル/相談', gym: 'パーソナルジム', makeup: 'メイク', hair: '美容室',
  diagnosis: '診断', fashion: 'ファッション', photo: '写真/撮影', marriage: '婚活/印象',
  eyebrow: '眉', hairremoval: '脱毛', esthetic: 'エステ', cosmetic: '美容外科・美容クリニック',
  whitening: 'ホワイトニング', orthodontics: '矯正', nail: 'ネイル',
};

export default function MypagePage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resvSummary, setResvSummary] = useState(null);
  const [goalCategory, setGoalCategory] = useState(null);

  useEffect(() => {
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (sbKey) {
      try {
        const obj = JSON.parse(localStorage.getItem(sbKey));
        if (obj?.user?.id) {
          setSession(obj);
          setLoading(false);

          // 目的カテゴリ読み込み
          try {
            const saved = localStorage.getItem('fineme:goal:category');
            if (saved) setGoalCategory(saved);
          } catch {}

          // 予約サマリー取得
          const email = obj.user.email;
          if (email) {
            supabaseAnon.auth.getSession().then(({ data }) => {
              const userEmail = data?.session?.user?.email || email;
              fetch('/api/reservations/by-contact?contact=' + encodeURIComponent(userEmail))
                .then(r => r.ok ? r.json() : [])
                .then(items => {
                  if (!Array.isArray(items) || !items.length) {
                    setResvSummary({ empty: true });
                    return;
                  }
                  const pending = items.filter(r => r.status === 'pending').length;
                  const counter = items.filter(r => r.status === 'counter_proposed').length;
                  const approved = items.filter(r => r.status === 'approved').length;
                  setResvSummary({ total: items.length, pending, counter, approved });
                })
                .catch(() => setResvSummary({ error: true }));
            });
          }
          return;
        }
      } catch {}
    }
    window.location.href = '/login';
  }, []);

  function handleSignOut() {
    supabaseAnon.auth.signOut().then(() => {
      window.location.href = '/login';
    });
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '60px' }}>読み込み中...</div>;

  const goalLabel = goalCategory ? (GOAL_MAP[goalCategory] || goalCategory) : null;

  return (
    <main className="section">
      <div className="container mypage-layout">
        {/* サイドナビ（シンプルなリンク群） */}
        <aside className="mypage-sidenav">
          <nav className="stack" style={{ gap: '4px' }}>
            <Link href="/mypage" className="sidenav-link sidenav-link--active">ホーム</Link>
            <Link href="/mypage/diagnosis" className="sidenav-link">診断結果</Link>
            <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
            <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
            <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
            <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
          </nav>
        </aside>

        <section className="stack">
          <h1 className="section-title">マイページ</h1>
          <p className="muted">予約履歴・お気に入り・閲覧履歴・プロフィール編集が利用できます。</p>

          {/* 予約状況 */}
          <div className="card" style={{ padding: '16px' }}>
            <h2>予約状況</h2>
            {resvSummary === null && <p className="muted">読み込み中…</p>}
            {resvSummary?.error && <p className="muted">予約状況を取得できませんでした。</p>}
            {resvSummary?.empty && <p className="muted">まだ予約はありません。</p>}
            {resvSummary?.total > 0 && (
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '14px' }}>予約: <strong>{resvSummary.total}件</strong></p>
                {resvSummary.counter > 0 && (
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#6366f1', fontWeight: 700 }}>
                    代替提案あり: {resvSummary.counter}件 → 確認が必要です
                  </p>
                )}
                {resvSummary.pending > 0 && (
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#f59e0b' }}>
                    返答待ち: {resvSummary.pending}件
                  </p>
                )}
                {resvSummary.approved > 0 && (
                  <p style={{ margin: '0', fontSize: '13px', color: '#10b981' }}>
                    承認済み: {resvSummary.approved}件
                  </p>
                )}
              </div>
            )}
            <div className="cluster" style={{ gap: '8px', marginTop: '12px' }}>
              <Link href="/search" className="btn" style={{ color: '#111' }}>サービスを探す</Link>
              <Link href="/my-reservations" className="btn btn-ghost">予約履歴を見る</Link>
            </div>
          </div>

          {/* あなたの目的 */}
          <div className="card" style={{ padding: '16px' }}>
            <h2>あなたの目的</h2>
            <div className="cluster" style={{ gap: '8px', flexWrap: 'wrap' }}>
              {goalLabel ? (
                <>
                  <p className="muted" style={{ margin: 0 }}>保存された目的：{goalLabel}</p>
                  <Link href={`/search?category=${encodeURIComponent(goalCategory)}`} className="btn">
                    {goalLabel}で探す
                  </Link>
                  <Link href="/search?diag=1&top=3&origin=mypage" className="btn btn-ghost">
                    タイプに合うスターター3選
                  </Link>
                  <Link href="/search?quick=today" className="btn btn-ghost">今日行ける</Link>
                  <Link href="/search?quick=weekend" className="btn btn-ghost">週末行ける</Link>
                </>
              ) : (
                <p className="muted" style={{ margin: 0 }}>目的がまだ設定されていません。</p>
              )}
            </div>
          </div>

          <div>
            <button className="btn btn-ghost" onClick={handleSignOut}>ログアウト</button>
          </div>
        </section>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; margin-bottom: 8px; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #374151; text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: #f3f4f6; }
        .sidenav-link--active { background: #f3f4f6; font-weight: 700; color: #111; }
      `}</style>
    </main>
  );
}
