'use client';
// 掲載者ダッシュボード右下の常駐「AI専属コンサル」（でお要望 2026-10-03）。
// どのタブにいても、店舗のゴール・実データ・今日の時期から考えた「今やること」を出す。
// 閉じている時は右下に「今日やること 1/3」のような進み具合の札を出す（2026-10-21：右端の縦タブから変更）。ゴール未設定でもシステムは普通に使える。
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { goToTab } from './consultant-api';
import { SHARED_CSS, TaskList, useConsultant } from './ConsultantShared';

// ── 閉じている時の吹き出し（でお要望 2026-10-21：「折りたたみが見つけづらい。今野くんは気づいていなかった。
//    でも作業の邪魔はしない、いい塩梅で」）。作業の区切り（画面を開いた後・タブを切り替えた直後）にだけ、
//    1日3回まで・20分以上あけて出す。入力中・ポップアップ表示中・直前に操作していた時は出さない。15秒で消える。
const NUDGE_KEY = 'fineme:cw:nudge';
const OPENED_KEY = 'fineme:cw:opened';
const MAX_PER_DAY = 3;
const GAP_MS = 20 * 60 * 1000;
const SHOW_MS = 15000;
const todayStr = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
function readNudge() {
  try {
    const v = JSON.parse(localStorage.getItem(NUDGE_KEY) || '{}');
    return v.date === todayStr() ? v : { date: todayStr(), count: 0, lastAt: 0, off: false };
  } catch { return null; }
}
function writeNudge(v) { try { localStorage.setItem(NUDGE_KEY, JSON.stringify(v)); } catch {} }
function everOpened() { try { return localStorage.getItem(OPENED_KEY) === '1'; } catch { return true; } }
function currentTab() {
  return document.querySelector('.tab-btn.active[data-tab]')?.dataset.tab || new URLSearchParams(location.search).get('tab') || '';
}
// 入力中・ポップアップ表示中・直前の操作がある間は「作業中」とみなして出さない
let lastActivity = 0;
function isBusyNow() {
  if (Date.now() - lastActivity < 4000) return true;
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) return true;
  const modal = [...document.querySelectorAll('.cal-modal-overlay, [role="dialog"], [aria-modal="true"]')].some(el => el.offsetParent !== null || getComputedStyle(el).position === 'fixed' && getComputedStyle(el).display !== 'none');
  return modal;
}

function Ring({ done, total }) {
  const r = 15, c = 2 * Math.PI * r;
  const ratio = total ? done / total : 0;
  return (
    <svg className="cw-ring" width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
      <circle cx="19" cy="19" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
      {ratio > 0 && <circle cx="19" cy="19" r={r} fill="none" stroke="#c8a45c" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * ratio} ${c}`} transform="rotate(-90 19 19)" />}
      <text x="19" y="23" textAnchor="middle" fontSize="12" fontWeight="800" fill="#ffffff">{total ? total - done : '策'}</text>
    </svg>
  );
}

export default function ConsultantWidget() {
  const { data, error, planning, busy, chatLog, replan, setTaskStatus, saveGoal, sendChat } = useConsultant();
  const [collapsed, setCollapsed] = useState(true);
  const [bubble, setBubble] = useState(null); // { text, sub }
  const [wiggle, setWiggle] = useState(false);
  const bubbleTimer = useRef(null);
  const dataRef = useRef(null);
  dataRef.current = data;
  const [view, setView] = useState('now');
  const [chatInput, setChatInput] = useState('');
  const [goalDraft, setGoalDraft] = useState('');
  const logRef = useRef(null);

  useEffect(() => {
    if (view === 'chat' && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [chatLog, view, busy]);

  function setCollapsedPersist(v) {
    setCollapsed(v);
    if (!v) {
      setBubble(null);
      try { localStorage.setItem(OPENED_KEY, '1'); } catch {}
    }
  }

  // 吹き出しに出す言葉：今の画面に関係するタスク ＞ 初めての方への紹介 ＞ ゴール未設定 ＞ 今日やることの件数
  function pickMessage(tab) {
    const d = dataRef.current;
    if (!d || d.enabled === false) return null;
    const open = (d.tasks || []).filter(t => t.status === 'open');
    const urgentN = open.filter(t => t.bucket === 'today' || t.bucket === 'missed').length;
    const here = tab && open.find(t => t.tab === tab);
    const cut = (t, n = 48) => (t.length > n ? `${t.slice(0, n)}…` : t);
    if (here) return { text: `この画面でできること：${cut(here.title)}`, sub: 'AIコンサルがお店のデータから選んだ、今日のおすすめです' };
    if (!everOpened()) return { text: 'AIコンサルです。お店のデータから「今日やること」を出しています', sub: urgentN ? `いま${urgentN}件あります。押すと開きます` : '押すと開きます' };
    if (d.needsGoal) return { text: 'お店がどうなりたいか教えてもらえれば、今日やることを考えます', sub: '押すと開きます' };
    if (urgentN) return { text: `今日やることが${urgentN}件あります`, sub: cut(open.find(t => t.bucket === 'today' || t.bucket === 'missed')?.title || '', 60) };
    return null;
  }
  function tryNudge(tab, attempt = 0) {
    if (!collapsedRef.current) return;
    const st = readNudge();
    if (!st || st.off || st.count >= MAX_PER_DAY || Date.now() - st.lastAt < GAP_MS) return;
    const msg = pickMessage(tab);
    if (!msg) return;
    if (isBusyNow()) {
      // 作業中なら少し待ってからもう一度（それでも作業中なら今回は出さない）
      if (attempt < 6) bubbleTimer.current = setTimeout(() => tryNudge(tab, attempt + 1), 5000);
      return;
    }
    writeNudge({ ...st, count: st.count + 1, lastAt: Date.now() });
    setBubble(msg);
    setWiggle(true);
    setTimeout(() => setWiggle(false), 1200);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setBubble(null), SHOW_MS);
  }
  const collapsedRef = useRef(true);
  collapsedRef.current = collapsed;
  const hideTimer = useRef(null);

  useEffect(() => {
    if (!data || data.enabled === false) return;
    const mark = () => { lastActivity = Date.now(); };
    window.addEventListener('keydown', mark, true);
    window.addEventListener('input', mark, true);
    // 画面を開いて少し落ち着いてから1回
    const first = setTimeout(() => tryNudge(currentTab()), 6000);
    // タブを切り替えた直後（作業の区切り）
    const onClick = e => {
      const btn = e.target.closest?.('.tab-btn[data-tab]');
      if (!btn) { mark(); return; }
      clearTimeout(bubbleTimer.current);
      bubbleTimer.current = setTimeout(() => tryNudge(btn.dataset.tab), 2500);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      clearTimeout(first); clearTimeout(bubbleTimer.current); clearTimeout(hideTimer.current);
      window.removeEventListener('keydown', mark, true);
      window.removeEventListener('input', mark, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [!!data]);

  function dismissToday() {
    const st = readNudge();
    if (st) writeNudge({ ...st, off: true });
    setBubble(null);
  }

  function submitChat() {
    const t = chatInput;
    setChatInput('');
    sendChat(t);
  }

  if (!data || data.enabled === false) return null;

  const { goalText, needsGoal, diagnosis, tasks, tabLabels } = data;
  const openTasks = (tasks || []).filter(t => t.status === 'open');
  const urgent = openTasks.filter(t => t.bucket === 'today' || t.bucket === 'missed');
  const shown = (urgent.length ? urgent : openTasks).slice(0, 4);
  const hiddenCount = openTasks.length - shown.length;
  // 今日の進み具合（今日やること＝期限が今日・遅れているもの。今日終えたものも数に入れて「もう進んでいる」と見せる）
  const today0 = todayStr();
  const doneToday = (tasks || []).filter(t => t.status === 'done' && t.done_at && new Date(new Date(t.done_at).getTime() + 9 * 3600000).toISOString().slice(0, 10) === today0).length;
  const todayTotal = doneToday + urgent.length;

  if (collapsed) {
    return createPortal(
      <>
        <style>{WIDGET_CSS}</style>
        {/* 右下の札（でお要望 2026-10-21：右端の縦タブは質問チャットbotと見分けがつかず気づかれにくかった）。
            チャットの窓口ではなく「今日の段取り役」に見えるよう、今日の進み具合を輪と数字で出す */}
        <button type="button" className={`cw-launch${wiggle ? ' is-wiggle' : ''}`} onClick={() => setCollapsedPersist(false)}
          aria-label={`AI専属コンサルを開く${todayTotal ? `（今日やること ${doneToday}/${todayTotal}）` : ''}`}>
          <Ring done={doneToday} total={todayTotal} />
          <span className="cw-launch-text">
            <span className="cw-launch-kicker">AIコンサル</span>
            <b>{needsGoal ? 'お店のゴールを決める' : todayTotal === 0 ? '相談する' : urgent.length === 0 ? '今日の分は完了' : `今日やること ${doneToday}/${todayTotal}`}</b>
          </span>
        </button>
        {bubble && (
          <div className="cw-bubble" role="status" onMouseEnter={() => clearTimeout(hideTimer.current)} onMouseLeave={() => { hideTimer.current = setTimeout(() => setBubble(null), 6000); }}>
            <button type="button" className="cw-bubble-main" onClick={() => setCollapsedPersist(false)}>
              <b>{bubble.text}</b>
              {bubble.sub && <span>{bubble.sub}</span>}
            </button>
            <div className="cw-bubble-foot">
              <button type="button" onClick={dismissToday}>今日は出さない</button>
              <button type="button" onClick={() => setBubble(null)} aria-label="閉じる">閉じる</button>
            </div>
          </div>
        )}
      </>,
      document.body,
    );
  }

  return (
    <>
      <style>{SHARED_CSS}{WIDGET_CSS}</style>
      <aside className="cw-panel" aria-label="AI専属コンサル">
        <header className="cw-head">
          <div className="cw-head-text">
            <div className="cw-kicker">AI専属コンサル</div>
            <div className="cw-goal" title={goalText || ''}>{needsGoal ? 'お店のゴールは未設定です' : `ゴール：${goalText}`}</div>
          </div>
          <button type="button" className="cw-icon-btn" onClick={() => setCollapsedPersist(true)} aria-label="折りたたむ">閉じる</button>
        </header>

        <nav className="cw-nav" aria-label="表示切り替え">
          {[['now', '今日やること'], ['chat', '相談']].map(([k, l]) => (
            <button key={k} type="button" className={`cw-nav-btn${view === k ? ' is-active' : ''}`} onClick={() => setView(k)}>{l}</button>
          ))}
        </nav>

        <div className="cw-body">
          {error && <p className="cw-error">{error}</p>}

          {view === 'now' && needsGoal && (
            <section className="cw-now">
              <h3 className="cw-now-title">お店がどうなりたいか、教えてください</h3>
              <p className="cw-why">ゴールと実際のデータ、今日の時期から、お店専用の見立てと毎日の作業を考えます。書かなくても、他の機能はこのまま使えます。</p>
              <textarea className="cw-goal-input" rows={3} maxLength={600} value={goalDraft} onChange={e => setGoalDraft(e.target.value)}
                placeholder="例：新しく来たお客様に2回目も来てもらえるようにしたい" aria-label="お店のゴール" />
              <div className="cw-actions">
                <button type="button" className="cw-primary" disabled={busy || !goalDraft.trim()} onClick={() => saveGoal(goalDraft)}>この内容で考えてもらう</button>
                <button type="button" className="cw-secondary" onClick={() => goToTab('consultant')}>詳しく書く</button>
              </div>
            </section>
          )}

          {view === 'now' && !needsGoal && (
            <>
              {planning && <p className="cw-why">お店のデータと今日の日付を見て、今日やることを考えています…</p>}
              {!planning && diagnosis && <p className="cw-diagnosis">{diagnosis.length > 120 ? `${diagnosis.slice(0, 120)}…` : diagnosis}</p>}
              {!planning && shown.length > 0 && <TaskList tasks={shown} tabLabels={tabLabels} busy={busy} onStatus={setTaskStatus} compact />}
              {!planning && shown.length === 0 && <p className="cc-muted">いまのタスクはありません。「考え直す」で、今日の状況から作り直せます。</p>}
              {hiddenCount > 0 && <p className="cc-muted">ほか{hiddenCount}件あります。</p>}
              <div className="cw-actions">
                <button type="button" className="cw-secondary" onClick={() => goToTab('consultant')}>見立てと全タスクを見る</button>
                <button type="button" className="cw-secondary" disabled={planning || busy} onClick={() => replan(true)}>考え直す</button>
              </div>
            </>
          )}

          {view === 'chat' && (
            <div className="cw-chat">
              <div className="cw-chat-log" ref={logRef}>
                {chatLog.length === 0 && <p className="cw-muted">お店のことを何でも相談してください。たとえば「今月は何に力を入れる？」「このスタッフに何を任せればいい？」「やってみたけどうまくいかなかった」など。</p>}
                {chatLog.map((m, i) => (
                  <div key={i} className={`cw-msg is-${m.role}`}>{m.content}</div>
                ))}
                {busy && <div className="cw-msg is-assistant cw-typing">考えています…</div>}
              </div>
              <form className="cw-chat-form" onSubmit={e => { e.preventDefault(); submitChat(); }}>
                <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} rows={2} maxLength={1000} placeholder="相談したいことを入力" aria-label="相談内容"
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitChat(); } }} />
                <button type="submit" className="cw-primary" disabled={busy || !chatInput.trim()}>送る</button>
              </form>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

const WIDGET_CSS = `
  .cw-panel { position: fixed; right: 16px; bottom: 16px; z-index: 180; width: min(380px, calc(100vw - 32px)); max-height: min(640px, calc(100vh - 32px)); display: flex; flex-direction: column; background: #fff; color: #1a1410; border: 1px solid rgba(26,20,16,0.12); border-radius: 14px; box-shadow: 0 12px 40px rgba(10,15,30,0.22); overflow: hidden; font-size: 13.5px; line-height: 1.6; }
  .cw-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 12px 14px; background: #0a0f1e; color: #fff; }
  .cw-kicker { font-size: 11px; letter-spacing: .08em; opacity: .7; }
  .cw-goal { font-weight: 700; font-size: 14px; }
  .cw-icon-btn { background: transparent; border: 1px solid rgba(255,255,255,.35); color: #fff; border-radius: 8px; padding: 3px 10px; font-size: 12px; cursor: pointer; }
  .cw-icon-btn:hover { background: rgba(255,255,255,.12); }
  .cw-nav { display: flex; border-bottom: 1px solid rgba(26,20,16,0.1); }
  .cw-nav-btn { flex: 1; padding: 9px 4px; background: none; border: none; border-bottom: 2px solid transparent; font-size: 13px; font-weight: 700; color: rgba(26,20,16,0.55); cursor: pointer; }
  .cw-nav-btn.is-active { color: #1a1410; border-bottom-color: var(--color-gold, #c8a45c); }
  .cw-body { padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
  .cw-error { margin: 0; color: #b91c1c; font-size: 12.5px; }
  .cw-progress { display: flex; align-items: center; gap: 10px; }
  .cw-progress-bar { flex: 1; height: 6px; border-radius: 99px; background: rgba(26,20,16,0.1); overflow: hidden; }
  .cw-progress-bar span { display: block; height: 100%; background: var(--color-gold, #c8a45c); border-radius: 99px; }
  .cw-progress-text { font-size: 12px; color: rgba(26,20,16,0.6); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .cw-now { display: flex; flex-direction: column; gap: 8px; }
  .cw-layer { font-size: 11.5px; font-weight: 700; color: rgba(26,20,16,0.55); }
  .cw-now-title { margin: 0; font-size: 15.5px; line-height: 1.5; }
  .cw-why { margin: 0; color: rgba(26,20,16,0.78); }
  .cw-prog { margin: 0; font-size: 12.5px; font-weight: 700; color: #1a1410; background: rgba(26,20,16,0.05); padding: 6px 10px; border-radius: 8px; }
  .cw-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .cw-primary { background: var(--color-gold, #c8a45c); color: #0a0f1e; border: none; border-radius: 9px; padding: 9px 14px; font-weight: 700; font-size: 13px; cursor: pointer; }
  .cw-primary:disabled { opacity: .5; cursor: default; }
  .cw-secondary { background: #fff; color: #1a1410; border: 1px solid rgba(26,20,16,0.22); border-radius: 9px; padding: 8px 12px; font-weight: 600; font-size: 13px; cursor: pointer; }
  .cw-secondary:disabled { opacity: .5; cursor: default; }
  .cw-link { background: none; border: none; padding: 0; color: #1d4ed8; font-size: 12.5px; font-weight: 700; cursor: pointer; text-align: left; }
  .cw-link:disabled { opacity: .5; cursor: default; }
  .cw-interview-prompt { border-top: 1px dashed rgba(26,20,16,0.2); padding-top: 12px; display: flex; flex-direction: column; gap: 6px; }
  .cw-interview-prompt p { margin: 0; color: rgba(26,20,16,0.78); }
  .cw-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .cw-step { border: 1px solid rgba(26,20,16,0.12); border-radius: 10px; padding: 9px 11px; display: flex; flex-direction: column; gap: 4px; }
  .cw-step.is-done { opacity: .6; }
  .cw-step-main { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
  .cw-step-title { font-weight: 700; }
  .cw-step-meta { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; color: rgba(26,20,16,0.58); }
  .cw-step-actions { display: flex; gap: 14px; }
  .cw-badge { flex-shrink: 0; font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 99px; background: #fef3c7; color: #92400e; }
  .cw-badge.is-done { background: #d1fae5; color: #065f46; }
  .cw-badge.is-snoozed, .cw-badge.is-skipped { background: #e5e7eb; color: #4b5563; }
  .cw-bn { border-top: 1px dashed rgba(26,20,16,0.2); padding-top: 12px; display: flex; flex-direction: column; gap: 8px; }
  .cw-bn h4 { margin: 0; font-size: 13.5px; }
  .cw-bn-row { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
  .cw-saved { margin: 0; font-weight: 700; color: #065f46; }
  .cw-muted { margin: 0; color: rgba(26,20,16,0.55); font-size: 12.5px; }
  .cw-chat { display: flex; flex-direction: column; gap: 10px; }
  .cw-chat-log { display: flex; flex-direction: column; gap: 8px; max-height: 320px; min-height: 120px; overflow-y: auto; }
  .cw-msg { padding: 8px 11px; border-radius: 10px; white-space: pre-wrap; max-width: 92%; }
  .cw-msg.is-user { align-self: flex-end; background: #0a0f1e; color: #fff; }
  .cw-msg.is-assistant { align-self: flex-start; background: rgba(26,20,16,0.06); }
  .cw-typing { color: rgba(26,20,16,0.55); }
  .cw-chat-form { display: flex; gap: 8px; align-items: flex-end; }
  .cw-chat-form textarea { flex: 1; resize: none; border: 1.5px solid rgba(26,20,16,0.2); border-radius: 9px; padding: 8px 10px; font-size: 13.5px; font-family: inherit; color: #1a1410; background: #fff; }
  .cw-dot { width: 9px; height: 9px; border-radius: 99px; background: var(--color-gold, #c8a45c); }
  .cw-launch { position: fixed; right: 16px; bottom: 16px; z-index: 180; display: flex; align-items: center; gap: 10px; padding: 8px 16px 8px 8px; background: #0a0f1e; color: #fff; border: 1px solid rgba(200,164,92,0.45); border-radius: 16px; box-shadow: 0 8px 24px rgba(10,15,30,0.28); cursor: pointer; font-family: inherit; text-align: left; }
  .cw-launch:hover { border-color: #c8a45c; }
  .cw-launch-text { display: flex; flex-direction: column; gap: 1px; }
  .cw-launch-kicker { font-size: 10.5px; letter-spacing: .08em; color: #ffffff; opacity: .8; }
  .cw-launch b { font-size: 13.5px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .cw-ring { flex-shrink: 0; display: block; }
  .cw-launch.is-wiggle { animation: cw-wiggle 1.1s ease-in-out 1; }
  @keyframes cw-wiggle { 0%, 100% { transform: translateY(0); } 20% { transform: translateY(-5px); } 40% { transform: translateY(0); } 60% { transform: translateY(-3px); } 80% { transform: translateY(0); } }
  .cw-bubble { position: fixed; right: 16px; bottom: 84px; z-index: 181; width: min(300px, calc(100vw - 32px)); background: #fff; color: #1a1410; border: 1px solid rgba(26,20,16,0.15); border-radius: 12px; box-shadow: 0 10px 30px rgba(10,15,30,0.2); animation: cw-in .25s ease-out; }
  .cw-bubble::after { content: ''; position: absolute; right: 36px; bottom: -7px; width: 12px; height: 12px; background: #fff; border-right: 1px solid rgba(26,20,16,0.15); border-bottom: 1px solid rgba(26,20,16,0.15); transform: rotate(45deg); }
  .cw-bubble-main { display: grid; gap: 3px; width: 100%; text-align: left; padding: 12px 14px 6px; background: none; border: 0; color: #1a1410; cursor: pointer; font-family: inherit; }
  .cw-bubble-main b { font-size: 13.5px; line-height: 1.55; }
  .cw-bubble-main span { font-size: 12px; line-height: 1.5; }
  .cw-bubble-foot { display: flex; justify-content: flex-end; gap: 4px; padding: 0 8px 8px; }
  .cw-bubble-foot button { background: none; border: 0; color: #1a1410; font-size: 11.5px; padding: 4px 8px; border-radius: 6px; cursor: pointer; text-decoration: underline; }
  .cw-bubble-foot button:hover { background: rgba(26,20,16,0.06); }
  @keyframes cw-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .cw-launch.is-wiggle, .cw-bubble { animation: none; } }
  @media (max-width: 640px) { .cw-launch { right: 10px; bottom: 10px; padding: 6px 12px 6px 6px; } .cw-bubble { right: 10px; bottom: 74px; width: calc(100vw - 20px); } }
  .cw-panel button:focus-visible, .cw-launch:focus-visible, .cw-panel textarea:focus-visible, .cw-panel input:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }
  @media (max-width: 640px) { .cw-panel { right: 8px; bottom: 8px; width: calc(100vw - 16px); max-height: 70vh; } }
  .cw-head-text { min-width: 0; }
  .cw-goal-input { width: 100%; box-sizing: border-box; resize: vertical; border: 1.5px solid rgba(26,20,16,0.2); border-radius: 9px; padding: 8px 10px; font-size: 13.5px; font-family: inherit; color: #1a1410; background: #fff; }
  .cw-diagnosis { margin: 0; font-size: 13px; line-height: 1.75; color: rgba(26,20,16,0.82); padding-bottom: 10px; border-bottom: 1px dashed rgba(26,20,16,0.2); }
`;
