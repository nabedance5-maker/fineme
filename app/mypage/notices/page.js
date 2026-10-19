'use client';
// お店からのお知らせ（でお要望 2026-10-19：hacomono差分 #13）。通っているお店が掲示したお知らせを新しい順に並べる。
import { useEffect, useState } from 'react';
import MypageSideNav from '../_components/MypageSideNav';

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
function Linkified({ text }) {
  return String(text).split(URL_RE).map((part, i) => (URL_RE.test(part) ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : <span key={i}>{part}</span>));
}

export default function MypageNoticesPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    let token = null;
    try { token = key ? JSON.parse(localStorage.getItem(key))?.access_token : null; } catch {}
    if (!token) { window.location.href = '/login?redirect=/mypage/notices'; return; }
    fetch('/api/me/notices', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        setRows(d.notices);
        const unread = d.notices.filter(n => !n.read).map(n => n.id);
        // 一覧を開いた時点で既読にする（未読の印はこの表示の間だけ残す）
        if (unread.length) fetch('/api/me/notices', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ids: unread }) });
      })
      .catch(() => setErr('お知らせを読み込めませんでした'));
  }, []);

  return (
    <main className="section">
      <div className="container mypage-layout">
        <MypageSideNav />
        <section className="stack mypage-content nt">
          <h1 className="section-title">お店からのお知らせ</h1>
          <p className="nt-lead">通っているお店からのお知らせです。</p>
          {err && <p>{err}</p>}
          {!rows && !err && <p>読み込み中…</p>}
          {rows && !rows.length && <p>まだお知らせはありません。</p>}
          {rows && rows.map(n => (
            <article key={n.id} className="nt-card">
              <button type="button" className="nt-head" onClick={() => setOpen(open === n.id ? null : n.id)} aria-expanded={open === n.id}>
                <span className="nt-meta">{n.provider_name}・{new Date(n.publish_at).toLocaleDateString('ja-JP')}{n.pinned && <em>大切なお知らせ</em>}{!n.read && <em>新着</em>}</span>
                <b>{n.title}</b>
              </button>
              {open === n.id && (
                <div className="nt-body">
                  <p><Linkified text={n.body} /></p>
                  {n.provider_slug && <a href={`/provider/${n.provider_slug}`} className="nt-link">お店のページを見る</a>}
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
      <style>{`
        .nt { color: #fff; }
        .nt-lead { margin: -8px 0 0; font-size: 13px; }
        .nt-card { border: 1px solid rgba(255,255,255,0.18); border-radius: 14px; background: #151b24; overflow: hidden; }
        .nt-head { display: grid; gap: 4px; width: 100%; text-align: left; padding: 16px 18px; background: none; border: 0; color: #fff; cursor: pointer; font-family: inherit; }
        .nt-head b { font-size: 15px; line-height: 1.5; }
        .nt-meta { font-size: 12px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .nt-meta em { font-style: normal; font-size: 11px; font-weight: 800; padding: 1px 8px; border-radius: 99px; background: #fff; color: #111; }
        .nt-body { padding: 0 18px 18px; font-size: 14px; line-height: 1.9; }
        .nt-body p { margin: 0 0 12px; white-space: pre-wrap; }
        .nt-body a { color: #fff; font-weight: 700; word-break: break-all; }
        .nt-head:focus-visible { outline: 2px solid #fff; outline-offset: -2px; }
      `}</style>
    </main>
  );
}
