'use client';
// アンケートの回答ページ（でお要望 2026-10-19：hacomono差分 #9）。店舗がメッセージ配信・QR・LINEでリンクを配る。
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

function accessToken() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return key ? JSON.parse(localStorage.getItem(key))?.access_token || null : null;
  } catch { return null; }
}

export default function SurveyPage() {
  const { token } = useParams();
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const [answers, setAnswers] = useState({});
  const [name, setName] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [auth, setAuth] = useState(null);

  useEffect(() => {
    const t = accessToken();
    setAuth(t);
    fetch(`/api/surveys/${token}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} })
      .then(r => r.json().then(d => (r.ok ? d : Promise.reject(d))))
      .then(d => { setS(d); if (d.answered) setAnswers(d.answered); })
      .catch(d => setErr(d?.error || 'アンケートを読み込めませんでした'));
  }, [token]);

  const set = (id, v) => setAnswers(a => ({ ...a, [id]: v }));
  const toggle = (id, opt) => setAnswers(a => { const cur = Array.isArray(a[id]) ? a[id] : []; return { ...a, [id]: cur.includes(opt) ? cur.filter(x => x !== opt) : [...cur, opt] }; });

  async function submit() {
    setSending(true); setErr('');
    const r = await fetch(`/api/surveys/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, body: JSON.stringify({ answers, name }) });
    const d = await r.json().catch(() => ({}));
    setSending(false);
    if (!r.ok) { setErr(d.error || '送れませんでした'); return; }
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="sv">
      {!s && !err && <p>読み込み中…</p>}
      {err && !s && <p>{err}</p>}
      {s && (
        <div className="sv-card">
          <p className="sv-shop">{s.provider_name}</p>
          <h1>{s.title}</h1>
          {done ? (
            <p className="sv-desc">ご回答ありがとうございました。いただいた声はお店のサービスづくりに使わせていただきます。</p>
          ) : s.status !== 'open' ? (
            <p className="sv-desc">このアンケートは受付を終了しました。</p>
          ) : !s.logged_in && !s.allow_guest ? (
            <p className="sv-desc">このアンケートはFinemeにログインしてから回答できます。<a href={`/login?redirect=/survey/${token}`}>ログインする</a></p>
          ) : (
            <>
              {s.description && <p className="sv-desc">{s.description}</p>}
              {s.answered && <p className="sv-desc">以前の回答が入っています。変更して送ると上書きされます。</p>}
              {!s.logged_in && (
                <label className="sv-q"><span className="sv-label">お名前<em>必須</em></span><input value={name} onChange={e => setName(e.target.value)} maxLength={60} /></label>
              )}
              {s.questions.map((q, i) => (
                <div key={q.id} className="sv-q">
                  <span className="sv-label">{i + 1}. {q.label}{q.required && <em>必須</em>}</span>
                  {q.type === 'text' && <textarea rows={4} value={answers[q.id] || ''} onChange={e => set(q.id, e.target.value)} maxLength={2000} />}
                  {q.type === 'single' && q.options.map(o => (
                    <label key={o} className="sv-opt"><input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => set(q.id, o)} />{o}</label>
                  ))}
                  {q.type === 'multi' && q.options.map(o => (
                    <label key={o} className="sv-opt"><input type="checkbox" checked={(answers[q.id] || []).includes(o)} onChange={() => toggle(q.id, o)} />{o}</label>
                  ))}
                  {q.type === 'rating' && (
                    <div className="sv-rate" role="radiogroup" aria-label={q.label}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} type="button" role="radio" aria-checked={answers[q.id] === n} className={answers[q.id] === n ? 'on' : ''} onClick={() => set(q.id, n)}>{n}</button>
                      ))}
                      <span className="sv-rate-note">1＝不満　5＝満足</span>
                    </div>
                  )}
                </div>
              ))}
              {err && <p className="sv-err">{err}</p>}
              <button type="button" className="sv-send" disabled={sending} onClick={submit}>{sending ? '送信中…' : '回答を送る'}</button>
            </>
          )}
        </div>
      )}
      <style>{`
        .sv { max-width: 560px; margin: 0 auto; padding: 40px 20px 80px; color: #fff; }
        .sv-card { display: grid; gap: 18px; background: #151b24; border: 1px solid rgba(255,255,255,0.15); border-radius: 18px; padding: 28px 22px; }
        .sv-shop { margin: 0; font-size: 13px; font-weight: 700; }
        .sv h1 { margin: -8px 0 0; font-size: 22px; line-height: 1.4; text-wrap: balance; }
        .sv-desc { margin: 0; font-size: 14px; line-height: 1.8; white-space: pre-wrap; }
        .sv-desc a { color: #fff; font-weight: 700; }
        .sv-q { display: grid; gap: 8px; }
        .sv-label { font-size: 15px; font-weight: 700; line-height: 1.6; }
        .sv-label em { font-style: normal; font-size: 11px; font-weight: 800; margin-left: 8px; padding: 1px 7px; border-radius: 99px; background: #fff; color: #111; vertical-align: 2px; }
        .sv input:not([type]), .sv textarea { width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.3); background: #0d1117; color: #fff; font-size: 16px; font-family: inherit; }
        .sv-opt { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; font-size: 15px; cursor: pointer; }
        .sv-opt input { width: 18px; height: 18px; accent-color: #fff; }
        .sv-rate { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .sv-rate button { width: 46px; height: 46px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.35); background: transparent; color: #fff; font-size: 17px; font-weight: 800; cursor: pointer; }
        .sv-rate button.on { background: #fff; color: #111; }
        .sv-rate-note { font-size: 12px; width: 100%; }
        .sv-err { margin: 0; font-size: 14px; font-weight: 700; }
        .sv-send { padding: 15px; border-radius: 12px; border: none; background: #fff; color: #111; font-size: 16px; font-weight: 800; cursor: pointer; }
        .sv-send:disabled { opacity: 0.6; }
        .sv button:focus-visible, .sv input:focus-visible, .sv textarea:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
      `}</style>
    </main>
  );
}
