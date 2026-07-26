'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { syncLocalDiagnosisToServer } from '@/lib/track';
import { syncLocalLogsToServer } from '@/lib/log-store';

const SUPABASE_URL = 'https://qsfpzlvucqzmjldshwwd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
const SITE_URL = 'https://fineme.me';

async function syncLocalDiagnosis(accessToken) {
  // 男性版・Belle版の両方を引き継ぐ（lib/track.js に共通化）
  await syncLocalDiagnosisToServer(accessToken);
  // New Me Log のゲスト記録も同じタイミングで引き継ぐ
  await syncLocalLogsToServer(accessToken);
}

export default function LoginPage() {
  const [view, setView] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [isProvider, setIsProvider] = useState(false);

  // ログインフォームの状態
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 新規登録フォームの状態
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupOk, setSignupOk] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // パスワード再設定フォームの状態
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetOk, setResetOk] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'signup') setView('signup');
    if (params.get('type') === 'provider') setIsProvider(true);
  }, []);

  async function handleLogin() {
    setLoginError('');
    if (!email || !password) {
      setLoginError('メールアドレスとパスワードを入力してください');
      return;
    }
    setLoginLoading(true);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError('ログインエラー: ' + error.message);
      setLoginLoading(false);
      return;
    }
    // 匿名診断データがあればクラウドに同期
    await syncLocalDiagnosis(data.session.access_token);

    // ?next= パラメータがあればそこへ（ユーザー側ログイン）
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next) {
      window.location.href = next;
      return;
    }
    // 掲載者かチェック（直接 /login アクセス時は掲載者ダッシュボードへ）
    const res = await fetch('/api/provider/me', {
      headers: { 'Authorization': `Bearer ${data.session.access_token}` },
    });
    if (res.ok) {
      window.location.href = '/provider/dashboard';
    } else {
      window.location.href = '/mypage';
    }
    setLoginLoading(false);
  }

  function handleLoginKeyDown(e) {
    if (e.key === 'Enter') handleLogin();
  }

  async function handleSignup() {
    setSignupError('');
    setSignupOk('');
    if (!signupEmail || !signupPassword) {
      setSignupError('メールアドレスとパスワードを入力してください');
      return;
    }
    if (signupPassword.length < 8) {
      setSignupError('パスワードは8文字以上にしてください');
      return;
    }
    setSignupLoading(true);
    const { data, error } = await sb.auth.signUp({ email: signupEmail, password: signupPassword });
    if (error) {
      setSignupError('登録エラー: ' + error.message);
      setSignupLoading(false);
      return;
    }
    // セッションがある場合（メール確認不要設定）は即ログイン
    if (data.session?.access_token) {
      await syncLocalDiagnosis(data.session.access_token);
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      window.location.href = next || '/mypage';
      return;
    }
    // メール確認が必要な場合
    setSignupOk('確認メールを送りました。メール内のリンクをクリックしてください。');
    setSignupLoading(false);
  }

  async function handleReset() {
    setResetError('');
    setResetOk('');
    if (!resetEmail) {
      setResetError('メールアドレスを入力してください');
      return;
    }
    setResetLoading(true);
    const { error } = await sb.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${SITE_URL}/auth/callback`,
    });
    setResetLoading(false);
    if (error) {
      setResetError('送信に失敗しました: ' + error.message);
    } else {
      setResetOk('パスワード再設定メールを送りました。メールを確認してください。');
    }
  }

  return (
    <div style={{ maxWidth: '420px', margin: '60px auto', padding: '0 20px' }}>
      <div style={{
        background: 'rgba(10,15,30,0.65)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(232,228,220,0.15)',
        borderRadius: '18px',
        padding: '32px',
        boxShadow: '0 4px 24px rgba(2,6,23,.06)',
      }}>

        {/* ログインフォーム */}
        {view === 'login' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>ログイン</h1>
            <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.55)', margin: '0 0 24px' }}>
              登録されたメールアドレスとパスワードを入力してください
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)' }}>メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleLoginKeyDown}
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  padding: '12px 14px',
                  border: '1px solid rgba(232,228,220,0.15)',
                  borderRadius: '10px',
                  fontSize: '15px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)' }}>パスワード</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleLoginKeyDown}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    padding: '12px 44px 12px 14px',
                    border: '1px solid rgba(232,228,220,0.15)',
                    borderRadius: '10px',
                    fontSize: '15px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6b7280', padding: '4px' }}
                  aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {loginError && (
              <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 8px' }}>{loginError}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={loginLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: '#111',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                opacity: loginLoading ? 0.4 : 1,
                marginTop: '4px',
              }}
            >
              {loginLoading ? 'ログイン中…' : 'ログイン'}
            </button>

            {!isProvider && (
              <>
                {/* 区切り線 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 4px' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                  <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>または</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                </div>

                {/* LINE ログインボタン */}
                <a
                  href={`/api/auth/line-login?type=login${typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('next') ? '&next=' + encodeURIComponent(new URLSearchParams(window.location.search).get('next')) : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '14px',
                    background: '#06C755',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                    <path d="M12 2C6.477 2 2 6.077 2 11.1c0 2.65 1.09 5.03 2.844 6.73C4.59 18.97 4 20.516 4 22c0 .166.1.315.25.382C4.397 22.46 4.558 22.437 4.68 22.34L7.6 20H12c5.523 0 10-4.077 10-9.1C22 6.077 17.523 2 12 2z"/>
                  </svg>
                  LINEでログイン
                </a>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: isProvider ? 'flex-end' : 'space-between', alignItems: 'center', marginTop: '12px' }}>
              {!isProvider && (
                <button
                  onClick={() => setView('signup')}
                  style={{ fontSize: '13px', color: '#6366f1', cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none' }}
                >
                  アカウントをお持ちでない方
                </button>
              )}
              <button
                onClick={() => setView('forgot')}
                style={{ fontSize: '13px', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none' }}
              >
                パスワードを忘れた方
              </button>
            </div>
          </div>
        )}

        {/* 新規登録フォーム */}
        {view === 'signup' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>無料アカウント登録</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>
              診断結果をクラウドに保存して、どのデバイスからでも続きを見られます。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>メールアドレス</label>
              <input
                type="email"
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                placeholder="you@example.com"
                autoComplete="email"
                style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '15px', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>パスワード（8文字以上）</label>
              <input
                type="password"
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                placeholder="••••••••"
                autoComplete="new-password"
                style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '15px', width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            {signupError && <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 8px' }}>{signupError}</p>}
            {signupOk && <p style={{ color: '#059669', fontSize: '13px', margin: '0 0 8px' }}>{signupOk}</p>}

            <button
              onClick={handleSignup}
              disabled={signupLoading}
              style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0a0f1e', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: signupLoading ? 'not-allowed' : 'pointer', opacity: signupLoading ? 0.4 : 1, marginTop: '4px' }}
            >
              {signupLoading ? '登録中…' : '無料登録する'}
            </button>

            {/* 区切り線 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 4px' }}>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              <span style={{ fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>または</span>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            </div>

            {/* LINE 登録ボタン */}
            <a
              href="/api/auth/line-login?type=signup"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '14px',
                background: '#06C755',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                <path d="M12 2C6.477 2 2 6.077 2 11.1c0 2.65 1.09 5.03 2.844 6.73C4.59 18.97 4 20.516 4 22c0 .166.1.315.25.382C4.397 22.46 4.558 22.437 4.68 22.34L7.6 20H12c5.523 0 10-4.077 10-9.1C22 6.077 17.523 2 12 2z"/>
              </svg>
              LINEで登録する
            </a>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                onClick={() => setView('login')}
                style={{ fontSize: '13px', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none' }}
              >
                すでにアカウントをお持ちの方
              </button>
            </div>
          </div>
        )}

        {/* パスワード再設定フォーム */}
        {view === 'forgot' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>パスワードを忘れた方へ</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>
              登録済みのメールアドレスを入力すると、パスワード再設定メールをお送りします。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>メールアドレス</label>
              <input
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  padding: '12px 14px',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '15px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {resetError && (
              <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 8px' }}>{resetError}</p>
            )}
            {resetOk && (
              <p style={{ color: '#059669', fontSize: '13px', margin: '0 0 8px' }}>{resetOk}</p>
            )}

            <button
              onClick={handleReset}
              disabled={resetLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: '#111',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: resetLoading ? 'not-allowed' : 'pointer',
                opacity: resetLoading ? 0.4 : 1,
                marginTop: '4px',
              }}
            >
              {resetLoading ? '送信中…' : '再設定メールを送る'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <button
                onClick={() => setView('login')}
                style={{
                  fontSize: '13px',
                  color: '#6366f1',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                }}
              >
                ログインに戻る
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
