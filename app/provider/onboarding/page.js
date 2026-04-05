'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const _sb = createClient(
  'https://qsfpzlvucqzmjldshwwd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
);

const STEPS = [
  {
    id: 'profile',
    title: 'プロフィールを入力する',
    desc: '名前・写真・所在地・サービス説明を設定します。充実度が掲載順位に直結します。',
    action: 'プロフィールを入力',
    href: '/provider/dashboard?tab=profile',
    check: (p) => !!(p.name && p.description && p.prefecture),
    icon: '👤',
  },
  {
    id: 'service',
    title: 'サービス内容を設定する',
    desc: '提供するサービスのカテゴリ・価格・特徴を入力します。AIマッチングの精度に影響します。',
    action: 'サービスを設定',
    href: '/provider/dashboard?tab=service',
    check: (p) => !!(p.price_from),
    icon: '🛠️',
  },
  {
    id: 'ai_profile',
    title: 'AIプロフィールを生成する',
    desc: 'あなたのプロフィールを元にAIが「どんな人に向いているか」を自動生成。マッチング精度が大幅に上がります。',
    action: 'AIで分析する',
    href: '/provider/dashboard?tab=service',
    check: (p) => !!(p.ai_match_profile),
    icon: '🤖',
  },
  {
    id: 'photo',
    title: '写真を追加する',
    desc: '顔写真・施術写真・ビフォーアフターを追加します。写真がある掲載者はCTRが3倍以上になります。',
    action: '写真を追加',
    href: '/provider/dashboard?tab=photos',
    check: (p) => !!(p.photo_url || (p.facility_photos && p.facility_photos.length > 0)),
    icon: '📷',
  },
  {
    id: 'story',
    title: '体験談を1件取得する',
    desc: 'お客様に体験談を書いてもらいましょう。1件でも社会的証明として大きく効きます。',
    action: '体験談ページを確認',
    href: '/provider/dashboard?tab=stories',
    check: (p) => !!(p._story_count > 0),
    icon: '⭐',
  },
  {
    id: 'connect',
    title: '振込口座を設定する',
    desc: '予約手数料をお振り込みするために必要です。Stripe Connectで安全に設定できます。',
    action: '口座を設定する',
    href: '/provider/billing',
    check: (p) => p.stripe_connect_status === 'active',
    icon: '🏦',
  },
];

export default function ProviderOnboardingPage() {
  const [provider, setProvider] = useState(null);
  const [storyCount, setStoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await _sb.auth.getSession();
      if (!session) { location.href = '/login?type=provider&next=/provider/onboarding'; return; }

      const token = session.access_token;

      try {
        const [provRes, storyRes] = await Promise.all([
          fetch('/api/provider/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/provider/stories', { headers: { 'Authorization': `Bearer ${token}` } }),
        ]);

        if (provRes.ok) {
          const data = await provRes.json();
          setProvider(data);
        }
        if (storyRes.ok) {
          const stories = await storyRes.json();
          setStoryCount(Array.isArray(stories) ? stories.filter(s => s.status === 'approved').length : 0);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <main className="section"><div className="container"><p className="muted">読み込み中...</p></div></main>;
  }

  const providerWithCount = provider ? { ...provider, _story_count: storyCount } : null;
  const completedCount = providerWithCount ? STEPS.filter(s => s.check(providerWithCount)).length : 0;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: '720px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 className="section-title" style={{ marginBottom: '8px' }}>掲載者オンボーディング</h1>
          <p className="muted" style={{ fontSize: '14px' }}>6つのステップを完了すると、マッチング精度と掲載順位が最大化されます。</p>
        </div>

        {/* 進捗バー */}
        <div style={{ marginBottom: '32px', padding: '20px', background: 'rgba(10,15,30,0.65)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>完了率</span>
            <span style={{ fontWeight: 800, fontSize: '22px', color: progress === 100 ? '#10b981' : '#c9a84c' }}>{progress}%</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(232,228,220,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? '#10b981' : 'linear-gradient(90deg,#c9a84c,#e8c97a)', borderRadius: '99px', transition: 'width .4s' }} />
          </div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#9ca3af', fontFamily: 'sans-serif' }}>
            {completedCount}/{STEPS.length} ステップ完了
            {progress === 100 && <span style={{ color: '#10b981', marginLeft: '8px', fontWeight: 600 }}>🎉 すべて完了！</span>}
          </div>
        </div>

        {/* ステップ一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {STEPS.map((step, i) => {
            const done = providerWithCount ? step.check(providerWithCount) : false;
            return (
              <div
                key={step.id}
                style={{
                  padding: '20px',
                  background: 'rgba(10,15,30,0.65)',
                  border: `1px solid ${done ? 'rgba(16,185,129,0.4)' : 'rgba(232,228,220,0.12)'}`,
                  borderRadius: '14px',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  opacity: done ? 0.75 : 1,
                }}
              >
                {/* アイコン・チェック */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: done ? 'rgba(16,185,129,0.15)' : 'rgba(201,168,76,0.1)',
                  border: `2px solid ${done ? 'rgba(16,185,129,0.4)' : 'rgba(201,168,76,0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: done ? '18px' : '20px',
                  flexShrink: 0,
                }}>
                  {done ? '✓' : step.icon}
                </div>

                {/* テキスト */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px', color: done ? '#6b7280' : '#e8e4dc' }}>
                      {i + 1}. {step.title}
                    </span>
                    {done && <span style={{ fontSize: '11px', background: 'rgba(16,185,129,.2)', color: '#10b981', padding: '2px 8px', borderRadius: '99px', fontFamily: 'sans-serif', fontWeight: 600 }}>完了</span>}
                  </div>
                  <p style={{ fontSize: '13px', color: '#9ca3af', fontFamily: 'sans-serif', lineHeight: '1.7', margin: '0 0 10px' }}>{step.desc}</p>
                  {!done && (
                    <Link
                      href={step.href}
                      style={{
                        display: 'inline-block',
                        padding: '7px 16px',
                        background: 'rgba(201,168,76,0.15)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        borderRadius: '8px',
                        color: '#c9a84c',
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: 'sans-serif',
                        textDecoration: 'none',
                      }}
                    >
                      {step.action} →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 完了後メッセージ */}
        {progress === 100 && (
          <div style={{ marginTop: '24px', padding: '24px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <div style={{ fontWeight: 700, fontSize: '18px', color: '#10b981', marginBottom: '8px' }}>すべてのステップが完了しました！</div>
            <p style={{ fontSize: '14px', color: '#9ca3af', fontFamily: 'sans-serif', marginBottom: '16px' }}>あなたのページは最高の状態でユーザーに表示されています。</p>
            <Link href="/provider/dashboard" style={{ display: 'inline-block', padding: '10px 24px', background: '#10b981', borderRadius: '8px', color: '#fff', fontWeight: 700, fontFamily: 'sans-serif', textDecoration: 'none' }}>
              ダッシュボードへ
            </Link>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link href="/provider/dashboard" style={{ fontSize: '13px', color: '#6b7280', fontFamily: 'sans-serif' }}>
            ← ダッシュボードに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
