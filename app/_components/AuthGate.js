'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AuthGate({ children, pageName = 'このページ' }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'gate'

  useEffect(() => {
    try {
      const sbKey = Object.keys(localStorage).find(
        k => k.startsWith('sb-') && k.endsWith('-auth-token')
      );
      if (sbKey) {
        const obj = JSON.parse(localStorage.getItem(sbKey) || 'null');
        if (obj?.user?.id) { setStatus('ok'); return; }
      }
    } catch {}
    setStatus('gate');
  }, []);

  if (status === 'loading') return <>{children}</>;

  if (status === 'gate') {
    return (
      <>
        <style>{`
          .auth-gate-wrap {
            min-height: 60vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px 20px;
          }
          .auth-gate-card {
            max-width: 480px;
            width: 100%;
            background: #fff;
            border: 1px solid rgba(201,168,76,0.25);
            border-radius: 18px;
            padding: 40px 32px;
            text-align: center;
            box-shadow: 0 4px 32px rgba(0,0,0,0.06);
            color: #1a1410;
            text-shadow: none;
          }
          .auth-gate-icon {
            font-size: 40px;
            margin: 0 0 16px;
          }
          .auth-gate-title {
            font-family: 'Noto Serif JP', Georgia, serif;
            font-size: 18px;
            font-weight: 700;
            color: #0a0f1e;
            margin: 0 0 12px;
            line-height: 1.6;
          }
          .auth-gate-desc {
            font-size: 14px;
            color: #6b7280;
            line-height: 1.85;
            margin: 0 0 28px;
          }
          .auth-gate-cta-primary {
            display: block;
            width: 100%;
            padding: 15px 24px;
            background: #c9a84c;
            color: #0a0f1e;
            font-size: 15px;
            font-weight: 700;
            border-radius: 6px;
            text-decoration: none;
            letter-spacing: .05em;
            margin-bottom: 12px;
            transition: opacity .15s;
          }
          .auth-gate-cta-primary:hover { opacity: .88; }
          .auth-gate-login-link {
            font-size: 13px;
            color: #9ca3af;
            text-decoration: none;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 2px;
            transition: color .15s;
          }
          .auth-gate-login-link:hover { color: #0a0f1e; }
        `}</style>
        <div className="auth-gate-wrap">
          <div className="auth-gate-card">
            <div className="auth-gate-icon">🗺️</div>
            <h2 className="auth-gate-title">
              ここはあなただけの<br />{pageName}が届く場所です。
            </h2>
            <p className="auth-gate-desc">
              Me Scanを受けると、8軸の現在地と変容ロードマップ<br />
              （Fineme Compass）がここに保存されます。<br />
              診断はアカウントなしで受けられます。
            </p>
            <Link href="/diagnosis" className="auth-gate-cta-primary">
              🧬 Me Scanを受ける（無料・約15分）
            </Link>
            <Link href="/login" className="auth-gate-login-link">
              すでにアカウントをお持ちの方はログイン
            </Link>
          </div>
        </div>
      </>
    );
  }

  return children;
}
