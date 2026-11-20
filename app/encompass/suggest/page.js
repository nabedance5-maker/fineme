'use client';

// 条件からメニューを作る。1画面に質問1つ。時間（5分ずつ）→ きたえる場所（いくつでも）→ 目的 → 慣れ → 体 → 痛い所。
// 年齢・性別・身長・体重はこの端末の中だけで使い、送らない・URLにも入れない。
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import s from '../encompass.module.css';
import { EXERCISE_BY_ID, PARTS, PART_LABEL } from '@/lib/encompass/exercises';
import { EXPERIENCE, GENDERS, GOALS, PAINS, doseText, secText, encodeMenu, saveMenu, suggestMenu, totalMinutes } from '@/lib/encompass/menu';
import { levelText } from '@/lib/encompass/resistance';
import { api } from '@/lib/encompass/client';

const MINUTES = [15, 30, 45, 60];   // よく使う時間（すぐ押せる）
const MIN_MIN = 5, MAX_MIN = 90;      // －＋は5分ずつ（渡邉指定 2026-11-20）
// 時間と場所は別々に選ぶ（渡邉 2026-11-20：「60分 下半身」のような組み合わせより、別々に選べる方がいい）
const STEPS = ['minutes', 'parts', 'goal', 'experience', 'body', 'pains', 'result'];

const toNum = v => {
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export default function Suggest() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [goal, setGoal] = useState('health');
  const [parts, setParts] = useState([]);
  const [experience, setExperience] = useState('first');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('none');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [pains, setPains] = useState([]);
  const [savedMsg, setSavedMsg] = useState('');
  // お店の画面から来た時（?store=1・&customer=）は、案をお店のメニューとして保存する方へ進める
  const [storeQs, setStoreQs] = useState('');
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('store') !== '1') {
      // お店の方がログインしている時は、お店に保存する方へ（保存先をひとつにする）
      api('/me').then(me => { if (me.ok) setStoreQs(q => q || 'store=1'); });
      return;
    }
    const c = p.get('customer');
    setStoreQs(`store=1${c && /^[um]:[0-9a-f-]{36}$/.test(c) ? `&customer=${encodeURIComponent(c)}` : ''}`);
  }, []);

  const toggle = (list, setList, key) => setList(list.includes(key) ? list.filter(x => x !== key) : [...list, key]);
  const next = () => setStep(n => Math.min(n + 1, STEPS.length - 1));
  const back = () => setStep(n => Math.max(n - 1, 0));
  const name = STEPS[step];
  const addMinutes = d => setMinutes(m => Math.min(MAX_MIN, Math.max(MIN_MIN, m + d)));

  const weightKg = toNum(weight);
  const result = name === 'result'
    ? suggestMenu({ minutes, parts, goal, experience, age: toNum(age), gender, heightCm: toNum(height), weightKg, pains })
    : null;

  return (
    <main className={s.main}>
      <p className={s.step}>{name === 'result' ? 'メニューの案' : `質問 ${step + 1} / ${STEPS.length - 1}`}</p>

      {name === 'minutes' && (
        <>
          <h1 className={s.h1}>何分にしますか？</h1>
          <p className={s.lead}>－ ＋ で5分ずつ変えられます。</p>
          <div className={s.row} style={{ alignItems: 'center', gap: 16, margin: '8px 0 16px' }}>
            <button type="button" className={s.btn} style={{ minWidth: 88, fontSize: 24 }} aria-label="5分へらす" disabled={minutes <= MIN_MIN} onClick={() => addMinutes(-5)}>－</button>
            <div style={{ fontSize: 44, fontWeight: 800, minWidth: 130, textAlign: 'center' }} aria-live="polite">{minutes}分</div>
            <button type="button" className={s.btn} style={{ minWidth: 88, fontSize: 24 }} aria-label="5分ふやす" disabled={minutes >= MAX_MIN} onClick={() => addMinutes(5)}>＋</button>
          </div>
          <div className={s.choices}>
            {MINUTES.map(m => (
              <button key={m} type="button" className={`${s.choice} ${minutes === m ? s.choiceOn : ''}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m}分</button>
            ))}
          </div>
        </>
      )}

      {name === 'goal' && (
        <>
          <h1 className={s.h1}>何のためにやりますか？</h1>
          <div className={s.choices}>
            {GOALS.map(g => (
              <button key={g.key} type="button" className={`${s.choice} ${goal === g.key ? s.choiceOn : ''}`} aria-pressed={goal === g.key} onClick={() => setGoal(g.key)}>
                {g.label}<span style={{ display: 'block', fontSize: 15, fontWeight: 400 }}>{g.sub}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {name === 'parts' && (
        <>
          <h1 className={s.h1}>どこをきたえますか？</h1>
          <p className={s.lead}>いくつでも選べます。選ばないと全身になります。</p>
          <div className={s.choices}>
            {PARTS.map(p => (
              <button key={p.key} type="button" className={`${s.choice} ${s.multi} ${parts.includes(p.key) ? s.choiceOn : ''}`} aria-pressed={parts.includes(p.key)} onClick={() => toggle(parts, setParts, p.key)}>{p.label}</button>
            ))}
          </div>
        </>
      )}

      {name === 'experience' && (
        <>
          <h1 className={s.h1}>このマシンを使ったことはありますか？</h1>
          <div className={s.choices}>
            {EXPERIENCE.map(e => (
              <button key={e.key} type="button" className={`${s.choice} ${experience === e.key ? s.choiceOn : ''}`} aria-pressed={experience === e.key} onClick={() => setExperience(e.key)}>{e.label}</button>
            ))}
          </div>
        </>
      )}

      {name === 'body' && (
        <>
          <h1 className={s.h1}>年齢・性別・身長・体重</h1>
          <p className={s.lead}>レベルを決めるのに使います。わからない所は空けたままで大丈夫です。このタブレットの外には送りません。</p>
          <label className={s.field}><span>年齢（歳）</span><input className={s.input} inputMode="numeric" value={age} maxLength={3} onChange={e => setAge(e.target.value)} /></label>
          <div className={s.field}><span>性別</span></div>
          <div className={s.choices}>
            {GENDERS.map(g => (
              <button key={g.key} type="button" className={`${s.choice} ${gender === g.key ? s.choiceOn : ''}`} aria-pressed={gender === g.key} onClick={() => setGender(g.key)}>{g.label}</button>
            ))}
          </div>
          <label className={s.field}><span>身長（cm）</span><input className={s.input} inputMode="decimal" value={height} maxLength={5} onChange={e => setHeight(e.target.value)} /></label>
          <label className={s.field}><span>体重（kg）</span><input className={s.input} inputMode="decimal" value={weight} maxLength={5} onChange={e => setWeight(e.target.value)} /></label>
        </>
      )}

      {name === 'pains' && (
        <>
          <h1 className={s.h1}>痛い所はありますか？</h1>
          <p className={s.lead}>いくつでも選べます。選んだ所に負担がかかる種目を外します。なければ、そのまま「メニューを作る」へ。</p>
          <div className={s.choices}>
            {PAINS.map(p => (
              <button key={p.key} type="button" className={`${s.choice} ${s.multi} ${pains.includes(p.key) ? s.choiceOn : ''}`} aria-pressed={pains.includes(p.key)} onClick={() => toggle(pains, setPains, p.key)}>{p.label}</button>
            ))}
          </div>
        </>
      )}

      {result && (
        <>
          <h1 className={s.h1}>{result.menu.title}（{result.menu.items.length}種目・約{totalMinutes(result.menu.items)}分）</h1>
          {result.stop.map(t => <p key={t} className={s.stop}>{t}</p>)}
          {result.warnings.map(t => <p key={t} className={s.warn}>{t}</p>)}
          {result.menu.items.length > 0 && (
            <>
              <details style={{ margin: '12px 0' }}>
                <summary style={{ cursor: 'pointer', fontSize: 18 }}>なぜこのレベル・回数なの？{result.bmi ? `（BMI ${result.bmi}）` : ''}</summary>
                <ul className={s.note}>{result.reasons.map(t => <li key={t}>{t}</li>)}</ul>
              </details>
              <ol className={s.list}>
                {result.menu.items.map((it, i) => {
                  const e = EXERCISE_BY_ID[it.id];
                  return (
                    <li key={`${it.id}-${i}`} className={s.listItem}>
                      <div className={s.num}>{i + 1}</div>
                      <div>
                        <div className={s.cardName}>{e.name}</div>
                        <div className={s.cardMeta}>{PART_LABEL[e.part]}・{doseText(it)}・休み{secText(it.rest)}</div>
                        <div className={s.cardMeta}>{levelText(it.level, weightKg)}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className={s.note}>レベルは目安です。最初は低い方から。最後はトレーナーが決めてください。</p>
              <div className={s.row} style={{ marginTop: 16 }}>
                <button type="button" className={s.btnPrimary} onClick={() => router.push(`/encompass/play?m=${encodeMenu(result.menu)}`)}>はじめる</button>
                {storeQs ? (
                  <button type="button" className={s.btn} onClick={() => router.push(`/encompass/builder?${storeQs}&m=${encodeMenu(result.menu)}`)}>直してからお店に保存</button>
                ) : (
                  <>
                    <button type="button" className={s.btn} onClick={() => router.push(`/encompass/builder?m=${encodeMenu(result.menu)}`)}>種目を入れかえる</button>
                    <button type="button" className={s.btn} onClick={() => { saveMenu(result.menu); setSavedMsg('このタブレットに保存しました。'); }}>このタブレットに保存</button>
                  </>
                )}
              </div>
              {savedMsg && <p className={s.note} role="status">{savedMsg}</p>}
            </>
          )}
        </>
      )}

      <div className={s.row} style={{ marginTop: 28 }}>
        {step > 0 && <button type="button" className={s.btnGhost} onClick={back}>戻る</button>}
        {name !== 'result' && <button type="button" className={s.btnPrimary} onClick={next}>{name === 'pains' ? 'メニューを作る' : '次へ'}</button>}
        {name === 'result' && <button type="button" className={s.btnGhost} onClick={() => setStep(0)}>最初からやり直す</button>}
      </div>
    </main>
  );
}
