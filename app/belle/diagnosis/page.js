'use client';
import { useEffect, useRef, useState } from 'react';
import { setTrackOnce, syncTrackWithServer } from '@/lib/track';
import { AGE_BANDS, hasRequiredAttributes, saveAttribute, syncAttributesWithServer } from '@/lib/attributes';
import { AXIS_HABIT_ITEM_LABELS, BELLE_MAKEUP_ITEM_LABELS, CLEANSE_FREQ_LABELS, BODY_FREQ_LABELS, BODY_PART_LABELS, HAIR_SALON_FREQ_LABELS } from '@/lib/axis-habits';

export default function BelleDiagnosisPage() {
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
    const STORAGE_KEY = 'fineme:diagnosis:belle';

    const CONCERN_AREAS = [
      { id:'body',         icon:'💪',  label:'体型・ボディ',        tier:1 },
      { id:'eyebrow',      icon:'✂️', label:'眉毛',                tier:1 },
      { id:'fashion',      icon:'👗',  label:'服・コーデ',           tier:1 },
      { id:'hair',         icon:'💇', label:'髪・ヘア',        tier:1 },
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
      { id:'fashion', icon:'👗', label:'服・コーデ',
        path_q:'服・コーデについて、これまでどんな道を歩いてきた？',
        path_opts:[
          {v:'virgin', t:'🌱 あまり考えてこなかった',              d:'いつも同じ系統のものを何となく買っている'},
          {v:'quit',   t:'🔄 変えようとしたが、しっくりこなかった', d:'試みたことはあるが、自分に合うかわからなかった'},
          {v:'blind',  t:'🤔 自分なりにこだわっているが、客観評価なし',d:'気を使っているが、外から見てどうかわからない'},
          {v:'lapsed', t:'😴 以前は気を使っていたが、最近は後回し',  d:'できていた時期があったが、今は惰性になっている'},
          {v:'doing',  t:'✅ 継続してできている',                   d:'自分のスタイルが確立している。さらに磨きたい'},
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
      care_levels: {},    // 自動算出（path_typeから導出。ラダー質問はもう出さない）
      ideal_levels: {},   // 自動算出（現在値を基準に固定オフセット。数値ピッカーはもう出さない）
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
      // 現在の具体的行動（8軸すべて、Q3で軸ごとに複数選択で聞く）
      axis_habits: {},
    };

    // コアフロー＝地図の骨格ができるまでの画面。残りの設問（他人からの見え方・恋愛への影響）は
    // 結果画面から1軸ずつ deepen で導く
    const MAIN_SCREENS = ['q3'];
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
      if (id === 'q3') q3StepIndex = 0;
      currentScreen = id;
      if (id === 'q3') renderQ3Step();
      // 画面ごとの到達をGA4へ（SPA遷移でURLが変わらないため明示送信）
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'mescan_screen', { screen_id: id, track: 'belle' });
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
      const noNavScreens = ['landing', 'rescan_confirm', 'attr_register', 'attr_confirm', 'deepen'];
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
          // 来た道（path_type）だけが必須。具体行動（items）は複数選択で「未選択＝何もしていない」も
          // 有効な回答なので必須にしない
          enabled = !!(q3Axis && state.path_types[q3Axis]);
          break;
        }
      }
      btnNext.disabled = !enabled;
      const isFinalTap = currentScreen === 'q3' && q3StepIndex === CONCERN_AREAS.length - 1;
      btnNext.textContent = isFinalTap ? '地図をつくる' : '次へ';
    }

    function goNext() {
      switch (currentScreen) {
        case 'q3': {
          if (q3StepIndex < CONCERN_AREAS.length - 1) {
            q3StepIndex++;
            renderQ3Step();
            return;
          }
          // ここが「地図の骨格ができた」地点。残りの軸（他人からの見え方・恋愛への影響）は
          // 結果画面から1軸ずつ導く
          if (typeof window.gtag === 'function') window.gtag('event', 'mescan_core_complete', { track: 'belle' });
          saveAndFinish();
          return;
        }
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

    // 来た道（path_type）→ 内部の現在値バケット。ラダー質問はもう出さないが、
    // AI生成プロンプトや旧フィールド（care_levels/concern_areas等）の互換のため内部的に保持する
    const PATH_TO_CARE_LEVEL = { virgin: 'concerned', quit: 'concerned', blind: 'self', lapsed: 'self', doing: 'pro' };
    const CARE_LEVEL_SCORE = { none: 1, concerned: 2, self: 3, self_regular: 3, pro: 4 };

    // 変容ベクトル（理想 - 現状）。来た道（path_type）の回答だけで確定する。
    // 理想値は「現在値+固定オフセット」で自動算出（変えたい度の個別質問はもう出さない）
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
        gender: 'female',
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
        // 属性・現在の具体的行動（Mirror分析・New Me Map生成プロンプトで使う）
        age_band: state.age_band,
        axis_habits: state.axis_habits,
      };

      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) {}

      // トラックを初回確定（すでに確定済みなら何もしない）
      setTrackOnce('belle');
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
              body: JSON.stringify({ raw_data: profile, track: 'belle' }),
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

      window.location.href = '/belle/diagnosis/result';
    }

    // 年代で「理想値」の自動算出だけをヒント補正する（gap計算式やスコアリング自体は変えない）
    const AGE_IDEAL_HINT = { skin: { '10s':2, '20s':3, '30s':4, '40s':4, '50s_plus':4 } };

    // 軸ごとの「今の具体的行動」multi-select。hairはアイテムとスタイリングを分け、
    // skinはBelle限定でメイクのグループを追加する（他軸はAXIS_HABIT_ITEM_LABELSの全キーを1グループ）
    const HABIT_GROUPS = {
      hair: [
        { title:'使っているケアアイテム', keys:['shampoo_market','shampoo_salon','treatment','milk','oil'] },
        { title:'スタイリング習慣',       keys:['daily_set','styling_product','iron'] },
      ],
      skin: [
        { title:'使っているアイテム', keys: Object.keys(AXIS_HABIT_ITEM_LABELS.skin) },
        { title:'メイク',           keys: Object.keys(BELLE_MAKEUP_ITEM_LABELS), labels: BELLE_MAKEUP_ITEM_LABELS },
      ],
    };
    function habitGroupsFor(axisId) {
      if (HABIT_GROUPS[axisId]) return HABIT_GROUPS[axisId];
      const labels = AXIS_HABIT_ITEM_LABELS[axisId] || {};
      return [{ title:'いま実際にやっていること', keys: Object.keys(labels) }];
    }

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

    // 来た道（path_type）から内部の現在値バケット・理想値を自動算出する
    // （変えたい度の個別質問は出さない。ユーザーには path_type だけを聞く）
    function applyPathType(area, pathVal) {
      state.path_types[area.id] = pathVal;
      const careLevel = PATH_TO_CARE_LEVEL[pathVal] || 'concerned';
      state.care_levels[area.id] = careLevel;
      const mappedScore = CARE_LEVEL_SCORE[careLevel] || 1;
      const ageHint = AGE_IDEAL_HINT[area.id]?.[state.age_band];
      state.ideal_levels[area.id] = String(Math.max(mappedScore, ageHint || 4));
    }

    function buildSingleSelectList(opts, current, onSelect) {
      const wrap = document.createElement('div');
      wrap.className = 'diag-options';
      opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'diag-option' + (current === opt.v ? ' selected' : '');
        btn.innerHTML = '<span class="diag-option-body"><span class="diag-option-title">' + opt.t + '</span>'
          + (opt.d ? '<span class="diag-option-desc" style="display:block">' + opt.d + '</span>' : '') + '</span>';
        btn.addEventListener('click', function () {
          wrap.querySelectorAll('.diag-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          onSelect(opt.v);
        });
        wrap.appendChild(btn);
      });
      return wrap;
    }

    function buildMultiSelectList(opts, currentArr, onToggle) {
      const wrap = document.createElement('div');
      wrap.className = 'diag-options';
      opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'diag-option multi' + (currentArr.includes(opt.v) ? ' selected' : '');
        btn.innerHTML = '<span class="diag-check">✓</span><span class="diag-option-body"><span class="diag-option-title">' + opt.t + '</span></span>';
        btn.addEventListener('click', function () {
          const i = currentArr.indexOf(opt.v);
          if (i > -1) { currentArr.splice(i, 1); btn.classList.remove('selected'); }
          else { currentArr.push(opt.v); btn.classList.add('selected'); }
          onToggle(currentArr);
        });
        wrap.appendChild(btn);
      });
      return wrap;
    }

    function sectionHeading(text) {
      const p = document.createElement('p');
      p.style.cssText = 'font-size:13px;font-weight:800;color:#374151;margin:18px 0 8px';
      p.textContent = text;
      return p;
    }

    function buildCareLevelCard(area) {
        const wrap = document.createElement('div');
        wrap.className = 'care-level-item';
        wrap.id = 'care-item-' + area.id;

        const labelEl = document.createElement('div');
        labelEl.className = 'care-level-label';
        labelEl.innerHTML = '<span class="care-level-icon">' + area.icon + '</span><span>' + area.label + '</span>';
        wrap.appendChild(labelEl);

        const cat = CATEGORY_PHASE3.find(c => c.id === area.id);
        if (!state.axis_habits[area.id]) state.axis_habits[area.id] = { items: [] };
        const habits = state.axis_habits[area.id];

        // ① 来た道（現在地の唯一の質問。これまでのQ3ラダーと最後の1問は統合済み）
        wrap.appendChild(sectionHeading('これまで、どんな道を歩いてきた？'));
        const pathList = buildSingleSelectList(cat.path_opts, state.path_types[area.id], function (v) {
          applyPathType(area, v);
          updateNextBtn();
        });
        wrap.appendChild(pathList);

        // ② 今の具体的行動（事実ベース・複数選択）
        // 体型のみ、筋トレ系を選んだ人だけに頻度・部位を追加で出す（無関係な人に聞いても離脱要因）
        let bodyExtra = null;
        if (area.id === 'body') {
          bodyExtra = document.createElement('div');
          bodyExtra.id = 'body-training-extra';
          const showTraining = habits.items.includes('gym_strength') || habits.items.includes('home_strength');
          bodyExtra.style.display = showTraining ? '' : 'none';
          bodyExtra.appendChild(sectionHeading('筋トレの頻度'));
          const freqOpts = Object.entries(BODY_FREQ_LABELS).map(([v, t]) => ({ v, t }));
          bodyExtra.appendChild(buildSingleSelectList(freqOpts, habits.freq, function (v) { habits.freq = v; }));
          bodyExtra.appendChild(sectionHeading('鍛えている部位（複数可）'));
          if (!habits.parts) habits.parts = [];
          const partOpts = Object.entries(BODY_PART_LABELS).map(([v, t]) => ({ v, t }));
          bodyExtra.appendChild(buildMultiSelectList(partOpts, habits.parts, function () {}));
        }

        habitGroupsFor(area.id).forEach(group => {
          wrap.appendChild(sectionHeading(group.title));
          const labelSrc = group.labels || AXIS_HABIT_ITEM_LABELS[area.id];
          const opts = group.keys.map(k => ({ v:k, t: labelSrc[k] }));
          wrap.appendChild(buildMultiSelectList(opts, habits.items, function (arr) {
            if (bodyExtra) bodyExtra.style.display = (arr.includes('gym_strength') || arr.includes('home_strength')) ? '' : 'none';
          }));
        });

        if (bodyExtra) wrap.appendChild(bodyExtra);

        // 軸別の付帯情報（頻度など。AI生成の解像度用でスコアには使わない）
        if (area.id === 'skin') {
          wrap.appendChild(sectionHeading('洗顔・クレンジングの頻度'));
          const freqOpts = Object.entries(CLEANSE_FREQ_LABELS).map(([v, t]) => ({ v, t }));
          wrap.appendChild(buildSingleSelectList(freqOpts, habits.freq, function (v) { habits.freq = v; }));
        }
        if (area.id === 'hair') {
          wrap.appendChild(sectionHeading('美容院に通う頻度'));
          const freqOpts = Object.entries(HAIR_SALON_FREQ_LABELS).map(([v, t]) => ({ v, t }));
          wrap.appendChild(buildSingleSelectList(freqOpts, habits.salon_freq, function (v) { habits.salon_freq = v; }));
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
    // 30秒お試し（instant-tryout）は廃止。年代確認へ直結し、そのままQ3（8軸×来た道）へ進む
    async function startMeScan() {
      let attrs = await syncAttributesWithServer();
      renderAttrScreen(attrs);
      const next = hasRequiredAttributes(attrs) ? 'attr_confirm' : 'attr_register';
      screenHistory.push(next);
      showScreen(next);
    }
    document.getElementById('btn-start').addEventListener('click', function () {
      // 既にMe Scan済み（Map生成の元になる診断データがローカルにある）なら、
      // 受け直すとMapが変わることを確認してから進める
      let existing = null;
      try { existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
      if (existing?.transform_vectors) {
        screenHistory.push('rescan_confirm');
        showScreen('rescan_confirm');
        return;
      }
      startMeScan();
    });
    document.getElementById('btn-rescan-proceed')?.addEventListener('click', startMeScan);
    document.getElementById('btn-rescan-cancel')?.addEventListener('click', function () {
      window.location.href = '/mypage/navi';
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


    // ─── 軸ごとの描き込み（?deepen=<axisId>）───
    // 結果画面が示した1軸だけをここで深める。既存のCATEGORY_PHASE3をそのまま使う
    function startDeepen(axisId) {
      const cat = CATEGORY_PHASE3.find(c => c.id === axisId);
      const container = document.getElementById('deepen-content');
      if (!cat || !container) return false;

      let profile = null;
      try { profile = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
      if (!profile) return false;

      // path_type（来た道）はQ3で全軸すでに回答済みなので、ここでは聞き直さない
      const answers = { path_type: profile.path_types?.[axisId] || null, self_view: null };
      const QUESTIONS = [
        { key:'self_view',   q:cat.view_q, opts:cat.view_opts.map(o => ({ v:o.v, t:o.t, d:o.d || '' })) },
      ];
      // hairremoval・nail は恋愛への影響を聞かない設計（has_love:false、love_q自体が無い）
      if (cat.has_love) {
        answers.love_impact = null;
        QUESTIONS.push({ key:'love_impact', q:cat.love_q, opts:cat.love_opts.map(o => ({ v:o.v, t:o.t, d:o.d || '' })) });
      }

      const labelEl = document.getElementById('deepen-label');
      const headEl  = document.getElementById('deepen-heading');
      if (labelEl) labelEl.textContent = `地図を描き込む｜${cat.label}`;
      if (headEl) headEl.innerHTML = `${cat.icon} ${cat.label}のことを、<br>もう少しだけ聞かせてください`;

      container.innerHTML = QUESTIONS.map(qq => `
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
          profile.transform_vectors = profile.transform_vectors || {};
          profile.transform_vectors[axisId] = Object.assign({}, profile.transform_vectors[axisId], answers);
          profile.self_views  = Object.assign({}, profile.self_views,  { [axisId]: answers.self_view });
          if (cat.has_love) {
            profile.love_impact = Object.assign({}, profile.love_impact, { [axisId]: answers.love_impact });
          }
          profile.at = Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        } catch (e) {}
        if (typeof window.gtag === 'function') window.gtag('event', 'mescan_axis_drawn', { axis: axisId, track: 'belle' });
        window.location.href = '/belle/diagnosis/result';
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
                <span className="diag-badge">⏱️ 約4分</span>
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
          <div style={{width:'100%',background:'linear-gradient(180deg,rgba(200,100,140,0.18) 0%,rgba(10,15,30,0) 100%)',textAlign:'center',padding:'32px 20px 24px',borderRadius:'18px',marginBottom:'10px',position:'relative',overflow:'hidden'}}>
            <p style={{fontSize:'10px',fontWeight:'800',letterSpacing:'.18em',color:'rgba(200,100,140,0.8)',textTransform:'uppercase',margin:'0 0 12px'}}>TYPE-ECV · 眉軸</p>
            <h2 style={{fontFamily:"'Noto Serif JP',Georgia,serif",fontSize:'clamp(22px,6vw,34px)',fontWeight:'900',color:'#fff',margin:'0 0 20px',lineHeight:1.2}}>眉の凍れる蕾</h2>
            <div style={{width:'min(200px,60vw)',height:'min(268px,80vw)',margin:'0 auto 18px',borderRadius:'16px',overflow:'hidden',border:'2px solid rgba(200,100,140,0.4)',boxShadow:'0 0 28px rgba(200,100,140,0.18)',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(200,100,140,0.08)'}}>
              <img src="/images/types/belle/TYPE-ECV.webp" alt="凍れる蕾" style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute',inset:0,borderRadius:'14px'}} onError={(e)=>{e.currentTarget.style.display='none';const s=e.currentTarget.nextElementSibling;if(s)s.style.visibility='visible';}} />
              <span style={{fontSize:'56px',position:'relative',zIndex:0,visibility:'hidden'}}>🌸</span>
            </div>
            <p style={{fontSize:'13px',color:'rgba(232,228,220,0.5)',lineHeight:1.85,maxWidth:'260px',margin:'0 auto'}}>気になっているのに、まだ動けていない。その一歩が、全てを変える。</p>
          </div>

          {/* Compass strip */}
          <div style={{background:'rgba(10,15,30,0.75)',border:'1.5px solid rgba(200,100,140,0.3)',borderRadius:'14px',padding:'14px 16px',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',gap:'14px',marginBottom:'10px'}}>
            <span style={{fontSize:'26px',flexShrink:0}}>🧭</span>
            <div style={{flex:1}}>
              <div style={{fontSize:'10px',fontWeight:'700',color:'rgba(200,100,140,0.65)',letterSpacing:'.08em',margin:'0 0 2px'}}>Belle Compass — 今向くべき方角</div>
              <div style={{fontSize:'16px',fontWeight:'900',color:'#fff',margin:'0 0 3px'}}>✂️ 眉 が最初の一手</div>
              <div style={{fontSize:'12px',color:'rgba(232,228,220,0.5)',lineHeight:1.6}}>眉は顔の印象を最も短時間・低コストで変えられる部位。1回のサロンで別人のような変化が出る。</div>
            </div>
          </div>

          {/* フェードアウト＋CTA */}
          <div style={{position:'relative'}}>
            <div style={{height:'60px',background:'linear-gradient(to bottom,rgba(10,15,30,0),rgba(10,15,30,0.85))',borderRadius:'0 0 12px 12px',pointerEvents:'none'}} />
            <div style={{textAlign:'center',paddingTop:'4px'}}>
              <p style={{fontSize:'12px',color:'rgba(200,100,140,0.6)',margin:'0 0 10px',lineHeight:1.6}}>136タイプの中のあなたのタイプが生成されます</p>
              <button id="btn-start-from-preview" style={{background:'linear-gradient(135deg,#c8648c,#e8789e)',border:'none',cursor:'pointer',color:'#fff',fontSize:'14px',fontWeight:'800',padding:'12px 28px',borderRadius:'10px',letterSpacing:'.04em'}}>あなたのタイプを診断する →</button>
            </div>
          </div>
        </div>

        {/* SCREEN RESCAN_CONFIRM: 既にMe Scan済みのユーザーが再受診しようとした時の確認
            （でお指摘 2026-08-06：Me Scanは何度も受け直すものではない。Mirrorは何度も、
            Me Scanは受け直すと今のMapが変わることを自覚した上で、という設計に変更） */}
        <div className="diag-screen" id="screen-rescan_confirm">
          <div className="diag-card">
            <p className="diag-step-label">確認</p>
            <h2 className="diag-q">もう一度、Me Scanを受けますか？</h2>
            <p className="diag-hint">すでにMe Scanを完了し、New Me Mapを作成済みです。もう一度受け直すと、今のMapの内容が変わります。</p>
            <button id="btn-rescan-proceed" className="diag-nav-next" style={{width:'100%',fontSize:'16px',padding:'14px',marginTop:'8px'}}>それでも受け直す →</button>
            <button id="btn-rescan-cancel" className="diag-back-btn" style={{width:'100%',textAlign:'center',marginTop:'12px',justifyContent:'center'}}>Mapに戻る</button>
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

        {/* SCREEN Q3: 軸ごとに「来た道」＋「今の具体的行動」を聞く */}
        <div className="diag-screen" id="screen-q3">
          <button className="diag-back-btn" data-back="">← 戻る</button>
          <div className="diag-card">
            <p className="diag-step-label">現在地の把握</p>
            <h2 className="diag-q">それぞれについて、<br />今のあなたを教えてください</h2>
            <p className="diag-hint">自己評価ではなく、実際にやっていることで教えてください。</p>
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

        {/* SCREEN DEEPEN: 軸ごとの描き込み（結果画面から1軸ずつ導かれて来る） */}
        <div className="diag-screen" id="screen-deepen">
          <div className="diag-card" style={{marginBottom:'16px'}}>
            <p className="diag-step-label" id="deepen-label">地図を描き込む</p>
            <h2 className="diag-q" id="deepen-heading"></h2>
            <p className="diag-hint">あと少しだけ。答えるほど、この軸のステップが具体的になります。</p>
          </div>
          <div id="deepen-content"></div>
          <button className="diag-nav-next" id="btn-deepen-save" style={{width:'100%',maxWidth:'600px',marginTop:'8px'}} disabled>地図に描き込む</button>
          <a href="/belle/diagnosis/result" style={{display:'block',textAlign:'center',marginTop:'14px',fontSize:'13px',color:'#9ca3af',textDecoration:'none'}}>あとにする →</a>
        </div>

        {/* Navigation */}
        <div className="diag-nav" id="diag-nav" style={{display:'none'}}>
          <button className="diag-nav-next" id="btn-next" disabled>次へ</button>
        </div>

      </div>
    </main>
  );
}
