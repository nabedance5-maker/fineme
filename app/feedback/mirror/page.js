'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function FeedbackForm() {
  const params = useSearchParams();
  const sessionId = params.get('sid');

  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error | invalid

  useEffect(() => {
    if (!sessionId) setStatus('invalid');
  }, [sessionId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || !sessionId) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback/mirror', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, text }),
      });
      if (res.ok) {
        setStatus('done');
      } else {
        const { error } = await res.json();
        console.error(error);
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'invalid') {
    return (
      <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.5)', textAlign: 'center', lineHeight: 1.9 }}>
        リンクが無効です。<br />
        メールのリンクからもう一度お試しください。
      </p>
    );
  }

  if (status === 'done') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🪞</div>
        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', marginBottom: '12px', lineHeight: 1.4 }}>
          ありがとうございます。<br />
          <span style={{ color: '#c9a84c' }}>声が届きました。</span>
        </h2>
        <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.55)', lineHeight: 1.85, marginBottom: '28px' }}>
          いただいた言葉は、でおが確認のうえ、<br />
          同じ悩みを持つ誰かの背中を押すために使わせていただきます。
        </p>
        <Link href="/mypage/navi" style={{ fontSize: '14px', color: 'rgba(201,168,76,0.8)', textDecoration: 'none', fontWeight: 700 }}>
          New Me Map を確認する →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label style={{ display: 'block', fontSize: '13px', color: 'rgba(232,228,220,0.55)', marginBottom: '10px', lineHeight: 1.7 }}>
        Mirrorを使ってみて、気づいたことや感じたことを聞かせてください。<br />
        <span style={{ color: 'rgba(201,168,76,0.7)' }}>1〜2文でOKです。</span>
      </label>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="例：「眉毛を変えると良さそうとわかり、さっそく予約した」「自分では気づかなかった点を指摘してもらえた」"
        maxLength={2000}
        rows={5}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: '10px', padding: '14px 16px',
          color: 'rgba(232,228,220,0.88)', fontSize: '14px', lineHeight: 1.75,
          resize: 'vertical', outline: 'none', marginBottom: '16px',
          fontFamily: '-apple-system, sans-serif',
        }}
        required
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.25)', lineHeight: 1.6, margin: 0 }}>
          内容はでおが確認。ご本人の同意なしには公開しません。
        </p>
        <button
          type="submit"
          disabled={status === 'sending' || !text.trim()}
          style={{
            background: 'linear-gradient(135deg,#c9a84c,#e8c97a)',
            color: '#0a0f1e', fontWeight: 900, fontSize: '14px',
            padding: '12px 32px', borderRadius: '10px', border: 'none',
            cursor: status === 'sending' ? 'not-allowed' : 'pointer',
            opacity: (!text.trim() || status === 'sending') ? 0.55 : 1,
          }}
        >
          {status === 'sending' ? '送信中…' : '送信する →'}
        </button>
      </div>
      {status === 'error' && (
        <p style={{ fontSize: '13px', color: 'rgba(240,80,80,0.8)', marginTop: '12px' }}>
          送信に失敗しました。もう一度お試しください。
        </p>
      )}
    </form>
  );
}

export default function MirrorFeedbackPage() {
  return (
    <main style={{ background: '#080d1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.14em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '14px', textAlign: 'center' }}>
          🪞 Fineme Mirror
        </p>
        <h1 style={{ fontSize: 'clamp(20px,5vw,26px)', fontWeight: 900, fontFamily: 'Georgia, serif', color: '#fff', marginBottom: '24px', lineHeight: 1.4, textAlign: 'center' }}>
          分析から1日。<br />
          <span style={{ color: '#c9a84c' }}>気づきを聞かせてください。</span>
        </h1>
        <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: '14px', padding: 'clamp(24px,5vw,36px)' }}>
          <Suspense fallback={<p style={{ color: 'rgba(232,228,220,0.4)', fontSize: '14px' }}>読み込み中…</p>}>
            <FeedbackForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
