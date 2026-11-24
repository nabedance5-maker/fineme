'use client';
// 閲覧ページの下の「Finemeに残す」（2026-11-24 §3・§9）。登録は任意。
// ログイン中なら、ボタンでこの記録のお店の顧客情報と自分のアカウントを結びつける（/api/me/record-claim）。
// ログインしていなければ、ログイン・新規登録の画面へ。戻ってきたら同じボタンで残せる。
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/log-store';

export default function ClaimRecord({ token, providerName }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [state, setState] = useState('idle'); // idle | saving | done | error
  const [msg, setMsg] = useState('');
  useEffect(() => { setLoggedIn(!!getAccessToken()); }, []);

  const here = `/record/posture/${token}`;
  async function claim() {
    const t = getAccessToken();
    if (!t) { location.href = `/login?next=${encodeURIComponent(here)}`; return; }
    setState('saving');
    try {
      const r = await fetch('/api/me/record-claim', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ token }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) { location.href = `/login?next=${encodeURIComponent(here)}`; return; }
      if (!r.ok) { setState('error'); setMsg(d.error || '保存できませんでした'); return; }
      setState('done');
    } catch {
      setState('error'); setMsg('通信が不安定なため保存できませんでした。もう一度お試しください');
    }
  }

  if (state === 'done') {
    return (
      <aside className="rp-claim">
        <p className="rp-claim-h">New Me Logに残しました</p>
        <p className="rp-claim-p">{providerName}が表示にした記録は、これからはNew Me Logの「お店からの記録」でいつでも見られます。</p>
        <a className="rp-claim-btn" href="/log">New Me Logを開く</a>
      </aside>
    );
  }
  return (
    <aside className="rp-claim">
      <p className="rp-claim-h">この記録を、ずっと残しておけます</p>
      <p className="rp-claim-p">Finemeに登録すると、通っているお店の記録がNew Me Logにまとまり、前回との変化をいつでも見返せます。登録は任意です。このリンクを受け取ったご本人だけが残してください。</p>
      <button type="button" className="rp-claim-btn" onClick={claim} disabled={state === 'saving'}>
        {state === 'saving' ? '保存しています…' : loggedIn ? '自分のNew Me Logに残す' : 'ログイン・登録して残す（無料）'}
      </button>
      {state === 'error' && <p className="rp-claim-err" role="alert">{msg}</p>}
    </aside>
  );
}
