'use client';

// メニューを見せる画面。タブレットを置きっぱなしにする前提。
//   おまかせ：準備 → セット → 休憩 を自動で進める（触らなくてよい）。回数で数える種目は、決めた速さで回数を数える。
//             声で「次は○○です」「1、2、3…」「休憩、30秒」と案内する（タブレットを見なくてよい）。画面が消えないようにする。
//   一覧　　：縦に並べ、画面に入った種目の動画だけ音なしで自動再生（スクロールだけで見られる）。
// 開き方：?m=（リンク・端末に保存）／?id=（お店に保存したメニュー。ログイン中なら「記録する」が出る）／&board=（ジムのタブレットから。戻り先だけに使う）
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import s from '../encompass.module.css';
import { EXERCISE_BY_ID, embedUrl, thumbUrl } from '@/lib/encompass/exercises';
import PartTag from '../PartTag';
import { CHANGE_SEC, REST_SEC, TEMPOS, secText, decodeMenu, doseText, encodeMenu, totalMinutes, workSeconds } from '@/lib/encompass/menu';
import { levelText } from '@/lib/encompass/resistance';
import { BOARD_TOKEN, api } from '@/lib/encompass/client';
import { hush, say, unlock, voiceAvailable } from '@/lib/encompass/voice';

// 声・数える速さの設定（この端末だけ。消えても既定で動く）
const PREF_KEY = 'encompass:play';
const DEFAULT_PREFS = { voice: true, count: true, tempo: 'normal' };
function loadPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return DEFAULT_PREFS; }
}
function savePrefs(p) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch {}
}
const tempoSec = key => (TEMPOS.find(t => t.key === key) || TEMPOS[1]).sec;

function buildTimeline(items, tempo) {
  const t = [];
  items.forEach((it, i) => {
    t.push({ i, kind: 'prep', sec: CHANGE_SEC });
    for (let k = 1; k <= it.sets; k++) {
      t.push({ i, kind: 'work', set: k, sec: workSeconds(it, tempo), reps: it.reps || null });
      if (k < it.sets) t.push({ i, kind: 'rest', sec: it.rest ?? REST_SEC });
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

// 動画は音なしで流す。URL の mute だけでは音が出る端末があったため、YouTube の公式の命令（mute）も何度か送る
const YT_ORIGIN = 'https://www.youtube-nocookie.com';
function muteFrame(frame) {
  try { frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), YT_ORIGIN); } catch {}
}
function Video({ yt, active, title }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => muteFrame(ref.current), 2000);
    return () => clearInterval(id);
  }, [active, yt]);
  return (
    <div className={s.frameBox}>
      {active ? (
        <iframe ref={ref} onLoad={() => { muteFrame(ref.current); setTimeout(() => muteFrame(ref.current), 800); }} src={embedUrl(yt, { autoplay: true })} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
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
          <div className={s.step}>{i + 1} / {items.length}　<PartTag part={e.part} /></div>
          <div className={s.playName}>{e.name}</div>
          <div className={s.playMeta}>{doseText(it)}・休み{secText(it.rest ?? REST_SEC)}</div>
          {it.level && <div className={s.playMeta}>{levelText(it.level)}</div>}
        </div>
      </section>
    );
  });
}

// 声で言う文（数字は読み上げに任せる）
const spokenDose = it => `${it.reps ? `${it.reps}回` : `${it.sec}秒`}を${it.sets}セット`;
const spokenLevel = lv => (lv ? (lv[0] === lv[1] ? `レベル${lv[0]}` : `レベル${lv[0]}から${lv[1]}`) : '');
// 回数はかなで言う（数字のままだと読まない・読み方がぶれる端末があるため）
const COUNT_WORDS = ['', 'いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'はち', 'きゅう', 'じゅう',
  'じゅういち', 'じゅうに', 'じゅうさん', 'じゅうよん', 'じゅうご', 'じゅうろく', 'じゅうなな', 'じゅうはち', 'じゅうきゅう', 'にじゅう'];
const countWord = n => COUNT_WORDS[n] || String(n);

// LINE の中のブラウザは読み上げが使えないことが多い。openExternalBrowser=1 を付けると LINE が外のブラウザで開く
const isLineApp = () => typeof navigator !== 'undefined' && /\bLine\//i.test(navigator.userAgent || '');
function externalUrl() {
  try {
    const u = new URL(window.location.href);
    u.searchParams.set('openExternalBrowser', '1');
    return u.href;
  } catch { return '#'; }
}

function Settings({ prefs, setPrefs }) {
  const set = patch => { const p = { ...prefs, ...patch }; setPrefs(p); savePrefs(p); };
  const [can, setCan] = useState(true);
  const [inLine, setInLine] = useState(false);
  useEffect(() => { setCan(voiceAvailable()); setInLine(isLineApp()); }, []);
  return (
    <div style={{ marginTop: 20, textAlign: 'left' }}>
      <div className={s.field}><span>声で教える</span></div>
      <div className={s.choices}>
        <button type="button" className={`${s.choice} ${prefs.voice ? s.choiceOn : ''}`} aria-pressed={prefs.voice} disabled={!can} onClick={() => set({ voice: true })}>声あり</button>
        <button type="button" className={`${s.choice} ${!prefs.voice ? s.choiceOn : ''}`} aria-pressed={!prefs.voice} onClick={() => set({ voice: false })}>声なし</button>
        {can && <button type="button" className={s.choice} onClick={() => { unlock('いち、に、さん'); }}>声をためす</button>}
      </div>
      {inLine ? (
        <div className={s.warn}>
          LINE の中で開いていると、声が出ないことがあります。
          <div style={{ marginTop: 8 }}><a href={externalUrl()} className={s.btn} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>ブラウザで開く</a></div>
        </div>
      ) : can ? <p className={s.note}>声が出ない時は、音量と、マナーモード（消音）を確かめてください。</p> : <p className={s.note}>このブラウザは声が出せません。画面だけで進みます。Chrome や Safari で開くと声が出ます。</p>}
      <div className={s.field}><span>回数を声で数える</span></div>
      <div className={s.choices}>
        <button type="button" className={`${s.choice} ${prefs.count ? s.choiceOn : ''}`} aria-pressed={prefs.count} disabled={!prefs.voice || !can} onClick={() => set({ count: true })}>数える</button>
        <button type="button" className={`${s.choice} ${!prefs.count ? s.choiceOn : ''}`} aria-pressed={!prefs.count} onClick={() => set({ count: false })}>数えない</button>
      </div>
      <div className={s.field}><span>数える速さ</span></div>
      <div className={s.choices}>
        {TEMPOS.map(t => (
          <button key={t.key} type="button" className={`${s.choice} ${prefs.tempo === t.key ? s.choiceOn : ''}`} aria-pressed={prefs.tempo === t.key} onClick={() => set({ tempo: t.key })}>{t.label}（{t.sec}秒で1回）</button>
        ))}
      </div>
    </div>
  );
}

function AutoMode({ items }) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  useEffect(() => { setPrefs(loadPrefs()); }, []);
  const tempo = tempoSec(prefs.tempo);
  const timeline = useMemo(() => buildTimeline(items, tempo), [items, tempo]);
  const [started, setStarted] = useState(false);
  const [{ pos, left }, setClock] = useState({ pos: 0, left: 0 });
  const [paused, setPaused] = useState(false);
  const done = started && pos >= timeline.length;
  useWakeLock(started && !done);
  const voiceOn = prefs.voice && voiceAvailable();

  const jumped = useRef(false); // ボタンで飛ばした時は「12。」のような最後の数を言わない
  const go = useCallback(p => {
    jumped.current = true;
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

  // 声の案内：時計が1つ進むたびに、その時に言うことがあれば言う
  const spoken = useRef('');
  useEffect(() => {
    if (!started || paused || !voiceOn) return;
    const key = `${pos}:${left}`;
    if (spoken.current === key) return;
    spoken.current = key;
    if (done) {
      const last = timeline[timeline.length - 1];
      const lastCount = prefs.count && !jumped.current && last?.kind === 'work' && last.reps ? `${countWord(last.reps)}。` : '';
      jumped.current = false;
      say(`${lastCount}おつかれさまでした。`, { interrupt: true });
      return;
    }
    const cur = timeline[pos];
    if (!cur) return;
    const it = items[cur.i];
    const e = EXERCISE_BY_ID[it.id];
    const prev = timeline[pos - 1];
    if (left === cur.sec) {
      // 区切りに入った時
      const lastCount = prefs.count && !jumped.current && prev?.kind === 'work' && prev.reps ? `${countWord(prev.reps)}。` : '';
      jumped.current = false;
      if (cur.kind === 'prep') say([lastCount + (pos === 0 ? '' : 'おつかれさまです。') + `次は、${e.name}`, spokenDose(it), spokenLevel(it.level), '準備してください'].filter(Boolean).join('。') + '。', { interrupt: true });
      else if (cur.kind === 'rest') say(`${lastCount}休み、${secText(cur.sec)}。`, { interrupt: true });
      else say(cur.reps ? `${cur.set}セット目、はじめ。` : `${cur.set}セット目、${cur.sec}秒、はじめ。`, { interrupt: true });
      return;
    }
    if (cur.kind === 'work' && cur.reps) {
      if (!prefs.count) return;
      const elapsed = cur.sec - left;
      if (elapsed > 0 && elapsed % tempo === 0) {
        const n = elapsed / tempo;
        if (n < cur.reps) say(n === cur.reps - 1 ? `${countWord(n)}、ラスト` : countWord(n), { interrupt: true });
      }
      return;
    }
    if (cur.kind === 'work' && left === 10 && cur.sec > 15) { say('あと10秒', { interrupt: true }); return; }
    if (left <= 3) say(countWord(left), { interrupt: true });
  }, [started, paused, done, pos, left, timeline, items, prefs.count, voiceOn, tempo]);

  useEffect(() => () => hush(), []);
  useEffect(() => { if (paused) hush(); }, [paused]);

  if (!started) {
    return (
      <div className={s.auto}>
        <p className={s.lead}>「はじめる」を押すと、自動で進みます。さわらなくて大丈夫です。</p>
        <button type="button" className={s.btnPrimary} style={{ minHeight: 80, fontSize: 26 }} onClick={() => { if (voiceOn) unlock(); setClock({ pos: 0, left: timeline[0]?.sec ?? 0 }); setStarted(true); }}>はじめる</button>
        <Settings prefs={prefs} setPrefs={setPrefs} />
      </div>
    );
  }

  if (done) {
    return (
      <div className={s.auto}>
        <h2 className={s.h1}>おつかれさまでした</h2>
        <div className={s.row}>
          <button type="button" className={s.btnPrimary} onClick={() => { spoken.current = ''; go(0); }}>もう一度はじめから</button>
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
  const phase = cur.kind === 'prep' ? '準備してください' : cur.kind === 'rest' ? '休み' : `${cur.set}セット目 ／ ${it.sets}セット`;
  const counting = cur.kind === 'work' && cur.reps;
  const doneReps = counting ? Math.min(cur.reps, Math.floor((cur.sec - left) / tempo)) : 0;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className={`${s.auto} ${s.autoWide}`}>
      <Video yt={e.yt} active title={e.name} />
      <div>
        <div className={s.step}>{cur.i + 1} / {items.length}　<PartTag part={e.part} /></div>
        <div className={s.playName}>{e.name}</div>
        <div className={s.playMeta}>{doseText(it)}</div>
        {it.level && <div className={s.playMeta}>{levelText(it.level)}</div>}
        <div className={`${s.phase} ${cur.kind === 'work' ? s.phaseWork : s.phaseRest}`} aria-live="polite">{phase}</div>
        {counting ? (
          <div className={s.clock}>{doneReps}<span style={{ fontSize: 32 }}> / {cur.reps}回</span></div>
        ) : (
          <div className={s.clock}>{mm}:{ss}</div>
        )}
        <div className={s.next}>{nextName ? `次は ${nextName}` : 'これが最後の種目です'}</div>
      </div>
      <div className={s.controls} style={{ gridColumn: '1 / -1' }}>
        <button type="button" className={s.btn} onClick={() => go(prevItemPos)}>前の種目へ</button>
        <button type="button" className={s.btnPrimary} onClick={() => setPaused(p => !p)}>{paused ? 'つづける' : 'とめる'}</button>
        <button type="button" className={s.btn} onClick={() => go(pos + 1)}>{cur.kind === 'work' ? 'このセットは終わり' : '次へ'}</button>
        <button type="button" className={s.btn} onClick={() => go(nextItemPos >= 0 ? nextItemPos : timeline.length)}>次の種目へ</button>
      </div>
    </div>
  );
}

function RecordBox({ menu, menuId, customerName }) {
  const [memo, setMemo] = useState('');
  const [state, setState] = useState('');
  const save = async () => {
    setState('saving');
    const r = await api('/logs', { method: 'POST', body: { menu_id: menuId, customer_ref: menu.customerRef || null, title: menu.title, items: menu.items, memo } });
    setState(r.ok ? 'done' : (r.data.error || '記録できませんでした'));
  };
  return (
    <section style={{ marginTop: 28 }}>
      <h2 className={s.h2}>今日やったことを残す{customerName ? `（${customerName} 様）` : ''}</h2>
      {state === 'done' ? <p className={s.note} role="status">残しました。お店の画面の「お客様ごと」で見られます。</p> : (
        <>
          <label className={s.field}><span>メモ（なくても大丈夫。例：レベル5は楽そう。次は6）</span><input className={`${s.input} ${s.inputWide}`} maxLength={300} value={memo} onChange={e => setMemo(e.target.value)} /></label>
          <div className={s.row}>
            <button type="button" className={s.btnPrimary} disabled={state === 'saving'} onClick={save}>{state === 'saving' ? '残しています' : '残す'}</button>
          </div>
          {state && state !== 'saving' && <p className={s.stop} role="alert">{state}</p>}
        </>
      )}
    </section>
  );
}

export default function Play() {
  const [menu, setMenu] = useState(undefined);
  const [mode, setMode] = useState('auto');
  const [src, setSrc] = useState({ kind: 'link' }); // link / store / board

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const board = p.get('board');
    const id = p.get('id');
    if (id) {
      (async () => {
        const r = await api(`/menus/${encodeURIComponent(id)}`);
        if (!r.ok) { setMenu(null); return; }
        const x = r.data.menu;
        let customerName = null;
        if (x.customer_ref) {
          const c = await api('/customers');
          customerName = c.ok ? c.data.customers.find(v => v.ref === x.customer_ref)?.name || null : null;
        }
        setSrc({ kind: 'store', id: x.id, customerName });
        setMenu({ title: x.title, items: x.items, customerRef: x.customer_ref });
      })();
      return;
    }
    if (board && BOARD_TOKEN.test(board)) setSrc({ kind: 'board', token: board });
    const m = p.get('m');
    setMenu(m ? decodeMenu(m) : null);
  }, []);

  const backHref = src.kind === 'board' ? `/encompass/board/${src.token}` : src.kind === 'store' ? '/encompass/store' : '/encompass';
  const backLabel = src.kind === 'board' ? 'メニューの一覧へ戻る' : src.kind === 'store' ? 'お店の画面へ戻る' : '最初の画面へ';

  if (menu === undefined) return <main className={s.main} />;
  if (!menu || !menu.items.length) {
    return (
      <main className={s.main}>
        <h1 className={s.h1}>メニューが開けませんでした</h1>
        <p className={s.lead}>{src.kind === 'link' ? 'リンクが途中で切れているかもしれません。' : 'ログインが切れているか、メニューが消されたかもしれません。'}</p>
        <Link href={backHref} className={s.btnPrimary} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{backLabel}</Link>
      </main>
    );
  }

  return (
    <main className={s.main}>
      {src.customerName && <p className={s.step}>{src.customerName} 様のメニュー</p>}
      <h1 className={s.h1}>{menu.title || 'メニュー'}（{menu.items.length}種目・約{totalMinutes(menu.items)}分）</h1>
      <div className={s.tabs} role="group" aria-label="見せ方">
        <button type="button" className={`${s.choice} ${mode === 'auto' ? s.choiceOn : ''}`} aria-pressed={mode === 'auto'} onClick={() => setMode('auto')} style={{ flex: 1 }}>自動で進む</button>
        <button type="button" className={`${s.choice} ${mode === 'scroll' ? s.choiceOn : ''}`} aria-pressed={mode === 'scroll'} onClick={() => setMode('scroll')} style={{ flex: 1 }}>全部を見る</button>
      </div>
      {mode === 'auto' ? <AutoMode items={menu.items} /> : <ScrollMode items={menu.items} />}
      {src.kind === 'store' && <RecordBox menu={menu} menuId={src.id} customerName={src.customerName} />}
      <div className={s.row} style={{ marginTop: 24 }}>
        <Link href={backHref} className={s.btnGhost} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{backLabel}</Link>
        {src.kind === 'store' && <Link href={`/encompass/builder?id=${src.id}`} className={s.btnGhost} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>メニューを直す</Link>}
        {src.kind === 'link' && <Link href={`/encompass/builder?m=${encodeMenu(menu)}`} className={s.btnGhost} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>メニューを直す</Link>}
      </div>
      <p className={s.safety}>胸が痛い・めまい・息が苦しい時は、すぐにやめてください。レベルは目安です。</p>
    </main>
  );
}
