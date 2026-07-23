'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

const T = {
  body:        { icon:'💪', label:'体型',  x:180, y:95,  r:52, c:'#1c3826', desc:'筋トレ・食事・体型管理' },
  eyebrow:     { icon:'✂️', label:'眉',    x:74,  y:194, r:35, c:'#2c1e0e', desc:'眉の形・清潔感の基盤' },
  fashion:     { icon:'👔', label:'服',    x:286, y:194, r:41, c:'#1c1636', desc:'サイズ感・服の選び方' },
  hair:        { icon:'💇', label:'髪',    x:60,  y:318, r:38, c:'#0e2030', desc:'ヘアスタイル・質感' },
  skin:        { icon:'✨', label:'肌',    x:282, y:318, r:30, c:'#2c1c0e', desc:'スキンケア・清潔感' },
  hairremoval: { icon:'🪒', label:'脱毛',  x:334, y:360, r:24, c:'#0e1c2c', desc:'脱毛・ムダ毛ケア' },
  teeth:       { icon:'🦷', label:'歯',    x:140, y:408, r:33, c:'#1c2236', desc:'歯並び・ホワイトニング' },
  nail:        { icon:'💅', label:'爪',    x:248, y:408, r:28, c:'#2c0e1c', desc:'ネイルケア・指先' },
};

const AXIS_TOTALS = { body:12, eyebrow:8, fashion:10, hair:10, skin:8, hairremoval:7, teeth:6, nail:6 };

// Mirror（AI写真分析）が対応する軸のみ「AIが確認した変化」を反映できる。
// hairremoval/teeth/nailはMirrorの分析軸に存在しないため常に自己申告のみ扱い。
const MIRROR_COMMON_AXES = new Set(['eyebrow', 'body', 'fashion', 'hair', 'skin']);

const MAP_PATHS = [
  'M 180,95 Q 115,148 74,194',
  'M 180,95 Q 245,148 286,194',
  'M 74,194 Q 62,256 60,318',
  'M 286,194 Q 294,256 282,318',
  'M 282,318 Q 310,340 334,360',
  'M 60,318 Q 90,374 140,408',
  'M 282,318 Q 272,374 248,408',
  'M 140,408 Q 194,424 248,408',
];

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getAuth() {
  try {
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (!sbKey) return { token: null, uid: null };
    const obj = JSON.parse(localStorage.getItem(sbKey) || 'null');
    return { token: obj?.access_token || null, uid: obj?.user?.id || null };
  } catch { return { token: null, uid: null }; }
}

function FbStarRow({ label, onChange }) {
  const [val, setVal] = useState(0);
  const [hover, setHover] = useState(0);
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:10}}>
      <span style={{fontSize:13,color:'rgba(232,228,220,.75)',minWidth:100}}>{label}</span>
      <div style={{display:'flex',gap:4}}>
        {[1,2,3,4,5].map(n => (
          <button key={n}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:n<=(hover||val)?'#c9a84c':'rgba(255,255,255,.2)',padding:2,transition:'color .15s'}}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => { setVal(n); onChange(n); }}
          >★</button>
        ))}
      </div>
    </div>
  );
}

export default function MapPage() {
  const [prog, setProg]       = useState({});
  const [compass, setCompass] = useState('body');
  const [selected, setSel]    = useState(null);
  const [fbDone, setFbDone]   = useState(false);
  const [fbSent, setFbSent]   = useState(false);
  const fbRatings = useRef({ accuracy: 0, usability: 0, revisit: 0 });

  // ── フェーズ1: 月次スナップショット ──
  const [snapshots, setSnapshots] = useState([]); // navi_snapshots（新しい順）
  const [viewMonth, setViewMonth] = useState('now'); // 'now' | 'YYYY-MM'
  // ── フェーズ2: Mirrorで確認された変化 ──
  const [mirrorComp, setMirrorComp] = useState(null);

  useEffect(() => {
    let axisProg = {};
    let stepDone = {};
    try { axisProg = JSON.parse(localStorage.getItem('fineme:axis:progress') || '{}'); } catch {}
    try { stepDone = JSON.parse(localStorage.getItem('fineme:step:done') || '{}'); } catch {}

    const computeProg = (ap, sd) => {
      const p = {};
      for (const id of Object.keys(T)) {
        const doneCount = Object.keys(sd).filter(k => k.startsWith(id + ':') && sd[k]).length;
        const total     = AXIS_TOTALS[id] ?? 10;
        const pct       = Math.min(100, Math.round(doneCount / total * 100));
        p[id] = { done: doneCount, total, pct, isDone: ap[id] === 'done' };
      }
      return p;
    };

    const computeCompass = (p) => {
      try {
        const override = localStorage.getItem('fineme:compass:override');
        if (override && T[override]) return override;
        const diagRaw = localStorage.getItem('fineme:diagnosis:latest');
        const diag = diagRaw ? JSON.parse(diagRaw) : null;
        // フェーズ4: 診断結果（Fineme Compass）の最優先軸をMapの現在地にも使う。
        // Mapだけが「進捗がある未完了の最初の軸」という別ロジックで現在地を決めるのを避ける。
        if (diag?.compass_first && T[diag.compass_first]) return diag.compass_first;
      } catch {}
      return Object.keys(T).find(id => (p[id]?.done ?? 0) > 0 && !p[id]?.isDone) ?? 'body';
    };

    // 初期表示（localStorageのみ・体感速度優先）
    const initialProg = computeProg(axisProg, stepDone);
    setProg(initialProg);
    setCompass(computeCompass(initialProg));
    setFbDone(!!localStorage.getItem('fineme:feedback:map'));

    // フェーズ3: サーバー側の進捗・フェーズ1の月次スナップショット・フェーズ2のMirror変化を取得
    const { token } = getAuth();
    if (!token) return;

    Promise.all([
      fetch('/api/me/profile', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/me/navi-snapshots', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/me/mirror-comparison', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([profileData, snapData, mirrorData]) => {
      // フェーズ3: サーバーに進捗があればlocalStorageより優先し、端末間で同期させる
      let nextAxisProg = axisProg, nextStepDone = stepDone, changed = false;
      if (profileData?.axis_progress && Object.keys(profileData.axis_progress).length > 0) {
        nextAxisProg = profileData.axis_progress;
        changed = true;
        try { localStorage.setItem('fineme:axis:progress', JSON.stringify(nextAxisProg)); } catch {}
      }
      if (profileData?.step_done && Object.keys(profileData.step_done).length > 0) {
        nextStepDone = { ...stepDone, ...profileData.step_done };
        changed = true;
        try { localStorage.setItem('fineme:step:done', JSON.stringify(nextStepDone)); } catch {}
      }
      if (changed) {
        const p2 = computeProg(nextAxisProg, nextStepDone);
        setProg(p2);
        setCompass(computeCompass(p2));
      }

      if (snapData?.snapshots?.length > 0) setSnapshots(snapData.snapshots);
      if (mirrorData?.has_comparison) setMirrorComp(mirrorData);
    }).catch(() => {});
  }, []);

  // 選択中の月の進捗を返す（'now' = リアルタイム、過去月 = スナップショットのdone/not doneのみ）
  const progForView = (() => {
    if (viewMonth === 'now') return prog;
    const snap = snapshots.find(s => s.year_month === viewMonth);
    if (!snap) return prog;
    const ap = snap.axis_progress || {};
    const p = {};
    for (const id of Object.keys(T)) {
      const isDone = ap[id] === 'done';
      p[id] = { done: isDone ? 1 : 0, total: 1, pct: isDone ? 100 : 0, isDone };
    }
    return p;
  })();

  const mirrorStatusFor = (id) => {
    if (viewMonth !== 'now' || !mirrorComp || !MIRROR_COMMON_AXES.has(id)) return null;
    const c = mirrorComp.changes?.find(ch => ch.id === id);
    return c ? c.direction : null; // 'improved' | 'stable' | null
  };

  const fogOf = id => {
    const p = progForView[id];
    if (!p || p.done === 0) return 'full';
    if (p.isDone) return 'clear';
    return 'partial';
  };

  const selData = selected ? { id: selected, ...T[selected], ...(progForView[selected] ?? {}) } : null;
  const selMirrorStatus = selected ? mirrorStatusFor(selected) : null;

  // 直近スナップショット（今月と異なる年月のうち最新）を「先月」として1つだけ表示
  const cym = currentYearMonth();
  const prevSnapshot = snapshots.find(s => s.year_month !== cym);
  const monthLabel = (ym) => {
    const m = parseInt((ym || '').split('-')[1] || '0', 10);
    return m ? `${m}月` : ym;
  };

  // Phase 1-A: 過去スナップショットのstep_outcomesから「分かってきたこと」を軸ごとに集計
  const confirmedByAxis = {};
  for (const snap of snapshots) {
    for (const o of snap.step_outcomes || []) {
      if (o.done && o.mirror_change === true && T[o.axis]) {
        confirmedByAxis[o.axis] = (confirmedByAxis[o.axis] || 0) + 1;
      }
    }
  }
  const confirmedAxisIds = Object.keys(confirmedByAxis).sort((a, b) => confirmedByAxis[b] - confirmedByAxis[a]);

  const improvedCount = mirrorComp?.improved_count ?? 0;
  const summary = viewMonth === 'now' && mirrorComp
    ? (improvedCount > 0
        ? { icon: '✨', text: `${mirrorComp.prev_month}から${mirrorComp.new_month}にかけて、Mirrorが ${improvedCount} 軸で変化を確認しました。` }
        : { icon: '🧭', text: `${mirrorComp.prev_month}から変化はまだ確認できていません。行動は積み上がっています。` })
    : null;

  return (
    <>
      <style>{`
        .map-pg { min-height:100vh; background:linear-gradient(180deg,#05091a 0%,#080d1e 100%); color:rgba(232,228,220,.9); font-family:sans-serif; padding-bottom:120px; }
        .tg { cursor:pointer; -webkit-tap-highlight-color:transparent; }
        .fog-full    { filter:blur(6px) grayscale(1); opacity:.18; transition:filter 1.4s,opacity 1.4s; }
        .fog-partial { filter:blur(1.5px) grayscale(.5); opacity:.58; transition:filter 1.4s,opacity 1.4s; }
        .fog-clear   { filter:none; opacity:1; transition:filter 1.4s,opacity 1.4s; }
        .tg:hover .fog-full    { filter:blur(3px) grayscale(.8); opacity:.36; }
        .tg:hover .fog-partial { filter:none; opacity:.9; }
        .cpulse { animation:cp 2.5s ease-in-out infinite; }
        @keyframes cp { 0%,100%{opacity:.14} 55%{opacity:.38} }
        .dp { margin:12px 16px; background:rgba(6,10,26,.94); border:1px solid rgba(201,168,76,.28); border-radius:18px; padding:18px; animation:su .22s ease; }
        @keyframes su { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }
        .dp-cta { display:block; text-align:center; padding:11px; background:rgba(201,168,76,.09); border:1px solid rgba(201,168,76,.32); border-radius:99px; color:#c9a84c; text-decoration:none; font-size:13px; font-weight:700; margin-top:14px; transition:background .15s; }
        .dp-cta:hover { background:rgba(201,168,76,.18); }
        .mtoggle { display:inline-flex; background:rgba(255,255,255,0.04); border:1px solid rgba(201,168,76,.2); border-radius:99px; padding:3px; }
        .mtoggle button { font-family:inherit; font-size:11.5px; font-weight:700; padding:7px 16px; border-radius:99px; border:none; background:transparent; color:rgba(232,228,220,.45); cursor:pointer; transition:all .2s; }
        .mtoggle button.active { background:rgba(201,168,76,.16); color:#e3c26e; }
        .mpill { font-size:10.5px; font-weight:700; padding:3px 10px; border-radius:99px; border:1px solid rgba(52,211,153,.4); color:#34d399; background:rgba(52,211,153,.08); display:inline-block; }
        .mpill.stable { border-color:rgba(201,168,76,.35); color:#e3c26e; background:rgba(201,168,76,.06); }
      `}</style>

      <div className="map-pg">
        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'22px 20px 4px'}}>
          <div>
            <div style={{fontSize:9,fontWeight:800,letterSpacing:'.16em',color:'rgba(201,168,76,.5)',textTransform:'uppercase',marginBottom:2}}>New Me</div>
            <div style={{fontSize:26,fontWeight:900,letterSpacing:'.02em',lineHeight:1}}>Map</div>
            <div style={{fontSize:11,color:'rgba(232,228,220,.3)',marginTop:4}}>
              {viewMonth === 'now' ? '7つの領域を同時に探索する' : `${monthLabel(viewMonth)}時点の記録`}
            </div>
          </div>
          <Link href="/mypage/navi" style={{fontSize:12,color:'rgba(201,168,76,.7)',textDecoration:'none',border:'1px solid rgba(201,168,76,.22)',padding:'7px 14px',borderRadius:99,marginTop:6,display:'inline-block',whiteSpace:'nowrap'}}>Navi →</Link>
        </div>

        {/* フェーズ1: 月次トグル（過去のスナップショットがある時だけ表示） */}
        {prevSnapshot && (
          <div style={{display:'flex',justifyContent:'center',padding:'14px 18px 0'}}>
            <div className="mtoggle">
              <button className={viewMonth === prevSnapshot.year_month ? 'active' : ''} onClick={() => { setViewMonth(prevSnapshot.year_month); setSel(null); }}>
                {monthLabel(prevSnapshot.year_month)}の地図
              </button>
              <button className={viewMonth === 'now' ? 'active' : ''} onClick={() => { setViewMonth('now'); setSel(null); }}>
                {monthLabel(cym)}の地図（今）
              </button>
            </div>
          </div>
        )}

        {/* フェーズ2: Mirrorで確認された変化のサマリー */}
        {summary && (
          <div style={{margin:'14px 16px 0',background: improvedCount > 0 ? 'rgba(52,211,153,0.06)' : 'rgba(201,168,76,0.05)', border: `1px solid ${improvedCount > 0 ? 'rgba(52,211,153,0.24)' : 'rgba(201,168,76,.18)'}`, borderRadius:14, padding:'13px 16px', display:'flex', alignItems:'center', gap:11}}>
            <span style={{fontSize:20}}>{summary.icon}</span>
            <span style={{fontSize:12.5,color:'rgba(232,228,220,.85)',lineHeight:1.55}}>{summary.text}</span>
          </div>
        )}

        {/* Phase 1-A: あなたについて分かってきたこと（旅の記録） */}
        {viewMonth === 'now' && confirmedAxisIds.length > 0 && (
          <div style={{margin:'10px 16px 0',background:'rgba(100,160,255,0.05)',border:'1px solid rgba(100,160,255,0.18)',borderRadius:14,padding:'13px 16px'}}>
            <div style={{fontSize:11,fontWeight:800,color:'rgba(100,160,255,0.85)',marginBottom:8}}>🪞 あなたについて分かってきたこと</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {confirmedAxisIds.map(id => (
                <span key={id} style={{fontSize:11.5,color:'rgba(232,228,220,.75)',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:99,padding:'4px 10px'}}>
                  {T[id]?.icon} {T[id]?.label} — {confirmedByAxis[id]}件の変化を確認
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Map SVG */}
        <div style={{display:'flex',justifyContent:'center',padding:'0 10px'}}>
          <svg viewBox="0 0 360 490" style={{width:'100%',maxWidth:420,display:'block',overflow:'visible'}}>
            <defs>
              {Object.entries(T).map(([id, t]) => (
                <radialGradient key={id} id={`gmap-${id}`}
                  cx={t.x} cy={t.y} r={t.r * 1.6}
                  gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={t.c}/>
                  <stop offset="100%" stopColor="#050810"/>
                </radialGradient>
              ))}
            </defs>

            {/* Grid lines */}
            {[60,120,180,240,300].map(x =>
              <line key={`vg${x}`} x1={x} y1="0" x2={x} y2="490" stroke="rgba(255,255,255,.022)" strokeWidth="1"/>
            )}
            {[80,160,240,320,400].map(y =>
              <line key={`hg${y}`} x1="0" y1={y} x2="360" y2={y} stroke="rgba(255,255,255,.022)" strokeWidth="1"/>
            )}

            {/* Decorative map paths */}
            {MAP_PATHS.map((d,i) =>
              <path key={i} d={d} fill="none" stroke="rgba(232,228,220,.065)" strokeWidth="1.2" strokeDasharray="4 6"/>
            )}

            {/* Territories */}
            {Object.entries(T).map(([id, t]) => {
              const fog  = fogOf(id);
              const isC  = id === compass;
              const isSel = id === selected;
              const p    = progForView[id] ?? {};
              const pct  = p.isDone ? 100 : (p.pct ?? 0);
              const arcR = t.r + 9;
              const circ = +(2 * Math.PI * arcR).toFixed(2);
              const offset = +(circ * (1 - pct / 100)).toFixed(2);
              const mStatus = mirrorStatusFor(id);
              const arcColor = mStatus === 'improved' ? '#34d399' : (isC ? '#c9a84c' : 'rgba(96,165,250,.6)');

              return (
                <g key={id} className="tg" onClick={() => setSel(isSel ? null : id)}>

                  {/* Compass pulse ring */}
                  {isC && <>
                    <circle cx={t.x} cy={t.y} r={t.r + 26} className="cpulse" fill="rgba(201,168,76,.06)"/>
                    <circle cx={t.x} cy={t.y} r={t.r + 15} fill="none" stroke="rgba(201,168,76,.2)" strokeWidth="1.5" strokeDasharray="3 3"/>
                  </>}

                  {/* Island blobs (organic shape via 3 stacked circles) */}
                  <g className={`fog-${fog}`}>
                    <circle cx={t.x + t.r * .20} cy={t.y - t.r * .24} r={t.r * .44} fill={`url(#gmap-${id})`}/>
                    <circle cx={t.x - t.r * .28} cy={t.y + t.r * .18} r={t.r * .38} fill={`url(#gmap-${id})`}/>
                    <circle cx={t.x} cy={t.y} r={t.r}
                      fill={`url(#gmap-${id})`}
                      stroke={isC ? 'rgba(201,168,76,.6)' : isSel ? 'rgba(232,228,220,.42)' : 'rgba(232,228,220,.09)'}
                      strokeWidth={isC ? 2 : 1.5}/>
                    {/* Interior highlight */}
                    <ellipse cx={t.x - t.r*.16} cy={t.y - t.r*.2} rx={t.r*.42} ry={t.r*.3} fill="rgba(255,255,255,.05)"/>
                    {/* Icon */}
                    <text x={t.x} y={t.y + t.r * .16}
                      textAnchor="middle"
                      fontSize={t.r > 46 ? 26 : t.r > 34 ? 20 : 15}
                      style={{userSelect:'none'}}>
                      {t.icon}
                    </text>
                  </g>

                  {/* Progress arc */}
                  {pct > 0 && (
                    <circle cx={t.x} cy={t.y} r={arcR} fill="none"
                      stroke={arcColor}
                      strokeWidth="2.5" strokeLinecap="round"
                      strokeDasharray={circ} strokeDashoffset={offset}
                      transform={`rotate(-90,${t.x},${t.y})`}/>
                  )}

                  {/* Territory name */}
                  <text x={t.x} y={t.y + t.r + 18}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight={isC ? '900' : '700'}
                    fill={isC ? '#c9a84c' : fog === 'full' ? 'rgba(232,228,220,.25)' : 'rgba(232,228,220,.82)'}>
                    {t.label}
                  </text>

                  {/* Compass badge */}
                  {isC && (
                    <text x={t.x} y={t.y - t.r - 10}
                      textAnchor="middle" fontSize="9"
                      fill="rgba(201,168,76,.78)">
                      🧭 今ここ
                    </text>
                  )}

                  {/* Done check mark: Mirror確認済みは明るい緑、自己申告のみは控えめな緑 */}
                  {(p.isDone || mStatus === 'improved') && (
                    <text x={t.x + t.r * .58} y={t.y - t.r * .5}
                      fontSize="13" fill={mStatus === 'improved' ? 'rgba(52,211,153,.95)' : 'rgba(52,211,153,.55)'}>✓</text>
                  )}

                  {/* Transparent hit target */}
                  <circle cx={t.x} cy={t.y} r={t.r + 22} fill="transparent"/>
                </g>
              );
            })}

            {/* Compass rose */}
            <g transform="translate(326,456)">
              <circle r="14" fill="rgba(5,8,22,.95)" stroke="rgba(201,168,76,.25)" strokeWidth="1"/>
              <text x="0" y="5" textAnchor="middle" fontSize="12" fill="rgba(201,168,76,.5)">✦</text>
            </g>

            {/* Watermark */}
            <text x="18" y="482" fontSize="7.5" fill="rgba(255,255,255,.04)" fontWeight="700" letterSpacing=".1em">NEW ME MAP</text>
          </svg>
        </div>

        {/* Feedback widget */}
        {!fbDone && !fbSent && (
          <div style={{margin:'16px 16px 0',background:'rgba(10,15,30,0.65)',border:'1px solid rgba(201,168,76,.18)',borderRadius:16,padding:'20px 16px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'rgba(201,168,76,.9)',letterSpacing:'.06em',marginBottom:3}}>FEEDBACK</div>
            <div style={{fontSize:14,fontWeight:700,color:'#e8e4dc',marginBottom:16}}>このマップはどうでしたか？</div>
            {[['accuracy','結果の的確さ'],['usability','使いやすさ'],['revisit','また使いたいか']].map(([key,label]) => (
              <FbStarRow key={key} label={label} onChange={v => { fbRatings.current[key] = v; }}/>
            ))}
            <textarea
              placeholder="ひとこと（任意）"
              rows={2}
              id="map-fb-comment"
              style={{background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.12)',borderRadius:8,color:'#e8e4dc',fontSize:13,padding:'10px 12px',resize:'vertical',width:'100%',boxSizing:'border-box',marginTop:8,marginBottom:12}}
            />
            <button
              style={{background:'rgba(201,168,76,.18)',border:'1px solid rgba(201,168,76,.35)',borderRadius:8,color:'#c9a84c',fontSize:13,fontWeight:700,padding:'9px 22px',cursor:'pointer',letterSpacing:'.04em'}}
              onClick={async (e) => {
                const btn = e.currentTarget;
                btn.disabled = true; btn.textContent = '送信中...';
                try {
                  const r = await fetch('/api/feedback', {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({
                      page:'map',
                      rating_accuracy:  fbRatings.current.accuracy  || null,
                      rating_usability: fbRatings.current.usability || null,
                      rating_revisit:   fbRatings.current.revisit   || null,
                      comment: document.getElementById('map-fb-comment')?.value?.trim() || null,
                    }),
                  });
                  if (!r.ok) { btn.disabled = false; btn.textContent = '送信する'; return; }
                } catch { btn.disabled = false; btn.textContent = '送信する'; return; }
                localStorage.setItem('fineme:feedback:map','1');
                setFbSent(true);
              }}
            >送信する</button>
          </div>
        )}
        {fbSent && (
          <div style={{margin:'16px 16px 0',padding:'16px',textAlign:'center',color:'rgba(201,168,76,.9)',fontSize:14,fontWeight:700,background:'rgba(10,15,30,.65)',border:'1px solid rgba(201,168,76,.18)',borderRadius:16}}>
            フィードバックを送りました。ありがとうございます 🙏
          </div>
        )}

        {/* Detail panel */}
        {selData ? (
          <div className="dp">
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
              <span style={{fontSize:30}}>{selData.icon}</span>
              <div>
                <div style={{fontSize:16,fontWeight:900}}>{selData.label}の領域</div>
                <div style={{fontSize:12,color:'rgba(232,228,220,.42)',marginTop:2}}>{selData.desc}</div>
              </div>
            </div>
            <div style={{fontSize:12,color:'rgba(232,228,220,.42)'}}>
              {selData.isDone
                ? '✓ この領域の探索は完了'
                : (selData.done ?? 0) > 0
                ? `${selData.done}ステップ踏破済み`
                : '⚡ まだ足を踏み入れていない領域'}
            </div>
            {/* フェーズ2: Mirrorで確認された変化かどうかを正直に区別する */}
            {viewMonth === 'now' && MIRROR_COMMON_AXES.has(selData.id) && (
              <div style={{marginTop:10}}>
                {selMirrorStatus === 'improved' ? (
                  <span className="mpill">✓ Mirrorで変化確認済み</span>
                ) : (
                  <span className="mpill stable">◯ 自己申告のみ・Mirror未確認</span>
                )}
              </div>
            )}
            <Link href="/mypage/navi" className="dp-cta">
              この領域のナビを開く →
            </Link>
          </div>
        ) : (
          <div style={{margin:'12px 16px',textAlign:'center'}}>
            <div style={{fontSize:11,color:'rgba(232,228,220,.28)',marginBottom:10}}>領域をタップして詳細を確認</div>
            <Link href="/mypage/navi" style={{display:'inline-block',padding:'11px 28px',background:'rgba(201,168,76,.09)',border:'1px solid rgba(201,168,76,.28)',borderRadius:99,color:'#c9a84c',textDecoration:'none',fontSize:13,fontWeight:700}}>
              Naviで次のステップへ →
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
