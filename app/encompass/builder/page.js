'use client';

// 種目を選んでメニューを作る。押すだけで並ぶ（ドラッグ・スワイプは使わない）。
// ?m= でメニューを受け取ると、その続きから直せる（条件からの提案・保存したメニューから来る）。
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import s from '../encompass.module.css';
import { EXERCISES, EXERCISE_BY_ID, PARTS, PART_LABEL, thumbUrl, watchUrl } from '@/lib/encompass/exercises';
import { DEFAULT_ITEM, LIMITS, decodeMenu, encodeMenu, saveMenu, totalMinutes } from '@/lib/encompass/menu';
import { levelText } from '@/lib/encompass/resistance';

export default function Builder() {
  const router = useRouter();
  const [part, setPart] = useState(PARTS[0].key);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([]);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get('m');
    const menu = m ? decodeMenu(m) : null;
    if (menu) { setTitle(menu.title); setItems(menu.items); }
  }, []);

  const shown = useMemo(() => EXERCISES.filter(e => e.part === part), [part]);
  const count = id => items.filter(x => x.id === id).length;

  const add = id => {
    if (items.length >= LIMITS.items) return;
    setItems(prev => [...prev, { id, ...DEFAULT_ITEM, level: null }]);
    setSavedMsg('');
  };
  const move = (i, d) => setItems(prev => {
    const j = i + d;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const remove = i => setItems(prev => prev.filter((_, k) => k !== i));
  const change = (i, key, d, [lo, hi]) => setItems(prev => prev.map((x, k) => (k === i ? { ...x, [key]: Math.min(Math.max(x[key] + d, lo), hi) } : x)));

  const menu = { title: title || '名前なし', items };

  return (
    <main className={s.main}>
      <h1 className={s.h1}>種目を選んでメニューを作る</h1>
      <p className={s.lead}>部位を選び、種目の「追加する」を押すと、下のメニューに順番に並びます。</p>

      <div className={s.choices} role="group" aria-label="部位">
        {PARTS.map(p => (
          <button key={p.key} type="button" className={`${s.choice} ${part === p.key ? s.choiceOn : ''}`} aria-pressed={part === p.key} onClick={() => setPart(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className={s.grid}>
        {shown.map(e => (
          <div key={e.id} className={`${s.card} ${count(e.id) ? s.cardOn : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={s.thumb} src={thumbUrl(e.yt)} alt="" loading="lazy" />
            <div className={s.cardBody}>
              <div className={s.cardName}>{e.name}</div>
              {count(e.id) > 0 && <div className={s.cardMeta}>メニューに{count(e.id)}回入っています</div>}
              <div className={s.row} style={{ marginTop: 'auto' }}>
                <button type="button" className={`${s.btnPrimary} ${s.small}`} onClick={() => add(e.id)} disabled={items.length >= LIMITS.items}>追加する</button>
                <a className={`${s.btnGhost} ${s.small}`} href={watchUrl(e.yt)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>動画を見る</a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className={s.h2}>できたメニュー（{items.length}種目・約{totalMinutes(items)}分）</h2>
      <label className={s.field}>
        <span>メニューの名前</span>
        <input className={`${s.input} ${s.inputWide}`} value={title} maxLength={LIMITS.title} placeholder="例：30分・脚とお腹" onChange={e => setTitle(e.target.value)} />
      </label>

      {items.length === 0 ? (
        <p className={s.note}>まだ種目がありません。上の「追加する」を押してください。</p>
      ) : (
        <ol className={s.list}>
          {items.map((it, i) => {
            const e = EXERCISE_BY_ID[it.id];
            return (
              <li key={`${it.id}-${i}`} className={s.listItem}>
                <div className={s.num}>{i + 1}</div>
                <div>
                  <div className={s.cardName}>{e.name}</div>
                  <div className={s.cardMeta}>{PART_LABEL[e.part]}{it.level ? `・${levelText(it.level)}` : ''}</div>
                  <div className={s.row} style={{ marginTop: 8 }}>
                    <span>{it.sets}セット</span>
                    <button type="button" className={`${s.btn} ${s.small}`} aria-label="セットを減らす" onClick={() => change(i, 'sets', -1, LIMITS.sets)}>減らす</button>
                    <button type="button" className={`${s.btn} ${s.small}`} aria-label="セットを増やす" onClick={() => change(i, 'sets', 1, LIMITS.sets)}>増やす</button>
                  </div>
                  <div className={s.row} style={{ marginTop: 8 }}>
                    <span>1セット{it.sec}秒</span>
                    <button type="button" className={`${s.btn} ${s.small}`} aria-label="秒を減らす" onClick={() => change(i, 'sec', -5, LIMITS.sec)}>5秒減らす</button>
                    <button type="button" className={`${s.btn} ${s.small}`} aria-label="秒を増やす" onClick={() => change(i, 'sec', 5, LIMITS.sec)}>5秒増やす</button>
                  </div>
                  <div className={s.row} style={{ marginTop: 8 }}>
                    <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => move(i, -1)} disabled={i === 0}>上へ</button>
                    <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => move(i, 1)} disabled={i === items.length - 1}>下へ</button>
                    <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => remove(i)}>外す</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className={s.row} style={{ marginTop: 20 }}>
        <button type="button" className={s.btnPrimary} disabled={!items.length} onClick={() => router.push(`/encompass/play?m=${encodeMenu(menu)}`)}>このメニューで始める</button>
        <button type="button" className={s.btn} disabled={!items.length} onClick={() => { saveMenu(menu); setSavedMsg('この端末に保存しました。'); }}>この端末に保存する</button>
      </div>
      {savedMsg && <p className={s.note} role="status">{savedMsg}</p>}
    </main>
  );
}
