'use client';
// お店に1本のシフト希望の提出リンク（でお要望 2026-10-27）。
// スタッフは自分の名前を選び、お店が決めたパスワードで入る（Finemeのスタッフアカウントでログインしている人はそのまま入れる）。
// 入ったら、その人の提出画面（/staff-shift/[その人の鍵]）へ移る。
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { freshAccessToken } from '@/lib/browser-auth';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '14px', padding: '16px' };

export default function StoreShiftLinkPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`/api/staff-shift/store/${token}`).then(r => r.json().then(d => ({ ok: r.ok, d }))).then(({ ok, d }) => (ok ? setData(d) : setError(d.error || 'リンクが無効です'))).catch(() => setError('読み込めませんでした'));
  }, [token]);

  const go = t => { window.location.href = `/staff-shift/${t}`; };

  async function loginWithAccount() {
    setBusy(true); setMsg('');
    const t = await freshAccessToken();
    if (!t) { window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`; return; }
    const r = await fetch(`/api/staff-shift/store/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: '{}' });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (d.token) go(d.token); else setMsg('このアカウントはこのお店のスタッフとしてつながっていません。名前を選んでパスワードで入ってください');
  }

  async function submit(e) {
    e.preventDefault();
    if (!picked) return;
    setBusy(true); setMsg('');
    const r = await fetch(`/api/staff-shift/store/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: picked.id, password }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (d.token) go(d.token); else setMsg(d.error || '入れませんでした');
  }

  if (error) return <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 20px', color: '#e8e4dc' }}><p>{error}</p></div>;
  if (!data) return <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 20px', color: 'rgba(232,228,220,0.7)' }}>読み込み中…</div>;

  return (
    <main style={{ maxWidth: '480px', margin: '40px auto', padding: '0 20px 60px', color: '#e8e4dc' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>{data.store_name} シフト希望の提出</h1>
      <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.7)', margin: '0 0 20px', lineHeight: 1.7 }}>自分の名前を選んで、お店から伝えられたパスワードを入れてください。</p>

      {data.staff.some(s => s.has_login) && (
        <div style={{ ...card, marginBottom: '16px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '13px', lineHeight: 1.7 }}>Finemeのスタッフアカウントをお持ちの方は、ログインするだけで入れます。</p>
          <button type="button" onClick={loginWithAccount} disabled={busy} style={{ minHeight: '44px', padding: '0 18px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.3)', background: 'transparent', color: '#e8e4dc', fontWeight: 700, cursor: 'pointer' }}>スタッフアカウントで入る</button>
        </div>
      )}

      {!data.staff.length ? (
        <p style={{ fontSize: '14px' }}>スタッフがまだ登録されていません。お店の方にお問い合わせください。</p>
      ) : (
        <div role="radiogroup" aria-label="自分の名前" style={{ display: 'grid', gap: '8px' }}>
          {data.staff.map(s => {
            const on = picked?.id === s.id;
            return (
              <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => { setPicked(s); setPassword(''); setMsg(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '52px', padding: '0 16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', border: `1px solid ${on ? '#c9a84c' : 'rgba(232,228,220,0.15)'}`, background: on ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)', color: '#e8e4dc' }}>
                <span style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(232,228,220,0.3)', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{s.number}</span>
                <span style={{ fontSize: '15px', fontWeight: 700 }}>{s.name}</span>
                {!s.has_password && <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: 'rgba(232,228,220,0.6)' }}>パスワード未設定</span>}
              </button>
            );
          })}
        </div>
      )}

      {picked && (
        <form onSubmit={submit} style={{ ...card, marginTop: '16px', display: 'grid', gap: '10px' }}>
          <label htmlFor="shift-pw" style={{ fontSize: '13px', fontWeight: 700 }}>{picked.name}さんのパスワード</label>
          <input id="shift-pw" type="password" inputMode="numeric" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="4〜8桁の数字"
            style={{ minHeight: '48px', padding: '0 14px', borderRadius: '10px', border: '1px solid rgba(232,228,220,0.3)', background: '#0d1117', color: '#e8e4dc', fontSize: '18px', letterSpacing: '0.2em' }} />
          <button type="submit" disabled={busy || password.length < 4} style={{ minHeight: '48px', borderRadius: '10px', border: 'none', background: '#c9a84c', color: '#0a0f1e', fontWeight: 800, fontSize: '15px', cursor: 'pointer', opacity: busy || password.length < 4 ? 0.5 : 1 }}>{busy ? '確認中…' : '入る'}</button>
          {!picked.has_password && <p style={{ margin: 0, fontSize: '12px', color: 'rgba(232,228,220,0.7)' }}>まだパスワードが決まっていません。お店の方に決めてもらってください。</p>}
        </form>
      )}
      {msg && <p role="alert" style={{ marginTop: '12px', fontSize: '13px', fontWeight: 700 }}>{msg}</p>}
    </main>
  );
}
