'use client';
// 掲載者ダッシュボード「AIコンサル」タブ（でお要望 2026-10-03）。
// 大前提は「リピートしてくれるお客様を増やす」。具体的なゴールは店舗が選ぶ・書く。道筋はそこから組み立てる。
// ゴール未設定でも、システムの他の機能は全て普通に使える。
import { useCallback, useEffect, useRef, useState } from 'react';
import { BOTTLENECK_CATEGORIES } from '@/lib/consultant-journey';
import { CHANGED_EVENT, MINUTE_CHOICES, STATUS_LABEL, consultantApi as api, goToTab, notifyChanged } from './consultant-api';

export default function ConsultantPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingGoals, setEditingGoals] = useState(false);
  const [draftGoals, setDraftGoals] = useState([]);
  const [draftNote, setDraftNote] = useState('');
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
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => {
    // ダッシュボード本体の認証・トークン更新が済んでから取得する
    const t = setTimeout(load, 1500);
    const onChanged = () => load();
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => { clearTimeout(t); window.removeEventListener(CHANGED_EVENT, onChanged); };
  }, [load]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [chatLog, busy]);

  async function run(fn) {
    setBusy(true);
    try { await fn(); setError(''); } catch (e) { setError(e.message); }
    setBusy(false);
  }

  function startEditGoals() {
    setDraftGoals(data.goals);
    setDraftNote(data.goalNote);
    setEditingGoals(true);
  }

  const toggleDraft = key => setDraftGoals(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));

  const saveGoals = () => run(async () => {
    await api('/goals', { method: 'PUT', body: JSON.stringify({ goals: draftGoals, note: draftNote }) });
    setEditingGoals(false);
    await load();
    notifyChanged();
  });

  const stepAction = (stepKey, action) => run(async () => {
    await api('/step-state', { method: 'POST', body: JSON.stringify({ step_key: stepKey, action }) });
    await load();
    notifyChanged();
  });

  const addBottleneck = () => run(async () => {
    await api('/bottleneck', { method: 'POST', body: JSON.stringify({ category: bnCategory, label: bnLabel, minutes_per_week: bnMinutes }) });
    setBnCategory(''); setBnLabel(''); setBnMinutes(60);
    await load();
    notifyChanged();
  });

  const setBottleneckStatus = (id, status) => run(async () => {
    await api('/bottleneck', { method: 'PATCH', body: JSON.stringify({ id, status }) });
    await load();
    notifyChanged();
  });

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

  if (!data) {
    return (
      <div className="card stack" style={{ padding: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '16px' }}>AIコンサル</h2>
        <p className="muted" style={{ margin: 0, fontSize: '13px' }}>{error || '読み込み中…'}</p>
      </div>
    );
  }

  if (data.enabled === false) {
    return (
      <div className="card stack" style={{ padding: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '16px' }}>AIコンサル</h2>
        <p className="muted" style={{ margin: 0, fontSize: '13px' }}>この機能はオフになっています。使う場合は「機能設定」タブでオンにしてください。</p>
      </div>
    );
  }

  const { goals, goalNote, goalOptions, needsGoals, steps, current, progress, bottlenecks, savedMinutesPerWeek, premise } = data;
  const openBottlenecks = bottlenecks.filter(b => b.status === 'open');
  const catLabel = key => BOTTLENECK_CATEGORIES.find(c => c.key === key)?.label || key;
  const showGoalEditor = editingGoals || needsGoals;

  return (
    <div className="stack" style={{ gap: '20px' }}>
      <style>{PANEL_CSS}</style>

      <section className="card stack" style={{ padding: '24px', gap: '14px' }}>
        <div>
          <div className="cp-kicker">AI専属コンサル</div>
          <h2 style={{ margin: '2px 0 6px', fontSize: '18px' }}>{premise}ために、お店に合った道筋を一緒に作ります</h2>
          <p className="muted" style={{ margin: 0, fontSize: '13px', lineHeight: 1.7 }}>
            何を目指すかはお店ごとに違います。まず、お店としてどうしたいかを教えてください。設定しなくても、Finemeの機能はすべて今まで通り使えます。
          </p>
        </div>
        {error && <p className="cp-error">{error}</p>}

        {showGoalEditor ? (
          <div className="stack" style={{ gap: '12px' }}>
            <div className="cp-label">お店として、いま目指したいことは？（いくつでも）</div>
            <div className="cp-options">
              {goalOptions.map(g => {
                const checked = (editingGoals ? draftGoals : []).includes(g.key);
                return (
                  <label key={g.key} className={`cp-option${checked ? ' is-on' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => {
                      if (!editingGoals) { setDraftGoals([g.key]); setDraftNote(goalNote); setEditingGoals(true); } else toggleDraft(g.key);
                    }} />
                    <span>{g.label}</span>
                  </label>
                );
              })}
            </div>
            <label className="cp-label" htmlFor="cp-note">ほかに目指していること、お店の状況（自由に・任意）</label>
            <textarea id="cp-note" className="cp-input" rows={3} maxLength={500}
              value={editingGoals ? draftNote : goalNote}
              onChange={e => { if (!editingGoals) { setDraftGoals([]); setEditingGoals(true); } setDraftNote(e.target.value); }}
              placeholder="例：常連のお客様は多いが、新しく来てくれた方が2回目に来てくれない" />
            <div className="cp-actions">
              <button type="button" className="cp-primary" disabled={busy || (editingGoals && draftGoals.length === 0)} onClick={saveGoals}>この内容で道筋を作る</button>
              {!needsGoals && <button type="button" className="cp-secondary" onClick={() => setEditingGoals(false)}>やめる</button>}
            </div>
            {needsGoals && <p className="muted" style={{ margin: 0, fontSize: '12.5px' }}>あとで決めても大丈夫です。右下のAIには、いつでも相談できます。</p>}
          </div>
        ) : (
          <div className="cp-goals">
            <div className="cp-label">お店のゴール</div>
            <ul>
              {goalOptions.filter(g => goals.includes(g.key)).map(g => <li key={g.key}>{g.label}</li>)}
            </ul>
            {goalNote && <p className="cp-note">{goalNote}</p>}
            <button type="button" className="cp-link" onClick={startEditGoals}>ゴールを変える</button>
          </div>
        )}
      </section>

      {!needsGoals && (
        <section className="card stack" style={{ padding: '24px', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>今の一手</h3>
            <span className="cp-progress-text">{progress.done} / {progress.total} ステップ</span>
          </div>
          <div className="cp-progress-bar"><span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>

          {current ? (
            <div className="cp-now">
              <div className="cp-kicker">{current.layer === 'customer' ? 'お客様への一手' : 'スタッフの時間を作る一手'}</div>
              <h4>{current.title}</h4>
              <p>{current.why}</p>
              {current.progress && <p className="cp-prog">{current.progress}</p>}
              <div className="cp-actions">
                <button type="button" className="cp-primary" onClick={() => goToTab(current.tab)}>{current.actionLabel}</button>
                <button type="button" className="cp-secondary" disabled={busy} onClick={() => stepAction(current.key, 'snooze')}>別の案を見る</button>
                <button type="button" className="cp-secondary" onClick={() => sendChat(`「${current.title}」について、うちの店ではどう進めればいいですか？`)}>AIに相談する</button>
              </div>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: '13px' }}>選んだゴールの道筋はすべて進んでいます。次に取り組むことは、下の相談欄で一緒に考えます。</p>
          )}

          <h3 style={{ margin: '8px 0 0', fontSize: '16px' }}>道筋のすべて</h3>
          <ol className="cp-steps">
            {steps.map(s => (
              <li key={s.key} className={`cp-step is-${s.status}`}>
                <div className="cp-step-main">
                  <span className="cp-step-title">{s.title}</span>
                  <span className={`cp-badge is-${s.status}`}>{s.ongoing && s.status === 'todo' ? '継続' : STATUS_LABEL[s.status]}</span>
                </div>
                <div className="cp-step-meta">
                  <span>{s.layer === 'customer' ? 'お客様' : '業務効率'}</span>
                  {s.progress && <span>{s.progress}</span>}
                </div>
                {s.status !== 'done' && (
                  <div className="cp-step-actions">
                    <button type="button" className="cp-link" onClick={() => goToTab(s.tab)}>{s.actionLabel}</button>
                    {s.status === 'todo' && !s.ongoing && <button type="button" className="cp-link" disabled={busy} onClick={() => stepAction(s.key, 'skip')}>見送る</button>}
                    {(s.status === 'skipped' || s.status === 'snoozed') && <button type="button" className="cp-link" disabled={busy} onClick={() => stepAction(s.key, 'reset')}>戻す</button>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="card stack" style={{ padding: '24px', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>時間を取られている作業</h3>
        <p className="muted" style={{ margin: 0, fontSize: '13px', lineHeight: 1.7 }}>
          スタッフ全員がお客様のために使える時間を増やすための記録です。教えてもらった作業は、道筋の中で優先して取り上げます。
        </p>
        {savedMinutesPerWeek > 0 && <p className="cp-saved">解消済みで週{savedMinutesPerWeek}分の時間を作れました。</p>}
        {openBottlenecks.length === 0 && <p className="muted" style={{ margin: 0, fontSize: '13px' }}>まだ記録がありません。</p>}
        {openBottlenecks.map(b => (
          <div key={b.id} className="cp-bn-row">
            <span>{catLabel(b.category)}{b.label && b.label !== catLabel(b.category) ? `：${b.label}` : ''}{b.minutes_per_week ? `（週${b.minutes_per_week}分）` : ''}</span>
            <button type="button" className="cp-link" disabled={busy} onClick={() => setBottleneckStatus(b.id, 'resolved')}>解消した</button>
          </div>
        ))}
        <div className="cp-form">
          <div className="cp-label">作業を追加する</div>
          <div className="cp-choices" role="radiogroup" aria-label="作業の種類">
            {BOTTLENECK_CATEGORIES.map(c => (
              <button key={c.key} type="button" role="radio" aria-checked={bnCategory === c.key} className={`cp-choice${bnCategory === c.key ? ' is-active' : ''}`} onClick={() => setBnCategory(c.key)}>{c.label}</button>
            ))}
          </div>
          {bnCategory && (
            <>
              <div className="cp-label">週にどのくらいかかっていますか</div>
              <div className="cp-choices" role="radiogroup" aria-label="週あたりの時間">
                {MINUTE_CHOICES.map(m => (
                  <button key={m.v} type="button" role="radio" aria-checked={bnMinutes === m.v} className={`cp-choice${bnMinutes === m.v ? ' is-active' : ''}`} onClick={() => setBnMinutes(m.v)}>{m.label}</button>
                ))}
              </div>
              <input className="cp-input" value={bnLabel} onChange={e => setBnLabel(e.target.value)} maxLength={200} placeholder="具体的に（任意）例：全員の希望を聞いてシフト表を作る" aria-label="具体的な内容" />
              <div className="cp-actions">
                <button type="button" className="cp-primary" disabled={busy} onClick={addBottleneck}>これを記録する</button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="card stack" style={{ padding: '24px', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>AIに相談する</h3>
        <div className="cp-chat-log" ref={logRef}>
          {chatLog.length === 0 && <p className="muted" style={{ margin: 0, fontSize: '13px' }}>お店のことを何でも相談してください。たとえば「しばらく来ていないお客様にどう声をかければいい？」「シフト作りに時間がかかる」など。</p>}
          {chatLog.map((m, i) => <div key={i} className={`cp-msg is-${m.role}`}>{m.content}</div>)}
          {busy && <div className="cp-msg is-assistant">考えています…</div>}
        </div>
        <form className="cp-chat-form" onSubmit={e => { e.preventDefault(); sendChat(); }}>
          <textarea className="cp-input" value={chatInput} onChange={e => setChatInput(e.target.value)} rows={2} maxLength={1000} placeholder="相談したいことを入力" aria-label="相談内容"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendChat(); } }} />
          <button type="submit" className="cp-primary" disabled={busy || !chatInput.trim()}>送る</button>
        </form>
      </section>
    </div>
  );
}

const PANEL_CSS = `
  .cp-kicker { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; color: rgba(26,20,16,0.55); }
  .cp-error { margin: 0; color: #b91c1c; font-size: 13px; }
  .cp-label { font-size: 13px; font-weight: 700; color: #1a1410; }
  .cp-options { display: flex; flex-direction: column; gap: 8px; }
  .cp-option { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1.5px solid rgba(26,20,16,0.16); border-radius: 10px; cursor: pointer; font-size: 14px; line-height: 1.5; color: #1a1410; background: #fff; }
  .cp-option.is-on { border-color: #1a1410; background: rgba(26,20,16,0.04); }
  .cp-option input { width: 18px; height: 18px; margin-top: 2px; flex-shrink: 0; }
  .cp-input { width: 100%; box-sizing: border-box; border: 1.5px solid rgba(26,20,16,0.2); border-radius: 9px; padding: 9px 11px; font-size: 14px; font-family: inherit; color: #1a1410; background: #fff; }
  .cp-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .cp-primary { background: var(--color-gold, #c8a45c); color: #0a0f1e; border: none; border-radius: 9px; padding: 10px 16px; font-weight: 700; font-size: 13.5px; cursor: pointer; }
  .cp-primary:disabled { opacity: .5; cursor: default; }
  .cp-secondary { background: #fff; color: #1a1410; border: 1px solid rgba(26,20,16,0.22); border-radius: 9px; padding: 9px 14px; font-weight: 600; font-size: 13.5px; cursor: pointer; }
  .cp-secondary:disabled { opacity: .5; cursor: default; }
  .cp-link { background: none; border: none; padding: 0; color: #1d4ed8; font-size: 13px; font-weight: 700; cursor: pointer; text-align: left; }
  .cp-link:disabled { opacity: .5; cursor: default; }
  .cp-goals { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
  .cp-goals ul { margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #1a1410; }
  .cp-note { margin: 0; font-size: 13px; color: rgba(26,20,16,0.7); white-space: pre-wrap; }
  .cp-progress-bar { height: 6px; border-radius: 99px; background: rgba(26,20,16,0.1); overflow: hidden; }
  .cp-progress-bar span { display: block; height: 100%; background: var(--color-gold, #c8a45c); border-radius: 99px; }
  .cp-progress-text { font-size: 12.5px; color: rgba(26,20,16,0.6); font-variant-numeric: tabular-nums; }
  .cp-now { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; border: 1.5px solid rgba(26,20,16,0.14); border-radius: 12px; }
  .cp-now h4 { margin: 0; font-size: 16px; line-height: 1.5; color: #1a1410; }
  .cp-now p { margin: 0; font-size: 13.5px; line-height: 1.7; color: rgba(26,20,16,0.78); }
  .cp-now .cp-prog { font-weight: 700; color: #1a1410; background: rgba(26,20,16,0.05); padding: 6px 10px; border-radius: 8px; align-self: flex-start; }
  .cp-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .cp-step { border: 1px solid rgba(26,20,16,0.12); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
  .cp-step.is-done { opacity: .6; }
  .cp-step-main { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
  .cp-step-title { font-weight: 700; font-size: 14px; color: #1a1410; }
  .cp-step-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12.5px; color: rgba(26,20,16,0.58); }
  .cp-step-actions { display: flex; gap: 16px; }
  .cp-badge { flex-shrink: 0; font-size: 11.5px; font-weight: 700; padding: 1px 9px; border-radius: 99px; background: #fef3c7; color: #92400e; }
  .cp-badge.is-done { background: #d1fae5; color: #065f46; }
  .cp-badge.is-snoozed, .cp-badge.is-skipped { background: #e5e7eb; color: #4b5563; }
  .cp-saved { margin: 0; font-weight: 700; color: #065f46; font-size: 13.5px; }
  .cp-bn-row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; font-size: 14px; color: #1a1410; }
  .cp-form { display: flex; flex-direction: column; gap: 10px; border-top: 1px dashed rgba(26,20,16,0.2); padding-top: 14px; }
  .cp-choices { display: flex; flex-wrap: wrap; gap: 6px; }
  .cp-choice { background: #fff; color: #1a1410; border: 1.5px solid rgba(26,20,16,0.2); border-radius: 99px; padding: 6px 13px; font-size: 13px; cursor: pointer; }
  .cp-choice.is-active { background: #0a0f1e; color: #fff; border-color: #0a0f1e; }
  .cp-chat-log { display: flex; flex-direction: column; gap: 8px; max-height: 360px; min-height: 80px; overflow-y: auto; }
  .cp-msg { padding: 9px 12px; border-radius: 10px; white-space: pre-wrap; max-width: 90%; font-size: 14px; line-height: 1.7; }
  .cp-msg.is-user { align-self: flex-end; background: #0a0f1e; color: #fff; }
  .cp-msg.is-assistant { align-self: flex-start; background: rgba(26,20,16,0.06); color: #1a1410; }
  .cp-chat-form { display: flex; gap: 8px; align-items: flex-end; }
  .cp-chat-form textarea { flex: 1; resize: none; }
  .cp-primary:focus-visible, .cp-secondary:focus-visible, .cp-link:focus-visible, .cp-choice:focus-visible, .cp-input:focus-visible, .cp-option:focus-within { outline: 2px solid #1d4ed8; outline-offset: 2px; }
`;
