'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { syncLocalDiagnosisToServer } from '@/lib/track';
import { syncLocalLogsToServer } from '@/lib/log-store';

const SUPABASE_URL = 'https://qsfpzlvucqzmjldshwwd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

async function syncLocalDiagnosis(accessToken) {
  // 男性版・Belle版の両方を引き継ぐ（lib/track.js に共通化）
  // New Me Log のゲスト記録も同じタイミングで引き継ぐ
  await syncLocalLogsToServer(accessToken);
  return syncLocalDiagnosisToServer(accessToken);
}

// パスワード設定フォーム
function PasswordForm({ onSubmit, loading, error }) {
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [localError, setLocalError] = useState('');

  function handleClick() {
    setLocalError('');
    if (pw1.length < 8) { setLocalError('パスワードは8文字以上で入力してください'); return; }
    if (pw1 !== pw2) { setLocalError('パスワードが一致しません'); return; }
    onSubmit(pw1);
  }

  const displayError = localError || error;

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px' }}>パスワードを設定してください</h2>
      <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.55)', margin: '0 0 20px' }}>
        掲載者ダッシュボードへのログインに使用します。
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
        <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)' }}>
          新しいパスワード（8文字以上）
        </label>
        <input
          type="password"
          value={pw1}
          onChange={e => setPw1(e.target.value)}
          placeholder="••••••••"
          minLength={8}
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
        <label style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(232,228,220,0.75)' }}>パスワード（確認）</label>
        <input
          type="password"
          value={pw2}
          onChange={e => setPw2(e.target.value)}
          placeholder="••••••••"
          minLength={8}
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

      {displayError && (
        <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 12px' }}>{displayError}</p>
      )}

      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px',
          background: '#111',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '700',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.4 : 1,
        }}
      >
        {loading ? '設定中…' : 'パスワードを設定して開始する'}
      </button>
    </div>
  );
}

export default function AuthCallbackPage() {
  // 'loading' | 'password-form' | 'invalid' | 'error'
  const [status, setStatus] = useState('loading');
  const [session, setSession] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { session: sess }, error } = await sb.auth.getSession();
      if (error || !sess) {
        setStatus('invalid');
        return;
      }
      // 掲載者かチェック
      const res = await fetch('/api/provider/me', {
        headers: { 'Authorization': `Bearer ${sess.access_token}` },
      });
      if (res.ok) {
        setSession(sess);
        setStatus('password-form');
      } else {
        // 一般ユーザー → 診断データがあれば同期してからナビへ
        const synced = await syncLocalDiagnosis(sess.access_token);
        window.location.href = synced ? '/mypage/navi' : '/mypage';
      }
    }
    init();
  }, []);

  async function handlePasswordSubmit(pw) {
    setPwError('');
    setPwLoading(true);
    const { error } = await sb.auth.updateUser({ password: pw });
    setPwLoading(false);
    if (error) {
      setPwError('エラー: ' + error.message);
      return;
    }
    window.location.href = '/provider/dashboard';
  }

  return (
    <div style={{ maxWidth: '440px', margin: '80px auto', padding: '0 20px' }}>
      <div style={{
        background: 'rgba(10,15,30,0.65)',
        border: '1px solid rgba(232,228,220,0.15)',
        borderRadius: '18px',
        padding: '32px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
      }}>

        {status === 'loading' && (
          <p style={{ textAlign: 'center', color: 'rgba(232,228,220,0.55)' }}>処理中…</p>
        )}

        {status === 'password-form' && (
          <PasswordForm
            onSubmit={handlePasswordSubmit}
            loading={pwLoading}
            error={pwError}
          />
        )}

        {status === 'invalid' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 8px' }}>リンクが無効です</h2>
            <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.55)', margin: '0 0 20px' }}>
              リンクの有効期限が切れているか、すでに使用済みです。
            </p>
            <a
              href="/login"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px',
                background: '#111',
                color: '#fff',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '15px',
              }}
            >
              ログインページへ
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
