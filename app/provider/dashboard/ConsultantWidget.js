'use client';
// 掲載者ダッシュボード右下の常駐「AI専属コンサル」（でお要望 2026-10-03）。
// どのタブにいても、店舗のゴール・実データ・今日の時期から考えた「今やること」を出す。
// 最初は開いて表示、閉じると右端に小さく収まる。ゴール未設定でもシステムは普通に使える。
import { useEffect, useRef, useState } from 'react';
import { goToTab } from './consultant-api';
import { SHARED_CSS, TaskList, useConsultant } from './ConsultantShared';

const COLLAPSE_KEY = 'fineme:consultant:collapsed';

export default function ConsultantWidget() {
  const { data, error, planning, busy, chatLog, replan, setTaskStatus, saveGoal, sendChat } = useConsultant();
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState('now');
  const [chatInput, setChatInput] = useState('');
  const [goalDraft, setGoalDraft] = useState('');
  const logRef = useRef(null);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'); } catch { /* 初期表示のままにする */ }
  }, []);

  useEffect(() => {
    if (view === 'chat' && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [chatLog, view, busy]);

  function setCollapsedPersist(v) {
    setCollapsed(v);
    try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch { /* 保存できなくても動作する */ }
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

  if (collapsed) {
    return (
      <>
        <style>{WIDGET_CSS}</style>
        <button type="button" className="cw-tab" onClick={() => setCollapsedPersist(false)} aria-label="AI専属コンサルを開く">
          <span className="cw-tab-label">AIコンサル</span>
          {(needsGoal || urgent.length > 0) && <span className="cw-dot" aria-hidden="true" />}
        </button>
      </>
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
                <button type="button" className="cw-primary" disabled={busy || planning || !goalDraft.trim()} onClick={() => saveGoal(goalDraft)}>この内容で考えてもらう</button>
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
  .cw-tab { position: fixed; right: 0; bottom: 96px; z-index: 180; display: flex; align-items: center; gap: 6px; background: #0a0f1e; color: #fff; border: none; border-radius: 12px 0 0 12px; padding: 12px 10px; box-shadow: -4px 4px 16px rgba(10,15,30,0.25); cursor: pointer; }
  .cw-tab-label { writing-mode: vertical-rl; font-size: 12.5px; font-weight: 700; letter-spacing: .1em; }
  .cw-dot { width: 9px; height: 9px; border-radius: 99px; background: var(--color-gold, #c8a45c); }
  .cw-panel button:focus-visible, .cw-tab:focus-visible, .cw-panel textarea:focus-visible, .cw-panel input:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }
  @media (max-width: 640px) { .cw-panel { right: 8px; bottom: 8px; width: calc(100vw - 16px); max-height: 70vh; } }
  .cw-head-text { min-width: 0; }
  .cw-goal-input { width: 100%; box-sizing: border-box; resize: vertical; border: 1.5px solid rgba(26,20,16,0.2); border-radius: 9px; padding: 8px 10px; font-size: 13.5px; font-family: inherit; color: #1a1410; background: #fff; }
  .cw-diagnosis { margin: 0; font-size: 13px; line-height: 1.75; color: rgba(26,20,16,0.82); padding-bottom: 10px; border-bottom: 1px dashed rgba(26,20,16,0.2); }
`;
