'use client';

// 種目を選んでメニューを作る。押すだけで並ぶ（ドラッグ・スワイプは使わない）。
// ?m= でメニューを受け取ると、その続きから直せる（条件からの提案・保存したメニューから来る）。
// お店のメニュー：?id=（お店に保存したメニューを直す）・?store=1（お店に新しく保存する）・&customer=（そのお客様用）。
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import s from '../encompass.module.css';
import { EXERCISES, EXERCISE_BY_ID, PARTS, PART_LABEL, thumbUrl, watchUrl } from '@/lib/encompass/exercises';
import { DEFAULT_ITEM, LIMITS, REST_SEC, autoTitle, secText, decodeMenu, encodeMenu, newItem, saveMenu, totalMinutes } from '@/lib/encompass/menu';
import { levelText } from '@/lib/encompass/resistance';
import { api } from '@/lib/encompass/client';

export default function Builder() {
  const router = useRouter();
  const [part, setPart] = useState(PARTS[0].key);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([]);
  const [savedMsg, setSavedMsg] = useState('');
  // このタブレットに保存した時の印。直して保存し直した時は、前のものと入れ替える（2つにしない。2026-11-20 実機で増えた）
  const [savedKey, setSavedKey] = useState(null);
  // お店のメニューとして作る・直す時
  const [store, setStore] = useState(null); // null=この端末だけ / { id, customerRef, customerName, onBoard }
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const m = p.get('m');
    const menu = m ? decodeMenu(m) : null;
    if (menu) { setTitle(menu.title); setItems(menu.items); }
    if (menu && p.get('from') === 'saved') setSavedKey(m);
    const id = p.get('id');
    const customerRef = p.get('customer');
    if (!id && p.get('store') !== '1') {
      // お店の方がログインしている時は、どこから来てもお店に保存する（保存先が2つあると、名前を直したのにお店に出ない等で迷うため。2026-11-20 実機）
      if (p.get('from') === 'saved') return;
      api('/me').then(me => { if (me.ok) setStore(cur => cur || { id: null, customerRef: null, customerName: null, onBoard: false }); });
      return;
    }
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
    const body = { title: title.trim() || autoTitle(items), items, on_board: !store.customerRef && store.onBoard, customer_ref: store.customerRef || null };
    const r = store.id
      ? await api(`/menus/${store.id}`, { method: 'PATCH', body })
      : await api('/menus', { method: 'POST', body });
    setBusy(false);
    if (!r.ok) { setSavedMsg(r.data.error || '保存できませんでした'); return; }
    // 新しく作った時は、この画面のURLを「そのメニューを直す」に替えておく（戻るで戻って保存し直しても、2つに増えない）
    if (!store.id && r.data.menu?.id) {
      setStore({ ...store, id: r.data.menu.id });
      try { window.history.replaceState(null, '', `/encompass/builder?id=${r.data.menu.id}`); } catch {}
    }
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

  const menu = { title: title.trim() || autoTitle(items), items };
  const saveHere = () => {
    const key = saveMenu(menu, savedKey);
    setSavedKey(key);
    setSavedMsg(savedKey ? '保存しなおしました。' : 'このタブレットに保存しました。');
  };

  return (
    <main className={s.main}>
      <h1 className={s.h1}>{store?.id ? 'メニューを直す' : 'メニューを作る'}</h1>
      {store?.customerName && <p className={s.warn}>{store.customerName} 様のメニューです。</p>}
      {loadErr && <p className={s.stop} role="alert">{loadErr}</p>}
      <p className={s.lead}>きたえる場所を選んで、「入れる」を押してください。下に順番に並びます。</p>

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
              {count(e.id) > 0 && <div className={s.cardMeta}>{count(e.id)}回 入っています</div>}
              <div className={s.row} style={{ marginTop: 'auto' }}>
                <button type="button" className={`${s.btnPrimary} ${s.small}`} onClick={() => add(e.id)} disabled={items.length >= LIMITS.items}>入れる</button>
                <a className={`${s.btnGhost} ${s.small}`} href={watchUrl(e.yt)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>動画を見る</a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <h2 className={s.h2}>今のメニュー（{items.length}種目・約{totalMinutes(items)}分）</h2>
      <label className={s.field}>
        <span>メニューの名前</span>
        <input className={`${s.input} ${s.inputWide}`} value={title} maxLength={LIMITS.title} placeholder={items.length ? autoTitle(items) : '例：30分 脚とお腹'} onChange={e => setTitle(e.target.value)} />
      </label>

      {items.length === 0 ? (
        <p className={s.note}>まだ何も入っていません。上の「入れる」を押してください。</p>
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
                    <span style={{ minWidth: 150 }}>セット数　{it.sets}</span>
                    <button type="button" className={`${s.btn} ${s.small}`} aria-label="セットを減らす" onClick={() => change(i, 'sets', -1, LIMITS.sets)}>－</button>
                    <button type="button" className={`${s.btn} ${s.small}`} aria-label="セットを増やす" onClick={() => change(i, 'sets', 1, LIMITS.sets)}>＋</button>
                  </div>
                  {it.reps ? (
                    <div className={s.row} style={{ marginTop: 8 }}>
                      <span style={{ minWidth: 150 }}>回数　{it.reps}回</span>
                      <button type="button" className={`${s.btn} ${s.small}`} aria-label="回数を減らす" onClick={() => change(i, 'reps', -1, LIMITS.reps)}>－</button>
                      <button type="button" className={`${s.btn} ${s.small}`} aria-label="回数を増やす" onClick={() => change(i, 'reps', 1, LIMITS.reps)}>＋</button>
                    </div>
                  ) : (
                    <div className={s.row} style={{ marginTop: 8 }}>
                      <span style={{ minWidth: 150 }}>時間　{it.sec}秒</span>
                      <button type="button" className={`${s.btn} ${s.small}`} aria-label="5秒へらす" onClick={() => change(i, 'sec', -5, LIMITS.sec)}>－</button>
                      <button type="button" className={`${s.btn} ${s.small}`} aria-label="5秒ふやす" onClick={() => change(i, 'sec', 5, LIMITS.sec)}>＋</button>
                    </div>
                  )}
                  <div className={s.row} style={{ marginTop: 8 }}>
                    <span style={{ minWidth: 150 }}>休み　{secText(it.rest ?? REST_SEC)}</span>
                    <button type="button" className={`${s.btn} ${s.small}`} aria-label="休みを10秒へらす" onClick={() => change(i, 'rest', -10, LIMITS.rest)}>－</button>
                    <button type="button" className={`${s.btn} ${s.small}`} aria-label="休みを10秒ふやす" onClick={() => change(i, 'rest', 10, LIMITS.rest)}>＋</button>
                  </div>
                  <div className={s.row} style={{ marginTop: 8 }}>
                    <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => switchMode(i)}>{it.reps ? '回数ではなく時間で数える' : '時間ではなく回数で数える'}</button>
                  </div>
                  <div className={s.row} style={{ marginTop: 8 }}>
                    <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => move(i, -1)} disabled={i === 0}>上へ</button>
                    <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => move(i, 1)} disabled={i === items.length - 1}>下へ</button>
                    <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => remove(i)}>消す</button>
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
            <button type="button" className={s.btnPrimary} disabled={!items.length || busy} onClick={saveToStore}>{busy ? '保存しています' : 'お店に保存'}</button>
            <button type="button" className={s.btn} disabled={!items.length} onClick={() => router.push(`/encompass/play?m=${encodeMenu(menu)}`)}>ためしにやってみる</button>
            <button type="button" className={s.btnGhost} onClick={() => router.push('/encompass/store')}>やめる</button>
          </>
        ) : (
          <>
            <button type="button" className={s.btnPrimary} disabled={!items.length} onClick={() => router.push(`/encompass/play?m=${encodeMenu(menu)}`)}>はじめる</button>
            <button type="button" className={s.btn} disabled={!items.length} onClick={saveHere}>{savedKey ? '保存しなおす' : 'このタブレットに保存'}</button>
          </>
        )}
      </div>
      {savedMsg && <p className={s.note} role="status">{savedMsg}</p>}
    </main>
  );
}
