'use client';

// 条件からメニューを作る。1画面に質問1つ。よく使う組み合わせ（60分 下半身・30分 追い込み 等）は1回押すだけ。
// 年齢・性別・身長・体重はこの端末の中だけで使い、送らない・URLにも入れない。
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import s from '../encompass.module.css';
import { EXERCISE_BY_ID, PARTS, PART_LABEL } from '@/lib/encompass/exercises';
import { EXPERIENCE, GENDERS, GOALS, PAINS, PRESETS, doseText, encodeMenu, saveMenu, suggestMenu, totalMinutes } from '@/lib/encompass/menu';
import { levelText } from '@/lib/encompass/resistance';

const MINUTES = [15, 30, 45, 60];
const STEPS = ['minutes', 'goal', 'parts', 'experience', 'body', 'pains', 'result'];

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
    if (p.get('store') !== '1') return;
    const c = p.get('customer');
    setStoreQs(`store=1${c && /^[um]:[0-9a-f-]{36}$/.test(c) ? `&customer=${encodeURIComponent(c)}` : ''}`);
  }, []);

  const toggle = (list, setList, key) => setList(list.includes(key) ? list.filter(x => x !== key) : [...list, key]);
  const next = () => setStep(n => Math.min(n + 1, STEPS.length - 1));
  const back = () => setStep(n => Math.max(n - 1, 0));
  const name = STEPS[step];
  const usePreset = p => { setMinutes(p.minutes); setParts(p.parts); setGoal(p.goal); setStep(STEPS.indexOf('experience')); };

  const weightKg = toNum(weight);
  const result = name === 'result'
    ? suggestMenu({ minutes, parts, goal, experience, age: toNum(age), gender, heightCm: toNum(height), weightKg, pains })
    : null;

  return (
    <main className={s.main}>
      <p className={s.step}>{name === 'result' ? 'メニューの案' : `質問 ${step + 1} / ${STEPS.length - 1}`}</p>

      {name === 'minutes' && (
        <>
          <h1 className={s.h1}>よく使うメニューから選ぶ</h1>
          <p className={s.lead}>押すと、時間・目的・部位が決まります。このあと、慣れ・年齢・体のことを聞きます。</p>
          <div className={s.choices}>
            {PRESETS.map(p => (
              <button key={p.key} type="button" className={s.choice} onClick={() => usePreset(p)}>{p.label}</button>
            ))}
          </div>
          <h2 className={s.h2}>自分で決める：何分のメニューにしますか？</h2>
          <div className={s.choices}>
            {MINUTES.map(m => (
              <button key={m} type="button" className={`${s.choice} ${minutes === m ? s.choiceOn : ''}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m}分</button>
            ))}
          </div>
        </>
      )}

      {name === 'goal' && (
        <>
          <h1 className={s.h1}>目的はどれですか？</h1>
          <p className={s.lead}>目的に合わせて、回数・セット数・休憩・レベルを決めます。</p>
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
          <h1 className={s.h1}>どこを鍛えますか？</h1>
          <p className={s.lead}>いくつ選んでもかまいません。選ばなければ全身にします。</p>
          <div className={s.choices}>
            {PARTS.map(p => (
              <button key={p.key} type="button" className={`${s.choice} ${parts.includes(p.key) ? s.choiceOn : ''}`} aria-pressed={parts.includes(p.key)} onClick={() => toggle(parts, setParts, p.key)}>{p.label}</button>
            ))}
          </div>
        </>
      )}

      {name === 'experience' && (
        <>
          <h1 className={s.h1}>ENCOMPASS は使ったことがありますか？</h1>
          <div className={s.choices}>
            {EXPERIENCE.map(e => (
              <button key={e.key} type="button" className={`${s.choice} ${experience === e.key ? s.choiceOn : ''}`} aria-pressed={experience === e.key} onClick={() => setExperience(e.key)}>{e.label}</button>
            ))}
          </div>
        </>
      )}

      {name === 'body' && (
        <>
          <h1 className={s.h1}>年齢・性別・身長・体重を教えてください</h1>
          <p className={s.lead}>レベル（傾斜）の目安を決めるのに使います。分からない所は空けたままでかまいません。この端末の中だけで使い、どこにも送りません。</p>
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
          <h1 className={s.h1}>痛みや不安のある所はありますか？</h1>
          <p className={s.lead}>選んだ所に負担がかかりやすい種目を外します。無ければそのまま次へ。</p>
          <div className={s.choices}>
            {PAINS.map(p => (
              <button key={p.key} type="button" className={`${s.choice} ${pains.includes(p.key) ? s.choiceOn : ''}`} aria-pressed={pains.includes(p.key)} onClick={() => toggle(pains, setPains, p.key)}>{p.label}</button>
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
                <summary style={{ cursor: 'pointer', fontSize: 18 }}>レベル・回数の決め方{result.bmi ? `（BMI ${result.bmi}）` : ''}</summary>
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
                        <div className={s.cardMeta}>{PART_LABEL[e.part]}・{doseText(it)}・休憩{it.rest}秒</div>
                        <div className={s.cardMeta}>{levelText(it.level, weightKg)}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className={s.note}>レベル（傾斜）と負荷は目安です。最初は低い方から始め、トレーナーが調整してください。</p>
              <div className={s.row} style={{ marginTop: 16 }}>
                <button type="button" className={s.btnPrimary} onClick={() => router.push(`/encompass/play?m=${encodeMenu(result.menu)}`)}>このメニューで始める</button>
                {storeQs ? (
                  <button type="button" className={s.btn} onClick={() => router.push(`/encompass/builder?${storeQs}&m=${encodeMenu(result.menu)}`)}>見直してお店に保存する</button>
                ) : (
                  <>
                    <button type="button" className={s.btn} onClick={() => router.push(`/encompass/builder?m=${encodeMenu(result.menu)}`)}>種目を入れ替える</button>
                    <button type="button" className={s.btn} onClick={() => { saveMenu(result.menu); setSavedMsg('この端末に保存しました。'); }}>この端末に保存する</button>
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
