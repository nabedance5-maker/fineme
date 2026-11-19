'use client';

// お店の方のログイン（Fineme の店舗アカウント・スタッフのログインと同じメールとパスワード）。
// ログインした後は、いつも /encompass/store へ（外のページへは飛ばさない）。
import { useState } from 'react';
import Link from 'next/link';
import s from '../encompass.module.css';
import { login } from '@/lib/encompass/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async e => {
    e.preventDefault();
    if (!email || !password) { setError('メールアドレスとパスワードを入れてください'); return; }
    setBusy(true); setError('');
    try {
      await login(email.trim(), password);
      window.location.href = '/encompass/store';
    } catch (err) {
      const down = !err?.status || err.status >= 500;
      setError(down ? 'つながりにくくなっています。少しおいて、もう一度お試しください' : 'メールアドレスかパスワードが違います');
      setBusy(false);
    }
  };

  return (
    <main className={s.main}>
      <h1 className={s.h1}>お店の方のログイン</h1>
      <p className={s.lead}>Fineme の店舗アカウント（またはスタッフのログイン）と同じメールアドレスとパスワードです。</p>
      <form onSubmit={submit}>
        <label className={s.field}><span>メールアドレス</span><input className={`${s.input} ${s.inputWide}`} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className={s.field}><span>パスワード</span><input className={`${s.input} ${s.inputWide}`} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <p className={s.stop} role="alert">{error}</p>}
        <div className={s.row} style={{ marginTop: 16 }}>
          <button type="submit" className={s.btnPrimary} disabled={busy}>{busy ? 'ログインしています' : 'ログインする'}</button>
        </div>
      </form>
      <p className={s.note} style={{ marginTop: 20 }}>
        パスワードを忘れた時は、<Link href="/login?type=provider">Fineme のログイン画面</Link>の「パスワードを忘れた方」から設定し直してください。
      </p>
    </main>
  );
}
