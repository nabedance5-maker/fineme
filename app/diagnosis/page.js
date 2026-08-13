'use client';
import { useEffect, useRef, useState } from 'react';
import { setTrackOnce, syncTrackWithServer } from '@/lib/track';
import { AGE_BANDS, hasRequiredAttributes, saveAttribute, syncAttributesWithServer } from '@/lib/attributes';
import { AXIS_HABIT_ITEM_LABELS, CLEANSE_FREQ_LABELS, BODY_FREQ_LABELS, HAIR_SALON_FREQ_LABELS, inferPathType, PATH_TO_CARE_LEVEL, CARE_LEVEL_SCORE } from '@/lib/axis-habits';
import { FACE_TYPE_OPTIONS, SKELETAL_TYPE_OPTIONS, PERSONAL_COLOR_OPTIONS, MBTI_OPTIONS, isMeaningfulProfileValue } from '@/lib/profile-basics';

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
      .diag-step-label { font-size: 11px; font-weight: 700; letter-spacing: .06em; color: #8a6a1a; text-transform: uppercase; margin: 0 0 8px; }
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

    // 来た道の自己申告（path_q/path_opts）は廃止。view_q/love_qはdeepen（結果画面から
    // 1軸ずつ導く客観視・恋愛への影響）でのみ使う
    const CATEGORY_PHASE3 = [
      { id:'body',    icon:'💪', label:'体型・ボディ',
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
        view_q:'自分のムダ毛って、他の人から見てどう見えていると思う？',
        view_opts:[
          {v:'better',   t:'気になるレベルではないと思う'},
          {v:'accurate', t:'自分の認識通りだと思う'},
          {v:'worse',    t:'実は気になられているかもしれない'},
          {v:'unknown',  t:'まったくわからない'},
        ],
        has_love:false },
      { id:'teeth', icon:'🦷', label:'歯・口元',
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
        view_q:'自分の爪・手元って、他の人から見てどう見えていると思う？',
        view_opts:[
          {v:'better',   t:'整って見えていると思う'},
          {v:'accurate', t:'普通 / 特に気にされないと思う'},
          {v:'worse',    t:'実はちょっと気になられているかもしれない'},
          {v:'unknown',  t:'まったくわからない'},
        ],
        has_love:false },
    ];

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
      // 現在の具体的行動（8軸すべて、Q3で軸ごとに複数選択で聞く）
      // { body:{items:[],freq:null,parts:[]}, skin:{items:[],freq:null}, hair:{items:[],salon_freq:null}, eyebrow:{items:[]}, ... }
      axis_habits: {},
      // 基本情報（任意・でお指摘 2026-08-13）。face_type/skeletal_typeは
      // fineme:body:data と語彙を共有し、Navi側の自己申告とも同期する
      height_cm: null,
      weight_kg: null,
      body_fat_pct: null,
      personal_color: null,
      face_type: null,
      skeletal_type: null,
      mbti: null,
    };

    // 既存のfineme:body:data（Naviの自己申告）に値があれば先に反映しておく
    // （Me Scanで初めて聞く場合も、Naviで既に答えていれば聞き直さない）
    try {
      const existingBodyData = JSON.parse(localStorage.getItem('fineme:body:data') || '{}');
      if (isMeaningfulProfileValue(existingBodyData.face_type)) state.face_type = existingBodyData.face_type;
      if (isMeaningfulProfileValue(existingBodyData.skeletal_type)) state.skeletal_type = existingBodyData.skeletal_type;
    } catch (e) {}

    // コアフロー＝地図の骨格ができるまでの画面。残りの設問（他人からの見え方・恋愛への影響）は
    // 結果画面から1軸ずつ deepen で導く
    const MAIN_SCREENS = ['q3','q3_aga'];
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
        // q3_agaから「戻る」で入ってきた場合は最後に答えた軸（爪）から再開、
        // それ以外（新規到達）は1軸目から
        q3StepIndex = (currentScreen === 'q3_aga') ? CONCERN_AREAS.length - 1 : 0;
      }
      currentScreen = id;
      if (id === 'q3') renderQ3Step();
      if (id === 'profile_basics') renderProfileBasics();
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
      const noNavScreens = ['landing', 'rescan_confirm', 'attr_register', 'attr_confirm', 'profile_basics', 'deepen'];
      if (noNavScreens.includes(currentScreen)) {
        navEl.style.display = 'none';
        return;
      }
      navEl.style.display = 'flex';
      updateNextBtn();
    }

    function updateNextBtn() {
      let enabled = false;
      const isLastAxisStep = q3StepIndex === CONCERN_AREAS.length - 1;
      switch (currentScreen) {
        case 'q3': {
          // 具体行動（items）は複数選択で「未選択＝何もしていない」も有効な回答なので、
          // タップ必須の項目はない（現在地は選択内容から自動算出される）
          enabled = true;
          break;
        }
        case 'q3_aga': enabled = !!state.aga_status; break;
      }
      btnNext.disabled = !enabled;
      const isFinalTap = (currentScreen === 'q3' && isLastAxisStep && state.aga_concern !== 'yes') || currentScreen === 'q3_aga';
      btnNext.textContent = isFinalTap ? '地図をつくる' : '次へ';
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
          if (state.aga_concern === 'yes') {
            next = 'q3_aga';
            break;
          }
          // ここが「地図の骨格ができた」地点。残りの軸（他人からの見え方・恋愛への影響）は
          // 結果画面から1軸ずつ導く
          if (typeof window.gtag === 'function') window.gtag('event', 'mescan_core_complete');
          saveAndFinish();
          return;
        }
        case 'q3_aga':
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

    // 変容ベクトル（理想 - 現状）。具体的行動（items・freq）から自動算出したcare_levelで確定する。
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
        // 属性・現在の具体的行動（Mirror分析・New Me Map生成プロンプトで使う）
        age_band: state.age_band,
        axis_habits: state.axis_habits,
        // 基本情報（任意）
        height_cm: state.height_cm,
        weight_kg: state.weight_kg,
        body_fat_pct: state.body_fat_pct,
        personal_color: isMeaningfulProfileValue(state.personal_color) ? state.personal_color : null,
        face_type: isMeaningfulProfileValue(state.face_type) ? state.face_type : null,
        skeletal_type: isMeaningfulProfileValue(state.skeletal_type) ? state.skeletal_type : null,
        mbti: isMeaningfulProfileValue(state.mbti) ? state.mbti : null,
      };

      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch (e) {}

      // 顔タイプ・骨格タイプはfineme:body:data（Naviの自己申告）にも書き戻す。
      // Naviでは引き続き答え直せる（でお指摘：Me Scan時点で分からなかった／後で違うと
      // 分かった場合のため）
      try {
        if (profile.face_type || profile.skeletal_type) {
          const bdKey = 'fineme:body:data';
          const bd = JSON.parse(localStorage.getItem(bdKey) || '{}');
          if (profile.face_type) bd.face_type = profile.face_type;
          if (profile.skeletal_type) bd.skeletal_type = profile.skeletal_type;
          localStorage.setItem(bdKey, JSON.stringify(bd));
        }
      } catch (e) {}

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
    // 年代で「理想値」の自動算出だけをヒント補正する（gap計算式やスコアリング自体は変えない）
    const AGE_IDEAL_HINT = { skin: { '10s':2, '20s':3, '30s':4, '40s':4, '50s_plus':4 } };

    // 軸ごとの「今の具体的行動」multi-select。body・hairは種目/アイテムの種類でグループを分ける
    // （他軸はAXIS_HABIT_ITEM_LABELSの全キーを1グループで出す）
    const HABIT_GROUPS = {
      body: [
        { title:'自宅・自重トレーニング', keys:['pushup','situp','squat_bodyweight','plank','pull_up','ab_roller','stretch','jump_rope'] },
        { title:'ジム・器具トレーニング', keys:['bench_press','chest_press_machine','squat_barbell','deadlift','lat_pulldown','dumbbell','shoulder_press','leg_press','kettlebell','hip_thrust'] },
        { title:'有酸素運動',            keys:['running','walking','cycling','swimming','stair_climbing','hiit'] },
        { title:'その他',                keys:['diet_management','protein','body_composition_tracking','yoga_pilates','personal_trainer'] },
      ],
      eyebrow: [
        { title:'自己処理',       keys:['tweezer','shaver','scissors','thread_epi','wax_epi'] },
        { title:'メイクで整える', keys:['pencil','powder','gel','home_tint','stencil','concealer_shape','growth_serum'] },
        { title:'サロン',         keys:['salon_shape','lamination','salon_tattoo'] },
      ],
      fashion: [
        { title:'選び方',         keys:['fit_check','color_coordinate','skin_tone_match','pattern_balance','fabric_texture','silhouette','body_cover'] },
        { title:'こだわりポイント', keys:['shoe_focus','accessory_coordinate','fragrance','layering','tpo'] },
        { title:'情報収集・管理', keys:['fixed_brand','trend_check','secondhand','personal_diagnosis','coordinate_record','capsule_wardrobe','seasonal_update'] },
      ],
      hair: [
        { title:'使っているケアアイテム', keys:['shampoo_market','shampoo_salon','treatment','milk','oil','scalp_care','scalp_tonic','hair_mask','hair_supplement','heat_protectant','uv_protect'] },
        { title:'スタイリング習慣',       keys:['daily_set','styling_product','iron','towel_dry','silk_pillow'] },
        { title:'カラー・パーマ',         keys:['perm_or_color','color_treatment','gray_coverage'] },
      ],
      skin: [
        { title:'基礎ケア',           keys:['lotion','cream','serum','vitamin_c','retinol','sheet_mask','sunscreen'] },
        { title:'集中ケア',           keys:['exfoliant','eye_cream','acne_care','acne_patch','spot_treatment','pore_care','cleansing'] },
        { title:'器具・生活習慣',     keys:['face_massage','beauty_device','mist_carry','sleep_hydration','inner_care'] },
        { title:'プロに頼る',         keys:['derm_visit','esthe_clinic'] },
      ],
      hairremoval: [
        { title:'ひげのケア',     keys:['razor_diy','shave_gel','beard_trim','beard_style'] },
        { title:'自宅美容機器',   keys:['cream_diy','waxing_diy','home_ipl','home_laser'] },
        { title:'プロに頼る',     keys:['salon','clinic'] },
      ],
      teeth: [
        { title:'毎日のケア',     keys:['electric_toothbrush','floss','tongue_care','mouthwash','breath_care'] },
        { title:'ホワイトニング', keys:['whitening_otc','whitening_strips','whitening_pro'] },
        { title:'歯科でのケア',   keys:['nightguard','braces','consult_only','checkup','scaling'] },
      ],
      nail: [
        { title:'セルフケア',       keys:['self_trim','self_file','file_variety','cuticle_care','nail_oil','nail_strengthener','hand_cream','top_coat'] },
        { title:'サロン・特別ケア', keys:['gel_nail','foot_care','salon'] },
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

    // 具体的行動（items・freq）から現在地・理想値を自動算出する。ユーザーへの自己申告質問は
    // 一切出さない（でお指摘：「継続してできている」等の自己評価は、家で腕立て1回だけの人と
    // 本気でトレーニングしている人を区別できず意味がない。区別できるのはプロ・専門サービスへの
    // 実際の関与だけ、という考え方でinferPathTypeが判定する）
    function recomputeAxisLevel(area) {
      const habits = state.axis_habits[area.id];
      const pathVal = inferPathType(area.id, habits);
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

    // 基本情報（任意）：身長・体重・体脂肪率・パーソナルカラー・顔タイプ・骨格タイプ・MBTI
    // 全項目スキップ可。face_type/skeletal_typeはfineme:body:data（Naviの自己申告）と
    // 語彙を共有し、Me Scan完了時にそちらへも書き戻す（でお指摘 2026-08-13）
    function buildNumberField(id, placeholder, current, onInput) {
      const input = document.createElement('input');
      input.type = 'number';
      input.id = id;
      input.placeholder = placeholder;
      if (current != null) input.value = current;
      input.style.cssText = 'width:100%;padding:12px 14px;border:2px solid rgba(201,168,76,0.2);border-radius:10px;font-size:15px;background:rgba(255,255,255,0.72);margin-bottom:10px;';
      input.addEventListener('input', function () { onInput(this.value ? Number(this.value) : null); });
      return input;
    }

    function renderProfileBasics() {
      const container = document.getElementById('profile-basics-content');
      if (!container) return;
      container.innerHTML = '';

      container.appendChild(sectionHeading('身長・体重・体脂肪率'));
      container.appendChild(buildNumberField('input-height', '身長（cm）', state.height_cm, v => { state.height_cm = v; }));
      container.appendChild(buildNumberField('input-weight', '体重（kg）', state.weight_kg, v => { state.weight_kg = v; }));
      container.appendChild(buildNumberField('input-bodyfat', '体脂肪率（%）', state.body_fat_pct, v => { state.body_fat_pct = v; }));

      container.appendChild(sectionHeading('パーソナルカラー'));
      container.appendChild(buildSingleSelectList(
        PERSONAL_COLOR_OPTIONS.map(v => ({ v, t: v })), state.personal_color,
        v => { state.personal_color = v; }
      ));

      container.appendChild(sectionHeading('顔タイプ'));
      container.appendChild(buildSingleSelectList(
        FACE_TYPE_OPTIONS.map(v => ({ v, t: v })), state.face_type,
        v => { state.face_type = v; }
      ));

      container.appendChild(sectionHeading('骨格タイプ'));
      container.appendChild(buildSingleSelectList(
        SKELETAL_TYPE_OPTIONS.map(v => ({ v, t: v })), state.skeletal_type,
        v => { state.skeletal_type = v; }
      ));

      container.appendChild(sectionHeading('MBTI'));
      container.appendChild(buildSingleSelectList(
        MBTI_OPTIONS.map(v => ({ v, t: v })), state.mbti,
        v => { state.mbti = v; }
      ));
    }

    function buildCareLevelCard(area) {
        const wrap = document.createElement('div');
        wrap.className = 'care-level-item';
        wrap.id = 'care-item-' + area.id;

        const labelEl = document.createElement('div');
        labelEl.className = 'care-level-label';
        labelEl.innerHTML = '<span class="care-level-icon">' + area.icon + '</span><span>' + area.label + '</span>';
        wrap.appendChild(labelEl);

        if (!state.axis_habits[area.id]) state.axis_habits[area.id] = { items: [] };
        const habits = state.axis_habits[area.id];
        recomputeAxisLevel(area); // 未選択でも「何もしていない」として現在地を確定させる

        // 今の具体的行動（事実ベース・複数選択）。現在地はこの回答から自動算出される
        wrap.appendChild(sectionHeading('今、実際にやっていることは？'));

        // 体型のみ、何か選んだ人だけに頻度を追加で出す（無関係な人に聞いても離脱要因）
        let bodyExtra = null;
        if (area.id === 'body') {
          bodyExtra = document.createElement('div');
          bodyExtra.id = 'body-training-extra';
          bodyExtra.style.display = habits.items.length ? '' : 'none';
          bodyExtra.appendChild(sectionHeading('取り組んでいる頻度'));
          const freqOpts = Object.entries(BODY_FREQ_LABELS).map(([v, t]) => ({ v, t }));
          bodyExtra.appendChild(buildSingleSelectList(freqOpts, habits.freq, function (v) { habits.freq = v; }));
        }

        habitGroupsFor(area.id).forEach(group => {
          wrap.appendChild(sectionHeading(group.title));
          const opts = group.keys.map(k => ({ v:k, t: AXIS_HABIT_ITEM_LABELS[area.id][k] }));
          wrap.appendChild(buildMultiSelectList(opts, habits.items, function (arr) {
            if (bodyExtra) bodyExtra.style.display = arr.length ? '' : 'none';
            recomputeAxisLevel(area);
          }));
        });

        // その他（自由記述・全軸共通、でお指摘 2026-08-13）
        wrap.appendChild(sectionHeading('他にやっていることがあれば'));
        const otherTextBox = document.createElement('textarea');
        otherTextBox.placeholder = '具体的に教えてください';
        otherTextBox.value = habits.other_note || '';
        otherTextBox.style.cssText = 'width:100%;padding:12px 14px;border:2px solid rgba(201,168,76,0.2);border-radius:10px;font-size:14px;margin-top:8px;min-height:64px;font-family:inherit;background:rgba(255,255,255,0.72);display:' + (habits.items.includes('other') ? 'block' : 'none') + ';';
        otherTextBox.addEventListener('input', function () { habits.other_note = this.value; });
        wrap.appendChild(buildMultiSelectList([{ v:'other', t:'その他（自由記述）' }], habits.items, function (arr) {
          otherTextBox.style.display = arr.includes('other') ? 'block' : 'none';
          recomputeAxisLevel(area);
        }));
        wrap.appendChild(otherTextBox);

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
          wrap.appendChild(buildSingleSelectList(freqOpts, habits.salon_freq, function (v) { habits.salon_freq = v; recomputeAxisLevel(area); }));
        }

        // AGA分岐（髪カテゴリのみ）
        if (area.hasAga) {
          const agaRow = document.createElement('div');
          agaRow.id = 'aga-row';
          agaRow.style.cssText = 'display:flex;margin-top:16px;padding:12px;background:#fefce8;border:1px solid #fde68a;border-radius:10px;align-items:flex-start;gap:10px;flex-direction:column;';
          agaRow.innerHTML = '<p style="font-size:13px;font-weight:700;color:#854d0e;margin:0 0 8px;">髪の量・薄さについて気になることはありますか？</p>';
          const agaOpts = document.createElement('div');
          agaOpts.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
          [{ v:'yes', label:'気になっている' }, { v:'no', label:'特にない' }].forEach(opt => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = opt.label;
            btn.style.cssText = 'padding:8px 16px;border:1.5px solid #d97706;border-radius:8px;font-size:13px;font-weight:700;background:' + (state.aga_concern===opt.v?'#d97706':'#fff') + ';cursor:pointer;color:' + (state.aga_concern===opt.v?'#fff':'#92400e') + ';transition:all .12s;';
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
        screenHistory.push('profile_basics');
        showScreen('profile_basics');
      });
    });
    document.getElementById('btn-attr-confirm-proceed')?.addEventListener('click', function() {
      screenHistory.push('profile_basics');
      showScreen('profile_basics');
    });
    document.getElementById('btn-attr-confirm-edit')?.addEventListener('click', function() {
      screenHistory.push('attr_register');
      showScreen('attr_register');
    });
    document.getElementById('btn-profile-basics-proceed')?.addEventListener('click', function() {
      screenHistory.push('q3');
      showScreen('q3');
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
          profile.transform_vectors = profile.transform_vectors || {};
          profile.transform_vectors[axisId] = Object.assign({}, profile.transform_vectors[axisId], answers);
          profile.self_views  = Object.assign({}, profile.self_views,  { [axisId]: answers.self_view });
          if (cat.has_love) {
            profile.love_impact = Object.assign({}, profile.love_impact, { [axisId]: answers.love_impact });
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

        {/* SCREEN PROFILE_BASICS: 基本情報（任意・でお指摘 2026-08-13） */}
        <div className="diag-screen" id="screen-profile_basics">
          <button className="diag-back-btn" data-back="">← 戻る</button>
          <div className="diag-card">
            <p className="diag-step-label">基本情報（任意）</p>
            <h2 className="diag-q">分かる範囲でだけ<br />教えてください</h2>
            <p className="diag-hint">すべて任意です。答えなくても診断は進められます。あとからマイページでも変更できます。</p>
            <div id="profile-basics-content">{/* JSで生成 */}</div>
            <button className="diag-nav-next" id="btn-profile-basics-proceed" style={{width:'100%',marginTop:'16px'}}>この内容で進む →</button>
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

        {/* SCREEN DEEPEN: 軸ごとの描き込み（結果画面から1軸ずつ導かれて来る） */}
        <div className="diag-screen" id="screen-deepen">
          <div className="diag-card" style={{marginBottom:'16px'}}>
            <p className="diag-step-label" id="deepen-label">地図を描き込む</p>
            <h2 className="diag-q" id="deepen-heading"></h2>
            <p className="diag-hint">あと少しだけ。答えるほど、この軸のステップが具体的になります。</p>
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
