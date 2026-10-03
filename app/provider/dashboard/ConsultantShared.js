'use client';
// AIコンサルの右下ウィジェットと専用タブで共有する、データ取得・操作・タスク表示。
import { useCallback, useEffect, useRef, useState } from 'react';
import { CHANGED_EVENT, consultantApi as api, goToTab, notifyChanged } from './consultant-api';

// 同じ画面に2つのコンポーネントがあっても、見立ての作り直しは同時に1回だけにする
let planInFlight = null;
function requestPlan(force) {
  const start = () => {
    const p = api('/plan', { method: 'POST', body: JSON.stringify({ force: !!force }) }).finally(() => { if (planInFlight === p) planInFlight = null; });
    planInFlight = p;
    return p;
  };
  if (!planInFlight) return start();
  // 強制の作り直しは、進行中の分が古いゴールで作られている可能性があるので、終わるのを待ってもう一度作る
  return force ? planInFlight.catch(() => {}).then(start) : planInFlight;
}

export function useConsultant() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [planning, setPlanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const autoTried = useRef(false);

  const load = useCallback(async () => {
    try {
      const d = await api('');
      setData(d);
      setChatLog(prev => (prev.length ? prev : d.messages || []));
      setError('');
      return d;
    } catch (e) { setError(e.message); return null; }
  }, []);

  const replan = useCallback(async force => {
    setPlanning(true);
    try {
      await requestPlan(force);
    } catch (e) { setError(e.message); }
    await load();
    notifyChanged();
    setPlanning(false);
  }, [load]);

  useEffect(() => {
    // ダッシュボード本体の認証・トークン更新が済んでから取得する
    const t = setTimeout(async () => {
      const d = await load();
      if (d && d.enabled !== false && d.stale && !d.needsGoal && !autoTried.current) {
        autoTried.current = true;
        replan(false);
      }
    }, 1500);
    const onChanged = () => load();
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => { clearTimeout(t); window.removeEventListener(CHANGED_EVENT, onChanged); };
  }, [load, replan]);

  const run = useCallback(async fn => {
    setBusy(true);
    try { await fn(); setError(''); } catch (e) { setError(e.message); }
    setBusy(false);
  }, []);

  const setTaskStatus = (id, status) => run(async () => {
    await api('/tasks', { method: 'PATCH', body: JSON.stringify({ id, status }) });
    await load();
    notifyChanged();
  });

  const addTask = (title, cadence) => run(async () => {
    await api('/tasks', { method: 'POST', body: JSON.stringify({ title, cadence }) });
    await load();
    notifyChanged();
  });

  const saveGoal = async note => {
    setBusy(true);
    try {
      await api('/goals', { method: 'PUT', body: JSON.stringify({ note }) });
      setError('');
      await load();
      notifyChanged();
    } catch (e) { setError(e.message); setBusy(false); return; }
    setBusy(false);
    replan(true);
  };

  const sendChat = async text => {
    const msg = String(text || '').trim();
    if (!msg || busy) return;
    setChatLog(prev => [...prev, { role: 'user', content: msg }]);
    setBusy(true);
    try {
      const res = await api('/chat', { method: 'POST', body: JSON.stringify({ message: msg }) });
      setChatLog(prev => [...prev, { role: 'assistant', content: res.reply }]);
      if (res.changed) {
        await load();
        notifyChanged();
        if (res.goalChanged) replan(true);
      }
    } catch (e) {
      setChatLog(prev => [...prev, { role: 'assistant', content: `うまく返答できませんでした（${e.message}）。もう一度お試しください。` }]);
    }
    setBusy(false);
  };

  return { data, error, setError, planning, busy, chatLog, load, replan, run, setTaskStatus, addTask, saveGoal, sendChat };
}

const BUCKETS = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '今週' },
  { key: 'month', label: '今月' },
  { key: 'missed', label: '期間を過ぎたもの' },
];
const CADENCE_JA = { daily: '毎日', weekly: '毎週', monthly: '毎月', once: '' };

export function groupTasks(tasks) {
  return BUCKETS.map(b => ({ ...b, items: tasks.filter(t => t.bucket === b.key) })).filter(g => g.items.length);
}

export function TaskList({ tasks, tabLabels, busy, onStatus, compact }) {
  const groups = groupTasks(tasks);
  if (!groups.length) return <p className="cc-muted">いまのタスクはありません。</p>;
  return (
    <div className="cc-groups">
      {groups.map(g => (
        <div key={g.key} className="cc-group">
          <div className="cc-group-label">{g.label}<span>{g.items.length}</span></div>
          <ul className="cc-tasks">
            {g.items.map(t => (
              <li key={t.id} className="cc-task">
                <input type="checkbox" className="cc-check" disabled={busy} checked={false} onChange={() => onStatus(t.id, 'done')} aria-label={`${t.title} を完了にする`} />
                <div className="cc-task-main">
                  <div className="cc-task-title">{t.title}{CADENCE_JA[t.cadence] && <span className="cc-chip">{CADENCE_JA[t.cadence]}</span>}</div>
                  {!compact && t.why && <div className="cc-task-why">{t.why}</div>}
                  <div className="cc-task-actions">
                    {t.tab && tabLabels?.[t.tab] && <button type="button" className="cc-link" onClick={() => goToTab(t.tab)}>{tabLabels[t.tab]}を開く</button>}
                    <button type="button" className="cc-link cc-link-quiet" disabled={busy} onClick={() => onStatus(t.id, 'skipped')}>見送る</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export const SHARED_CSS = `
  .cc-muted { margin: 0; color: rgba(26,20,16,0.55); font-size: 12.5px; line-height: 1.7; }
  .cc-groups { display: flex; flex-direction: column; gap: 14px; }
  .cc-group-label { display: flex; align-items: baseline; gap: 6px; font-size: 12px; font-weight: 700; letter-spacing: .04em; color: rgba(26,20,16,0.62); margin-bottom: 6px; }
  .cc-group-label span { font-variant-numeric: tabular-nums; font-weight: 600; color: rgba(26,20,16,0.4); }
  .cc-tasks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .cc-task { display: flex; gap: 10px; align-items: flex-start; padding: 9px 11px; border: 1px solid rgba(26,20,16,0.12); border-radius: 10px; background: #fff; }
  .cc-check { width: 18px; height: 18px; margin: 2px 0 0; flex-shrink: 0; cursor: pointer; }
  .cc-task-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .cc-task-title { font-weight: 700; font-size: 13.5px; line-height: 1.55; color: #1a1410; }
  .cc-task-why { font-size: 12.5px; line-height: 1.6; color: rgba(26,20,16,0.66); }
  .cc-chip { margin-left: 8px; font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 99px; background: rgba(26,20,16,0.07); color: rgba(26,20,16,0.7); vertical-align: 1px; }
  .cc-task-actions { display: flex; gap: 14px; }
  .cc-link { background: none; border: none; padding: 0; color: #1d4ed8; font-size: 12.5px; font-weight: 700; cursor: pointer; text-align: left; }
  .cc-link-quiet { color: rgba(26,20,16,0.5); font-weight: 600; }
  .cc-link:disabled { opacity: .5; cursor: default; }
  .cc-check:focus-visible, .cc-link:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }
`;
