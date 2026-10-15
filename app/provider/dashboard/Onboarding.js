'use client';

// 掲載者管理画面のオンボーディング（でお承認 2026-10-15）。
// 初めて管理画面を開いた店舗に業態・規模・運営・目的を聞き、回答に合わせて機能を自動でON/OFFし、
// AI専属コンサルにもお店の前提として共有する。機能設定タブの「はじめの質問をやり直す」からも開ける
// （window の 'pd-open-onboarding' イベント）。質問とおすすめ判定は lib/onboarding.js。
import { useEffect, useMemo, useState } from 'react';
import {
  BUSINESS_TYPES, STAFF_SIZES, BOOKING_STYLES, OPERATIONS, GOALS, MAX_GOALS, BURDENS,
  normalizeAnswers, recommendFeatures, recommendShortcuts, firstSteps,
} from '@/lib/onboarding';
import { FEATURE_DEFS } from '@/lib/feature-flags';
import { HEADER_SHORTCUT_OPTIONS } from '@/lib/dashboard-prefs';

function getToken() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return key ? JSON.parse(localStorage.getItem(key))?.access_token || null : null;
  } catch { return null; }
}
function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const EMPTY = { business: null, businessOther: '', staffSize: null, booking: null, operations: [], goals: [], burdens: [], concern: '' };

const STEPS = [
  { key: 'business', title: 'どんなお店ですか？', note: 'いちばん近いものを1つ選んでください。' },
  { key: 'staffSize', title: 'スタッフは何人ですか？', note: 'オーナーご自身も含めた、施術・接客をする人数です。' },
  { key: 'booking', title: '予約はどう受けていますか？', note: 'いちばん多い受け方を1つ選んでください。' },
  { key: 'operations', title: 'お店で当てはまるものは？', note: '当てはまるものを全て選んでください。無ければそのまま次へ。' },
  { key: 'goals', title: 'Finemeで、何を良くしたいですか？', note: `大事な順に${MAX_GOALS}つまで選んでください。` },
  { key: 'burdens', title: '時間を取られている作業は？', note: '当てはまるものを全て選んでください。最後に、いちばん困っていることを一言どうぞ（任意）。' },
];

const CSS = `
.pob-overlay { position: fixed; inset: 0; z-index: 99990; background: rgba(15,20,32,.72); backdrop-filter: blur(3px); display: flex; align-items: flex-start; justify-content: center; padding: max(24px, env(safe-area-inset-top)) 16px 24px; overflow-y: auto; }
.pob-card { width: 100%; max-width: 640px; background: #fff; color: #1a1410; border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,.35); overflow: hidden; margin: auto 0; }
.pob-top { padding: 18px 24px 0; display: flex; align-items: center; gap: 12px; }
.pob-seal { width: 34px; height: 34px; border-radius: 50%; border: 1px solid rgba(176,143,51,.6); color: #8a6a17; display: flex; align-items: center; justify-content: center; font-family: 'Shippori Mincho', serif; font-weight: 700; font-size: 16px; flex-shrink: 0; }
.pob-progress { flex: 1; height: 4px; border-radius: 2px; background: rgba(26,20,16,.08); overflow: hidden; }
.pob-progress span { display: block; height: 100%; background: linear-gradient(90deg, #c9a84c, #e8cf7e); transition: width .3s ease; }
.pob-count { font-size: 12px; color: rgba(26,20,16,.5); font-variant-numeric: tabular-nums; }
.pob-body { padding: 22px 24px 8px; display: grid; gap: 14px; }
.pob-body h2 { margin: 0; font-size: 21px; line-height: 1.45; text-wrap: balance; }
.pob-note { margin: 0; font-size: 13.5px; line-height: 1.75; color: rgba(26,20,16,.62); }
.pob-choices { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; }
.pob-choice { text-align: left; padding: 12px 14px; border-radius: 12px; border: 1.5px solid rgba(26,20,16,.12); background: #fff; font-size: 14px; line-height: 1.55; color: #1a1410; cursor: pointer; display: flex; gap: 10px; align-items: flex-start; }
.pob-choice:hover { border-color: rgba(201,168,76,.6); }
.pob-choice[aria-pressed="true"] { border-color: #c9a84c; background: rgba(201,168,76,.1); font-weight: 700; }
.pob-choice:disabled { opacity: .45; cursor: not-allowed; }
.pob-mark { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid rgba(26,20,16,.25); flex-shrink: 0; margin-top: 2px; display: flex; align-items: center; justify-content: center; }
.pob-choice.multi .pob-mark { border-radius: 5px; }
.pob-choice[aria-pressed="true"] .pob-mark { border-color: #b08f33; background: #c9a84c; }
.pob-choice[aria-pressed="true"] .pob-mark::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #fff; }
.pob-choice.multi[aria-pressed="true"] .pob-mark::after { width: 5px; height: 9px; border-radius: 0; background: none; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg) translate(-1px, -1px); }
.pob-input { width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: 14px; border: 1.5px solid rgba(26,20,16,.15); border-radius: 10px; font-family: inherit; }
.pob-foot { padding: 14px 24px 22px; display: flex; gap: 10px; justify-content: space-between; align-items: center; flex-wrap: wrap; }
.pob-btn { border: 0; border-radius: 999px; padding: 12px 24px; font-weight: 800; font-size: 14.5px; cursor: pointer; color: #1a1410; background: linear-gradient(180deg, #e8cf7e, #c9a84c); }
.pob-btn:disabled { opacity: .45; cursor: not-allowed; }
.pob-ghost { border: 0; background: none; color: rgba(26,20,16,.55); font-size: 13.5px; cursor: pointer; padding: 10px 4px; }
.pob-ghost:hover { color: #1a1410; }
.pob-feat { display: flex; gap: 12px; align-items: flex-start; padding: 11px 0; border-bottom: 1px solid rgba(26,20,16,.07); }
.pob-feat:last-child { border-bottom: 0; }
.pob-feat b { font-size: 14px; display: block; }
.pob-feat p { margin: 2px 0 0; font-size: 12.5px; line-height: 1.6; color: rgba(26,20,16,.6); }
.pob-switch { position: relative; width: 40px; height: 23px; flex-shrink: 0; border-radius: 99px; border: 0; background: rgba(26,20,16,.18); cursor: pointer; margin-top: 1px; transition: background .2s; }
.pob-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 17px; height: 17px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.pob-switch[aria-checked="true"] { background: #c9a84c; }
.pob-switch[aria-checked="true"]::after { transform: translateX(17px); }
.pob-switch:disabled { opacity: .4; cursor: not-allowed; }
.pob-lock { font-size: 11px; font-weight: 700; color: #2f4f8f; margin-left: 6px; }
.pob-sec { border: 1px solid rgba(26,20,16,.1); border-radius: 12px; padding: 4px 14px; }
.pob-sec-title { font-size: 12px; font-weight: 800; letter-spacing: .06em; color: rgba(26,20,16,.55); margin: 4px 0 0; }
.pob-sec summary { cursor: pointer; font-size: 13px; font-weight: 700; padding: 10px 0; color: rgba(26,20,16,.65); }
.pob-steps { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; counter-reset: pob; }
.pob-steps li { counter-increment: pob; display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 12px; background: rgba(201,168,76,.07); }
.pob-steps li::before { content: counter(pob); width: 24px; height: 24px; border-radius: 50%; background: #1a1410; color: #e8cf7e; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.pob-steps b { font-size: 14px; display: block; }
.pob-steps span { font-size: 12px; color: rgba(26,20,16,.6); line-height: 1.55; }
.pob-go { border: 1px solid rgba(26,20,16,.18); background: #fff; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.pob-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.pob-chip { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 99px; background: rgba(26,20,16,.06); }
.pob-err { color: #c2410c; font-size: 13px; margin: 0; }
.pob-choice:focus-visible, .pob-btn:focus-visible, .pob-switch:focus-visible, .pob-go:focus-visible, .pob-ghost:focus-visible { outline: 2px solid #2f4f8f; outline-offset: 2px; }
@media (max-width: 480px) { .pob-body { padding: 18px 18px 6px; } .pob-foot { padding: 12px 18px 18px; } .pob-top { padding: 16px 18px 0; } .pob-body h2 { font-size: 19px; } }
@media (prefers-reduced-motion: reduce) { .pob-progress span, .pob-switch, .pob-switch::after { transition: none; } }
`;

export default function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(-1); // -1: はじめに / 0..5: 質問 / 6: おすすめ / 7: 完了
  const [answers, setAnswers] = useState(EMPTY);
  const [locks, setLocks] = useState({});
  const [toggles, setToggles] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [doneSteps, setDoneSteps] = useState([]);

  async function loadLocks() {
    try {
      const res = await fetch('/api/provider/features', { headers: authHeaders() });
      if (res.ok) setLocks((await res.json()).locks || {});
    } catch { /* ロック表示が出ないだけ。保存時にサーバー側で判定される */ }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) return;
      try {
        const res = await fetch('/api/provider/onboarding', { headers: authHeaders() });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!data.completed) { setOpen(true); setStep(-1); loadLocks(); }
      } catch { /* 取得できない時は出さない（作業の邪魔をしない） */ }
    })();
    const reopen = async () => {
      try {
        const res = await fetch('/api/provider/onboarding', { headers: authHeaders() });
        const data = res.ok ? await res.json() : {};
        setAnswers({ ...EMPTY, ...normalizeAnswers(data.answers || {}) });
      } catch { setAnswers(EMPTY); }
      setError(''); setStep(0); setOpen(true); loadLocks();
    };
    window.addEventListener('pd-open-onboarding', reopen);
    return () => { cancelled = true; window.removeEventListener('pd-open-onboarding', reopen); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const normalized = useMemo(() => normalizeAnswers(answers), [answers]);
  const recs = useMemo(() => recommendFeatures(normalized), [normalized]);
  const shortcuts = useMemo(() => recommendShortcuts(normalized), [normalized]);
  const steps = useMemo(() => firstSteps(normalized), [normalized]);

  function goResult() {
    const init = {};
    Object.entries(recs).forEach(([k, r]) => { init[k] = locks[k] ? false : r.on; });
    setToggles(init);
    setStep(6);
  }

  async function skip() {
    setOpen(false);
    try { await fetch('/api/provider/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ mode: 'skip' }) }); } catch {}
  }

  async function apply() {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/provider/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ mode: 'apply', answers: normalized, features: toggles }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || '保存できませんでした。もう一度お試しください。'); setSaving(false); return; }
      setDoneSteps(data.steps || steps);
      setStep(7);
    } catch {
      setError('通信できませんでした。電波の良いところでもう一度お試しください。');
    }
    setSaving(false);
  }

  function goTab(tab) {
    // 機能のON/OFF・サイドバー・ショートカットを確実に反映させるため、読み込み直して開く
    window.location.href = `/provider/dashboard?tab=${encodeURIComponent(tab)}`;
  }

  if (!open) return null;

  const set = (k, v) => setAnswers(a => ({ ...a, [k]: v }));
  const toggleIn = (k, v, max) => setAnswers(a => {
    const cur = a[k] || [];
    if (cur.includes(v)) return { ...a, [k]: cur.filter(x => x !== v) };
    if (max && cur.length >= max) return a;
    return { ...a, [k]: [...cur, v] };
  });

  const q = STEPS[step];
  const canNext =
    step === 0 ? !!answers.business && (answers.business !== 'other' || !!answers.businessOther.trim()) :
    step === 1 ? !!answers.staffSize :
    step === 2 ? !!answers.booking :
    step === 4 ? answers.goals.length > 0 :
    true;

  const single = (list, k) => (
    <div className="pob-choices" role="radiogroup">
      {list.map(o => (
        <button key={o.key} type="button" className="pob-choice" aria-pressed={answers[k] === o.key} onClick={() => set(k, o.key)}>
          <span className="pob-mark" />{o.label}
        </button>
      ))}
    </div>
  );
  const multi = (list, k, max) => (
    <div className="pob-choices">
      {list.map(o => {
        const on = answers[k].includes(o.key);
        return (
          <button key={o.key} type="button" className="pob-choice multi" aria-pressed={on}
            disabled={!on && max && answers[k].length >= max} onClick={() => toggleIn(k, o.key, max)}>
            <span className="pob-mark" />{o.label}
          </button>
        );
      })}
    </div>
  );

  const recList = Object.entries(recs);
  const onList = recList.filter(([k, r]) => r.on && !locks[k]);
  const offList = recList.filter(([k, r]) => !r.on || locks[k]);
  const shortcutLabel = k => HEADER_SHORTCUT_OPTIONS.find(o => o.key === k)?.label || k;

  const featRow = ([k, r]) => (
    <div className="pob-feat" key={k}>
      <button type="button" role="switch" className="pob-switch" aria-checked={!!toggles[k]} aria-label={FEATURE_DEFS[k].label}
        disabled={!!locks[k]} onClick={() => setToggles(t => ({ ...t, [k]: !t[k] }))} />
      <div>
        <b>{FEATURE_DEFS[k].label}{locks[k] && <span className="pob-lock">{locks[k]}プランから</span>}</b>
        <p>{r.reason}</p>
      </div>
    </div>
  );

  return (
    <div className="pob-overlay" role="dialog" aria-modal="true" aria-labelledby="pob-title">
      <style>{CSS}</style>
      <div className="pob-card">
        <div className="pob-top">
          <span className="pob-seal" aria-hidden="true">始</span>
          {step >= 0 && step <= 5 ? (
            <>
              <div className="pob-progress"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
              <span className="pob-count">{step + 1} / {STEPS.length}</span>
            </>
          ) : <div style={{ flex: 1 }} />}
        </div>

        {step === -1 && (
          <>
            <div className="pob-body">
              <h2 id="pob-title">はじめに、お店のことを教えてください</h2>
              <p className="pob-note">
                6つの質問に答えると、お店に合わせて使う機能を自動で設定します。答えはAI専属コンサルにも共有され、お店に合った提案に使われます。1分ほどで終わります。
              </p>
              <p className="pob-note">設定は、あとから「機能設定」でいつでも変えられます。</p>
            </div>
            <div className="pob-foot">
              <button type="button" className="pob-ghost" onClick={skip}>あとで</button>
              <button type="button" className="pob-btn" onClick={() => setStep(0)}>始める</button>
            </div>
          </>
        )}

        {step >= 0 && step <= 5 && (
          <>
            <div className="pob-body">
              <h2 id="pob-title">{q.title}</h2>
              <p className="pob-note">{q.note}</p>
              {step === 0 && (
                <>
                  {single(BUSINESS_TYPES, 'business')}
                  {answers.business === 'other' && (
                    <input className="pob-input" placeholder="例：ヨガスタジオ、メンズ脱毛" value={answers.businessOther} maxLength={40}
                      onChange={e => set('businessOther', e.target.value)} aria-label="業態" />
                  )}
                </>
              )}
              {step === 1 && single(STAFF_SIZES, 'staffSize')}
              {step === 2 && single(BOOKING_STYLES, 'booking')}
              {step === 3 && multi(OPERATIONS, 'operations')}
              {step === 4 && multi(GOALS, 'goals', MAX_GOALS)}
              {step === 5 && (
                <>
                  {multi(BURDENS, 'burdens')}
                  <textarea className="pob-input" rows={3} maxLength={300} value={answers.concern}
                    placeholder="例：2回目に来てくれないお客様が多い／予約の電話で施術が止まる"
                    onChange={e => set('concern', e.target.value)} aria-label="いちばん困っていること" />
                </>
              )}
            </div>
            <div className="pob-foot">
              <button type="button" className="pob-ghost" onClick={() => setStep(s => s - 1)}>戻る</button>
              <button type="button" className="pob-btn" disabled={!canNext} onClick={() => (step === 5 ? goResult() : setStep(s => s + 1))}>
                {step === 5 ? 'おすすめを見る' : '次へ'}
              </button>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <div className="pob-body">
              <h2 id="pob-title">お店に合わせた使い方</h2>
              <p className="pob-note">回答をもとに、使う機能を選びました。スイッチで変えてから決定できます。</p>
              <div className="pob-sec">
                <p className="pob-sec-title">使う機能</p>
                {onList.map(featRow)}
              </div>
              {offList.length > 0 && (
                <details className="pob-sec">
                  <summary>今は使わない機能（{offList.length}）</summary>
                  {offList.map(featRow)}
                </details>
              )}
              <div>
                <p className="pob-sec-title" style={{ marginBottom: 6 }}>画面上部のショートカット</p>
                <div className="pob-chips">{shortcuts.map(k => <span key={k} className="pob-chip">{shortcutLabel(k)}</span>)}</div>
              </div>
              {error && <p className="pob-err">{error}</p>}
            </div>
            <div className="pob-foot">
              <button type="button" className="pob-ghost" onClick={() => setStep(5)}>戻る</button>
              <button type="button" className="pob-btn" disabled={saving} onClick={apply}>{saving ? '設定中…' : 'この設定で始める'}</button>
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <div className="pob-body">
              <h2 id="pob-title">設定しました</h2>
              <p className="pob-note">まずはこの順に進めると、すぐに使い始められます。AI専属コンサルも、今の回答をもとに今日やることを提案します。</p>
              <ol className="pob-steps">
                {doneSteps.map(s => (
                  <li key={s.tab}>
                    <div><b>{s.title}</b><span>{s.why}</span></div>
                    <button type="button" className="pob-go" onClick={() => goTab(s.tab)}>開く</button>
                  </li>
                ))}
              </ol>
            </div>
            <div className="pob-foot">
              <span />
              <button type="button" className="pob-btn" onClick={() => { window.location.href = '/provider/dashboard'; }}>管理画面へ</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
