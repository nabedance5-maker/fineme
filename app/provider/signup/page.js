'use client';
// お店の登録ページ（2026-10-30）。問い合わせ（オンライン相談）のあと、ご利用を決めたお店と、
// 「すでに決めていて、すぐに始めたい」お店が使う。登録すると、パスワード設定のメールが届き、
// 管理画面でプランを申し込んだ日から使える。オンライン相談をしたい方は /provider/inquiry へ。
import { useEffect, useState } from 'react';

const CATEGORIES = [
  ['gym', 'ジム・パーソナルトレーニング'], ['makeup', 'メイク・コスメ'], ['hair', 'ヘア・美容院'],
  ['colordiagnosis', 'パーソナルカラー診断'], ['bonediagnosis', '骨格診断'], ['diagnosis', '診断（総合・イメコン）'],
  ['fashion', 'ファッション・スタイリング'], ['photo', 'プロフィール写真・撮影'], ['marriage', '婚活・マッチングサポート'],
  ['eyebrow', '眉毛サロン'], ['hairremoval', '脱毛'], ['esthetic', 'エステ・フェイシャル'],
  ['whitening', '歯のホワイトニング'], ['orthodontics', '歯列矯正'], ['nail', 'ネイル'], ['aga', 'AGA・薄毛治療'],
  ['consulting', 'コンサルティング'], ['other', 'その他'],
];

const CSS = `
.su-page { min-height: 80vh; background: linear-gradient(rgba(6,12,26,0.75), rgba(6,12,26,0.82)), url('/assets/images/hero-bg.webp') center / cover no-repeat; padding: 60px 16px 80px; font-family: 'Noto Sans JP', sans-serif; }
.su-wrap { max-width: 640px; margin: 0 auto; }
.su-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .18em; color: rgba(201,168,76,0.8); margin: 0 0 12px; }
.su-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(20px, 4vw, 28px); font-weight: 700; color: #fff; margin: 0 0 10px; line-height: 1.4; }
.su-lead { font-size: 13px; color: rgba(255,255,255,.72); margin: 0 0 24px; line-height: 1.8; }
.su-lead a { color: #c9a84c; font-weight: 700; }
.su-card { background: rgba(255,255,255,0.97); border: 1px solid rgba(201,168,76,0.25); border-radius: 16px; padding: 28px 32px; box-shadow: 0 8px 40px rgba(0,0,0,.22); display: grid; gap: 16px; }
@media (max-width: 600px) { .su-card { padding: 22px 18px; } }
.su-steps { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.9; color: #374151; }
.su-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 600px) { .su-row { grid-template-columns: 1fr; } }
.su-field { display: flex; flex-direction: column; gap: 5px; }
.su-label { font-size: 12px; font-weight: 700; color: #374151; }
.su-req { color: #b91c1c; margin-left: 2px; }
.su-input { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 16px; font-family: inherit; color: #111827; background: #fff; }
.su-input:focus { border-color: #c9a84c; outline: none; box-shadow: 0 0 0 3px rgba(201,168,76,.15); }
.su-btn { min-height: 50px; background: #c9a84c; color: #0a0f1e; border: none; border-radius: 10px; font-size: 15.5px; font-weight: 800; cursor: pointer; font-family: inherit; }
.su-btn:disabled { opacity: .5; cursor: not-allowed; }
.su-btn:focus-visible, .su-input:focus-visible { outline: 2px solid #2f4f8f; outline-offset: 2px; }
.su-err { margin: 0; color: #b91c1c; font-size: 13px; font-weight: 700; line-height: 1.6; }
.su-note { margin: 0; font-size: 12px; color: #6b7280; line-height: 1.7; }
.su-note a { color: #2f4f8f; font-weight: 700; }
.su-hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.su-done h2 { margin: 0; font-size: 18px; color: #111; }
.su-done p { margin: 0; font-size: 14px; color: #374151; line-height: 1.8; }
`;

export default function ProviderSignupPage() {
  const [form, setForm] = useState({ bizName: '', contactName: '', email: '', phone: '', category: '', desiredPlan: 'B', website: '' });
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const plan = sp.get('plan');
    if (['A', 'B', 'C'].includes(plan)) setForm(f => ({ ...f, desiredPlan: plan }));
    setRef(sp.get('ref') || '');
  }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.bizName.trim() || !form.contactName.trim() || !form.email.trim() || !form.phone.trim() || !form.category) { setError('必須の項目を入れてください'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/provider/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, ref: ref || undefined }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || '登録できませんでした'); setBusy(false); return; }
      setDone({ email: form.email.trim(), warn: d.invite_sent ? '' : d.error });
    } catch {
      setError('通信に失敗しました。電波のよい場所でもう一度お試しください');
    }
    setBusy(false);
  }

  return (
    <div className="su-page">
      <style>{CSS}</style>
      <div className="su-wrap">
        <p className="su-eyebrow">STORE SIGN UP</p>
        <h1 className="su-title">お店の登録</h1>
        <p className="su-lead">すでにFinemeの導入を決めているお店向けの登録ページです。まずは話を聞いてみたい方は、<a href={ref ? `/provider/inquiry?ref=${encodeURIComponent(ref)}` : '/provider/inquiry'}>オンライン相談</a>からお申し込みください。</p>

        {done ? (
          <div className="su-card su-done" role="status">
            <h2>ご登録ありがとうございます</h2>
            <p>{done.email} に「管理画面のご用意ができました」というメールをお送りしました。メールのボタンからパスワードを決めて管理画面に入り、プランをお申し込みください。お申し込みの日からご利用いただけます。</p>
            {done.warn && <p className="su-err">{done.warn}</p>}
            <p className="su-note">メールが届かない時は、迷惑メールのフォルダもご確認ください。</p>
          </div>
        ) : (
          <form className="su-card" onSubmit={submit} noValidate>
            <ol className="su-steps">
              <li>このページでお店の情報を登録</li>
              <li>届いたメールからパスワードを決めて、管理画面に入る</li>
              <li>プランを選び、利用規約をご確認のうえお申し込み（カード登録）。その日からご利用いただけます</li>
            </ol>
            <div className="su-row">
              <label className="su-field"><span className="su-label">店名・屋号<span className="su-req">*</span></span><input className="su-input" value={form.bizName} onChange={set('bizName')} autoComplete="organization" required placeholder="例：パーソナルジム〇〇" /></label>
              <label className="su-field"><span className="su-label">ご担当者のお名前<span className="su-req">*</span></span><input className="su-input" value={form.contactName} onChange={set('contactName')} autoComplete="name" required placeholder="例：山田 太郎" /></label>
            </div>
            <div className="su-row">
              <label className="su-field"><span className="su-label">メールアドレス（ログインに使います）<span className="su-req">*</span></span><input className="su-input" type="email" value={form.email} onChange={set('email')} autoComplete="email" required placeholder="例：you@example.com" /></label>
              <label className="su-field"><span className="su-label">電話番号<span className="su-req">*</span></span><input className="su-input" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" required placeholder="例：090-1234-5678" /></label>
            </div>
            <div className="su-row">
              <label className="su-field"><span className="su-label">業種<span className="su-req">*</span></span>
                <select className="su-input" value={form.category} onChange={set('category')} required>
                  <option value="" disabled>選択してください</option>
                  {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="su-field"><span className="su-label">使いたいプラン（あとで変えられます）</span>
                <select className="su-input" value={form.desiredPlan} onChange={set('desiredPlan')}>
                  <option value="A">PLAN A ライト（¥5,000/月）</option>
                  <option value="B">PLAN B スタンダード（¥7,000/月）</option>
                  <option value="C">PLAN C プレミアム（¥10,000/月）</option>
                </select>
              </label>
            </div>
            <label className="su-hp" aria-hidden="true">ウェブサイト<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
            {ref && <p className="su-note">紹介コード「{ref}」が適用されます。</p>}
            {error && <p className="su-err" role="alert">{error}</p>}
            <button type="submit" className="su-btn" disabled={busy}>{busy ? '登録しています…' : '登録して、パスワード設定のメールを受け取る'}</button>
            <p className="su-note">登録しただけでは料金はかかりません。月額は、管理画面でプランをお申し込みいただいた日からです。<a href="/terms-provider" target="_blank" rel="noopener noreferrer">契約者利用規約</a>・<a href="/privacy" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a></p>
          </form>
        )}
      </div>
    </div>
  );
}
