'use client';
// 初期設定ガイド（2026-11-26 渡邉要望：「初めて入る時はよくわからない。初期設定を重点的に、パッパッパッとこれをやりましょうと案内して。
// ただし、いつでもすぐにスキップして作業に取り掛かれるように」）。
//  - mode="bar"：管理画面の上に細い帯で「初期設定 2/7・次は〇〇」。押すと一覧が開く。×でいつでも閉じられる（使い方タブから戻せる）
//  - mode="card"：使い方タブの一番上に、同じ一覧をいつも出す
//  - 手順の画面を開いている間は「この画面でやること」を出し、終わったら実データで確かめて次へ進める
// 終わったかどうかはお店の実データから判定する（/api/provider/setup-guide・lib/setup-guide.js）。
// 次の手順は window.__finemeSetup に置き、右下のAIコンサルの吹き出しが「次はここをやりましょう」と案内に使う。
import { useCallback, useEffect, useRef, useState } from 'react';
import { goToTab } from './consultant-api';

export const SETUP_STATE_EVENT = 'pd-setup-state';
const REFRESH_EVENT = 'pd-setup-refresh';
const OPEN_KEY = 'fineme:setup:open';

function getToken() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return key ? JSON.parse(localStorage.getItem(key))?.access_token || null : null;
  } catch { return null; }
}
async function api(method, body) {
  const t = getToken();
  if (!t) return null;
  const res = await fetch('/api/provider/setup-guide', {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  return res.json().catch(() => null);
}
function currentTab() {
  return document.querySelector('.tab-btn.active[data-tab]')?.dataset.tab || new URLSearchParams(location.search).get('tab') || '';
}
function readOpen() { try { return localStorage.getItem(OPEN_KEY); } catch { return null; } }
function writeOpen(v) { try { localStorage.setItem(OPEN_KEY, v ? '1' : '0'); } catch {} }

const CSS = `
.sg { color: #1a1410; }
.sg-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: #fff; border: 1px solid rgba(201,168,76,.45); border-left: 4px solid #c9a84c; border-radius: 12px; padding: 10px 12px 10px 14px; margin-bottom: 14px; box-shadow: 0 2px 10px rgba(26,20,16,.05); }
.sg-count { display: flex; align-items: center; gap: 10px; min-width: 0; }
.sg-meter { width: 72px; height: 6px; border-radius: 99px; background: rgba(26,20,16,.08); overflow: hidden; flex-shrink: 0; }
.sg-meter span { display: block; height: 100%; background: linear-gradient(90deg, #c9a84c, #e8cf7e); transition: width .3s; }
.sg-label { font-size: 12px; font-weight: 800; letter-spacing: .04em; color: #8a6a17; white-space: nowrap; }
.sg-next { flex: 1; min-width: 180px; font-size: 13.5px; line-height: 1.5; }
.sg-next b { font-weight: 800; }
.sg-next small { color: rgba(26,20,16,.55); font-size: 12px; margin-left: 6px; white-space: nowrap; }
.sg-acts { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.sg-btn { border: 0; border-radius: 999px; padding: 8px 16px; font-weight: 800; font-size: 13px; cursor: pointer; color: #1a1410; background: linear-gradient(180deg, #e8cf7e, #c9a84c); min-height: 36px; }
.sg-ghost { border: 1px solid rgba(26,20,16,.16); background: #fff; border-radius: 999px; padding: 7px 14px; font-size: 12.5px; font-weight: 700; cursor: pointer; color: #1a1410; min-height: 36px; }
.sg-x { border: 0; background: none; color: rgba(26,20,16,.5); font-size: 12.5px; cursor: pointer; padding: 8px 6px; min-height: 36px; }
.sg-x:hover, .sg-ghost:hover { color: #1a1410; }
.sg-panel { background: #fff; border: 1px solid rgba(26,20,16,.12); border-radius: 14px; padding: 16px 18px; margin: -6px 0 14px; display: grid; gap: 10px; }
.sg-card { background: #fff; border: 1px solid rgba(201,168,76,.45); border-radius: 14px; padding: 22px 24px; margin-bottom: 16px; display: grid; gap: 12px; }
.sg-card h2 { margin: 0; font-size: 16px; }
.sg-note { margin: 0; font-size: 12.5px; line-height: 1.7; color: rgba(26,20,16,.62); }
.sg-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.sg-item { display: grid; grid-template-columns: 26px 1fr auto; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 12px; background: rgba(26,20,16,.03); }
.sg-item.is-next { background: rgba(201,168,76,.12); }
.sg-dot { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; border: 1.5px solid rgba(26,20,16,.25); color: rgba(26,20,16,.6); }
.sg-item.is-done .sg-dot { background: #1f7a4d; border-color: #1f7a4d; color: #fff; }
.sg-item.is-done .sg-dot::before { content: ''; width: 5px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg) translate(-1px, -1px); }
.sg-item.is-skipped .sg-dot { border-style: dashed; }
.sg-item b { font-size: 13.5px; display: block; }
.sg-item.is-done b { color: rgba(26,20,16,.55); font-weight: 700; }
.sg-item span { font-size: 12px; color: rgba(26,20,16,.6); line-height: 1.55; display: block; }
.sg-item-acts { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.sg-tag { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: rgba(26,20,16,.07); color: rgba(26,20,16,.6); white-space: nowrap; }
.sg-here { background: #fffbeb; border: 1px solid #f3d27a; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; display: grid; gap: 8px; }
.sg-here h3 { margin: 0; font-size: 14px; }
.sg-here ol { margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8; }
.sg-msg { margin: 0; font-size: 12.5px; color: #7c2d12; font-weight: 700; }
.sg-done { background: #f0fdf4; border: 1px solid #86efac; color: #14532d; border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; display: flex; gap: 10px; align-items: center; justify-content: space-between; flex-wrap: wrap; font-size: 13.5px; }
.sg button:focus-visible { outline: 2px solid #2f4f8f; outline-offset: 2px; }
@media (max-width: 560px) { .sg-item { grid-template-columns: 26px 1fr; } .sg-item-acts { grid-column: 2; justify-content: flex-start; } .sg-card { padding: 18px 16px; } }
@media (prefers-reduced-motion: reduce) { .sg-meter span { transition: none; } }
`;

export default function SetupGuide({ mode = 'bar' }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('');
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState('');
  const prevRef = useRef(null);

  const load = useCallback(async () => {
    const d = await api('GET');
    if (!d || !Array.isArray(d.steps)) return null;
    setData(d);
    const remaining = d.steps.filter(s => s.status === 'todo');
    // AIコンサルの吹き出し（ConsultantWidget）が使う「次の一手」
    try {
      window.__finemeSetup = d.hidden ? null : { next: remaining[0] ? { key: remaining[0].key, title: remaining[0].title, tab: remaining[0].tab } : null, remaining: remaining.length, done: d.done, total: d.total };
      window.dispatchEvent(new Event(SETUP_STATE_EVENT));
    } catch {}
    return d;
  }, []);

  useEffect(() => {
    load().then(d => {
      // 初めての時（まだ1つも終わっていない）は一覧を開いて出す。一度閉じたらその後は閉じたまま
      const saved = readOpen();
      if (d && mode === 'bar') setOpen(saved === null ? d.done === 0 : saved === '1');
    });
    setTab(currentTab());
    let t;
    const onClick = e => {
      const btn = e.target.closest?.('.tab-btn[data-tab], [data-goto-tab]');
      if (!btn) return;
      clearTimeout(t);
      t = setTimeout(() => { setTab(currentTab()); setMsg(''); }, 60);
    };
    const onFocus = () => load();
    const onRefresh = () => load();
    document.addEventListener('click', onClick, true);
    window.addEventListener('focus', onFocus);
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [load, mode]);

  // 手順の画面から別の画面に移った時に、実データで確かめ直す（保存したら自動で「済」になる）
  useEffect(() => {
    if (prevRef.current && prevRef.current !== tab) load();
    prevRef.current = tab;
  }, [tab, load]);

  async function act(body) {
    await api('POST', body);
    await load();
    window.dispatchEvent(new Event(REFRESH_EVENT));
  }
  function setOpenPersist(v) { setOpen(v); writeOpen(v); }
  function go(step) { setMsg(''); goToTab(step.tab); if (mode === 'bar') setOpenPersist(false); }
  async function check(step) {
    setChecking(true); setMsg('');
    const d = await load();
    setChecking(false);
    const now = d?.steps.find(s => s.key === step.key);
    if (now?.status === 'done') {
      const next = d.steps.find(s => s.status === 'todo');
      setMsg('');
      if (next) goToTab(next.tab);
    } else {
      setMsg('まだ保存されていないようです。上の手順で保存してから、もう一度押してください。');
    }
  }

  if (!data) return null;
  const { steps } = data;
  if (!steps.length) return null;
  const todo = steps.filter(s => s.status === 'todo');
  const next = todo[0] || null;
  const allDone = steps.every(s => s.status === 'done');
  const pct = Math.round((data.done / data.total) * 100);
  const here = tab && steps.find(s => s.tab === tab && s.status === 'todo');

  const list = (
    <ol className="sg-list">
      {steps.map(s => (
        <li key={s.key} className={`sg-item is-${s.status}${next && s.key === next.key ? ' is-next' : ''}`}>
          <div className="sg-dot" aria-hidden="true">{s.status === 'done' ? '' : steps.indexOf(s) + 1}</div>
          <div>
            <b>{s.title}</b>
            <span>{s.status === 'done' ? '終わっています' : s.status === 'skipped' ? 'あとでやる、にしています' : `${s.why}（約${s.minutes}分）`}</span>
          </div>
          <div className="sg-item-acts">
            {s.status !== 'done' && <button type="button" className={next && s.key === next.key ? 'sg-btn' : 'sg-ghost'} onClick={() => go(s)}>開く</button>}
            {s.status === 'todo' && <button type="button" className="sg-x" onClick={() => act({ action: 'skip', key: s.key })}>あとで</button>}
            {s.status === 'skipped' && <button type="button" className="sg-x" onClick={() => act({ action: 'unskip', key: s.key })}>やることに戻す</button>}
            {s.status === 'done' && <span className="sg-tag">済</span>}
          </div>
        </li>
      ))}
    </ol>
  );

  // 使い方タブの中のカード（閉じていても、ここからはいつでも見られる）
  if (mode === 'card') {
    return (
      <section className="sg sg-card" aria-labelledby="sg-card-title">
        <style>{CSS}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2 id="sg-card-title">はじめての方へ：初期設定の進み具合</h2>
          <span className="sg-label">{data.done} / {data.total} 完了</span>
        </div>
        <div className="sg-meter" style={{ width: '100%' }}><span style={{ width: `${pct}%` }} /></div>
        <p className="sg-note">上から順に進めると、その日から予約・顧客管理を使い始められます。保存すると自動で「済」になります。やらない手順は「あとで」で飛ばせます。</p>
        {list}
        {data.hidden && !allDone && (
          <div><button type="button" className="sg-ghost" onClick={() => act({ action: 'show' })}>画面の上にガイドをもう一度出す</button></div>
        )}
      </section>
    );
  }

  // ── 画面の上の帯 ──
  if (data.hidden || tab === 'tutorial') return null;
  if (allDone) {
    return (
      <div className="sg sg-done" role="status">
        <style>{CSS}</style>
        <span><b>初期設定が終わりました。</b>これで予約・顧客管理を使い始められます。困った時は「使い方」から探せます。</span>
        <button type="button" className="sg-ghost" onClick={() => act({ action: 'hide' })}>閉じる</button>
      </div>
    );
  }

  return (
    <div className="sg">
      <style>{CSS}</style>
      {here && (
        <div className="sg-here" role="region" aria-label="この画面でやること">
          <h3>初期設定：{here.title}</h3>
          <ol>{here.how.map((h, i) => <li key={i}>{h}</li>)}</ol>
          {msg && <p className="sg-msg" role="alert">{msg}</p>}
          <div className="sg-acts">
            <button type="button" className="sg-btn" disabled={checking} onClick={() => check(here)}>{checking ? '確かめています…' : 'できたので次へ'}</button>
            <button type="button" className="sg-x" onClick={() => act({ action: 'skip', key: here.key })}>この手順はあとで</button>
          </div>
        </div>
      )}
      {!here && (
        <div className="sg-bar">
          <div className="sg-count">
            <span className="sg-label">初期設定 {data.done}/{data.total}</span>
            <div className="sg-meter" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
          </div>
          <div className="sg-next">
            {next ? <>次は<b>「{next.title}」</b><small>約{next.minutes}分</small></> : <>残りは「あとで」にした手順だけです</>}
          </div>
          <div className="sg-acts">
            {next && <button type="button" className="sg-btn" onClick={() => go(next)}>開く</button>}
            <button type="button" className="sg-ghost" aria-expanded={open} onClick={() => setOpenPersist(!open)}>{open ? '一覧を閉じる' : 'すべての手順'}</button>
            <button type="button" className="sg-x" onClick={() => act({ action: 'hide' })} title="使い方タブからいつでも戻せます">ガイドを閉じる</button>
          </div>
        </div>
      )}
      {!here && open && (
        <div className="sg-panel">
          <p className="sg-note">上から順に進めると、その日から使い始められます。保存すると自動で「済」になります。今すぐ作業したい時は、このガイドは閉じて大丈夫です（「使い方」からいつでも戻せます）。</p>
          {list}
        </div>
      )}
    </div>
  );
}
