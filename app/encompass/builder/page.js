'use client';

// 種目を選んでメニューを作る。押すだけで並ぶ（ドラッグ・スワイプは使わない）。
// ?m= でメニューを受け取ると、その続きから直せる（条件からの提案・保存したメニューから来る）。
// お店のメニュー：?id=（お店に保存したメニューを直す）・?store=1（お店に新しく保存する）・&customer=（そのお客様用）。
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import s from '../encompass.module.css';
import { EXERCISES, EXERCISE_BY_ID, PARTS, PART_LABEL, thumbUrl, watchUrl } from '@/lib/encompass/exercises';
import { DEFAULT_ITEM, LIMITS, REST_SEC, decodeMenu, encodeMenu, newItem, saveMenu, totalMinutes } from '@/lib/encompass/menu';
import { levelText } from '@/lib/encompass/resistance';
import { api } from '@/lib/encompass/client';

export default function Builder() {
  const router = useRouter();
  const [part, setPart] = useState(PARTS[0].key);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([]);
  const [savedMsg, setSavedMsg] = useState('');
  // お店のメニューとして作る・直す時
  const [store, setStore] = useState(null); // null=この端末だけ / { id, customerRef, customerName, onBoard }
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const m = p.get('m');
    const menu = m ? decodeMenu(m) : null;
    if (menu) { setTitle(menu.title); setItems(menu.items); }
    const id = p.get('id');
    const customerRef = p.get('customer');
    if (!id && p.get('store') !== '1') return;
    const nameOf = async ref => {
      if (!ref) return null;
      const r = await api('/customers');
      return r.ok ? (r.data.customers.find(c => c.ref === ref)?.name || null) : null;
    };
    (async () => {
      if (id) {
        const r = await api(`/menus/${encodeURIComponent(id)}`);
        if (!r.ok) { setLoadErr(r.data.error || 'メニューを開けませんでした'); return; }
        const x = r.data.menu;
        setTitle(x.title); setItems(x.items);
        setStore({ id: x.id, customerRef: x.customer_ref, customerName: await nameOf(x.customer_ref), onBoard: x.on_board });
      } else {
        const me = await api('/me');
        if (!me.ok) { setLoadErr(me.data.error || 'ログインしてください'); return; }
        const name = await nameOf(customerRef);
        setStore({ id: null, customerRef: name ? customerRef : null, customerName: name, onBoard: false });
      }
    })();
  }, []);

  const saveToStore = async () => {
    setBusy(true); setSavedMsg('');
    const body = { title: title.trim() || '名前なし', items, on_board: !store.customerRef && store.onBoard, customer_ref: store.customerRef || null };
    const r = store.id
      ? await api(`/menus/${store.id}`, { method: 'PATCH', body })
      : await api('/menus', { method: 'POST', body });
    setBusy(false);
    if (!r.ok) { setSavedMsg(r.data.error || '保存できませんでした'); return; }
    router.push('/encompass/store');
  };

  const shown = useMemo(() => EXERCISES.filter(e => e.part === part), [part]);
  const count = id => items.filter(x => x.id === id).length;

  const add = id => {
    if (items.length >= LIMITS.items) return;
    setItems(prev => [...prev, newItem(id)]);
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
  const change = (i, key, d, [lo, hi]) => setItems(prev => prev.map((x, k) => (k === i ? { ...x, [key]: Math.min(Math.max((x[key] ?? (key === 'rest' ? REST_SEC : 0)) + d, lo), hi) } : x)));
  // 回数で数える ⇔ 秒で数える
  const switchMode = i => setItems(prev => prev.map((x, k) => (k === i ? { ...x, reps: x.reps ? null : DEFAULT_ITEM.reps } : x)));

  const menu = { title: title || '名前なし', items };

  return (
    <main className={s.main}>
      <h1 className={s.h1}>{store?.id ? 'お店のメニューを直す' : store ? 'お店のメニューを作る' : '種目を選んでメニューを作る'}</h1>
      {store?.customerName && <p className={s.warn}>{store.customerName} 様のメニューです。</p>}
      {loadErr && <p className={s.stop} role="alert">{loadErr}</p>}
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
                  {it.reps ? (
                    <div className={s.row} style={{ marginTop: 8 }}>
                      <span>1セット{it.reps}回</span>
                      <button type="button" className={`${s.btn} ${s.small}`} aria-label="回数を減らす" onClick={() => change(i, 'reps', -1, LIMITS.reps)}>1回減らす</button>
                      <button type="button" className={`${s.btn} ${s.small}`} aria-label="回数を増やす" onClick={() => change(i, 'reps', 1, LIMITS.reps)}>1回増やす</button>
                    </div>
                  ) : (
                    <div className={s.row} style={{ marginTop: 8 }}>
                      <span>1セット{it.sec}秒</span>
                      <button type="button" className={`${s.btn} ${s.small}`} aria-label="秒を減らす" onClick={() => change(i, 'sec', -5, LIMITS.sec)}>5秒減らす</button>
                      <button type="button" className={`${s.btn} ${s.small}`} aria-label="秒を増やす" onClick={() => change(i, 'sec', 5, LIMITS.sec)}>5秒増やす</button>
                    </div>
                  )}
                  <div className={s.row} style={{ marginTop: 8 }}>
                    <span>休憩{it.rest ?? REST_SEC}秒</span>
                    <button type="button" className={`${s.btn} ${s.small}`} aria-label="休憩を減らす" onClick={() => change(i, 'rest', -5, LIMITS.rest)}>5秒減らす</button>
                    <button type="button" className={`${s.btn} ${s.small}`} aria-label="休憩を増やす" onClick={() => change(i, 'rest', 5, LIMITS.rest)}>5秒増やす</button>
                    <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => switchMode(i)}>{it.reps ? '秒で数えるに変える' : '回数で数えるに変える'}</button>
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

      {store && !store.customerRef && (
        <label className={s.row} style={{ marginTop: 16, fontSize: 19 }}>
          <input type="checkbox" style={{ width: 28, height: 28 }} checked={store.onBoard} onChange={e => setStore({ ...store, onBoard: e.target.checked })} />
          ジムのタブレットに出す
        </label>
      )}
      <div className={s.row} style={{ marginTop: 20 }}>
        {store ? (
          <>
            <button type="button" className={s.btnPrimary} disabled={!items.length || busy} onClick={saveToStore}>{busy ? '保存しています' : 'お店に保存する'}</button>
            <button type="button" className={s.btn} disabled={!items.length} onClick={() => router.push(`/encompass/play?m=${encodeMenu(menu)}`)}>保存せずに試す</button>
            <button type="button" className={s.btnGhost} onClick={() => router.push('/encompass/store')}>やめる</button>
          </>
        ) : (
          <>
            <button type="button" className={s.btnPrimary} disabled={!items.length} onClick={() => router.push(`/encompass/play?m=${encodeMenu(menu)}`)}>このメニューで始める</button>
            <button type="button" className={s.btn} disabled={!items.length} onClick={() => { saveMenu(menu); setSavedMsg('この端末に保存しました。'); }}>この端末に保存する</button>
          </>
        )}
      </div>
      {savedMsg && <p className={s.note} role="status">{savedMsg}</p>}
    </main>
  );
}
