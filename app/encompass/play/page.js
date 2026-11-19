'use client';

// メニューを見せる画面。タブレットを置きっぱなしにする前提。
//   おまかせ：タイマーで次の種目へ自動で進む（触らなくてよい）。画面が消えないようにする。
//   一覧　　：縦に並べ、画面に入った種目の動画だけ音なしで自動再生（スクロールだけで見られる）。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import s from '../encompass.module.css';
import { EXERCISE_BY_ID, PART_LABEL, embedUrl, thumbUrl } from '@/lib/encompass/exercises';
import { CHANGE_SEC, REST_SEC, decodeMenu, encodeMenu, totalMinutes } from '@/lib/encompass/menu';
import { levelText } from '@/lib/encompass/resistance';

function buildTimeline(items) {
  const t = [];
  items.forEach((it, i) => {
    t.push({ i, kind: 'prep', sec: CHANGE_SEC });
    for (let k = 1; k <= it.sets; k++) {
      t.push({ i, kind: 'work', set: k, sec: it.sec });
      if (k < it.sets) t.push({ i, kind: 'rest', sec: REST_SEC });
    }
  });
  return t;
}

function useWakeLock(on) {
  useEffect(() => {
    if (!on || typeof navigator === 'undefined' || !navigator.wakeLock) return undefined;
    let lock = null;
    let alive = true;
    const req = async () => {
      try { lock = await navigator.wakeLock.request('screen'); } catch { lock = null; }
    };
    const onVis = () => { if (alive && document.visibilityState === 'visible') req(); };
    req();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      try { lock?.release(); } catch {}
    };
  }, [on]);
}

function Video({ yt, active, title }) {
  return (
    <div className={s.frameBox}>
      {active ? (
        <iframe src={embedUrl(yt, { autoplay: true })} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbUrl(yt)} alt="" loading="lazy" />
      )}
    </div>
  );
}

function ScrollMode({ items }) {
  const [visible, setVisible] = useState(-1);
  const refs = useRef([]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const idx = Number(en.target.dataset.idx);
        if (en.isIntersecting && en.intersectionRatio >= 0.6) setVisible(idx);
      });
    }, { threshold: [0.6] });
    refs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [items]);

  return items.map((it, i) => {
    const e = EXERCISE_BY_ID[it.id];
    return (
      <section key={`${it.id}-${i}`} className={s.playCard} data-idx={i} ref={el => { refs.current[i] = el; }}>
        <Video yt={e.yt} active={visible === i} title={e.name} />
        <div className={s.playBody}>
          <div className={s.step}>{i + 1} / {items.length}・{PART_LABEL[e.part]}</div>
          <div className={s.playName}>{e.name}</div>
          <div className={s.playMeta}>{it.sets}セット × {it.sec}秒（間の休憩{REST_SEC}秒）</div>
          {it.level && <div className={s.playMeta}>{levelText(it.level)}</div>}
        </div>
      </section>
    );
  });
}

function AutoMode({ items }) {
  const timeline = useMemo(() => buildTimeline(items), [items]);
  const [started, setStarted] = useState(false);
  const [{ pos, left }, setClock] = useState({ pos: 0, left: timeline[0]?.sec ?? 0 });
  const [paused, setPaused] = useState(false);
  const done = pos >= timeline.length;
  useWakeLock(started && !done);

  const go = useCallback(p => {
    const q = Math.max(0, Math.min(p, timeline.length));
    setClock({ pos: q, left: timeline[q]?.sec ?? 0 });
  }, [timeline]);

  useEffect(() => {
    if (!started || paused || done) return undefined;
    const id = setInterval(() => {
      setClock(c => (c.left > 1 ? { pos: c.pos, left: c.left - 1 } : { pos: c.pos + 1, left: timeline[c.pos + 1]?.sec ?? 0 }));
    }, 1000);
    return () => clearInterval(id);
  }, [started, paused, done, timeline]);

  if (!started) {
    return (
      <div className={s.auto}>
        <p className={s.lead}>「始める」を押すと、準備{CHANGE_SEC}秒 → セット → 休憩 の順に自動で進みます。途中で触らなくてかまいません。</p>
        <button type="button" className={s.btnPrimary} style={{ minHeight: 80, fontSize: 26 }} onClick={() => setStarted(true)}>始める</button>
      </div>
    );
  }

  if (done) {
    return (
      <div className={s.auto}>
        <h2 className={s.h1}>おつかれさまでした</h2>
        <div className={s.row}>
          <button type="button" className={s.btnPrimary} onClick={() => go(0)}>もう一度はじめから</button>
        </div>
      </div>
    );
  }

  const cur = timeline[pos];
  const it = items[cur.i];
  const e = EXERCISE_BY_ID[it.id];
  const nextItemPos = timeline.findIndex((x, k) => k > pos && x.i !== cur.i);
  const prevItemPos = timeline.findIndex(x => x.i === Math.max(cur.i - (cur.kind === 'prep' ? 1 : 0), 0));
  const nextName = nextItemPos >= 0 ? EXERCISE_BY_ID[items[timeline[nextItemPos].i].id].name : null;
  const phase = cur.kind === 'prep' ? '準備してください' : cur.kind === 'rest' ? '休憩' : `${cur.set}セット目（全${it.sets}セット）`;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className={`${s.auto} ${s.autoWide}`}>
      <Video yt={e.yt} active title={e.name} />
      <div>
        <div className={s.step}>{cur.i + 1} / {items.length}・{PART_LABEL[e.part]}</div>
        <div className={s.playName}>{e.name}</div>
        {it.level && <div className={s.playMeta}>{levelText(it.level)}</div>}
        <div className={`${s.phase} ${cur.kind === 'work' ? s.phaseWork : s.phaseRest}`} aria-live="polite">{phase}</div>
        <div className={s.clock}>{mm}:{ss}</div>
        <div className={s.next}>{nextName ? `次は ${nextName}` : 'これが最後の種目です'}</div>
      </div>
      <div className={s.controls} style={{ gridColumn: '1 / -1' }}>
        <button type="button" className={s.btn} onClick={() => go(prevItemPos)}>前の種目</button>
        <button type="button" className={s.btnPrimary} onClick={() => setPaused(p => !p)}>{paused ? '再開する' : '一時停止'}</button>
        <button type="button" className={s.btn} onClick={() => go(nextItemPos >= 0 ? nextItemPos : timeline.length)}>次の種目</button>
      </div>
    </div>
  );
}

export default function Play() {
  const [menu, setMenu] = useState(undefined);
  const [mode, setMode] = useState('auto');

  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get('m');
    setMenu(m ? decodeMenu(m) : null);
  }, []);

  if (menu === undefined) return <main className={s.main} />;
  if (!menu || !menu.items.length) {
    return (
      <main className={s.main}>
        <h1 className={s.h1}>メニューが開けませんでした</h1>
        <p className={s.lead}>リンクが途中で切れているかもしれません。</p>
        <Link href="/encompass" className={s.btnPrimary} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>最初の画面へ</Link>
      </main>
    );
  }

  return (
    <main className={s.main}>
      <h1 className={s.h1}>{menu.title || 'メニュー'}（{menu.items.length}種目・約{totalMinutes(menu.items)}分）</h1>
      <div className={s.tabs} role="group" aria-label="見せ方">
        <button type="button" className={`${s.choice} ${mode === 'auto' ? s.choiceOn : ''}`} aria-pressed={mode === 'auto'} onClick={() => setMode('auto')} style={{ flex: 1 }}>おまかせで進む</button>
        <button type="button" className={`${s.choice} ${mode === 'scroll' ? s.choiceOn : ''}`} aria-pressed={mode === 'scroll'} onClick={() => setMode('scroll')} style={{ flex: 1 }}>一覧で見る</button>
      </div>
      {mode === 'auto' ? <AutoMode items={menu.items} /> : <ScrollMode items={menu.items} />}
      <div className={s.row} style={{ marginTop: 24 }}>
        <Link href={`/encompass/builder?m=${encodeMenu(menu)}`} className={s.btnGhost} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>メニューを直す</Link>
      </div>
      <p className={s.safety}>胸の痛み・めまい・息切れなどが出たら、すぐに止めてください。レベルと負荷は目安です。</p>
    </main>
  );
}
