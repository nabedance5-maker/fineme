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

  useEffect(() => {
    try {
      const stepDone = JSON.parse(localStorage.getItem('fineme:step:done') || '{}');
      const axisProg = JSON.parse(localStorage.getItem('fineme:axis:progress') || '{}');
      const override = localStorage.getItem('fineme:compass:override');

      const p = {};
      for (const id of Object.keys(T)) {
        const doneCount = Object.keys(stepDone).filter(k => k.startsWith(id + ':') && stepDone[k]).length;
        const total     = AXIS_TOTALS[id] ?? 10;
        const pct       = Math.min(100, Math.round(doneCount / total * 100));
        p[id] = { done: doneCount, total, pct, isDone: axisProg[id] === 'done' };
      }
      setProg(p);

      const cId = (override && T[override]) ? override
        : Object.keys(T).find(id => (p[id]?.done ?? 0) > 0 && !p[id]?.isDone)
        ?? 'body';
      setCompass(cId);
    } catch {}
    setFbDone(!!localStorage.getItem('fineme:feedback:map'));
  }, []);

  const fogOf = id => {
    const p = prog[id];
    if (!p || p.done === 0) return 'full';
    if (p.isDone) return 'clear';
    return 'partial';
  };

  const selData = selected ? { id: selected, ...T[selected], ...(prog[selected] ?? {}) } : null;

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
      `}</style>

      <div className="map-pg">
        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'22px 20px 4px'}}>
          <div>
            <div style={{fontSize:9,fontWeight:800,letterSpacing:'.16em',color:'rgba(201,168,76,.5)',textTransform:'uppercase',marginBottom:2}}>New Me</div>
            <div style={{fontSize:26,fontWeight:900,letterSpacing:'.02em',lineHeight:1}}>Map</div>
            <div style={{fontSize:11,color:'rgba(232,228,220,.3)',marginTop:4}}>7つの領域を同時に探索する</div>
          </div>
          <Link href="/mypage/navi" style={{fontSize:12,color:'rgba(201,168,76,.7)',textDecoration:'none',border:'1px solid rgba(201,168,76,.22)',padding:'7px 14px',borderRadius:99,marginTop:6,display:'inline-block',whiteSpace:'nowrap'}}>Navi →</Link>
        </div>

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
              const p    = prog[id] ?? {};
              const pct  = p.isDone ? 100 : (p.pct ?? 0);
              const arcR = t.r + 9;
              const circ = +(2 * Math.PI * arcR).toFixed(2);
              const offset = +(circ * (1 - pct / 100)).toFixed(2);

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
                      stroke={isC ? '#c9a84c' : 'rgba(96,165,250,.6)'}
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

                  {/* Done check mark */}
                  {p.isDone && (
                    <text x={t.x + t.r * .58} y={t.y - t.r * .5}
                      fontSize="13" fill="rgba(52,211,153,.82)">✓</text>
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
