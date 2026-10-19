'use client';
// 予約ウィジェット（でお要望 2026-10-19：hacomono差分 #14）。店舗の自社サイトに iframe で埋め込む。
// メニューと空き枠を見せ、予約はFinemeの店舗ページ（新しいタブ）で行う
// （埋め込み先ではログイン状態を共有できないブラウザが多いため、予約手続き自体はiframeの外で行う）。
// ?view=both|menus|schedule ?theme=light|dark
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

const jst = (n = 0) => new Date(Date.now() + 9 * 3600000 + n * 86400000).toISOString().slice(0, 10);
const WD = ['日', '月', '火', '水', '木', '金', '土'];

export default function EmbedBooking() {
  const { slug } = useParams();
  const sp = useSearchParams();
  const view = ['menus', 'schedule'].includes(sp.get('view')) ? sp.get('view') : 'both';
  const dark = sp.get('theme') === 'dark';
  const [prov, setProv] = useState(null);
  const [menus, setMenus] = useState([]);
  const [slots, setSlots] = useState([]);
  const [day, setDay] = useState(jst());
  const [err, setErr] = useState('');
  const root = useRef(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const bookUrl = (q = {}) => `${origin}/provider/${slug}?${new URLSearchParams({ tab: 'consult', from: 'widget', ...q })}`;

  useEffect(() => {
    Promise.all([
      fetch(`/api/providers/${slug}`).then(r => (r.ok ? r.json() : Promise.reject())),
      fetch(`/api/providers/${slug}/services`).then(r => (r.ok ? r.json() : [])),
      fetch(`/api/providers/${slug}/availability?from=${jst()}&to=${jst(13)}`).then(r => (r.ok ? r.json() : [])),
    ]).then(([p, m, s]) => { setProv(p); setMenus(Array.isArray(m) ? m : []); setSlots(Array.isArray(s) ? s : []); })
      .catch(() => setErr('このお店の予約情報を表示できません'));
  }, [slug]);

  // 埋め込み先のiframeの高さを中身に合わせる（widget.js が受け取る）
  useEffect(() => {
    if (!root.current || typeof ResizeObserver === 'undefined') return;
    const post = () => window.parent?.postMessage({ type: 'fineme-embed-height', slug, height: Math.ceil(root.current.getBoundingClientRect().height) + 8 }, '*');
    const ro = new ResizeObserver(post); ro.observe(root.current); post();
    return () => ro.disconnect();
  }, [slug, prov]);

  const days = [...Array(14)].map((_, i) => jst(i));
  const daySlots = slots.filter(s => s.date === day).sort((a, b) => (a.start_time < b.start_time ? -1 : 1));
  const menuName = id => menus.find(m => m.id === id)?.name;

  return (
    <div ref={root} className={`fw ${dark ? 'fw-dark' : ''}`}>
      {err && <p className="fw-note">{err}</p>}
      {!prov && !err && <p className="fw-note">読み込み中…</p>}
      {prov && (
        <>
          <div className="fw-head"><b>{prov.name}</b><a href={bookUrl()} target="_blank" rel="noopener" className="fw-btn">予約する</a></div>
          {view !== 'menus' && slots.length > 0 && (
            <section className="fw-sec">
              <h2>空き状況</h2>
              <div className="fw-days" role="tablist">
                {days.map(d => {
                  const n = slots.filter(s => s.date === d).length;
                  const dt = new Date(`${d}T00:00:00+09:00`);
                  return <button key={d} type="button" role="tab" aria-selected={d === day} className={d === day ? 'on' : ''} onClick={() => setDay(d)} disabled={!n}><span>{dt.getMonth() + 1}/{dt.getDate()}</span><small>{WD[dt.getDay()]}</small><em>{n ? `空${n}` : '—'}</em></button>;
                })}
              </div>
              <div className="fw-slots">
                {daySlots.length ? daySlots.map(s => (
                  <a key={s.id} href={bookUrl({ service_id: s.service_id || '', date: s.date })} target="_blank" rel="noopener" className="fw-slot">
                    <b>{String(s.start_time).slice(0, 5)}</b><span>{[menuName(s.service_id), s.staff_name].filter(Boolean).join('・') || '予約できます'}</span><em>残り{s.remaining}</em>
                  </a>
                )) : <p className="fw-note">この日は空きがありません。</p>}
              </div>
            </section>
          )}
          {view !== 'schedule' && menus.length > 0 && (
            <section className="fw-sec">
              <h2>メニュー</h2>
              {menus.map(m => (
                <div key={m.id} className="fw-menu">
                  <div><b>{m.name}</b><span>¥{Number(m.price || 0).toLocaleString()}{m.duration ? `・${/^\d+$/.test(String(m.duration)) ? `${m.duration}分` : m.duration}` : ''}</span></div>
                  <a href={bookUrl({ service_id: m.id })} target="_blank" rel="noopener" className="fw-btn fw-btn-sm">予約</a>
                </div>
              ))}
            </section>
          )}
          <p className="fw-foot">予約はFinemeの店舗ページで行います（新しいタブで開きます）</p>
        </>
      )}
      <style>{`
        html, body { background: transparent !important; margin: 0; }
        .fw { --bg: #ffffff; --fg: #111111; --line: rgba(0,0,0,0.14); --soft: #f4f2ee; font-family: "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif; color: var(--fg); background: var(--bg); padding: 14px; border-radius: 14px; display: grid; gap: 14px; }
        .fw-dark { --bg: #111418; --fg: #ffffff; --line: rgba(255,255,255,0.2); --soft: #1d222a; }
        .fw-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .fw-head b { font-size: 16px; }
        .fw-btn { background: var(--fg); color: var(--bg); text-decoration: none; font-weight: 800; font-size: 14px; padding: 10px 18px; border-radius: 10px; white-space: nowrap; }
        .fw-btn-sm { padding: 7px 14px; font-size: 13px; }
        .fw-sec { display: grid; gap: 8px; }
        .fw-sec h2 { margin: 0; font-size: 14px; }
        .fw-days { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
        .fw-days button { flex: 0 0 auto; display: grid; justify-items: center; gap: 1px; min-width: 52px; padding: 6px 4px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); cursor: pointer; font-family: inherit; }
        .fw-days button.on { background: var(--fg); color: var(--bg); }
        .fw-days button:disabled { opacity: 0.4; cursor: default; }
        .fw-days span { font-size: 13px; font-weight: 800; } .fw-days small, .fw-days em { font-size: 10.5px; font-style: normal; }
        .fw-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; }
        .fw-slot { display: grid; gap: 1px; padding: 9px 11px; border-radius: 10px; border: 1px solid var(--line); color: var(--fg); text-decoration: none; font-size: 12px; }
        .fw-slot b { font-size: 15px; } .fw-slot em { font-style: normal; font-size: 11px; }
        .fw-menu { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; background: var(--soft); }
        .fw-menu div { display: grid; gap: 2px; font-size: 12.5px; } .fw-menu b { font-size: 14px; }
        .fw-note, .fw-foot { margin: 0; font-size: 12px; }
        .fw a:focus-visible, .fw button:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
      `}</style>
    </div>
  );
}
