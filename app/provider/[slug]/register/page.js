'use client';
// お店の会員登録（無料）ページ（でお要望 2026-10-28：「店舗ごとに会員登録をする設定に変更。会員になってから、予約やプラン契約ができる」）。
// お名前・フリガナ・電話番号を登録する。登録するとお店のメンバー一覧に並び、予約・入会・回数券の購入ができる。
// Finemeに未登録の方は、ここでメールアドレスとパスワードを決めてもらい、Finemeのアカウントも同時に作る
// （別々に登録させない。以後はこのアカウントで本人と分かり、体験の回数制限などもこのアカウントで数える。2026-10-28）。
// 終わったら ?next= のページ（予約していたお店のページ・入会ページ）へ戻る。
import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { freshAccessToken, signInWithPassword } from '@/lib/browser-auth';

const CARD = { background: 'rgba(10,15,30,0.65)', border: '1px solid rgba(232,228,220,0.15)', borderRadius: '18px', padding: '28px' };
const LABEL = { fontSize: '12.5px', fontWeight: 700, color: 'rgba(232,228,220,0.8)', display: 'block', marginBottom: '6px' };
const INPUT = { padding: '12px 14px', minHeight: '48px', border: '1px solid rgba(232,228,220,0.2)', borderRadius: '10px', fontSize: '16px', width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.03)', color: '#e8e4dc' };
const BTN = { width: '100%', minHeight: '50px', padding: '0 14px', background: '#c9a84c', color: '#0a0f1e', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const WRAP = { maxWidth: '480px', margin: '48px auto', padding: '0 20px 60px', color: '#e8e4dc' };

function RegisterInner() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  // 戻り先はこのサイトの中のページだけ（外のサイトへ飛ばされないように）
  const rawNext = searchParams.get('next') || '';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : `/provider/${slug}`;

  const [st, setSt] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ last_name: '', first_name: '', last_name_kana: '', first_name_kana: '', phone: '', birthday: '', agree: false, email: '', password: '', password2: '', agree_fineme: false });
  const [errCode, setErrCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!slug) return;
    freshAccessToken().then(t => fetch(`/api/providers/${slug}/register`, { headers: t ? { Authorization: `Bearer ${t}` } : {} }))
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => { setSt(d); if (d.prefill) setForm(f => ({ ...f, ...d.prefill })); })
      .catch(() => setError('お店が見つかりませんでした'));
  }, [slug]);

  async function submit(e) {
    e.preventDefault();
    setError(''); setErrCode('');
    if (!st.logged_in && form.password !== form.password2) { setError('パスワードが一致しません'); return; }
    setBusy(true);
    const t = st.logged_in ? await freshAccessToken() : null;
    const { password2, ...body } = form;
    const r = await fetch(`/api/providers/${slug}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setError(d.error || '登録できませんでした'); setErrCode(d.code || ''); return; }
    // 作ったアカウントでそのままログインしておく（戻った先で予約・入会できるように）
    if (d.account_created) { try { await signInWithPassword(form.email.trim(), form.password); } catch {} }
    setBusy(false);
    setDone(true);
  }

  if (error && !st) return <div style={WRAP}><p>{error}</p></div>;
  if (!st) return <div style={{ ...WRAP, color: 'rgba(232,228,220,0.7)' }}>読み込み中…</div>;

  const title = <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>{st.store_name} の会員登録</h1>;

  const here = typeof window !== 'undefined' ? window.location.pathname + window.location.search : `/provider/${slug}/register`;
  const loginHref = `/login?next=${encodeURIComponent(here)}`;

  if (done || st.registered) {
    return (
      <div style={WRAP}><div style={CARD}>
        {title}
        <p style={{ fontSize: '14px', margin: '0 0 20px', lineHeight: 1.8 }}>{done ? '会員登録が完了しました。' : 'このお店の会員に登録済みです。'}ご予約・お申し込みができます。</p>
        <a href={next} style={BTN}>{next.includes('/join') ? '入会の手続きに戻る' : 'お店のページに戻る'}</a>
      </div></div>
    );
  }

  return (
    <div style={WRAP}>
      <form onSubmit={submit} style={CARD}>
        {title}
        <p style={{ fontSize: '13.5px', color: 'rgba(232,228,220,0.75)', margin: '0 0 22px', lineHeight: 1.8 }}>
          {st.required ? 'このお店は、会員登録（無料）をしてから予約・お申し込みができます。' : '会員登録は無料です。'}登録した内容はお店のお客様情報として使われます。
        </p>
        {!st.logged_in && (
          <p style={{ fontSize: '13px', margin: '-8px 0 20px', lineHeight: 1.7 }}>
            Finemeのアカウントをお持ちの方は <a href={loginHref} style={{ color: '#e8e4dc', fontWeight: 700 }}>ログイン</a> してから登録してください（LINEでログインしている方も）。
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div><label htmlFor="rg-ln" style={LABEL}>姓（必須）</label><input id="rg-ln" required autoComplete="family-name" value={form.last_name} onChange={e => set('last_name', e.target.value)} style={INPUT} /></div>
          <div><label htmlFor="rg-fn" style={LABEL}>名（必須）</label><input id="rg-fn" required autoComplete="given-name" value={form.first_name} onChange={e => set('first_name', e.target.value)} style={INPUT} /></div>
          <div><label htmlFor="rg-lnk" style={LABEL}>セイ</label><input id="rg-lnk" value={form.last_name_kana} onChange={e => set('last_name_kana', e.target.value)} style={INPUT} /></div>
          <div><label htmlFor="rg-fnk" style={LABEL}>メイ</label><input id="rg-fnk" value={form.first_name_kana} onChange={e => set('first_name_kana', e.target.value)} style={INPUT} /></div>
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label htmlFor="rg-tel" style={LABEL}>電話番号（必須）</label>
          <input id="rg-tel" required type="tel" inputMode="tel" autoComplete="tel" placeholder="090-1234-5678" value={form.phone} onChange={e => set('phone', e.target.value)} style={INPUT} />
        </div>
        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="rg-bd" style={LABEL}>生年月日（任意）</label>
          <input id="rg-bd" type="date" autoComplete="bday" value={form.birthday || ''} onChange={e => set('birthday', e.target.value)} style={INPUT} />
        </div>
        {st.logged_in ? (
          form.email && <p style={{ fontSize: '12.5px', color: 'rgba(232,228,220,0.7)', margin: '0 0 16px' }}>メールアドレス：{form.email}（Finemeのアカウントのもの）</p>
        ) : (
          <fieldset style={{ border: '1px solid rgba(232,228,220,0.15)', borderRadius: '12px', padding: '14px', margin: '0 0 18px' }}>
            <legend style={{ fontSize: '12.5px', fontWeight: 700, padding: '0 6px' }}>ログイン用（Finemeのアカウントも同時に作ります）</legend>
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="rg-em" style={LABEL}>メールアドレス（必須）</label>
              <input id="rg-em" required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={e => set('email', e.target.value)} style={INPUT} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="rg-pw" style={LABEL}>パスワード（8文字以上・必須）</label>
              <input id="rg-pw" required type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={e => set('password', e.target.value)} style={INPUT} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="rg-pw2" style={LABEL}>パスワード（確認）</label>
              <input id="rg-pw2" required type="password" autoComplete="new-password" minLength={8} value={form.password2} onChange={e => set('password2', e.target.value)} style={INPUT} />
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(232,228,220,0.7)', margin: '0 0 10px', lineHeight: 1.7 }}>次からは、このメールアドレスとパスワードでログインすると、ご予約やチケットが確認できます。ほかのFinemeの掲載店でも同じアカウントが使えます。</p>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', cursor: 'pointer', lineHeight: 1.7 }}>
              <input type="checkbox" checked={form.agree_fineme} onChange={e => set('agree_fineme', e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px' }} />
              <span><a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#e8e4dc' }}>Finemeの利用規約</a>と<a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#e8e4dc' }}>プライバシーポリシー</a>に同意します</span>
            </label>
          </fieldset>
        )}
        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13.5px', marginBottom: '18px', cursor: 'pointer', lineHeight: 1.7 }}>
          <input type="checkbox" checked={form.agree} onChange={e => set('agree', e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px' }} />
          <span>入力した内容を{st.store_name}に伝えることに同意します</span>
        </label>
        {error && <p role="alert" style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 12px', lineHeight: 1.7 }}>{error}{errCode === 'existing_login' && <> <a href={loginHref} style={{ color: '#e8e4dc' }}>ログインする</a></>}</p>}
        {(() => { const off = busy || !form.agree || (!st.logged_in && !form.agree_fineme); return <button type="submit" disabled={off} style={{ ...BTN, opacity: off ? 0.5 : 1 }}>{busy ? '登録中…' : st.logged_in ? '会員登録する' : 'アカウントを作って会員登録する'}</button>; })()}
      </form>
    </div>
  );
}

export default function StoreRegisterPage() {
  return <Suspense fallback={<div style={{ ...WRAP, color: 'rgba(232,228,220,0.7)' }}>読み込み中…</div>}><RegisterInner /></Suspense>;
}
