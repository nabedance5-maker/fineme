'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qsfpzlvucqzmjldshwwd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
const SITE_URL = 'https://fineme.me';

export default function LoginPage() {
  const [view, setView] = useState('login'); // 'login' | 'forgot'

  // ログインフォームの状態
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // パスワード再設定フォームの状態
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetOk, setResetOk] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '18px',
        padding: '32px',
        boxShadow: '0 4px 24px rgba(2,6,23,.06)',
      }}>

        {/* ログインフォーム */}
        {view === 'login' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px' }}>ログイン</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px' }}>
              登録されたメールアドレスとパスワードを入力してください
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleLoginKeyDown}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleLoginKeyDown}
                placeholder="••••••••"
                autoComplete="current-password"
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

            <div style={{ textAlign: 'right', marginTop: '12px' }}>
              <button
                onClick={() => setView('forgot')}
                style={{
                  fontSize: '13px',
                  color: '#6366f1',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                }}
              >
                パスワードを忘れた方はこちら
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
