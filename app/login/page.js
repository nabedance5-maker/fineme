'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { syncLocalDiagnosisToServer } from '@/lib/track';
import { syncLocalLogsToServer } from '@/lib/log-store';
import { syncLocalAttributesToServer } from '@/lib/attributes';

const SUPABASE_URL = 'https://qsfpzlvucqzmjldshwwd.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
const SITE_URL = 'https://www.fineme.me';

// Android Chromeなど一部ブラウザは、<form>のsubmitイベントを検知できないと
// パスワードマネージャーの「保存しますか？」プロンプト自体が出ない（でお報告
// 2026-09-13：今野くんのPixel 9で自動保存が機能しない／でおのiPhoneでは動く）。
// iOS Safari・iOS Chrome（WebKit）はform無しでもヒューリスティックで保存を
// 提案することが多いが、Android Chrome（Blink）はより厳格。根本原因はこの
// ログインフォームに<form>要素が無かったこと（下のJSXで修正）。
// あわせて、Credential Management APIに対応しているブラウザ（Android Chrome等。
// Safariは未対応でこの関数は何もしない）では、ログイン成功時に明示的に
// navigator.credentials.store()を呼び、保存プロンプトをより確実に出す。
//
// でお報告2026-09-14：今野くんのPixelで「保存はされたが次回ログイン時に自動入力
// されなかった」。Chromeの自動入力はautocomplete属性だけでなくinputのname属性も
// 強く見ており、name無しだと保存済みでも候補に出ない/入らないことがある。
// 下のJSXの各inputにname属性を追加して対応。
async function maybeStoreCredential(email, password) {
  try {
    if (typeof window === 'undefined' || !window.PasswordCredential || !navigator.credentials) return;
    const cred = new window.PasswordCredential({ id: email, password, name: email });
    await navigator.credentials.store(cred);
  } catch {}
}

// 掲載者判定が失敗すると、掲載者アカウントでログインしても一般ユーザーの
// マイページへ飛ばされてしまう（でお報告2026-09-14：「今日最初にログインした時に
// 何故かユーザーマイページに飛ばされた」「私もたまにそれが起こる」）。単発のfetch
// 失敗（ログイン直後の一瞬のネットワーク不調・サーバーレス関数のコールドスタート等）
// を「掲載者ではない」と誤判定しないよう、明確に「掲載者ではない」と分かる404以外は
// 少し待って再試行する。
async function checkIsProviderAccount(accessToken, attempts = 2) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch('/api/provider/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (res.ok) return true;
      if (res.status === 404) return false; // 明確に「掲載者ではない」
    } catch {}
    if (i < attempts - 1) await new Promise(resolve => setTimeout(resolve, 600));
  }
  return false;
}

async function syncLocalDiagnosis(accessToken) {
  // 男性版・Belle版の両方を引き継ぐ（lib/track.js に共通化）
  await syncLocalDiagnosisToServer(accessToken);
  // New Me Log のゲスト記録も同じタイミングで引き継ぐ
  await syncLocalLogsToServer(accessToken);
  // 端末に保存済みの属性（年代）もサーバへ引き継ぐ
  await syncLocalAttributesToServer(accessToken);
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
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
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

  // 掲載者向けログインは、遷移先の掲載者管理画面（白背景＋ネイビー/ゴールドの
  // 業務ツールの見た目）と統一する（でお要望2026-09-15：「ビジュアルデザインを
  // 掲載者管理画面と同じ感じにして」）。サイト全体の「深海に沈む羊皮紙」演出
  // （body::before/::afterの固定背景レイヤー）はグローバルCSSのためinlineでは
  // 打ち消せず、body にクラスを立てて上書きする。
  useEffect(() => {
    document.body.classList.toggle('provider-login-theme', isProvider);
    return () => document.body.classList.remove('provider-login-theme');
  }, [isProvider]);

  // ログインフォーム・パスワード再設定フォームで繰り返し使う色をテーマ化。
  // 一般ユーザー向けは既存の「深海ネイビーのガラスカード」のまま変更しない。
  const T = isProvider ? {
    cardBg: '#ffffff',
    cardBorder: '1px solid rgba(26,20,16,0.08)',
    cardBackdrop: 'none',
    cardShadow: '0 1px 3px rgba(10,15,30,0.05)',
    heading: '#1a1410',
    muted: 'rgba(26,20,16,0.55)',
    label: 'rgba(26,20,16,0.7)',
    inputBorder: '1px solid rgba(26,20,16,0.15)',
    inputBg: '#ffffff',
    inputText: '#1a1410',
    divider: 'rgba(26,20,16,0.12)',
    dividerText: 'rgba(26,20,16,0.4)',
    btnBg: '#c9a84c',
    btnText: '#0a0f1e',
    linkMuted: 'rgba(26,20,16,0.55)',
  } : {
    cardBg: 'rgba(10,15,30,0.65)',
    cardBorder: '1px solid rgba(232,228,220,0.15)',
    cardBackdrop: 'blur(8px)',
    cardShadow: '0 4px 24px rgba(2,6,23,.06)',
    heading: undefined,
    muted: 'rgba(232,228,220,0.55)',
    label: 'rgba(232,228,220,0.75)',
    inputBorder: '1px solid rgba(232,228,220,0.15)',
    inputBg: undefined,
    inputText: undefined,
    divider: '#e5e7eb',
    dividerText: '#9ca3af',
    btnBg: '#111',
    btnText: '#fff',
    linkMuted: '#6b7280',
  };

  async function handleLogin(e) {
    e?.preventDefault();
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
    // ブラウザのパスワードマネージャーに保存を促す（Android Chrome対策。詳細は上の関数コメント）
    await maybeStoreCredential(email, password);
    // 匿名診断データがあればクラウドに同期
    await syncLocalDiagnosis(data.session.access_token);

    // ?next= パラメータがあればそこへ（ユーザー側ログイン）。セッション切れ時の
    // 再ログイン導線の一部（mirror・ServiceLog・provider/dashboard等）は歴史的に
    // ?redirect= という別名を使っており、このページが読んでいなかったため無視され、
    // 意図した元のページではなく掲載者判定のフォールバック（/mypage等）に飛ばされて
    // いた（でお報告2026-09-14：「何故かユーザーマイページに飛ばされた」）。両対応する。
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') || params.get('redirect');
    if (next) {
      window.location.href = next;
      return;
    }
    // 掲載者かチェック（直接 /login アクセス時は掲載者ダッシュボードへ）
    const isProviderAccount = await checkIsProviderAccount(data.session.access_token);
    window.location.href = isProviderAccount ? '/provider/dashboard' : '/mypage';
    setLoginLoading(false);
  }

  async function handleSignup(e) {
    e?.preventDefault();
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
    if (signupPassword !== signupPasswordConfirm) {
      setSignupError('パスワードが一致しません');
      return;
    }
    setSignupLoading(true);
    const { data, error } = await sb.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
    });
    if (error) {
      setSignupError('登録エラー: ' + error.message);
      setSignupLoading(false);
      return;
    }
    // セッションがある場合（メール確認不要設定）は即ログイン
    if (data.session?.access_token) {
      await maybeStoreCredential(signupEmail, signupPassword);
      await syncLocalDiagnosis(data.session.access_token);
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || params.get('redirect');
      window.location.href = next || '/mypage';
      return;
    }
    // メール確認が必要な場合
    setSignupOk('確認メールを送りました。メール内のリンクをクリックしてください。');
    setSignupLoading(false);
  }

  async function handleReset(e) {
    e?.preventDefault();
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
      {/* サイト全体の「深海ネイビーに沈む羊皮紙」演出（body::before/::after）は
          グローバルCSSで、inline styleでは打ち消せない。掲載者ログイン中だけ
          掲載者管理画面と同じ明るい背景に切り替える。 */}
      <style>{`
        body.provider-login-theme::before { display: none; }
        body.provider-login-theme::after { background: var(--color-bg); }
        body.provider-login-theme { color: #1a1410; }
      `}</style>
      {/* 掲載者向けは、掲載者管理画面と同じ「fineme」ゴールドロゴ入りネイビーの
          ヘッダー帯を上に添えて、遷移先と同じ製品に入る感覚を作る。 */}
      {isProvider && (
        <div style={{ background: '#0a0f1e', borderRadius: '14px 14px 0 0', padding: '18px 24px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: '#c9a84c', letterSpacing: 1 }}>fineme</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>店舗様専用ログイン</p>
        </div>
      )}
      <div style={{
        background: T.cardBg,
        backdropFilter: T.cardBackdrop,
        border: T.cardBorder,
        borderRadius: isProvider ? '0 0 14px 14px' : '18px',
        padding: '32px',
        boxShadow: T.cardShadow,
      }}>

        {/* ログインフォーム */}
        {view === 'login' && (
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px', color: T.heading }}>ログイン</h1>
            <p style={{ fontSize: '14px', color: T.muted, margin: '0 0 24px' }}>
              登録されたメールアドレスとパスワードを入力してください
            </p>

            {/* Android Chrome等でパスワードマネージャーの自動保存プロンプトを確実に出す
                には<form>のsubmitイベントが必須（でお報告2026-09-13、詳細は上部コメント）。 */}
            <form onSubmit={handleLogin}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: T.label }}>メールアドレス</label>
                <input
                  type="email"
                  name="email"
                  id="login-email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                  style={{
                    padding: '12px 14px',
                    border: T.inputBorder,
                    borderRadius: '10px',
                    fontSize: '15px',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: T.inputBg,
                    color: T.inputText,
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: T.label }}>パスワード</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="login-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      padding: '12px 44px 12px 14px',
                      border: T.inputBorder,
                      borderRadius: '10px',
                      fontSize: '15px',
                      width: '100%',
                      boxSizing: 'border-box',
                      background: T.inputBg,
                      color: T.inputText,
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
                type="submit"
                disabled={loginLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: T.btnBg,
                  color: T.btnText,
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
            </form>

            {!isProvider && (
              <>
                {/* 区切り線 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0 4px' }}>
                  <div style={{ flex: 1, height: '1px', background: T.divider }} />
                  <span style={{ fontSize: '12px', color: T.dividerText, whiteSpace: 'nowrap' }}>または</span>
                  <div style={{ flex: 1, height: '1px', background: T.divider }} />
                </div>

                {/* LINE ログインボタン */}
                <a
                  href={`/api/auth/line-login?type=login${(() => {
                    if (typeof window === 'undefined') return '';
                    const p = new URLSearchParams(window.location.search);
                    const n = p.get('next') || p.get('redirect');
                    return n ? '&next=' + encodeURIComponent(n) : '';
                  })()}`}
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
                style={{ fontSize: '13px', color: T.linkMuted, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none' }}
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

            <form onSubmit={handleSignup}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>メールアドレス</label>
                <input
                  type="email"
                  name="email"
                  id="signup-email"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                  style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '15px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>パスワード（8文字以上）</label>
                <input
                  type="password"
                  name="new-password"
                  id="signup-password"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '15px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151' }}>パスワード（確認用）</label>
                <input
                  type="password"
                  name="new-password-confirm"
                  id="signup-password-confirm"
                  value={signupPasswordConfirm}
                  onChange={e => setSignupPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={{ padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '15px', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {signupError && <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 8px' }}>{signupError}</p>}
              {signupOk && <p style={{ color: '#059669', fontSize: '13px', margin: '0 0 8px' }}>{signupOk}</p>}

              <button
                type="submit"
                disabled={signupLoading}
                style={{ width: '100%', padding: '14px', background: '#c9a84c', color: '#0a0f1e', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: signupLoading ? 'not-allowed' : 'pointer', opacity: signupLoading ? 0.4 : 1, marginTop: '4px' }}
              >
                {signupLoading ? '登録中…' : '無料登録する'}
              </button>
            </form>

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
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px', color: T.heading }}>パスワードを忘れた方へ</h1>
            <p style={{ fontSize: '14px', color: T.muted, margin: '0 0 24px' }}>
              登録済みのメールアドレスを入力すると、パスワード再設定メールをお送りします。
            </p>

            <form onSubmit={handleReset}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: T.label }}>メールアドレス</label>
                <input
                  type="email"
                  name="email"
                  id="reset-email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                  style={{
                    padding: '12px 14px',
                    border: T.inputBorder,
                    borderRadius: '10px',
                    fontSize: '15px',
                    width: '100%',
                    boxSizing: 'border-box',
                    background: T.inputBg,
                    color: T.inputText,
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
                type="submit"
                disabled={resetLoading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: T.btnBg,
                  color: T.btnText,
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
            </form>

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
