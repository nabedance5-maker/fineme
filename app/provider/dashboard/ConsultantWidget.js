'use client';
// 掲載者ダッシュボード右下の常駐「AI専属コンサル」（でお要望 2026-10-03）。
// どのタブにいても1本の道筋（ゴール→道筋→今の一手）を出す。タブごとに別提案はしない。
// 最初は開いて表示、閉じると右端に小さく収まる。
import { useCallback, useEffect, useRef, useState } from 'react';
import { BOTTLENECK_CATEGORIES } from '@/lib/consultant-journey';

const COLLAPSE_KEY = 'fineme:consultant:collapsed';
const MINUTE_CHOICES = [
  { v: 30, label: '30分' },
  { v: 60, label: '1時間' },
  { v: 120, label: '2時間' },
  { v: 240, label: '4時間以上' },
];

function getToken() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return key ? JSON.parse(localStorage.getItem(key))?.access_token || null : null;
  } catch { return null; }
}

async function api(path, options = {}) {
  const token = getToken();
  const res = await fetch(`/api/provider/consultant${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || '通信に失敗しました');
  return body;
}

function goToTab(tab) {
  document.querySelector(`[data-tab="${tab}"]`)?.click();
}

const STATUS_LABEL = { done: '完了', todo: '未着手', snoozed: '保留中', skipped: '見送り' };

export default function ConsultantWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState('now');
  const [busy, setBusy] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [bnCategory, setBnCategory] = useState('');
  const [bnMinutes, setBnMinutes] = useState(60);
  const [bnLabel, setBnLabel] = useState('');
  const logRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api('');
      setData(d);
      setChatLog(prev => (prev.length ? prev : d.messages || []));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1'); } catch { /* 初期表示のままにする */ }
    // ダッシュボード本体の認証・トークン更新が済んでから取得する
    const t = setTimeout(load, 1500);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (view === 'chat' && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [chatLog, view, busy]);

  function setCollapsedPersist(v) {
    setCollapsed(v);
    try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch { /* 保存できなくても動作する */ }
  }

  async function stepAction(stepKey, action) {
    setBusy(true);
    try {
      await api('/step-state', { method: 'POST', body: JSON.stringify({ step_key: stepKey, action }) });
      await load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function sendChat(text) {
    const msg = (text ?? chatInput).trim();
    if (!msg || busy) return;
    setChatInput('');
    setChatLog(prev => [...prev, { role: 'user', content: msg }]);
    setBusy(true);
    try {
      const { reply } = await api('/chat', { method: 'POST', body: JSON.stringify({ message: msg }) });
      setChatLog(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setChatLog(prev => [...prev, { role: 'assistant', content: `うまく返答できませんでした（${e.message}）。もう一度お試しください。` }]);
    }
    setBusy(false);
  }

  async function submitInterview() {
    if (!bnCategory) return;
    setBusy(true);
    try {
      await api('/bottleneck', { method: 'POST', body: JSON.stringify({ category: bnCategory, label: bnLabel, minutes_per_week: bnMinutes }) });
      setBnCategory(''); setBnLabel(''); setBnMinutes(60);
      await load();
      setView('now');
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function skipInterview() {
    setBusy(true);
    try {
      await api('/bottleneck', { method: 'POST', body: JSON.stringify({ skip: true }) });
      await load();
      setView('now');
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function setBottleneckStatus(id, status) {
    setBusy(true);
    try {
      await api('/bottleneck', { method: 'PATCH', body: JSON.stringify({ id, status }) });
      await load();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  if (!data) return null;

  const { current, progress, steps, bottlenecks, interviewDone, savedMinutesPerWeek, goal } = data;
  const openBottlenecks = bottlenecks.filter(b => b.status === 'open');
  const catLabel = key => BOTTLENECK_CATEGORIES.find(c => c.key === key)?.label || key;

  if (collapsed) {
    return (
      <>
        <style>{WIDGET_CSS}</style>
        <button type="button" className="cw-tab" onClick={() => setCollapsedPersist(false)} aria-label="AI専属コンサルを開く">
          <span className="cw-tab-label">AIコンサル</span>
          {current && <span className="cw-dot" aria-hidden="true" />}
        </button>
      </>
    );
  }

  return (
    <>
      <style>{WIDGET_CSS}</style>
      <aside className="cw-panel" aria-label="AI専属コンサル">
        <header className="cw-head">
          <div>
            <div className="cw-kicker">AI専属コンサル</div>
            <div className="cw-goal">ゴール：{goal.label}</div>
          </div>
          <button type="button" className="cw-icon-btn" onClick={() => setCollapsedPersist(true)} aria-label="折りたたむ">閉じる</button>
        </header>

        <nav className="cw-nav" aria-label="表示切り替え">
          {[['now', '今の一手'], ['path', '道筋'], ['chat', '相談']].map(([k, l]) => (
            <button key={k} type="button" className={`cw-nav-btn${view === k ? ' is-active' : ''}`} onClick={() => setView(k)}>{l}</button>
          ))}
        </nav>

        <div className="cw-body">
          {error && <p className="cw-error">{error}</p>}

          {view === 'now' && (
            <>
              <div className="cw-progress">
                <div className="cw-progress-bar"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
                <span className="cw-progress-text">{progress.done} / {progress.total} ステップ</span>
              </div>

              {current ? (
                <section className="cw-now">
                  <div className="cw-layer">{current.layer === 'customer' ? 'お客様への一手' : 'スタッフの時間を作る一手'}</div>
                  <h3 className="cw-now-title">{current.title}</h3>
                  <p className="cw-why">{current.why}</p>
                  {current.progress && <p className="cw-prog">{current.progress}</p>}
                  <div className="cw-actions">
                    <button type="button" className="cw-primary" onClick={() => goToTab(current.tab)}>{current.actionLabel}</button>
                    <button type="button" className="cw-secondary" disabled={busy} onClick={() => stepAction(current.key, 'snooze')}>別の案を見る</button>
                    <button type="button" className="cw-secondary" onClick={() => { setView('chat'); sendChat(`「${current.title}」について、うちの店ではどう進めればいいですか？`); }}>相談する</button>
                  </div>
                </section>
              ) : (
                <section className="cw-now">
                  <h3 className="cw-now-title">今の道筋はすべて進んでいます</h3>
                  <p className="cw-why">リピート率の変化を見ながら、次に取り組むことを一緒に考えます。</p>
                  <div className="cw-actions">
                    <button type="button" className="cw-primary" onClick={() => { setView('chat'); sendChat('次に何を優先すればリピート率が上がりますか？'); }}>次の一手を相談する</button>
                  </div>
                </section>
              )}

              {!interviewDone && (
                <section className="cw-interview-prompt">
                  <p>お店ごとに、時間を取られている作業は違います。いちばん手間のかかる作業を教えてもらえますか？</p>
                  <button type="button" className="cw-link" onClick={() => setView('interview')}>答える</button>
                </section>
              )}
            </>
          )}

          {view === 'path' && (
            <>
              <ol className="cw-steps">
                {steps.map(s => (
                  <li key={s.key} className={`cw-step is-${s.status}`}>
                    <div className="cw-step-main">
                      <span className="cw-step-title">{s.title}</span>
                      <span className={`cw-badge is-${s.status}`}>{s.ongoing && s.status === 'todo' ? '継続' : STATUS_LABEL[s.status]}</span>
                    </div>
                    <div className="cw-step-meta">
                      <span>{s.layer === 'customer' ? 'お客様' : '業務効率'}</span>
                      {s.progress && <span>{s.progress}</span>}
                    </div>
                    {s.status !== 'done' && (
                      <div className="cw-step-actions">
                        <button type="button" className="cw-link" onClick={() => goToTab(s.tab)}>{s.actionLabel}</button>
                        {s.status === 'todo' && !s.ongoing && <button type="button" className="cw-link" disabled={busy} onClick={() => stepAction(s.key, 'skip')}>見送る</button>}
                        {(s.status === 'skipped' || s.status === 'snoozed') && <button type="button" className="cw-link" disabled={busy} onClick={() => stepAction(s.key, 'reset')}>戻す</button>}
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              <section className="cw-bn">
                <h4>時間を取られている作業</h4>
                {savedMinutesPerWeek > 0 && <p className="cw-saved">解消済みで週{savedMinutesPerWeek}分の時間を作れました。</p>}
                {openBottlenecks.length === 0 && <p className="cw-muted">まだ記録がありません。</p>}
                {openBottlenecks.map(b => (
                  <div key={b.id} className="cw-bn-row">
                    <span>{catLabel(b.category)}{b.label && b.label !== catLabel(b.category) ? `：${b.label}` : ''}{b.minutes_per_week ? `（週${b.minutes_per_week}分）` : ''}</span>
                    <button type="button" className="cw-link" disabled={busy} onClick={() => setBottleneckStatus(b.id, 'resolved')}>解消した</button>
                  </div>
                ))}
                <button type="button" className="cw-link" onClick={() => setView('interview')}>作業を追加する</button>
              </section>
            </>
          )}

          {view === 'chat' && (
            <div className="cw-chat">
              <div className="cw-chat-log" ref={logRef}>
                {chatLog.length === 0 && <p className="cw-muted">お店のことを何でも相談してください。たとえば「休眠のお客様にどう声をかければいい？」「シフト作りに時間がかかる」など。</p>}
                {chatLog.map((m, i) => (
                  <div key={i} className={`cw-msg is-${m.role}`}>{m.content}</div>
                ))}
                {busy && <div className="cw-msg is-assistant cw-typing">考えています…</div>}
              </div>
              <form className="cw-chat-form" onSubmit={e => { e.preventDefault(); sendChat(); }}>
                <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} rows={2} maxLength={1000} placeholder="相談したいことを入力" onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendChat(); } }} />
                <button type="submit" className="cw-primary" disabled={busy || !chatInput.trim()}>送る</button>
              </form>
            </div>
          )}

          {view === 'interview' && (
            <section className="cw-form">
              <h3 className="cw-now-title">いま、いちばん時間を取られている作業は？</h3>
              <p className="cw-why">スタッフ全員が、お客様のために使える時間を増やすための質問です。紙や口頭でやっている作業も含めて教えてください。</p>
              <div className="cw-choices" role="radiogroup" aria-label="作業の種類">
                {BOTTLENECK_CATEGORIES.map(c => (
                  <button key={c.key} type="button" role="radio" aria-checked={bnCategory === c.key} className={`cw-choice${bnCategory === c.key ? ' is-active' : ''}`} onClick={() => setBnCategory(c.key)}>{c.label}</button>
                ))}
              </div>
              {bnCategory && (
                <>
                  <label className="cw-label">週にどのくらいかかっていますか</label>
                  <div className="cw-choices" role="radiogroup" aria-label="週あたりの時間">
                    {MINUTE_CHOICES.map(m => (
                      <button key={m.v} type="button" role="radio" aria-checked={bnMinutes === m.v} className={`cw-choice${bnMinutes === m.v ? ' is-active' : ''}`} onClick={() => setBnMinutes(m.v)}>{m.label}</button>
                    ))}
                  </div>
                  <label className="cw-label" htmlFor="cw-bn-label">具体的に（任意）</label>
                  <input id="cw-bn-label" className="cw-input" value={bnLabel} onChange={e => setBnLabel(e.target.value)} maxLength={200} placeholder="例：全員の希望を聞いてシフト表を作る" />
                </>
              )}
              <div className="cw-actions">
                <button type="button" className="cw-primary" disabled={busy || !bnCategory} onClick={submitInterview}>これを教える</button>
                <button type="button" className="cw-secondary" disabled={busy} onClick={skipInterview}>あとで答える</button>
              </div>
            </section>
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
  .cw-form { display: flex; flex-direction: column; gap: 10px; }
  .cw-label { font-size: 12.5px; font-weight: 700; }
  .cw-choices { display: flex; flex-wrap: wrap; gap: 6px; }
  .cw-choice { background: #fff; color: #1a1410; border: 1.5px solid rgba(26,20,16,0.2); border-radius: 99px; padding: 6px 12px; font-size: 13px; cursor: pointer; }
  .cw-choice.is-active { background: #0a0f1e; color: #fff; border-color: #0a0f1e; }
  .cw-input { border: 1.5px solid rgba(26,20,16,0.2); border-radius: 9px; padding: 8px 10px; font-size: 13.5px; font-family: inherit; color: #1a1410; background: #fff; }
  .cw-tab { position: fixed; right: 0; bottom: 96px; z-index: 180; display: flex; align-items: center; gap: 6px; background: #0a0f1e; color: #fff; border: none; border-radius: 12px 0 0 12px; padding: 12px 10px; box-shadow: -4px 4px 16px rgba(10,15,30,0.25); cursor: pointer; }
  .cw-tab-label { writing-mode: vertical-rl; font-size: 12.5px; font-weight: 700; letter-spacing: .1em; }
  .cw-dot { width: 9px; height: 9px; border-radius: 99px; background: var(--color-gold, #c8a45c); }
  .cw-panel button:focus-visible, .cw-tab:focus-visible, .cw-panel textarea:focus-visible, .cw-panel input:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }
  @media (max-width: 640px) { .cw-panel { right: 8px; bottom: 8px; width: calc(100vw - 16px); max-height: 70vh; } }
`;
