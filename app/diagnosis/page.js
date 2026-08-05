'use client';
import { useEffect, useRef, useState } from 'react';
import { setTrackOnce, syncTrackWithServer } from '@/lib/track';
import { AGE_BANDS, hasRequiredAttributes, saveAttribute, syncAttributesWithServer } from '@/lib/attributes';

export default function DiagnosisPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ?src= パラメータを読み取りlocalStorage保存＋ログ（D-20260712-3）
    const diagSrc = new URLSearchParams(window.location.search).get('src');
    if (diagSrc) {
      try { localStorage.setItem('fineme:diagnosis:src', diagSrc); } catch {}
      fetch('/api/track/src?src=' + encodeURIComponent(diagSrc)).catch(() => {});
    }

    // ─── ページ固有スタイル ───
    const style = document.createElement('style');
    style.textContent = `
      :root { --diag-max: 600px; }
      .diag-wrap {
        min-height: calc(100vh - 72px);
        display: flex; flex-direction: column; align-items: center;
        padding: 32px 20px 100px;
        background: transparent;
      }
      .diag-progress { width: 100%; max-width: var(--diag-max); margin-bottom: 24px; }
      .diag-progress-bar { height: 4px; background: rgba(201,168,76,0.2); border-radius: 2px; overflow: hidden; }
      .diag-progress-fill { height: 100%; background: linear-gradient(90deg, #c9a84c, #e8c86a); border-radius: 2px; transition: width .4s ease; }
      .diag-progress-text { font-size: 12px; color: #7a6e65; margin-top: 6px; text-align: right; font-weight: 600; }
      .diag-screen { display: none; width: 100%; max-width: var(--diag-max); animation: fadeUp .25s ease; }
      .diag-screen.is-active { display: block; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .diag-back-btn { background: none; border: none; cursor: pointer; font-size: 13px; color: #7a6e65; padding: 0 0 16px; display: flex; align-items: center; gap: 4px; font-weight: 600; }
      .diag-back-btn:hover { color: #0a0f1e; }
      .diag-card { background: rgba(255,255,255,0.88); backdrop-filter: blur(6px); border: 1px solid rgba(201,168,76,0.25); border-radius: 18px; padding: 28px 24px; margin-bottom: 16px; box-shadow: 0 4px 24px rgba(10,15,30,.06); }
      .diag-step-label { font-size: 11px; font-weight: 700; letter-spacing: .06em; color: rgba(201,168,76,0.8); text-transform: uppercase; margin: 0 0 8px; }
      .diag-q { font-size: clamp(17px, 4vw, 20px); font-weight: 800; line-height: 1.4; margin: 0 0 6px; color: #0a0f1e; }
      .diag-hint { font-size: 13px; color: #5a4e45; margin: 0 0 20px; line-height: 1.6; }
      .diag-options { display: flex; flex-direction: column; gap: 10px; }
      .diag-option { display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px; border: 2px solid rgba(201,168,76,0.2); border-radius: 12px; cursor: pointer; transition: border-color .12s, background .12s; text-align: left; background: rgba(255,255,255,0.72); width: 100%; }
      .diag-option:hover { border-color: rgba(201,168,76,0.55); background: rgba(245,240,232,0.85); }
      .diag-option.selected { border-color: #c9a84c; background: rgba(201,168,76,0.08); }
      .diag-option-icon { font-size: 20px; flex-shrink: 0; line-height: 1.3; }
      .diag-option-body { flex: 1; }
      .diag-option-title { font-size: 15px; font-weight: 700; color: #0a0f1e; line-height: 1.4; display: block; }
      .diag-option-desc { display: none; }
      .diag-option.multi .diag-check { width: 18px; height: 18px; border: 2px solid rgba(201,168,76,0.3); border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-top: 2px; transition: all .12s; color: transparent; }
      .diag-option.multi.selected .diag-check { background: #c9a84c; border-color: #c9a84c; color: #0a0f1e; font-size: 11px; font-weight: 900; }
      .care-level-item { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(201,168,76,0.12); }
      .care-level-item:last-child { border-bottom: none; margin-bottom: 0; }
      .care-overall-wrap { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 14px 16px; border: 2px solid rgba(201,168,76,0.2); border-radius: 12px; transition: border-color .12s, background .12s; background: rgba(255,255,255,0.72); }
      .care-overall-wrap:hover { border-color: rgba(201,168,76,0.55); background: rgba(245,240,232,0.85); }
      .care-overall-wrap.selected { border-color: #c9a84c; background: rgba(201,168,76,0.08); }
      .care-overall-text { display: flex; align-items: center; gap: 10px; flex: 1; }
      .care-level-label { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #0a0f1e; margin-bottom: 10px; }
      .care-level-icon { font-size: 18px; }
      .care-level-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .care-level-opt { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border: 2px solid rgba(201,168,76,0.2); border-radius: 10px; cursor: pointer; transition: border-color .12s, background .12s; background: rgba(255,255,255,0.72); user-select: none; }
      .care-level-opt:hover { border-color: rgba(201,168,76,0.55); background: rgba(245,240,232,0.85); }
      .care-level-opt.selected { border-color: #c9a84c; background: rgba(201,168,76,0.08); }
      .care-level-opt input[type="radio"] { display: none; }
      .care-level-opt-text { font-size: 12px; font-weight: 600; color: #374151; line-height: 1.4; }
      @media (max-width: 480px) { .care-level-opts { grid-template-columns: 1fr; } }
      .diag-nav { display: flex; gap: 10px; align-items: center; max-width: var(--diag-max); width: 100%; }
      .diag-nav-next { flex: 1; padding: 14px 20px; background: #0a0f1e; color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: opacity .15s, background .15s; }
      .diag-nav-next:disabled { opacity: .35; cursor: not-allowed; }
      .diag-nav-next:not(:disabled):hover { background: #c9a84c; color: #0a0f1e; }
      .diag-landing { text-align: center; padding: 16px 0 4px; }
      .diag-landing h1 { font-size: clamp(22px, 5vw, 28px); font-weight: 800; line-height: 1.3; margin: 0 0 12px; color: #0a0f1e; }
      .diag-landing p { font-size: 15px; color: #5a4e45; line-height: 1.7; margin: 0 0 6px; }
      .diag-badges { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin: 16px 0 24px; }
      .diag-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; background: rgba(201,168,76,0.1); padding: 6px 12px; border-radius: 99px; color: #7a6e65; border: 1px solid rgba(201,168,76,0.25); }
      /* Phase 3 intro */
      .q3-intro-card { text-align: center; padding: 8px 0; }
      .q3-intro-axes { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 20px 0 24px; }
      .q3-intro-axis { display: flex; flex-direction: column; align-items: center; gap: 5px; }
      .q3-intro-axis-icon { width: 44px; height: 44px; border-radius: 50%; background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.25); display: flex; align-items: center; justify-content: center; font-size: 20px; }
      .q3-intro-axis-label { font-size: 10px; color: #7a6e65; font-weight: 600; }
      /* Path-type chip assignment (q3_path) */
      .path-row { background:rgba(10,15,30,0.65); border:1px solid rgba(232,228,220,0.12); border-radius:14px; padding:14px 16px; margin-bottom:10px; }
      .path-row-label { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; }
      .path-row-icon { font-size:22px; line-height:1.2; flex-shrink:0; margin-top:1px; }
      .path-row-short { font-size:14px; font-weight:800; color:rgba(232,228,220,0.9); margin:0 0 2px; }
      .path-row-desc { font-size:11px; color:rgba(232,228,220,0.42); margin:0; }
      .axis-chips { display:flex; flex-wrap:wrap; gap:7px; }
      .axis-chip { padding:6px 12px; border-radius:99px; font-size:12px; font-weight:700; border:1.5px solid rgba(232,228,220,0.15); background:rgba(232,228,220,0.05); color:rgba(232,228,220,0.45); cursor:pointer; transition:all .14s; white-space:nowrap; user-select:none; }
      .axis-chip.assigned { background:rgba(201,168,76,0.18); border-color:rgba(201,168,76,0.65); color:#c9a84c; }
      .axis-chip.elsewhere { opacity:0.18; pointer-events:none; }
      /* Goal framing banner */
      .goal-frame-banner { background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.25); border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; }
      /* Instant tryout screens (D-20260713-2) */
      .tryout-option { display:flex; align-items:center; gap:14px; padding:14px 16px; border:2px solid rgba(201,168,76,0.2); border-radius:12px; cursor:pointer; transition:border-color .12s, background .12s; text-align:left; background:rgba(255,255,255,0.72); width:100%; margin-bottom:10px; }
      .tryout-option:hover { border-color:rgba(201,168,76,0.55); background:rgba(245,240,232,0.85); }
      .tryout-option-icon { font-size:22px; flex-shrink:0; }
      .tryout-option-title { font-size:15px; font-weight:700; color:#0a0f1e; line-height:1.4; }
      .tryout-result-axis { background:rgba(201,168,76,0.08); border:1.5px solid rgba(201,168,76,0.35); border-radius:14px; padding:24px 20px; margin:12px 0; text-align:center; }
      .tryout-result-axis-icon { font-size:40px; display:block; margin-bottom:10px; }
      .tryout-result-axis-name { font-size:26px; font-weight:900; color:#0a0f1e; margin:0 0 8px; }
      .tryout-result-axis-desc { font-size:14px; color:#5a4e45; line-height:1.6; margin:0; }
      .tryout-framing { font-size:12px; color:#9ca3af; margin:14px 0 0; line-height:1.7; text-align:center; }
    `;
    document.head.appendChild(style);

    // ─── メインロジック ───
    const STORAGE_KEY = 'fineme:diagnosis:latest';

    const CONCERN_AREAS = [
      { id:'body',         icon:'💪',  label:'体型・ボディ',        tier:1 },
      { id:'eyebrow',      icon:'✂️', label:'眉毛',                tier:1 },
      { id:'fashion',      icon:'👔',  label:'服・コーデ',           tier:1 },
      { id:'hair',         icon:'💇‍♂️', label:'髪・ヘア',        tier:1, hasAga:true },
      { id:'skin',         icon:'✨',   label:'肌・ニキビ・エステ',  tier:2 },
      { id:'hairremoval',  icon:'🪒',   label:'脱毛・ムダ毛',        tier:2 },
      { id:'teeth',        icon:'🦷',  label:'歯・口元',            tier:3 },
      { id:'nail',         icon:'💅',  label:'爪',                  tier:4 },
    ];

    const STYLE_MAP = {
      explanation_autonomy:       { style: 'explanation', relationship: 'autonomy' },
      consultation_accessibility: { style: 'consultation', relationship: 'accessibility' },
      delegate_directive:         { style: 'delegate',     relationship: 'directive' },
      cautious_continuity:        { style: 'cautious',     relationship: 'continuity' }
    };

    const CATEGORY_PHASE3 = [
      { id:'body',    icon:'💪', label:'体型・ボディ',
        path_q:'体型について、これまでどんな道を歩いてきた？',
        path_opts:[
          {v:'virgin', t:'🌱 ほとんど何もしてこなかった',          d:'「どうせ変わらない」という気持ちがあったかも'},
          {v:'quit',   t:'🔄 試したが、続かなかった',              d:'筋トレ・食事制限など、途中で止まった'},
          {v:'blind',  t:'🤔 自分なりにやっているが、効果が不明',   d:'やり方が正しいか、客観的な評価を受けたことがない'},
          {v:'lapsed', t:'😴 以前はやっていたが、今は後回し',       d:'できていた時期があったが、疎かになっている'},
          {v:'doing',  t:'✅ 継続してできている',                   d:'今の習慣・ペースで問題ない。さらに高みを目指したい'},
        ],
        view_q:'他の人から見た自分の体型、実際どう見えていると思う？',
        view_opts:[
          {v:'better',   t:'自分が思っているより良く見えていると思う'},
          {v:'accurate', t:'自分の認識通りだと思う'},
          {v:'worse',    t:'実は自分より悪く見えているかもしれない'},
          {v:'unknown',  t:'正直わからない（聞いたことがない）'},
        ],
        love_q:'体型への不安が、恋愛や出会いの場面で影響したことは？',
        love_opts:[
          {v:'often',    t:'よくある（意識するとどこかで引いてしまう）'},
          {v:'sometimes',t:'たまにある'},
          {v:'rarely',   t:'あまりない'},
        ], has_love:true },
      { id:'eyebrow', icon:'✂️', label:'眉毛',
        path_q:'眉毛について、これまでどんな道を歩いてきた？',
        path_opts:[
          {v:'virgin', t:'🌱 整えたことがない / ずっと自己流',      d:'眉毛サロンやプロに頼んだことがない'},
          {v:'quit',   t:'🔄 サロンに行ったが続いていない',         d:'一度は試したが、習慣にならなかった'},
          {v:'blind',  t:'🤔 自分で整えているが、似合っているか不安',d:'鏡では確認しているが、第三者の目がわからない'},
          {v:'lapsed', t:'😴 以前は通っていたが、最近サボっている',  d:'できていた時期があったが、間隔が空いている'},
          {v:'doing',  t:'✅ 継続してできている',                   d:'定期的に整えられている。さらに高みを目指したい'},
        ],
        habit_q:'眉の手入れは、今どうしていますか？',
        habit_opts:[
          {v:'self_diy',    t:'自己処理（毛抜き・シェーバー）'},
          {v:'salon_tattoo',t:'サロン・眉毛アートメイク'},
          {v:'none',        t:'特にしていない'},
        ],
        view_q:'自分の眉って、他の人から見てどう見えていると思う？',
        view_opts:[
          {v:'better',   t:'整って見えていると思う'},
          {v:'accurate', t:'普通 / 特に気にされないと思う'},
          {v:'worse',    t:'実はちょっと気になられているかもしれない'},
          {v:'unknown',  t:'まったくわからない'},
        ],
        love_q:'眉や顔まわりの印象が、初対面や出会いの場面で気になったことは？',
        love_opts:[
          {v:'often',    t:'よくある'},
          {v:'sometimes',t:'たまにある'},
          {v:'rarely',   t:'あまりない'},
        ], has_love:true },
      { id:'fashion', icon:'👔', label:'服・コーデ',
        path_q:'服・コーデについて、これまでどんな道を歩いてきた？',
        path_opts:[
          {v:'virgin', t:'🌱 あまり考えてこなかった',              d:'いつも同じ系統のものを何となく買っている'},
          {v:'quit',   t:'🔄 変えようとしたが、しっくりこなかった', d:'試みたことはあるが、自分に合うかわからなかった'},
          {v:'blind',  t:'🤔 自分なりにこだわっているが、客観評価なし',d:'気を使っているが、外から見てどうかわからない'},
          {v:'lapsed', t:'😴 以前は気を使っていたが、最近は後回し',  d:'できていた時期があったが、今は惰性になっている'},
          {v:'doing',  t:'✅ 継続してできている',                   d:'自分のスタイルが確立している。さらに磨きたい'},
        ],
        habit_q:'服選びで、今意識していることは？',
        habit_opts:[
          {v:'size_fit',    t:'サイズ感を最優先'},
          {v:'trend',       t:'トレンドを意識'},
          {v:'fixed_brand', t:'決まったブランド・店で揃える'},
          {v:'none',        t:'特にこだわりなし'},
        ],
        view_q:'自分の着こなしって、他の人から見てどう見えていると思う？',
        view_opts:[
          {v:'better',   t:'整って見えていると思う'},
          {v:'accurate', t:'普通 / 特に印象に残らないと思う'},
          {v:'worse',    t:'実はちょっと気になられているかもしれない'},
          {v:'unknown',  t:'まったくわからない'},
        ],
        love_q:'服や着こなしへの自信が、デートや出会いの場面で影響したことは？',
        love_opts:[
          {v:'often',    t:'よくある（「ダサいと思われたら」が頭をよぎる）'},
          {v:'sometimes',t:'たまにある'},
          {v:'rarely',   t:'あまりない'},
        ], has_love:true },
      { id:'hair', icon:'💇', label:'髪・ヘア',
        path_q:'髪・ヘアについて、これまでどんな道を歩いてきた？',
        path_opts:[
          {v:'virgin', t:'🌱 特に気を使ってこなかった',             d:'安いところに行くだけで、スタイリングもほぼしない'},
          {v:'quit',   t:'🔄 変えようとしたが、思い通りにならなかった',d:'オーダーがうまく伝わらない、また同じスタイルに戻る'},
          {v:'blind',  t:'🤔 定期的に行っているが、似合っているか不安',d:'美容院には通っているが、「これでいい」か正直わからない'},
          {v:'lapsed', t:'😴 以前は意識していたが、最近は間隔が空いている',d:'できていた時期があったが、なんとなく後回し'},
          {v:'doing',  t:'✅ 継続してできている',                   d:'定期的に美容院に通い、スタイルを維持できている'},
        ],
        habit_q:'美容院に通う頻度は？',
        habit_opts:[
          {v:'monthly',       t:'月1回'},
          {v:'bimonthly',     t:'2〜3ヶ月に1回'},
          {v:'half_year_plus',t:'半年以上空く'},
          {v:'rarely',        t:'ほぼ行かない'},
        ],
        view_q:'自分の髪型って、他の人から見てどう見えていると思う？',
        view_opts:[
          {v:'better',   t:'整って見えていると思う'},
          {v:'accurate', t:'普通 / 特に気にされないと思う'},
          {v:'worse',    t:'実はちょっと気になられているかもしれない'},
          {v:'unknown',  t:'まったくわからない'},
        ],
        love_q:'髪型への不安が、初対面や出会いの場面で気になったことは？',
        love_opts:[
          {v:'often',    t:'よくある'},
          {v:'sometimes',t:'たまにある'},
          {v:'rarely',   t:'あまりない'},
        ], has_love:true },
      { id:'skin', icon:'✨', label:'肌・ニキビ・エステ',
        path_q:'肌・スキンケアについて、これまでどんな道を歩いてきた？',
        path_opts:[
          {v:'virgin', t:'🌱 洗顔以外ほとんど何もしてこなかった',    d:'スキンケアのことをあまり考えてこなかった'},
          {v:'quit',   t:'🔄 スキンケアを始めたことはあるが続かなかった',d:'少し試みたが、習慣にならなかった'},
          {v:'blind',  t:'🤔 スキンケアは習慣だが、効果が実感できない',d:'やっているが、本当に改善しているか正直わからない'},
          {v:'lapsed', t:'😴 以前はちゃんとやっていたが、最近は手を抜いている',d:'できていた時期があったが、今は惰性'},
          {v:'doing',  t:'✅ 継続してできている',                   d:'スキンケアが習慣化し、肌の状態を維持できている'},
        ],
        view_q:'自分の肌って、他の人から見てどう見えていると思う？',
        view_opts:[
          {v:'better',   t:'清潔感があると思われていると思う'},
          {v:'accurate', t:'普通 / 特に印象に残らないと思う'},
          {v:'worse',    t:'実はちょっと気になられているかもしれない'},
          {v:'unknown',  t:'まったくわからない'},
        ],
        love_q:'肌への不安が、近距離での会話や出会いの場面で気になったことは？',
        love_opts:[
          {v:'often',    t:'よくある（近づかれると気になる）'},
          {v:'sometimes',t:'たまにある'},
          {v:'rarely',   t:'あまりない'},
        ], has_love:true },
      { id:'hairremoval', icon:'🪒', label:'脱毛・ムダ毛',
        path_q:'脱毛・ムダ毛ケアについて、これまでどんな道を歩いてきた？',
        path_opts:[
          {v:'virgin', t:'🌱 ほとんど何もしてこなかった',            d:'脱毛やムダ毛ケアを真剣に考えたことがなかった'},
          {v:'quit',   t:'🔄 自己処理はしているが、サロンには行っていない',d:'カミソリや除毛クリームで対処している'},
          {v:'blind',  t:'🤔 自己処理しているが、これで十分か不安',   d:'サロンと比べてどうなのか正直わからない'},
          {v:'lapsed', t:'😴 以前は通っていたが、最近は後回し',       d:'サロンに行っていた時期があったが、今は間が空いている'},
          {v:'doing',  t:'✅ 定期的に通ってケアできている',           d:'照射・メンテナンスのサイクルが確立している'},
        ],
        habit_q:'今の状況は？',
        habit_opts:[
          {v:'self_only',    t:'自己処理のみ'},
          {v:'salon_clinic', t:'サロン・クリニックに通っている'},
          {v:'none',         t:'どちらもしていない'},
        ],
        view_q:'自分のムダ毛って、他の人から見てどう見えていると思う？',
        view_opts:[
          {v:'better',   t:'気になるレベルではないと思う'},
          {v:'accurate', t:'自分の認識通りだと思う'},
          {v:'worse',    t:'実は気になられているかもしれない'},
          {v:'unknown',  t:'まったくわからない'},
        ],
        has_love:false },
      { id:'teeth', icon:'🦷', label:'歯・口元',
        path_q:'歯・口元について、これまでどんな道を歩いてきた？',
        path_opts:[
          {v:'virgin', t:'🌱 歯科検診以外、特に何もしてこなかった',   d:'ホワイトニングや矯正などは考えたことがなかった'},
          {v:'quit',   t:'🔄 検討したことはあるが、踏み出せていない',  d:'興味はあるが、まだアクションを起こせていない'},
          {v:'blind',  t:'🤔 ケアはしているが、外から見てどうかわからない',d:'気を使っているが、人からどう見えているか不安'},
          {v:'lapsed', t:'😴 以前は気を使っていたが、最近は後回し',    d:'できていた時期があったが、今は惰性'},
          {v:'doing',  t:'✅ 継続してできている',                   d:'ホワイトニングや定期ケアを継続できている'},
        ],
        habit_q:'今の状況は？',
        habit_opts:[
          {v:'whitening',     t:'ホワイトニング中'},
          {v:'braces',        t:'矯正中'},
          {v:'interested',    t:'どちらもしていないが興味ある'},
          {v:'not_concerned', t:'特に気にしていない'},
        ],
        view_q:'自分の歯・口元って、他の人から見てどう見えていると思う？',
        view_opts:[
          {v:'better',   t:'清潔感があると思われていると思う'},
          {v:'accurate', t:'普通 / 特に気にされないと思う'},
          {v:'worse',    t:'実はちょっと気になられているかもしれない'},
          {v:'unknown',  t:'まったくわからない'},
        ],
        love_q:'笑顔や口元への不安が、恋愛や出会いの場面で影響したことは？',
        love_opts:[
          {v:'often',    t:'よくある（笑顔を隠したくなる、口元が気になる）'},
          {v:'sometimes',t:'たまにある'},
          {v:'rarely',   t:'あまりない'},
        ], has_love:true },
      { id:'nail', icon:'💅', label:'爪',
        path_q:'爪のケアについて、これまでどんな道を歩いてきた？',
        path_opts:[
          {v:'virgin', t:'🌱 切るだけで、ケアらしいことはしてこなかった',d:'ネイルケアを意識したことがほとんどなかった'},
          {v:'quit',   t:'🔄 ネイルサロンなど試したことはあるが続かなかった',d:'少し試みたが、習慣にならなかった'},
          {v:'blind',  t:'🤔 一応ケアしているが、基準がわからない',    d:'やっているが、これで十分かどうか判断できない'},
          {v:'lapsed', t:'😴 以前はちゃんとやっていたが、今は後回し',   d:'できていた時期があったが、今は疎かになっている'},
          {v:'doing',  t:'✅ 継続してできている',                   d:'定期的なケアが習慣化できている'},
        ],
        habit_q:'爪のケアは、今どうしていますか？',
        habit_opts:[
          {v:'self_care', t:'自分で整えている'},
          {v:'salon',     t:'ネイルサロンに通っている'},
          {v:'none',      t:'特にケアしていない'},
        ],
        view_q:'自分の爪・手元って、他の人から見てどう見えていると思う？',
        view_opts:[
          {v:'better',   t:'整って見えていると思う'},
          {v:'accurate', t:'普通 / 特に気にされないと思う'},
          {v:'worse',    t:'実はちょっと気になられているかもしれない'},
          {v:'unknown',  t:'まったくわからない'},
        ],
        has_love:false },
    ];

    const PATH_LABELS = {
      virgin: 'ほとんどしてこなかった',
      quit:   '試したが続かなかった',
      blind:  '自分なりにやっているが客観評価なし',
      lapsed: '以前はやっていたが後回し',
      doing:  '継続してできている',
    };

    const state = {
      trigger: null,
      triggers: [],
      // ゴール深掘り（Layer 2→3→4）
      goal_scene: [],
      goal_change: null,
      goal_vision: null,
      scene: null,
      scenes: [],
      care_levels: {},
      ideal_levels: {},   // 各カテゴリの理想スコア（1〜5）
      aga_concern: null,
      aga_status: null,
      // Phase 3: カテゴリ別来た道・客観視・恋愛
      path_types: {},     // { body: 'virgin'|'quit'|'blind'|'lapsed', ... }
      self_views: {},     // { body: 'better'|'accurate'|'worse'|'unknown', ... }
      love_impact: {},    // { body: 'often'|'sometimes'|'rarely', ... }
      past_attempts: [],
      failure_pattern: null,
      failure_patterns: [],
      style_priorities: [],
      style_priority_top: null,
      urgency: null,
      budget: null,
      // 新5問
      self_score: null,
      reference_type: null,
      rel_status: null,
      key_scene_type: null,
      past_change_exp: null,
      // 属性（でお指摘 2026-08-01：年代で肌ケア・体づくりのアプローチは変わるべき）
      age_band: null,
      // 現在の行動習慣（肌・体型のみコア必須。他6軸は結果画面からの deepen で聞く）
      skincare_habits: { cleanse_freq: null, items: [] },
      workout_type: null,
    };

    // コアフロー＝地図の骨格ができるまでの画面。残りの設問は結果画面から1軸ずつ導く
    const MAIN_SCREENS = ['q3','q3_habits','q3_aga','q3_path'];
    const TOTAL_STEPS = MAIN_SCREENS.length;

    let currentScreen = 'landing';
    let screenHistory = ['landing'];

    const progressWrap = document.getElementById('diag-progress');
    const progressFill = document.getElementById('diag-progress-fill');
    const progressText = document.getElementById('diag-progress-text');
    const navEl = document.getElementById('diag-nav');
    const btnNext = document.getElementById('btn-next');

    function showScreen(id) {
      document.querySelectorAll('.diag-screen').forEach(s => s.classList.remove('is-active'));
      const el = document.getElementById('screen-' + id);
      if (el) el.classList.add('is-active');
      if (id === 'q3') {
        // q3_habitsから「戻る」で入ってきた場合は最後に答えた軸（爪）から再開、
        // それ以外（新規到達）は1軸目から
        q3StepIndex = (currentScreen === 'q3_habits') ? CONCERN_AREAS.length - 1 : 0;
      }
      currentScreen = id;
      if (id === 'q3') renderQ3Step();
      // 画面ごとの到達をGA4へ（SPA遷移でURLが変わらないため明示送信）
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'mescan_screen', { screen_id: id });
      }
      const previewBlock = document.getElementById('sample-preview-block');
      if (previewBlock) previewBlock.style.display = id === 'landing' ? '' : 'none';
      updateProgress();
      updateNav();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function updateProgress() {
      const subScreenMap = { 'q5b':'q5b', 'q6b':'q6b' };
      const baseScreen = subScreenMap[currentScreen] || currentScreen;
      const isMain = MAIN_SCREENS.includes(baseScreen);
      progressWrap.style.display = isMain ? '' : 'none';
      if (!isMain) return;
      let pct;
      {
        const idx = MAIN_SCREENS.indexOf(baseScreen);
        if (idx === -1) return;
        pct = Math.round(((idx + 1) / TOTAL_STEPS) * 100);
      }
      progressFill.style.width = pct + '%';
      progressText.textContent = '地図の骨格 ' + pct + '%';
    }

    function updateNav() {
      const noNavScreens = ['landing', 'instant-tryout', 'instant-tryout-result', 'attr_register', 'attr_confirm', 'deepen'];
      if (noNavScreens.includes(currentScreen)) {
        navEl.style.display = 'none';
        return;
      }
      navEl.style.display = 'flex';
      updateNextBtn();
    }

    function updateNextBtn() {
      let enabled = false;
      switch (currentScreen) {
        case 'q3': {
          const q3Axis = CONCERN_AREAS[q3StepIndex]?.id;
          enabled = !!(q3Axis && state.care_levels[q3Axis]);
          break;
        }
        case 'q3_habits':
          enabled = !!state.skincare_habits.cleanse_freq
            && (state.care_levels.body === 'none' || !!state.workout_type);
          break;
        case 'q3_aga': enabled = !!state.aga_status; break;
        case 'q3_path': {
          // コアではCompass軸1つだけ答えれば地図の骨格が完成する
          enabled = !!state.path_types[currentCompassAxis()];
          break;
        }
      }
      btnNext.disabled = !enabled;
      btnNext.textContent = (currentScreen === 'q3_path') ? '地図をつくる' : '次へ';
    }

    function goNext() {
      let next = null;
      switch (currentScreen) {
        case 'q3': {
          if (q3StepIndex < CONCERN_AREAS.length - 1) {
            q3StepIndex++;
            renderQ3Step();
            return;
          }
          next = 'q3_habits';
          // 体型に無関心な人に手段を聞いても離脱要因にしかならないため出し分ける
          const workoutBlock = document.getElementById('habits-workout-block');
          if (workoutBlock) workoutBlock.style.display = state.care_levels.body === 'none' ? 'none' : '';
          break;
        }
        case 'q3_habits':
          next = state.aga_concern === 'yes' ? 'q3_aga' : 'q3_path';
          if (next === 'q3_path') buildAllCategoryCards();
          break;
        case 'q3_aga':
          next = 'q3_path';
          buildAllCategoryCards();
          break;
        case 'q3_path':
          // ここが「地図の骨格ができた」地点。残りの軸は結果画面から1軸ずつ導く
          if (typeof window.gtag === 'function') window.gtag('event', 'mescan_core_complete');
          saveAndFinish();
          return;
      }
      if (next) {
        screenHistory.push(next);
        showScreen(next);
      }
    }

    function goBack() {
      if (currentScreen === 'q3' && q3StepIndex > 0) {
        q3StepIndex--;
        renderQ3Step();
        return;
      }
      if (screenHistory.length > 1) {
        screenHistory.pop();
        showScreen(screenHistory[screenHistory.length - 1]);
      }
    }

    function buildMiniRadarSVG(doneUpTo) {
      const n = CONCERN_AREAS.length;
      const cx = 80, cy = 80, r = 62, SIZE = 160;
      const AXIS_COLORS = ['#3b82f6','#8b5cf6','#f59e0b','#10b981','#ec4899','#06b6d4','#f97316','#6366f1'];

      function ptStr(val, i) {
        const angle = -Math.PI / 2 + i * (2 * Math.PI / n);
        const rv = r * (Math.max(val, 0.12) / 5);
        return `${(cx + rv * Math.cos(angle)).toFixed(1)},${(cy + rv * Math.sin(angle)).toFixed(1)}`;
      }
      function ptXY(scale, i) {
        const angle = -Math.PI / 2 + i * (2 * Math.PI / n);
        return { x: cx + r * scale * Math.cos(angle), y: cy + r * scale * Math.sin(angle) };
      }

      const gridLines = [1, 2, 3, 4, 5].map(v =>
        `<polygon points="${CONCERN_AREAS.map((_, i) => ptStr(v, i)).join(' ')}" fill="none" stroke="#f1f5f9" stroke-width="1"/>`
      ).join('');

      const axisLines = CONCERN_AREAS.map((area, i) => {
        const ep = ptXY(1, i);
        const done = i <= doneUpTo;
        return `<line x1="${cx}" y1="${cy}" x2="${ep.x.toFixed(1)}" y2="${ep.y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>` +
               `<circle cx="${ep.x.toFixed(1)}" cy="${ep.y.toFixed(1)}" r="5" fill="${done ? AXIS_COLORS[i] : '#e5e7eb'}"/>`;
      }).join('');

      const currentVals = CONCERN_AREAS.map((area, i) => {
        const level = state.care_levels[area.id] || 'none';
        const v = { none: 1, concerned: 2, self: 3, pro: 4 }[level] || 1;
        return i <= doneUpTo ? v : 1;
      });

      const idealVals = CONCERN_AREAS.map((area, i) => {
        const currentV = { none:1, concerned:2, self:3, pro:4 }[state.care_levels[area.id]] || 1;
        const v = parseInt(state.ideal_levels[area.id] || String(Math.max(currentV, 3)), 10);
        return i <= doneUpTo ? v : 1;
      });

      const currentPts = currentVals.map((v, i) => ptStr(v, i)).join(' ');
      const idealPts = idealVals.map((v, i) => ptStr(v, i)).join(' ');

      return `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" style="display:block;margin:0 auto">
        ${gridLines}
        ${axisLines}
        <polygon points="${idealPts}" fill="rgba(99,102,241,.1)" stroke="#a5b4fc" stroke-width="1.5" stroke-linejoin="round"/>
        <polygon points="${currentPts}" fill="rgba(37,99,235,.22)" stroke="#2563eb" stroke-width="2" stroke-linejoin="round"/>
      </svg>`;
    }

    function buildAllCategoryCards() {
      const container = document.getElementById('q3_path_content');
      if (!container) return;

      // コアではCompass軸1つだけを描き込む。残りの軸は結果画面から1軸ずつ導く
      const compassAxis = currentCompassAxis();
      const activeAreas = CONCERN_AREAS.filter(a => a.id === compassAxis);
      CONCERN_AREAS.forEach(a => {
        if (a.id !== compassAxis && !state.path_types[a.id]) {
          state.path_types[a.id] = null;
        }
      });

      // 見出しにCompass軸を差し込む（「あなたに最初に効く軸」を明示する）
      const compassArea = CONCERN_AREAS.find(a => a.id === compassAxis);
      if (compassArea) {
        const labelEl = document.getElementById('q3path-label');
        const headEl  = document.getElementById('q3path-heading');
        if (labelEl) labelEl.textContent = `最後の1問｜${compassArea.label}`;
        if (headEl) headEl.innerHTML =
          `あなたに最初に効くのは<br><strong style="color:#6366f1">${compassArea.icon} ${compassArea.label}</strong><br>ここまで、どんな道を歩いてきましたか？`;
      }

      const PATH_OPTIONS = [
        { v:'virgin', icon:'🌱', short:'まだ何もやったことがない',    desc:'取り組んだことがない・考えたことがなかった' },
        { v:'quit',   icon:'🔄', short:'試したが、続かなかった',       desc:'始めたことはあるが習慣にならなかった' },
        { v:'blind',  icon:'🤔', short:'自己流でやっているが不安',      desc:'正しいのか客観的な評価を受けたことがない' },
        { v:'lapsed', icon:'😴', short:'以前はやっていたが後回し中',    desc:'できていた時期があるが、今は疎かになっている' },
        { v:'doing',  icon:'✅', short:'継続できている',                desc:'今の習慣・ペースで問題なく続けられている' },
      ];

      function renderChips(pathVal) {
        return activeAreas.map(area => {
          const cur = state.path_types[area.id];
          const isAssigned  = cur === pathVal;
          const isElsewhere = cur && cur !== pathVal;
          return `<button class="axis-chip${isAssigned ? ' assigned' : ''}${isElsewhere ? ' elsewhere' : ''}"
            data-axis="${area.id}" data-pathval="${pathVal}">${area.icon} ${area.label}</button>`;
        }).join('');
      }

      container.innerHTML = PATH_OPTIONS.map(opt => `
        <div class="path-row" data-pathval="${opt.v}">
          <div class="path-row-label">
            <span class="path-row-icon">${opt.icon}</span>
            <div>
              <p class="path-row-short">${opt.short}</p>
              <p class="path-row-desc">${opt.desc}</p>
            </div>
          </div>
          <div class="axis-chips" data-pathval="${opt.v}">${renderChips(opt.v)}</div>
        </div>
      `).join('');

      const progressEl = document.getElementById('q3path-progress');
      function updateQ3Progress() {
        if (!progressEl) return;
        const done = activeAreas.every(a => !!state.path_types[a.id]);
        progressEl.textContent = done
          ? '✓ 地図の骨格がそろいました'
          : 'あてはまるものを1つ選んでください';
      }
      updateQ3Progress();

      container.querySelectorAll('.axis-chip').forEach(chip => {
        chip.addEventListener('click', function () {
          const axisId  = this.dataset.axis;
          const pathVal = this.dataset.pathval;

          // すでに同じ選択肢に割り当て済みならトグルで未選択に戻す
          if (state.path_types[axisId] === pathVal) {
            delete state.path_types[axisId];
          } else {
            state.path_types[axisId] = pathVal;
          }
          const newVal = state.path_types[axisId];

          // 同軸の全チップを更新
          container.querySelectorAll(`.axis-chip[data-axis="${axisId}"]`).forEach(c => {
            const cv = c.dataset.pathval;
            c.classList.toggle('assigned',  !!newVal && cv === newVal);
            c.classList.toggle('elsewhere', !!newVal && cv !== newVal);
          });

          updateQ3Progress();
          updateNextBtn();
        });
      });
    }

    // 変容ベクトル（理想 - 現状）。q3の回答だけで確定する
    function computeTransformVectors() {
      const vectors = {};
      CONCERN_AREAS.forEach(area => {
        const currentScore = { none:1, concerned:2, self:3, self_regular:3, pro:4 }[state.care_levels[area.id]] || 1;
        const idealScore = parseInt(state.ideal_levels[area.id] || String(Math.max(currentScore, 3)), 10);
        vectors[area.id] = {
          current: currentScore,
          ideal: idealScore,
          gap: Math.max(0, idealScore - currentScore),
          tier: area.tier,
          care_type: state.care_levels[area.id] || 'none',
          path_type:   state.path_types[area.id]  || null,
          self_view:   state.self_views[area.id]  || null,
          love_impact: state.love_impact[area.id] || null,
        };
      });
      return vectors;
    }

    // 優先順位：tier → gap → 速効性。q3完了時点でCompass軸が決まる
    const AXIS_SPEED = { eyebrow:5, fashion:5, hair:4, body:3, skin:3, hairremoval:3, teeth:2, nail:2 };
    function computePriorityOrder(vectors) {
      return Object.entries(vectors || computeTransformVectors())
        .filter(([, v]) => v.gap > 0)
        .sort((a, b) => {
          if (a[1].tier !== b[1].tier) return a[1].tier - b[1].tier;
          if (b[1].gap !== a[1].gap) return b[1].gap - a[1].gap;
          return (AXIS_SPEED[b[0]] || 3) - (AXIS_SPEED[a[0]] || 3);
        })
        .map(([id]) => id);
    }

    // Compass軸（＝最初の一手）。q3_pathで描き込む対象を1軸に絞るのに使う
    function currentCompassAxis() {
      return computePriorityOrder()[0] || CONCERN_AREAS[0].id;
    }

    function saveAndFinish() {
      const concernAreas = {};
      Object.entries(state.care_levels).forEach(([id, level]) => {
        if (level === 'concerned') concernAreas[id] = 4;
        else if (level === 'self') concernAreas[id] = 3;
        else if (level === 'pro')  concernAreas[id] = 2;
      });

      const behaviorBaseline = Object.entries(state.care_levels)
        .filter(([, v]) => v === 'self' || v === 'pro')
        .map(([id]) => id);

      const careLevelOrder = ['concerned', 'self', 'pro'];
      let priority = null;
      for (const pLevel of careLevelOrder) {
        priority = CONCERN_AREAS.map(a => a.id).find(id => state.care_levels[id] === pLevel);
        if (priority) break;
      }

      const styleRel = STYLE_MAP[state.style_priority_top] || { style: null, relationship: null };

      const transformVectors = computeTransformVectors();
      const priorityOrder = computePriorityOrder(transformVectors);

      const profile = {
        version: 'v9_me_scan',
        at: Date.now(),
        gender: 'male',
        // 文脈
        trigger: state.triggers[0] || null,
        triggers: state.triggers,
        // ゴール（Layer 2→4）
        goal_scene: state.goal_scene,
        goal_change: state.goal_change,
        goal_vision: state.goal_vision,
        // 場面
        scene: state.scenes[0] || null,
        scenes: state.scenes,
        // 8軸スコア
        transform_vectors: transformVectors,
        priority_order: priorityOrder,
        compass_first: priorityOrder[0] || null,
        // 来た道（カテゴリ別 Phase 3）
        care_levels: state.care_levels,
        ideal_levels: state.ideal_levels,
        path_types: state.path_types,
        self_views: state.self_views,
        love_impact: state.love_impact,
        // AGA
        aga_concern: state.aga_concern,
        aga_status: state.aga_status,
        // 旧互換フィールド（結果ページが参照）
        concern_areas: concernAreas,
        concern_priority: priority,
        behavior_baseline: behaviorBaseline,
        past_attempts: state.past_attempts,
        failure_pattern: state.failure_patterns[0] || null,
        failure_patterns: state.failure_patterns,
        style_priorities: state.style_priorities,
        style_priority_top: state.style_priority_top,
        style: styleRel.style,
        relationship: styleRel.relationship,
        urgency: state.urgency,
        budget: state.budget,
        // 新5問
        self_score: state.self_score ? parseInt(state.self_score, 10) : null,
        reference_type: state.reference_type,
        rel_status: state.rel_status,
        key_scene_type: state.key_scene_type,
        past_change_exp: state.past_change_exp,
        // 属性・現在の行動習慣（Mirror分析・New Me Map生成プロンプトで使う）
        age_band: state.age_band,
        skincare_habits: state.skincare_habits,
        workout_type: state.workout_type,
      };

      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) {}

      // トラックを初回確定（すでに確定済みなら何もしない）
      setTrackOnce('fineme');
      syncTrackWithServer().catch(() => {});

      try {
        const histKey = 'fineme:diagnosis:history';
        const raw = localStorage.getItem(histKey);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ at: profile.at, version: profile.version, profile });
        if (arr.length > 20) arr.splice(0, arr.length - 20);
        localStorage.setItem(histKey, JSON.stringify(arr));
      } catch (e) {}

      // ログイン済みの場合はSupabaseにも保存（他デバイス・localStorage消去後の復元用）
      try {
        const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (sbKey) {
          const sbObj = JSON.parse(localStorage.getItem(sbKey) || 'null');
          const token = sbObj?.access_token;
          if (token) {
            fetch('/api/me/diagnosis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ raw_data: profile, track: 'fineme' }),
            }).catch(() => {});
            // 診断完了と同時にパーソナライズされた変容ステップを非同期生成
            try {
              const bd = JSON.parse(localStorage.getItem('fineme:body:data') || '{}');
              fetch('/api/me/navi-steps/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ diagnosis: profile, body_data: bd }),
              }).catch(() => {});
            } catch (_) {}
          }
        }
      } catch (e) {}

      window.location.href = '/diagnosis/result';
    }

    // Q3: care-level grid
    // 年代で「変えたい度」の初期選択だけをヒント補正する（gap計算式やスコアリング自体は変えない。
    // ユーザーはボタンでいつでも上書き可能）
    const AGE_IDEAL_HINT = { skin: { '10s':2, '20s':3, '30s':4, '40s':4, '50s_plus':4 } };

    const CARE_OPTIONS = [
      { value: 'none',         label: '気にしていない',                          color: '#9ca3af' },
      { value: 'concerned',    label: '気になっているが、まだ何もしていない',     color: '#f59e0b' },
      { value: 'self',         label: '自分なりにやっている（自己流・不定期）',   color: '#3b82f6' },
      { value: 'self_regular', label: '自己流だが、定期的に続けている',           color: '#60a5fa' },
      { value: 'pro',          label: 'プロ・サロンに定期的に任せている',         color: '#10b981' }
    ];
    const IDEAL_LABELS = ['1','2','3','4','5'];

    // 軸によって「自分なり」「プロ」の意味が実態とズレるため、4軸のみ文言を差し替える
    // （でお指摘 2026-08-06：髪は誰でも美容師に切ってもらうので全員「プロ」になってしまう等）。
    // valueは共通のまま（下流の136タイプ・優先順位計算・AI生成プロンプトは無改修で動く）
    const AXIS_CARE_LABELS = {
      fashion: {
        none: '特に意識していない（いつも同じような服を何となく着ている）',
        concerned: '気になっているが、まだ何も変えられていない',
        self: '自分なりに気をつけている（サイズ感や色を意識することがある）',
        self_regular: '自分の「勝ちパターン」が決まっていて、安定して選べている',
        pro: 'パーソナルスタイリスト・パーソナルカラー診断などプロのアドバイスを受けたことがある',
      },
      hair: {
        none: '特に何もしていない（セットもせず、そのまま）',
        concerned: '気になっているが、特に何もできていない',
        self: '自分でセット・スタイリングをしている（不定期）',
        self_regular: '毎日のスタイリング・ケア（トリートメント等）が習慣になっている',
        pro: '美容師にスタイリング・ケアまで相談しながら本格的に整えている',
      },
      hairremoval: {
        none: '特に何もしていない',
        concerned: '気になっているが、まだ何もしていない',
        self: '自己処理をしている（カミソリ・除毛クリーム等、不定期）',
        self_regular: '自己処理を習慣的に続けている',
        pro: 'サロン・クリニックで脱毛している',
      },
      teeth: {
        none: '歯科検診以外、特に何もしていない',
        concerned: '気になっているが、まだ何もしていない',
        self: '市販のホワイトニンググッズ等を使っている（不定期）',
        self_regular: 'ホワイトニング・歯科ケアを習慣的に続けている',
        pro: '歯科医院でホワイトニング・矯正など専門的なケアを受けている',
      },
    };

    // Q3を1画面8軸まとめてではなく1軸ずつ表示する（でお指摘：全部答えなきゃいけない圧が面倒に見える）
    let q3StepIndex = 0;

    function renderQ3Step() {
      const grid = document.getElementById('care-level-grid');
      if (!grid) return;
      grid.innerHTML = '';
      const area = CONCERN_AREAS[q3StepIndex];
      grid.appendChild(buildCareLevelCard(area));
      const progressEl = document.getElementById('q3-step-progress');
      if (progressEl) progressEl.textContent = (q3StepIndex + 1) + ' / ' + CONCERN_AREAS.length;
      const overallBlock = document.getElementById('care-overall-block');
      if (overallBlock) overallBlock.style.display = (q3StepIndex === CONCERN_AREAS.length - 1) ? '' : 'none';
      updateNextBtn();
    }

    function buildCareLevelCard(area) {
        const wrap = document.createElement('div');
        wrap.className = 'care-level-item';
        wrap.id = 'care-item-' + area.id;

        const labelEl = document.createElement('div');
        labelEl.className = 'care-level-label';
        labelEl.innerHTML = '<span class="care-level-icon">' + area.icon + '</span><span>' + area.label + '</span>';
        wrap.appendChild(labelEl);

        // 現在地（来た道）
        const optGroup = document.createElement('div');
        optGroup.className = 'care-level-opts';

        const axisLabels = AXIS_CARE_LABELS[area.id] || null;
        CARE_OPTIONS.forEach(opt => {
          const radioId = 'care-' + area.id + '-' + opt.value;
          const optEl = document.createElement('label');
          optEl.className = 'care-level-opt';
          optEl.htmlFor = radioId;
          const optLabel = (axisLabels && axisLabels[opt.value]) || opt.label;
          optEl.innerHTML =
            '<input type="radio" id="' + radioId + '" name="care-' + area.id + '" value="' + opt.value + '">' +
            '<span class="care-level-opt-text">' + optLabel + '</span>';

          optEl.querySelector('input').addEventListener('change', function () {
            state.care_levels[area.id] = opt.value;
            wrap.querySelectorAll('.care-level-opt').forEach(el => el.classList.remove('selected'));
            optEl.classList.add('selected');
            // 理想スコアが現在地を下回らないよう自動補正
            const mappedScore = { none:1, concerned:2, self:3, pro:4 }[opt.value] || 1;
            if (!state.ideal_levels[area.id] || parseInt(state.ideal_levels[area.id]) < mappedScore) {
              const ageHint = AGE_IDEAL_HINT[area.id]?.[state.age_band];
              const newIdeal = String(Math.max(mappedScore, ageHint || 3));
              state.ideal_levels[area.id] = newIdeal;
              idealBtns.querySelectorAll('button').forEach(b => {
                const sel = b.dataset.v === newIdeal;
                b.style.background    = sel ? '#2563eb' : '#fff';
                b.style.borderColor   = sel ? '#2563eb' : '#e5e7eb';
                b.style.color         = sel ? '#fff'    : '#374151';
              });
            }
            // AGAトグル表示制御
            if (area.hasAga) {
              const agaRow = document.getElementById('aga-row');
              if (agaRow) agaRow.style.display = (opt.value !== 'none') ? 'flex' : 'none';
            }
            updateNextBtn();
          });

          optGroup.appendChild(optEl);
        });
        wrap.appendChild(optGroup);

        // 理想スコア（変えたい度 1〜5）
        const idealWrap = document.createElement('div');
        idealWrap.style.cssText = 'margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
        idealWrap.innerHTML = '<span style="font-size:11px;font-weight:700;color:#6b7280;white-space:nowrap;">変えたい度:</span>';
        const idealBtns = document.createElement('div');
        idealBtns.style.cssText = 'display:flex;gap:4px;';
        IDEAL_LABELS.forEach(v => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = v;
          btn.dataset.v = v;
          btn.style.cssText = 'width:32px;height:32px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;font-weight:700;background:#fff;cursor:pointer;color:#374151;transition:all .12s;';
          btn.addEventListener('click', function () {
            idealBtns.querySelectorAll('button').forEach(b => {
              b.style.background = '#fff';
              b.style.borderColor = '#e5e7eb';
              b.style.color = '#374151';
            });
            btn.style.background = '#2563eb';
            btn.style.borderColor = '#2563eb';
            btn.style.color = '#fff';
            state.ideal_levels[area.id] = v;
          });
          idealBtns.appendChild(btn);
        });
        idealWrap.appendChild(idealBtns);
        const idealHint = document.createElement('span');
        idealHint.style.cssText = 'font-size:10px;color:#9ca3af;margin-left:4px;';
        idealHint.textContent = '低←→高';
        idealWrap.appendChild(idealHint);
        wrap.appendChild(idealWrap);

        // AGA分岐（髪カテゴリのみ）
        if (area.hasAga) {
          const agaRow = document.createElement('div');
          agaRow.id = 'aga-row';
          agaRow.style.cssText = 'display:none;margin-top:12px;padding:12px;background:#fefce8;border:1px solid #fde68a;border-radius:10px;align-items:flex-start;gap:10px;flex-direction:column;';
          agaRow.innerHTML = '<p style="font-size:13px;font-weight:700;color:#854d0e;margin:0 0 8px;">髪の量・薄さについて気になることはありますか？</p>';
          const agaOpts = document.createElement('div');
          agaOpts.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
          [{ v:'yes', label:'気になっている' }, { v:'no', label:'特にない' }].forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = opt.label;
            btn.style.cssText = 'padding:8px 16px;border:1.5px solid #d97706;border-radius:8px;font-size:13px;font-weight:700;background:#fff;cursor:pointer;color:#92400e;transition:all .12s;';
            btn.addEventListener('click', function () {
              agaOpts.querySelectorAll('button').forEach(b => { b.style.background='#fff'; b.style.color='#92400e'; });
              btn.style.background = '#d97706';
              btn.style.color = '#fff';
              state.aga_concern = opt.v;
              updateNextBtn();
            });
            agaOpts.appendChild(btn);
          });
          agaRow.appendChild(agaOpts);
          wrap.appendChild(agaRow);
        }

        return wrap;
    }

    (function bindCareOverallCheckbox() {
      const overallCheck = document.getElementById('care-overall-check');
      const overallWrap  = document.getElementById('care-overall-wrap');
      if (overallCheck) {
        overallCheck.addEventListener('change', function () {
          state.care_levels['overall'] = this.checked ? 'concerned' : undefined;
          if (!this.checked) delete state.care_levels['overall'];
          overallWrap.classList.toggle('selected', this.checked);
          updateNextBtn();
        });
      }
    })();

    // Q6b: 動的生成
    // Single choice handlers
    function bindSingleChoice(containerId, stateKey) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.querySelectorAll('.diag-option').forEach(btn => {
        btn.addEventListener('click', function () {
          container.querySelectorAll('.diag-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          state[stateKey] = btn.dataset.value;
          updateNextBtn();
        });
      });
    }
    bindSingleChoice('opts-q3_aga', 'aga_status');

    // Multi choice handler
    function bindMultiChoice(containerId, stateArray, noneExcludes) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.querySelectorAll('.diag-option').forEach(btn => {
        btn.addEventListener('click', function () {
          const val = btn.dataset.value;
          if (val === 'none' && noneExcludes) {
            container.querySelectorAll('.diag-option').forEach(b => b.classList.remove('selected'));
            stateArray.length = 0;
            btn.classList.add('selected');
            stateArray.push('none');
          } else {
            if (noneExcludes) {
              const noneBtn = container.querySelector('[data-value="none"]');
              if (noneBtn) noneBtn.classList.remove('selected');
              const ni = stateArray.indexOf('none');
              if (ni > -1) stateArray.splice(ni, 1);
            }
            if (btn.classList.contains('selected')) {
              btn.classList.remove('selected');
              const i = stateArray.indexOf(val);
              if (i > -1) stateArray.splice(i, 1);
            } else {
              btn.classList.add('selected');
              stateArray.push(val);
            }
          }
          updateNextBtn();
        });
      });
    }
    // Button handlers
    document.getElementById('btn-start').addEventListener('click', function () {
      screenHistory.push('instant-tryout');
      showScreen('instant-tryout');
    });
    document.getElementById('btn-start-from-preview')?.addEventListener('click', function () {
      document.getElementById('btn-start')?.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    btnNext.addEventListener('click', function () {
      goNext();
    });

    document.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', goBack);
    });

    const introStartBtn = document.getElementById('btn-q3-intro-start');
    if (introStartBtn) {
      introStartBtn.addEventListener('click', function() {
        buildAllCategoryCards();
        screenHistory.push('q3_path');
        showScreen('q3_path');
      });
    }

    // ─── Instant Tryout（D-20260713-2）───
    const TRYOUT_AXIS_MAP = {
      matching_photo: { icon: '💇‍♂️', label: '髪・ヘア',    desc: '第一印象に最も直結する軸です。' },
      matching_date:  { icon: '👔',    label: '服・コーデ',  desc: '長時間いっしょにいる人ほど、ここが効きます。' },
      love_now:       { icon: '👔',    label: '服・コーデ',  desc: '長時間いっしょにいる人ほど、ここが効きます。' },
      career:         { icon: '✨',    label: '肌・清潔感',  desc: '清潔感は信頼感の土台です。' },
      mirror:         { icon: '✂️',   label: '眉毛',        desc: '顔全体の印象で最も変化が出やすい場所です。' },
      word:           { icon: '✂️',   label: '眉毛',        desc: '顔全体の印象で最も変化が出やすい場所です。' },
      comparison:     { icon: '✂️',   label: '眉毛',        desc: '顔全体の印象で最も変化が出やすい場所です。' },
      vague:          { icon: '✂️',   label: '眉毛',        desc: '変化体験の最短経路です。変わった実感が継続の動機になります。' },
    };

    document.getElementById('opts-instant-tryout')?.querySelectorAll('.tryout-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const val = this.dataset.value;
        // お試しの回答＝Q1の回答。同じことを二度聞かない
        if (val && !state.triggers.includes(val)) state.triggers.push(val);
        const axis = TRYOUT_AXIS_MAP[val] || { icon: '✂️', label: '眉毛', desc: '顔全体の印象で最も変化が出やすい場所です。' };
        const resultEl = document.getElementById('tryout-result-axis');
        if (resultEl) {
          resultEl.innerHTML =
            '<span class="tryout-result-axis-icon">' + axis.icon + '</span>' +
            '<p class="tryout-result-axis-name">' + axis.label + '</p>' +
            '<p class="tryout-result-axis-desc">' + axis.desc + '</p>';
        }
        // お試し完了を計測
        fetch('/api/track/src?src=instant-tryout-done').catch(function() {});
        try { localStorage.setItem('fineme:diagnosis:src', 'instant-tryout-done'); } catch(e) {}
        screenHistory.push('instant-tryout-result');
        showScreen('instant-tryout-result');
      });
    });

    // 属性（年代）：登録・確認どちらも選ぶ／進むと即q3へ（でお指摘 2026-08-01）
    function renderAttrScreen(attrs) {
      state.age_band = attrs?.age_band || state.age_band;
      const valueEl = document.getElementById('attr-confirm-value');
      if (valueEl && hasRequiredAttributes(attrs)) valueEl.textContent = AGE_BANDS[attrs.age_band].label;
    }
    document.getElementById('opts-attr-register')?.querySelectorAll('.diag-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const ageBand = this.dataset.value;
        state.age_band = ageBand;
        saveAttribute({ age_band: ageBand });
        screenHistory.push('q3');
        showScreen('q3');
      });
    });
    document.getElementById('btn-attr-confirm-proceed')?.addEventListener('click', function() {
      screenHistory.push('q3');
      showScreen('q3');
    });
    document.getElementById('btn-attr-confirm-edit')?.addEventListener('click', function() {
      screenHistory.push('attr_register');
      showScreen('attr_register');
    });

    // 肌・体型の現在の行動習慣（q3_habits）
    document.getElementById('opts-habits-cleanse')?.querySelectorAll('.diag-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#opts-habits-cleanse .diag-option').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        state.skincare_habits.cleanse_freq = this.dataset.value;
        updateNextBtn();
      });
    });
    document.getElementById('opts-habits-items')?.querySelectorAll('.diag-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const val = this.dataset.value;
        const items = state.skincare_habits.items;
        if (val === 'none') {
          document.querySelectorAll('#opts-habits-items .diag-option').forEach(b => b.classList.remove('selected'));
          items.length = 0;
          this.classList.add('selected');
          items.push('none');
        } else {
          const noneBtn = document.querySelector('#opts-habits-items [data-value="none"]');
          if (noneBtn) noneBtn.classList.remove('selected');
          const ni = items.indexOf('none');
          if (ni > -1) items.splice(ni, 1);
          const i = items.indexOf(val);
          if (i > -1) { items.splice(i, 1); this.classList.remove('selected'); }
          else { items.push(val); this.classList.add('selected'); }
        }
      });
    });
    document.getElementById('opts-habits-workout')?.querySelectorAll('.diag-option').forEach(function(btn) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#opts-habits-workout .diag-option').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
        state.workout_type = this.dataset.value;
        updateNextBtn();
      });
    });

    document.getElementById('btn-tryout-continue')?.addEventListener('click', async function() {
      // 本問診開始を計測
      fetch('/api/track/src?src=instant-tryout').catch(function() {});
      try { localStorage.setItem('fineme:diagnosis:src', 'instant-tryout'); } catch(e) {}
      // 属性（年代）が必須。未登録なら登録画面、登録済みならログイン中の最新値で確認画面を出す
      // ログイン済みなら必ずサーバと同期する（端末を変えた・キャッシュが消えた等でローカルが
      // 空でも、サーバに既に登録済みなら確認画面を出す。毎回はじめから聞き直すのを防ぐ）
      let attrs = await syncAttributesWithServer();
      renderAttrScreen(attrs);
      const next = hasRequiredAttributes(attrs) ? 'attr_confirm' : 'attr_register';
      screenHistory.push(next);
      showScreen(next);
    });

    // ─── 軸ごとの描き込み（?deepen=<axisId>）───
    // 結果画面が示した1軸だけをここで深める。既存のCATEGORY_PHASE3をそのまま使う
    function startDeepen(axisId) {
      const cat = CATEGORY_PHASE3.find(c => c.id === axisId);
      const container = document.getElementById('deepen-content');
      if (!cat || !container) return false;

      let profile = null;
      try { profile = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
      if (!profile) return false;

      const answers = { path_type: null, self_view: null };
      const QUESTIONS = [
        { key:'path_type',   q:cat.path_q, opts:cat.path_opts.map(o => ({ v:o.v, t:o.t, d:o.d })) },
        { key:'self_view',   q:cat.view_q, opts:cat.view_opts.map(o => ({ v:o.v, t:o.t, d:o.d || '' })) },
      ];
      // hairremoval・nail は恋愛への影響を聞かない設計（has_love:false、love_q自体が無い）。
      // 元々ここが無条件に cat.love_opts.map(...) していたため、この2軸のdeepenは
      // 実行時に落ちていた（今回habit_qを足すのに合わせて気づいたので直す）
      if (cat.has_love) {
        answers.love_impact = null;
        QUESTIONS.push({ key:'love_impact', q:cat.love_q, opts:cat.love_opts.map(o => ({ v:o.v, t:o.t, d:o.d || '' })) });
      }
      // 残り6軸（肌・体型はコアq3_habitsで既に聞いているため対象外）は
      // 今の行動習慣を4問目として聞く（でお指摘 2026-08-01）
      if (cat.habit_q) {
        answers.habit_type = null;
        QUESTIONS.push({ key:'habit_type', q:cat.habit_q, opts:cat.habit_opts.map(o => ({ v:o.v, t:o.t, d:o.d || '' })) });
      }

      const labelEl = document.getElementById('deepen-label');
      const headEl  = document.getElementById('deepen-heading');
      if (labelEl) labelEl.textContent = `地図を描き込む｜${cat.label}`;
      if (headEl) headEl.innerHTML = `${cat.icon} ${cat.label}のことを、<br>もう少しだけ聞かせてください`;

      container.innerHTML = QUESTIONS.map((qq, qi) => `
        <div class="diag-card" style="margin-bottom:12px">
          <p style="font-size:15px;font-weight:800;color:#e8e4dc;margin:0 0 12px;line-height:1.5">${qq.q}</p>
          <div class="diag-options" data-qkey="${qq.key}">
            ${qq.opts.map(o => `
              <button class="diag-option" data-qkey="${qq.key}" data-value="${o.v}">
                <span class="diag-option-body">
                  <span class="diag-option-title">${o.t}</span>
                  ${o.d ? `<span class="diag-option-desc">${o.d}</span>` : ''}
                </span>
              </button>`).join('')}
          </div>
        </div>`).join('');

      const saveBtn = document.getElementById('btn-deepen-save');
      function refreshSaveBtn() {
        if (saveBtn) saveBtn.disabled = !Object.values(answers).every(v => !!v);
      }

      container.querySelectorAll('.diag-option').forEach(btn => {
        btn.addEventListener('click', function () {
          const key = this.dataset.qkey;
          answers[key] = this.dataset.value;
          container.querySelectorAll(`.diag-option[data-qkey="${key}"]`).forEach(b => b.classList.remove('selected'));
          this.classList.add('selected');
          refreshSaveBtn();
        });
      });
      refreshSaveBtn();

      saveBtn?.addEventListener('click', function () {
        try {
          // habit_type はスコア計算（transform_vectors）に混ぜない。優先軸を変えるためではなく
          // AI生成文の解像度を上げるための情報なので、別の場所（axis_habits）に置く
          const { habit_type, ...scoreAnswers } = answers;
          profile.transform_vectors = profile.transform_vectors || {};
          profile.transform_vectors[axisId] = Object.assign({}, profile.transform_vectors[axisId], scoreAnswers);
          profile.path_types  = Object.assign({}, profile.path_types,  { [axisId]: answers.path_type });
          profile.self_views  = Object.assign({}, profile.self_views,  { [axisId]: answers.self_view });
          if (cat.has_love) {
            profile.love_impact = Object.assign({}, profile.love_impact, { [axisId]: answers.love_impact });
          }
          if (cat.habit_q) {
            profile.axis_habits = Object.assign({}, profile.axis_habits, { [axisId]: habit_type });
          }
          profile.at = Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        } catch (e) {}
        if (typeof window.gtag === 'function') window.gtag('event', 'mescan_axis_drawn', { axis: axisId });
        window.location.href = '/diagnosis/result';
      });

      showScreen('deepen');
      return true;
    }

    const deepenAxis = new URLSearchParams(window.location.search).get('deepen');
    if (deepenAxis && startDeepen(deepenAxis)) {
      // 描き込み画面を直接開いた
    } else {
      showScreen('landing');
    }

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <main>
      <div className="diag-wrap">

        {/* Progress bar */}
        <div className="diag-progress" id="diag-progress" style={{display:'none'}}>
          <div className="diag-progress-bar">
            <div className="diag-progress-fill" id="diag-progress-fill" style={{width:'0%'}}></div>
          </div>
          <div className="diag-progress-text" id="diag-progress-text">0 / 7</div>
        </div>

        {/* SCREEN: Landing */}
        <div className="diag-screen is-active" id="screen-landing">
          <div className="diag-card">
            <div className="diag-landing">
              <p style={{fontSize:'12px',fontWeight:'700',color:'#6366f1',letterSpacing:'.06em',textTransform:'uppercase',margin:'0 0 10px'}}>Find New Me</p>
              <h1>Me Scan</h1>
              <p>今のあなたを丁寧にスキャンして、<br />あなただけの変容ナビを生成します。</p>
              <p style={{fontSize:'13px',color:'#9ca3af'}}>外見より先に、「あなたの状況」を聞きます。<br />だから答えが、本物になる。</p>
              <div className="diag-badges">
                <span className="diag-badge" style={{fontWeight:'800',background:'rgba(201,168,76,0.15)',color:'#a07830',border:'1px solid rgba(201,168,76,0.4)',fontSize:'13px',padding:'7px 14px'}}>🐉 136タイプからあなたのタイプを判定</span>
                <span className="diag-badge">⏱️ 約3分</span>
                <span className="diag-badge">🕶️ 登録不要</span>
              </div>
              <button className="diag-nav-next" id="btn-start" style={{width:'100%',fontSize:'18px',padding:'16px'}}>Me Scanをはじめる</button>
            </div>
          </div>
        </div>

        {/* Sample result preview（landing cardの直下に表示） */}
        <div id="sample-preview-block" style={{width:'100%',maxWidth:'600px',marginTop:'24px',position:'relative'}}>
          <p style={{textAlign:'center',fontSize:'10px',fontWeight:'800',letterSpacing:'.18em',color:'rgba(201,168,76,0.5)',textTransform:'uppercase',margin:'0 0 14px'}}>— スキャン結果のサンプル —</p>

          {/* TYPE HERO（全幅・Naviと同じレイアウト） */}
          <div style={{width:'100%',background:'linear-gradient(180deg,rgba(59,130,246,0.18) 0%,rgba(10,15,30,0) 100%)',textAlign:'center',padding:'32px 20px 24px',borderRadius:'18px',marginBottom:'10px',position:'relative',overflow:'hidden'}}>
            <p style={{fontSize:'10px',fontWeight:'800',letterSpacing:'.18em',color:'rgba(59,130,246,0.8)',textTransform:'uppercase',margin:'0 0 12px'}}>TYPE-HND · 髪軸</p>
            <h2 style={{fontFamily:"'Noto Serif JP',Georgia,serif",fontSize:'clamp(22px,6vw,34px)',fontWeight:'900',color:'#fff',margin:'0 0 20px',lineHeight:1.2}}>黒髪の臥す伏竜</h2>
            <div style={{width:'min(200px,60vw)',height:'min(268px,80vw)',margin:'0 auto 18px',borderRadius:'16px',overflow:'hidden',border:'2px solid rgba(59,130,246,0.4)',boxShadow:'0 0 28px rgba(59,130,246,0.18)',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(59,130,246,0.08)'}}>
              <img src="/images/types/TYPE-HND.webp" alt="伏竜" style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0,borderRadius:'14px'}} onError={(e)=>{e.currentTarget.style.display='none';const s=e.currentTarget.nextElementSibling;if(s)s.style.visibility='visible';}} />
              <span style={{fontSize:'56px',position:'relative',zIndex:0,visibility:'hidden'}}>🐉</span>
            </div>
            <p style={{fontSize:'13px',color:'rgba(232,228,220,0.5)',lineHeight:1.85,maxWidth:'260px',margin:'0 auto'}}>深き影に潜む竜。その才、まだ誰も知らない。</p>
          </div>

          {/* Compass strip */}
          <div style={{background:'rgba(10,15,30,0.75)',border:'1.5px solid rgba(201,168,76,0.3)',borderRadius:'14px',padding:'14px 16px',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',gap:'14px',marginBottom:'10px'}}>
            <span style={{fontSize:'26px',flexShrink:0}}>🧭</span>
            <div style={{flex:1}}>
              <div style={{fontSize:'10px',fontWeight:'700',color:'rgba(201,168,76,0.65)',letterSpacing:'.08em',margin:'0 0 2px'}}>Fineme Compass — 今向くべき方角</div>
              <div style={{fontSize:'16px',fontWeight:'900',color:'#fff',margin:'0 0 3px'}}>💇 髪 が最初の一手</div>
              <div style={{fontSize:'12px',color:'rgba(232,228,220,0.5)',lineHeight:1.6}}>髪型は第一印象の30%。美容院1回で「なんかいい感じ」が体感できる。</div>
            </div>
          </div>

          {/* フェードアウト＋CTA */}
          <div style={{position:'relative'}}>
            <div style={{height:'60px',background:'linear-gradient(to bottom,rgba(10,15,30,0),rgba(10,15,30,0.85))',borderRadius:'0 0 12px 12px',pointerEvents:'none'}} />
            <div style={{textAlign:'center',paddingTop:'4px'}}>
              <p style={{fontSize:'12px',color:'rgba(201,168,76,0.5)',margin:'0 0 10px',lineHeight:1.6}}>136タイプの中のあなたのタイプが生成されます</p>
              <button id="btn-start-from-preview" style={{background:'linear-gradient(135deg,#c9a84c,#e8c86a)',border:'none',cursor:'pointer',color:'#0a0f1e',fontSize:'14px',fontWeight:'800',padding:'12px 28px',borderRadius:'10px',letterSpacing:'.04em'}}>あなたのタイプを診断する →</button>
            </div>
          </div>
        </div>

        {/* SCREEN: instant-tryout（30秒・1問お試し D-20260713-2） */}
        <div className="diag-screen" id="screen-instant-tryout">
          <button className="diag-back-btn" data-back="">← 戻る</button>
          <div className="diag-card">
            <p className="diag-step-label">30秒 お試し</p>
            <h2 className="diag-q">なぜ今、外見を変えようと<br />思いましたか？</h2>
            <p className="diag-hint">一番近いものを1つ選んでください。すぐに「最初の1点」をお伝えします。</p>
            <div id="opts-instant-tryout">
              <button className="tryout-option" data-value="matching_photo"><span className="tryout-option-icon">📱</span><span className="tryout-option-title">マッチングアプリの写真で損している</span></button>
              <button className="tryout-option" data-value="matching_date"><span className="tryout-option-icon">💔</span><span className="tryout-option-title">マッチングはできるが、会うと続かない</span></button>
              <button className="tryout-option" data-value="love_now"><span className="tryout-option-icon">❤️</span><span className="tryout-option-title">好きな人に会う前に変わりたい</span></button>
              <button className="tryout-option" data-value="career"><span className="tryout-option-icon">💼</span><span className="tryout-option-title">就職・転職など大事な場面が近い</span></button>
              <button className="tryout-option" data-value="mirror"><span className="tryout-option-icon">🪞</span><span className="tryout-option-title">毎朝鏡を見て気分が上がらない</span></button>
              <button className="tryout-option" data-value="word"><span className="tryout-option-icon">💬</span><span className="tryout-option-title">言われた一言が頭から離れない</span></button>
              <button className="tryout-option" data-value="comparison"><span className="tryout-option-icon">😔</span><span className="tryout-option-title">同世代と並んで差が気になった</span></button>
              <button className="tryout-option" data-value="vague"><span className="tryout-option-icon">🌱</span><span className="tryout-option-title">明確な理由はないが変わりたい</span></button>
            </div>
          </div>
        </div>

        {/* SCREEN: instant-tryout-result */}
        <div className="diag-screen" id="screen-instant-tryout-result">
          <button className="diag-back-btn" data-back="">← 戻る</button>
          <div className="diag-card">
            <p className="diag-step-label">最初の1点</p>
            <h2 className="diag-q" style={{marginBottom:'8px'}}>あなたの最初の1点は</h2>
            <div className="tryout-result-axis" id="tryout-result-axis"></div>
            <p className="tryout-framing">これはあなたの動機から導き出した「最初の1点」です。<br />8軸すべてを測ると、別の軸が前に出ることもあります。</p>
            <button className="diag-nav-next" id="btn-tryout-continue" style={{width:'100%',marginTop:'16px'}}>8軸を測ってタイプを判定する（約3分）→</button>
          </div>
        </div>

        {/* SCREEN ATTR_REGISTER: 年代の登録（初回のみ）*/}
        <div className="diag-screen" id="screen-attr_register">
          <button className="diag-back-btn" data-back="">← 戻る</button>
          <div className="diag-card">
            <p className="diag-step-label">はじめに</p>
            <h2 className="diag-q">年代を教えてください</h2>
            <p className="diag-hint">同じ肌・体型の悩みでも、年代によって効くアプローチは変わります。あとからマイページで変更できます。</p>
            <div className="diag-options" id="opts-attr-register">
              <button className="diag-option" data-value="10s"><span className="diag-option-body"><span className="diag-option-title">10代</span></span></button>
              <button className="diag-option" data-value="20s"><span className="diag-option-body"><span className="diag-option-title">20代</span></span></button>
              <button className="diag-option" data-value="30s"><span className="diag-option-body"><span className="diag-option-title">30代</span></span></button>
              <button className="diag-option" data-value="40s"><span className="diag-option-body"><span className="diag-option-title">40代</span></span></button>
              <button className="diag-option" data-value="50s_plus"><span className="diag-option-body"><span className="diag-option-title">50代以上</span></span></button>
            </div>
          </div>
        </div>

        {/* SCREEN ATTR_CONFIRM: 年代の確認（2回目以降）*/}
        <div className="diag-screen" id="screen-attr_confirm">
          <button className="diag-back-btn" data-back="">← 戻る</button>
          <div className="diag-card">
            <p className="diag-step-label">はじめに</p>
            <h2 className="diag-q">あなたの年代：<span id="attr-confirm-value" style={{color:'#6366f1'}}></span></h2>
            <p className="diag-hint">前回登録した内容です。違っていればその場で変更できます。</p>
            <button className="diag-nav-next" id="btn-attr-confirm-proceed" style={{width:'100%',marginTop:'8px'}}>この内容で進む →</button>
            <button className="diag-back-btn" id="btn-attr-confirm-edit" style={{width:'100%',marginTop:'10px',textAlign:'center'}}>変更する</button>
          </div>
        </div>

        {/* SCREEN Q3: care-level grid */}
        <div className="diag-screen" id="screen-q3">
          <button className="diag-back-btn" data-back="">← 戻る</button>
          <div className="diag-card">
            <p className="diag-step-label">Q3｜現在地の把握</p>
            <h2 className="diag-q">それぞれについて、<br />今のあなたの状態を教えてください</h2>
            <p className="diag-hint">「気にしていない」も大切な情報です。全て正直に教えてください。</p>
            <p id="q3-step-progress" style={{fontSize:'12px',fontWeight:800,color:'#6366f1',margin:'-8px 0 4px'}}></p>
            <div id="care-level-grid">{/* JSで生成 */}</div>
            <div id="care-overall-block" style={{marginTop:'20px',paddingTop:'16px',borderTop:'2px dashed #e5e7eb'}}>
              <label className="care-overall-wrap" id="care-overall-wrap">
                <input type="checkbox" id="care-overall-check" style={{width:'20px',height:'20px',accentColor:'#6366f1',flexShrink:'0',cursor:'pointer'}} />
                <span className="care-overall-text">
                  <span style={{fontSize:'18px'}}>🪞</span>
                  <span>
                    <strong style={{display:'block',fontSize:'14px',color:'#111'}}>上記の複数をまとめてトータルで整えたい</strong>
                    <span style={{fontSize:'12px',color:'#6b7280'}}>スタイル・外見全体を一緒に考えてほしい</span>
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* SCREEN Q3_HABITS: 肌・体型の現在の行動習慣（でお指摘 2026-08-01：頻度・アイテムまで聞く） */}
        <div className="diag-screen" id="screen-q3_habits">
          <button className="diag-back-btn" data-back="">← 戻る</button>
          <div className="diag-card">
            <p className="diag-step-label">今やっていること</p>
            <h2 className="diag-q">肌・体づくりで、<br />いま実際にやっていることは？</h2>
            <p className="diag-hint">具体的なほど、提案の精度が上がります。</p>

            <p style={{fontSize:'13px',fontWeight:800,color:'#374151',margin:'18px 0 8px'}}>✨ 洗顔・クレンジングの頻度</p>
            <div className="diag-options" id="opts-habits-cleanse">
              <button className="diag-option" data-value="twice_plus"><span className="diag-option-body"><span className="diag-option-title">1日2回以上</span></span></button>
              <button className="diag-option" data-value="once"><span className="diag-option-body"><span className="diag-option-title">1日1回</span></span></button>
              <button className="diag-option" data-value="irregular"><span className="diag-option-body"><span className="diag-option-title">不定期・週数回</span></span></button>
              <button className="diag-option" data-value="rarely"><span className="diag-option-body"><span className="diag-option-title">ほとんどしない</span></span></button>
            </div>

            <p style={{fontSize:'13px',fontWeight:800,color:'#374151',margin:'18px 0 8px'}}>✨ 使っているアイテム（複数可）</p>
            <div className="diag-options" id="opts-habits-items">
              <button className="diag-option multi" data-value="lotion"><span className="diag-check">✓</span><span className="diag-option-body"><span className="diag-option-title">化粧水</span></span></button>
              <button className="diag-option multi" data-value="cream"><span className="diag-check">✓</span><span className="diag-option-body"><span className="diag-option-title">乳液・クリーム</span></span></button>
              <button className="diag-option multi" data-value="serum"><span className="diag-check">✓</span><span className="diag-option-body"><span className="diag-option-title">美容液</span></span></button>
              <button className="diag-option multi" data-value="sheet_mask"><span className="diag-check">✓</span><span className="diag-option-body"><span className="diag-option-title">シートマスク</span></span></button>
              <button className="diag-option multi" data-value="cleansing"><span className="diag-check">✓</span><span className="diag-option-body"><span className="diag-option-title">クレンジング（メイク落とし）</span></span></button>
              <button className="diag-option multi" data-value="none"><span className="diag-check">✓</span><span className="diag-option-body"><span className="diag-option-title">特に使っていない</span></span></button>
            </div>

            <div id="habits-workout-block" style={{display:'none'}}>
              <p style={{fontSize:'13px',fontWeight:800,color:'#374151',margin:'18px 0 8px'}}>💪 体型づくりの取り組み方</p>
              <div className="diag-options" id="opts-habits-workout">
                <button className="diag-option" data-value="gym"><span className="diag-option-body"><span className="diag-option-title">ジムに通っている</span></span></button>
                <button className="diag-option" data-value="bodyweight"><span className="diag-option-body"><span className="diag-option-title">自重トレーニング（自宅・公園等）</span></span></button>
                <button className="diag-option" data-value="home_equipment"><span className="diag-option-body"><span className="diag-option-title">宅トレ器具を使っている（ダンベル等）</span></span></button>
                <button className="diag-option" data-value="none"><span className="diag-option-body"><span className="diag-option-title">特に取り組んでいない</span></span></button>
              </div>
            </div>
          </div>
        </div>

        {/* SCREEN Q3_AGA: AGA深掘り（髪分岐） */}
        <div className="diag-screen" id="screen-q3_aga">
          <button className="diag-back-btn" data-back="">← 戻る</button>
          <div className="diag-card">
            <p className="diag-step-label">髪｜AGA</p>
            <h2 className="diag-q">薄毛・抜け毛について、<br />今どう向き合っていますか？</h2>
            <p className="diag-hint">正直に教えてください。この情報が経路を変えます。</p>
            <div className="diag-options" id="opts-q3_aga">
              <button className="diag-option" data-value="no_action">
                <span className="diag-option-body">
                  <span className="diag-option-title">まだ放置している・何をすればいいかわからない</span>
                  <span className="diag-option-desc">気になっているが、最初の一歩が踏み出せていない</span>
                </span>
              </button>
              <button className="diag-option" data-value="self_care">
                <span className="diag-option-body">
                  <span className="diag-option-title">市販のシャンプーや育毛剤を試している</span>
                  <span className="diag-option-desc">自己流で対処している段階</span>
                </span>
              </button>
              <button className="diag-option" data-value="consulted">
                <span className="diag-option-body">
                  <span className="diag-option-title">皮膚科やクリニックに相談したことがある</span>
                  <span className="diag-option-desc">専門家のアドバイスは受けている</span>
                </span>
              </button>
              <button className="diag-option" data-value="ongoing">
                <span className="diag-option-body">
                  <span className="diag-option-title">治療・ケアを継続中</span>
                  <span className="diag-option-desc">クリニックや薬で対処しながら進めている</span>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* SCREEN Q3_PATH: Phase 3 軸別スキャン（全軸1ページ） */}
        <div className="diag-screen" id="screen-q3_path">
          <button className="diag-back-btn" data-back="">← 戻る</button>
          <div className="diag-card" style={{marginBottom:'16px'}}>
            <p className="diag-step-label" id="q3path-label">最後の1問｜来た道</p>
            <h2 className="diag-q" id="q3path-heading">これまで、どんな道を<br />歩いてきましたか？</h2>
            <p className="diag-hint">下のチップをタップして選びます。ここまで答えると、あなたの地図の骨格が完成します。</p>
            <p id="q3path-progress" style={{fontSize:'12px',fontWeight:'700',color:'rgba(201,168,76,0.8)',margin:'8px 0 0'}}></p>
          </div>
          <div id="q3_path_content"></div>
        </div>

        {/* SCREEN DEEPEN: 軸ごとの描き込み（結果画面から1軸ずつ導かれて来る） */}
        <div className="diag-screen" id="screen-deepen">
          <div className="diag-card" style={{marginBottom:'16px'}}>
            <p className="diag-step-label" id="deepen-label">地図を描き込む</p>
            <h2 className="diag-q" id="deepen-heading"></h2>
            <p className="diag-hint">3問だけ。答えるほど、この軸のステップが具体的になります。</p>
          </div>
          <div id="deepen-content"></div>
          <button className="diag-nav-next" id="btn-deepen-save" style={{width:'100%',maxWidth:'600px',marginTop:'8px'}} disabled>地図に描き込む</button>
          <a href="/diagnosis/result" style={{display:'block',textAlign:'center',marginTop:'14px',fontSize:'13px',color:'#9ca3af',textDecoration:'none'}}>あとにする →</a>
        </div>

        {/* Navigation */}
        <div className="diag-nav" id="diag-nav" style={{display:'none'}}>
          <button className="diag-nav-next" id="btn-next" disabled>次へ</button>
        </div>

      </div>
    </main>
  );
}
