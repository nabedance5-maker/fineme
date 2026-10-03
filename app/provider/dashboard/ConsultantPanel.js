'use client';
// 掲載者ダッシュボード「AIコンサル」タブ（でお要望 2026-10-03）。
// 固定のチェックリストではなく、店舗が自分の言葉で書いたゴール×実データ×今日の時期から、
// AIが見立て・段階別の打ち手・日々のタスクを考える。Fineme の導入チェックは「準備状況」に格下げ。
import { useEffect, useRef, useState } from 'react';
import { BOTTLENECK_CATEGORIES } from '@/lib/consultant-journey';
import { MINUTE_CHOICES, STATUS_LABEL, consultantApi as api, goToTab, notifyChanged } from './consultant-api';
import { SHARED_CSS, TaskList, useConsultant } from './ConsultantShared';

const GOAL_EXAMPLES = [
  '初めて来たお客様に、2回目も来てもらえるようにしたい',
  'しばらく来ていないお客様に、また戻ってきてほしい',
  '通ってくれているお客様に、もっと定期的に来てほしい',
  'お客様のことをもっと把握して、接客の質を上げたい',
  'スタッフの時間に余裕を作って、お客様一人一人に向き合いたい',
];

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function ConsultantPanel() {
  const { data, error, setError, planning, busy, chatLog, load, replan, run, setTaskStatus, addTask, saveGoal, sendChat } = useConsultant();
  const [editingGoal, setEditingGoal] = useState(false);
  const [draftGoal, setDraftGoal] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [qOpen, setQOpen] = useState('');
  const [qText, setQText] = useState('');
  const [qSent, setQSent] = useState(null);
  const [taskInput, setTaskInput] = useState('');
  const [taskCadence, setTaskCadence] = useState('once');
  const [openStage, setOpenStage] = useState('');
  const [copied, setCopied] = useState('');
  const [bnCategory, setBnCategory] = useState('');
  const [bnMinutes, setBnMinutes] = useState(60);
  const [bnLabel, setBnLabel] = useState('');
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [chatLog, busy]);

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

  async function copyDraft(draft, name, key) {
    const text = draft.replace(/\{name\}/g, name);
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000); }
    catch { setError('コピーできませんでした。文面を選択してコピーしてください。'); }
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

  const { goalText, needsGoal, diagnosis, focus, questions, stageActions, generatedAt, tasks, tabLabels, stages, timeText, kpis, readiness, bottlenecks, savedMinutesPerWeek, facts, premise } = data;
  const showGoalEditor = editingGoal || needsGoal;
  const openBottlenecks = bottlenecks.filter(b => b.status === 'open');
  const catLabel = key => BOTTLENECK_CATEGORIES.find(c => c.key === key)?.label || key;
  const openTasks = tasks.filter(t => t.status === 'open');
  const doneTasks = tasks.filter(t => t.status === 'done').slice(0, 8);
  const actionByStage = Object.fromEntries((stageActions || []).map(a => [a.stage, a]));
  const visibleStages = stages.filter(s => s.count > 0);
  const salesDelta = kpis.salesPrev30.total ? Math.round(((kpis.sales30.total - kpis.salesPrev30.total) / kpis.salesPrev30.total) * 100) : null;

  const submitGoal = async () => {
    await saveGoal(draftGoal);
    setEditingGoal(false);
  };

  return (
    <div className="stack" style={{ gap: '20px' }}>
      <style>{SHARED_CSS}{PANEL_CSS}</style>

      <section className="card stack" style={{ padding: '24px', gap: '14px' }}>
        <div>
          <div className="cp-kicker">AI専属コンサル</div>
          <h2 style={{ margin: '2px 0 6px', fontSize: '18px' }}>{premise}ために、お店のデータから毎日の動きまで一緒に考えます</h2>
          <p className="muted" style={{ margin: 0, fontSize: '13px', lineHeight: 1.7 }}>
            お店がどうなりたいかを、自分の言葉で書いてください。来店・売上・予約の実データと、今日の日付や時期を見て、見立てと日々の作業を考えます。時間が経ってお客様の状況が変わると、毎日考え直します。
          </p>
        </div>
        {error && <p className="cp-error">{error}</p>}

        {showGoalEditor ? (
          <div className="stack" style={{ gap: '10px' }}>
            <label className="cp-label" htmlFor="cp-goal">お店として、これからどうなりたいですか？</label>
            <textarea id="cp-goal" className="cp-input" rows={4} maxLength={600} value={draftGoal} onChange={e => setDraftGoal(e.target.value)}
              placeholder="例：常連のお客様は多いが、新しく来てくれた方が2回目に来てくれない。3か月で、初回のお客様の半分が2回目に来てくれるようにしたい" />
            <div className="cp-label" style={{ fontWeight: 600, fontSize: '12.5px' }}>書きづらいときは、近いものを押すと入ります</div>
            <div className="cp-choices">
              {GOAL_EXAMPLES.map(g => <button key={g} type="button" className="cp-choice" onClick={() => setDraftGoal(prev => (prev ? `${prev}\n${g}` : g).slice(0, 600))}>{g}</button>)}
            </div>
            <div className="cp-actions">
              <button type="button" className="cp-primary" disabled={busy || !draftGoal.trim()} onClick={submitGoal}>この内容で考えてもらう</button>
              {!needsGoal && <button type="button" className="cp-secondary" onClick={() => setEditingGoal(false)}>やめる</button>}
            </div>
            {needsGoal && <p className="muted" style={{ margin: 0, fontSize: '12.5px' }}>あとで書いても大丈夫です。書かなくても、Finemeの機能はすべて今まで通り使えます。</p>}
          </div>
        ) : (
          <div className="cp-goals">
            <div className="cp-label">お店のゴール</div>
            <p className="cp-note cp-goal-text">{goalText}</p>
            <div className="cp-actions">
              <button type="button" className="cp-link" onClick={() => { setDraftGoal(goalText); setEditingGoal(true); }}>ゴールを書き直す</button>
              <button type="button" className="cp-link" disabled={planning || busy} onClick={() => replan(true)}>今の状況で考え直してもらう</button>
            </div>
            <p className="cc-muted">{timeText}{generatedAt ? ` / 最後に考えたのは ${formatWhen(generatedAt)}` : ''}</p>
          </div>
        )}
      </section>

      {planning && (
        <section className="card" style={{ padding: '20px 24px' }}>
          <p className="muted" style={{ margin: 0, fontSize: '13.5px' }}>お店のデータと今日の日付を見て、見立てと今日の作業を考えています。30秒ほどかかります。</p>
        </section>
      )}

      {!needsGoal && diagnosis && (
        <section className="card stack" style={{ padding: '24px', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>いまの見立て</h3>
          <p className="cp-prose">{diagnosis}</p>
          {focus && (
            <div className="cp-focus">
              <div className="cp-kicker">この時期の焦点</div>
              <p className="cp-prose" style={{ margin: 0 }}>{focus}</p>
            </div>
          )}
          {questions?.length > 0 && (
            <div className="cp-questions">
              <div className="cp-label">もっと精度を上げるために、教えてください</div>
              {questions.map(q => {
                const open = qOpen === q;
                const sent = qSent?.q === q ? qSent : null;
                const reply = sent ? chatLog[sent.startLen + 1] : null;
                return (
                  <div key={q} className="cp-qa">
                    <button type="button" className={`cp-choice cp-question${open ? ' is-active' : ''}`} aria-expanded={open} onClick={() => { setQOpen(open ? '' : q); setQText(''); }}>{q}</button>
                    {open && !sent && (
                      <form className="cp-qa-form" onSubmit={e => { e.preventDefault(); const t = qText.trim(); if (!t) return; setQSent({ q, startLen: chatLog.length }); sendChat(`質問「${q}」への回答：${t}`); }}>
                        <textarea className="cp-input" rows={3} maxLength={600} value={qText} onChange={e => setQText(e.target.value)} placeholder="わかる範囲で書いてください" aria-label={`${q} への回答`} />
                        <button type="submit" className="cp-primary" disabled={busy || !qText.trim()}>この内容を伝える</button>
                      </form>
                    )}
                    {sent && (
                      <div className="cp-qa-result" aria-live="polite">
                        <div className="cp-qa-you">{sent.startLen != null && chatLog[sent.startLen]?.content?.replace(/^質問「.*?」への回答：/, '')}</div>
                        <div className="cp-qa-ai">{reply ? reply.content : '考えています…'}</div>
                        {reply && <button type="button" className="cc-link" onClick={() => { setQSent(null); setQOpen(''); }}>とじる</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {!needsGoal && (
        <section className="card stack" style={{ padding: '24px', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>やること</h3>
          <TaskList tasks={openTasks} tabLabels={tabLabels} busy={busy} onStatus={setTaskStatus} />
          <form className="cp-task-form" onSubmit={e => { e.preventDefault(); const t = taskInput.trim(); if (t) { addTask(t, taskCadence); setTaskInput(''); } }}>
            <input className="cp-input" value={taskInput} onChange={e => setTaskInput(e.target.value)} maxLength={120} placeholder="自分でやることを足す" aria-label="追加するタスク" />
            <select className="cp-input cp-select" value={taskCadence} onChange={e => setTaskCadence(e.target.value)} aria-label="頻度">
              <option value="once">単発</option><option value="daily">毎日</option><option value="weekly">毎週</option><option value="monthly">毎月</option>
            </select>
            <button type="submit" className="cp-secondary" disabled={busy || !taskInput.trim()}>追加</button>
          </form>
          {doneTasks.length > 0 && (
            <details className="cp-details">
              <summary>最近できたこと（{doneTasks.length}）</summary>
              <ul className="cp-done">{doneTasks.map(t => <li key={t.id}>{t.title} <button type="button" className="cc-link cc-link-quiet" disabled={busy} onClick={() => setTaskStatus(t.id, 'open')}>戻す</button></li>)}</ul>
            </details>
          )}
        </section>
      )}

      {!needsGoal && visibleStages.length > 0 && (
        <section className="card stack" style={{ padding: '24px', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>お客様の段階</h3>
          <p className="muted" style={{ margin: 0, fontSize: '13px', lineHeight: 1.7 }}>Fineme上の来店記録をもとにした段階です。日がたつと、お客様は次の段階に移ります。段階ごとに、打ち手と声かけの文案を出します。</p>
          <div className="cp-stages">
            {visibleStages.map(s => {
              const act = actionByStage[s.key];
              const open = openStage === s.key;
              return (
                <div key={s.key} className={`cp-stage${open ? ' is-open' : ''}`}>
                  <button type="button" className="cp-stage-head" aria-expanded={open} onClick={() => setOpenStage(open ? '' : s.key)}>
                    <span className="cp-stage-count">{s.count}<small>人</small></span>
                    <span className="cp-stage-label">{s.label}<small>{s.hint}</small></span>
                  </button>
                  {open && (
                    <div className="cp-stage-body">
                      {act?.action ? <p className="cp-prose" style={{ margin: 0 }}>{act.action}</p> : <p className="cc-muted">この段階の打ち手は、次に考え直す時に出ます。</p>}
                      {act?.message_draft && (
                        <div className="cp-draft">
                          <div className="cp-kicker">声かけの文案（名前は自動で入れ替えます）</div>
                          <p>{act.message_draft}</p>
                        </div>
                      )}
                      <ul className="cp-people">
                        {s.samples.map(c => (
                          <li key={c.user_id}>
                            <span>{c.name}<small>{c.axisLabel ? `${c.axisLabel} / ` : ''}来店{c.visits}回 / 最後から{c.daysSince}日</small></span>
                            {act?.message_draft && <button type="button" className="cc-link" onClick={() => copyDraft(act.message_draft, c.name, `${s.key}-${c.user_id}`)}>{copied === `${s.key}-${c.user_id}` ? 'コピーしました' : '文案をコピー'}</button>}
                          </li>
                        ))}
                      </ul>
                      {s.count > s.samples.length && <p className="cc-muted">ほか{s.count - s.samples.length}人。全員は顧客管理で見られます。</p>}
                      <button type="button" className="cc-link" onClick={() => goToTab('customers')}>顧客管理を開く</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!needsGoal && (
        <section className="card stack" style={{ padding: '24px', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>直近の動き</h3>
          <ul className="cp-kpis">
            <li>売上の記録（30日）：{kpis.sales30.count}件 / {kpis.sales30.total.toLocaleString()}円{salesDelta != null ? `（その前の30日より${salesDelta >= 0 ? '+' : ''}${salesDelta}%）` : ''}</li>
            <li>予約リクエスト（30日）：{kpis.reservations30}件（その前の30日は{kpis.reservationsPrev30}件）、キャンセル{kpis.cancelled30}件</li>
          </ul>
          <p className="cc-muted">Fineme上に記録されている分だけの数字です。記録が少ないと、実際のお店の動きとは差が出ます。</p>
        </section>
      )}

      <section className="card stack" style={{ padding: '24px', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>AIに相談する</h3>
        {facts?.length > 0 && (
          <details className="cp-details">
            <summary>AIが覚えているお店のこと（{facts.length}）</summary>
            <ul className="cp-done">{facts.map(f => <li key={f}>{f}</li>)}</ul>
          </details>
        )}
        <div className="cp-chat-log" ref={logRef}>
          {chatLog.length === 0 && <p className="muted" style={{ margin: 0, fontSize: '13px' }}>お店のことを何でも相談してください。「今月は何に力を入れるべき？」「このスタッフに何を任せればいい？」「やってみたけどうまくいかなかった」など。決めたことはやることに記録します。</p>}
          {chatLog.map((m, i) => <div key={i} className={`cp-msg is-${m.role}`}>{m.content}</div>)}
          {busy && <div className="cp-msg is-assistant">考えています…</div>}
        </div>
        <form className="cp-chat-form" onSubmit={e => { e.preventDefault(); const t = chatInput; setChatInput(''); sendChat(t); }}>
          <textarea className="cp-input" value={chatInput} onChange={e => setChatInput(e.target.value)} rows={2} maxLength={1000} placeholder="相談したいことを入力" aria-label="相談内容"
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); const t = chatInput; setChatInput(''); sendChat(t); } }} />
          <button type="submit" className="cp-primary" disabled={busy || !chatInput.trim()}>送る</button>
        </form>
      </section>

      <section className="card stack" style={{ padding: '24px', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>時間を取られている作業</h3>
        <p className="muted" style={{ margin: 0, fontSize: '13px', lineHeight: 1.7 }}>
          スタッフ全員がお客様のために使える時間を増やすための記録です。教えてもらった作業は、タスクの組み立てで優先して取り上げます。
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

      <section className="card stack" style={{ padding: '24px', gap: '10px' }}>
        <details className="cp-details">
          <summary>Finemeの準備状況（{readiness.progress.done} / {readiness.progress.total}）</summary>
          <p className="cc-muted" style={{ margin: '8px 0 10px' }}>これはゴールそのものではなく、Finemeの機能をどこまで使っているかの事実です。必要だと思ったものだけ整えてください。使わなくても、他の機能は問題なく動きます。</p>
          <ol className="cp-steps">
            {readiness.steps.map(s => (
              <li key={s.key} className={`cp-step is-${s.status}`}>
                <div className="cp-step-main">
                  <span className="cp-step-title">{s.title}</span>
                  <span className={`cp-badge is-${s.status}`}>{s.ongoing && s.status === 'todo' ? '継続' : STATUS_LABEL[s.status]}</span>
                </div>
                {s.progress && <div className="cp-step-meta"><span>{s.progress}</span></div>}
                {s.status !== 'done' && (
                  <div className="cp-step-actions">
                    <button type="button" className="cp-link" onClick={() => goToTab(s.tab)}>{s.actionLabel}</button>
                    {s.status === 'todo' && !s.ongoing && <button type="button" className="cp-link" disabled={busy} onClick={() => stepAction(s.key, 'skip')}>使わない</button>}
                    {(s.status === 'skipped' || s.status === 'snoozed') && <button type="button" className="cp-link" disabled={busy} onClick={() => stepAction(s.key, 'reset')}>戻す</button>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </details>
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

  .cp-goal-text { font-size: 15px; line-height: 1.8; color: #1a1410; }
  .cp-prose { margin: 0; font-size: 14px; line-height: 1.85; color: #1a1410; white-space: pre-wrap; }
  .cp-focus { border-left: 3px solid var(--color-gold, #c8a45c); padding: 4px 0 4px 14px; display: flex; flex-direction: column; gap: 4px; }
  .cp-questions { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
  .cp-qa { display: flex; flex-direction: column; gap: 8px; align-items: stretch; width: 100%; }
  .cp-qa-form { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; padding: 10px 12px; border-left: 3px solid var(--color-gold, #c8a45c); background: rgba(26,20,16,0.04); border-radius: 0 10px 10px 0; }
  .cp-qa-result { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; padding: 10px 12px; border-left: 3px solid var(--color-gold, #c8a45c); background: rgba(26,20,16,0.04); border-radius: 0 10px 10px 0; }
  .cp-qa-you { font-size: 13px; color: rgba(26,20,16,0.62); white-space: pre-wrap; }
  .cp-qa-ai { font-size: 13.5px; line-height: 1.8; color: #1a1410; white-space: pre-wrap; }
  .cp-question { align-self: flex-start; text-align: left; border-radius: 10px; line-height: 1.55; }
  .cp-task-form { display: flex; gap: 8px; align-items: center; }
  .cp-task-form .cp-input { flex: 1; }
  .cp-task-form .cp-select { flex: 0 0 auto; width: auto; }
  .cp-details summary { cursor: pointer; font-size: 13.5px; font-weight: 700; color: #1a1410; }
  .cp-done { margin: 8px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.8; color: rgba(26,20,16,0.7); }
  .cp-stages { display: flex; flex-direction: column; gap: 8px; }
  .cp-stage { border: 1px solid rgba(26,20,16,0.14); border-radius: 12px; overflow: hidden; background: #fff; }
  .cp-stage-head { display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 14px; background: none; border: none; cursor: pointer; text-align: left; font: inherit; color: #1a1410; }
  .cp-stage-count { flex: 0 0 56px; font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1; }
  .cp-stage-count small { font-size: 12px; font-weight: 600; margin-left: 2px; color: rgba(26,20,16,0.6); }
  .cp-stage-label { display: flex; flex-direction: column; gap: 2px; font-weight: 700; font-size: 14px; }
  .cp-stage-label small { font-weight: 500; font-size: 12px; color: rgba(26,20,16,0.58); }
  .cp-stage-body { display: flex; flex-direction: column; gap: 12px; padding: 4px 14px 14px; border-top: 1px dashed rgba(26,20,16,0.16); padding-top: 12px; }
  .cp-draft { background: rgba(26,20,16,0.05); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
  .cp-draft p { margin: 0; font-size: 13.5px; line-height: 1.8; white-space: pre-wrap; }
  .cp-people { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .cp-people li { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; font-size: 13.5px; }
  .cp-people small { display: block; font-size: 12px; color: rgba(26,20,16,0.58); }
  .cp-kpis { margin: 0; padding-left: 20px; font-size: 13.5px; line-height: 1.9; color: #1a1410; font-variant-numeric: tabular-nums; }
  .cp-stage-head:focus-visible, .cp-details summary:focus-visible { outline: 2px solid #1d4ed8; outline-offset: 2px; }
`;
