'use client';
import { useEffect, useRef } from 'react';

export default function DiagnosisStage2Page() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ─── ページ固有スタイル ───
    const style = document.createElement('style');
    style.textContent = `
      :root { --diag-max: 600px; }
      .diag-wrap { min-height: calc(100vh - 72px); display: flex; flex-direction: column; align-items: center; padding: 32px 20px 100px; background: linear-gradient(180deg, #f4f7fb 0%, #fff 60%); }
      .diag-progress { width: 100%; max-width: var(--diag-max); margin-bottom: 24px; }
      .diag-progress-bar { height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
      .diag-progress-fill { height: 100%; background: linear-gradient(90deg, #2563eb, #6366f1); border-radius: 2px; transition: width .4s ease; }
      .diag-progress-text { font-size: 12px; color: #9ca3af; margin-top: 6px; text-align: right; }
      .diag-screen { display: none; width: 100%; max-width: var(--diag-max); animation: fadeUp .25s ease; }
      .diag-screen.is-active { display: block; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .diag-back-btn { background: none; border: none; cursor: pointer; font-size: 13px; color: #9ca3af; padding: 0 0 16px; display: flex; align-items: center; gap: 4px; }
      .diag-back-btn:hover { color: #374151; }
      .diag-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px 24px; margin-bottom: 16px; box-shadow: 0 4px 24px rgba(2,6,23,.05); }
      .diag-q { font-size: clamp(17px, 4vw, 20px); font-weight: 800; line-height: 1.4; margin: 0 0 6px; color: #111; }
      .diag-hint { font-size: 13px; color: #6b7280; margin: 0 0 20px; line-height: 1.6; }
      .diag-options { display: flex; flex-direction: column; gap: 10px; }
      .diag-option { display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px; border: 2px solid #e5e7eb; border-radius: 12px; cursor: pointer; transition: border-color .12s, background .12s; text-align: left; background: #fff; width: 100%; }
      .diag-option:hover { border-color: #a5b4fc; background: rgba(99,102,241,.03); }
      .diag-option.selected { border-color: #2563eb; background: rgba(37,99,235,.05); }
      .diag-option-icon { font-size: 20px; flex-shrink: 0; line-height: 1.3; }
      .diag-option-body { flex: 1; }
      .diag-option-title { font-size: 15px; font-weight: 700; color: #111; line-height: 1.4; display: block; }
      .diag-option-desc { font-size: 13px; color: #6b7280; margin-top: 2px; line-height: 1.5; display: block; }
      .diag-nav-next { flex: 1; padding: 14px 20px; background: #111; color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: opacity .15s; width: 100%; }
      .diag-nav-next:disabled { opacity: .35; cursor: not-allowed; }
      .diag-nav-next:not(:disabled):hover { opacity: .85; }
      .diag-landing { text-align: center; padding: 16px 0 4px; }
      .diag-landing h1 { font-size: clamp(22px, 5vw, 28px); font-weight: 800; line-height: 1.3; margin: 0 0 12px; }
      .diag-landing p { font-size: 15px; color: #6b7280; line-height: 1.7; margin: 0 0 6px; }
      .diag-badges { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin: 16px 0 24px; }
      .diag-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; background: #f3f4f6; padding: 6px 12px; border-radius: 99px; color: #374151; }
      .s2-area-tags { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 20px 0 28px; }
      .s2-area-tag { display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 99px; }
      .s2-area-header { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
      .s2-area-icon { font-size: 20px; }
      .s2-area-progress { font-size: 11px; color: #9ca3af; margin-left: auto; }
      .s2-complete { text-align: center; padding: 20px 0 8px; }
      .s2-complete-icon { font-size: 48px; margin-bottom: 16px; }
      .s2-complete h2 { font-size: clamp(20px, 5vw, 26px); font-weight: 800; line-height: 1.3; margin: 0 0 12px; color: #111; }
      .s2-complete p { font-size: 15px; color: #6b7280; line-height: 1.7; margin: 0 0 24px; }
    `;
    document.head.appendChild(style);

    // ─── メインロジック ───
    const AREA_DEFS = {
      hair:    { icon: '💇‍♂️', label: '髪型・髪' },
      skin:    { icon: '✨',   label: '肌・ニキビ' },
      eyebrow: { icon: '✂️',  label: '眉毛' },
      body:    { icon: '💪',  label: '体型・体' },
      fashion: { icon: '👔',  label: '服・コーデ' },
      photo:   { icon: '📸',  label: '写真写り' },
      overall: { icon: '🪞',  label: '全体の雰囲気' },
      beard:   { icon: '💈',  label: 'ひげ' },
      teeth:   { icon: '😁',  label: '歯・口元' },
      posture: { icon: '🚶',  label: '姿勢' }
    };

    const CONCERN_AREA_KEYS = ['hair','skin','eyebrow','body','fashion','photo','overall','beard','teeth','posture'];

    const ASPIRATION_OPTS = [
      { value: 'date_romance',    icon: '❤️',  title: '好きな人との時間・デート' },
      { value: 'photo_profile',   icon: '📸',  title: '写真・SNS・プロフィール画像' },
      { value: 'daily_mirror',    icon: '🪞',  title: '毎日鏡を見る時間が楽しみになる' },
      { value: 'confidence',      icon: '✨',  title: '自分に自信を持てる感覚全般' },
      { value: 'first_impression',icon: '🤝',  title: '初対面・仕事の場面での印象' }
    ];

    const FREQUENCY_OPTS = [
      { value: 'daily',            icon: '🔥', title: '毎日' },
      { value: 'few_times_week',   icon: '📅', title: '週2〜3回' },
      { value: 'weekly',           icon: '🗓️', title: '週1回程度' },
      { value: 'few_times_month',  icon: '📆', title: '月2〜3回' },
      { value: 'monthly',          icon: '🌙', title: '月1回程度' },
      { value: 'irregular',        icon: '🌀', title: '気が向いたとき（不定期）' }
    ];

    const SELF_WHAT_OPTS = {
      hair: [
        { value: 'barbershop_monthly',  icon: '✂️',  title: '美容院・理容室に月1回以上通っている' },
        { value: 'barbershop_irregular',icon: '🪒',  title: '美容院には行くが間隔がバラバラ' },
        { value: 'self_styling',        icon: '💈',  title: '自分でセットしている（ワックス・アイロンなど）' },
        { value: 'shampoo_care',        icon: '🧴',  title: 'シャンプーやトリートメントにこだわっている' },
        { value: 'other_hair',          icon: '➕',  title: 'その他' }
      ],
      skin: [
        { value: 'basic_skincare',  icon: '💧', title: '洗顔＋化粧水などの基本ケアをしている' },
        { value: 'skincare_full',   icon: '✨', title: '美容液・乳液など複数ステップのケアをしている' },
        { value: 'acne_care',       icon: '🌿', title: 'ニキビ・肌荒れ専用のケアをしている' },
        { value: 'natural_only',    icon: '🚿', title: '特別なことはせず、洗顔程度' }
      ],
      eyebrow: [
        { value: 'self_shave',   icon: '🪒', title: 'カミソリや眉用ハサミで自分で整えている' },
        { value: 'self_tweeze',  icon: '✂️', title: 'ピンセットで自分で整えている' },
        { value: 'combined',     icon: '🔀', title: '複数の方法を組み合わせている' }
      ],
      body: [
        { value: 'gym_training',   icon: '🏋️', title: 'ジムでトレーニングしている' },
        { value: 'home_training',  icon: '🏠', title: '自宅でトレーニングしている' },
        { value: 'diet_control',   icon: '🥗', title: '食事を意識している・管理している' },
        { value: 'sports',         icon: '⚽', title: 'スポーツや運動を定期的にしている' },
        { value: 'walking',        icon: '🚶', title: 'ウォーキングや軽い運動をしている' }
      ],
      fashion: [
        { value: 'conscious_buying',icon: '🛍️', title: '服を選ぶとき見た目を意識して買っている' },
        { value: 'reference_sns',   icon: '📱', title: 'SNSやメディアでコーデを参考にしている' },
        { value: 'coordinate',      icon: '👔', title: '着回しやコーデを考えてから着ている' },
        { value: 'basic_clean',     icon: '🧺', title: '清潔感を意識している（アイロン・手入れなど）' }
      ],
      _default: [
        { value: 'light_care',     icon: '🌱', title: '軽く気にかけている程度' },
        { value: 'regular_care',   icon: '📅', title: '定期的にケアしている' },
        { value: 'intensive_care', icon: '💪', title: 'かなり意識してケアしている' }
      ]
    };

    function buildQuestionsForArea(areaKey, level) {
      const area = AREA_DEFS[areaKey];
      const questions = [];

      if (level === 'concerned') {
        questions.push({
          key: 'barrier',
          text: areaKey === 'hair'  ? '髪型・髪のケアを始めていない一番の理由は何ですか？'
               : areaKey === 'skin' ? '肌・ニキビのケアを始めていない一番の理由は何ですか？'
               : `${area.label}のケアを始めていない一番の理由は何ですか？`,
          opts: [
            { value: 'dont_know',    icon: '🗺️', title: 'どこから始めればいいかわからない' },
            { value: 'cost_worry',   icon: '💰', title: 'お金がかかりそうで踏み出せない' },
            { value: 'no_time',      icon: '⏰', title: '時間を作れていない' },
            { value: 'fear_fail',    icon: '😟', title: '変わらなかったらどうしようという不安がある' },
            { value: 'past_bad',     icon: '⚡', title: '以前に試してうまくいかなかった経験がある' },
            { value: 'not_priority', icon: '📋', title: '他にやることがあって後回しにしている' }
          ]
        });
        questions.push({
          key: 'since',
          text: `${area.label}が気になり始めたのはいつ頃ですか？`,
          opts: [
            { value: 'recently',  icon: '⚡', title: '最近（3ヶ月以内）ふと気になった' },
            { value: 'half_year', icon: '📅', title: '半年〜1年くらい前から' },
            { value: 'years',     icon: '🗓️', title: '1〜3年ほど前から' },
            { value: 'always',    icon: '🌀', title: 'ずっと前から、でもそのままにしていた' }
          ]
        });
        questions.push({ key: 'aspiration', text: `${area.label}が改善されたら、どんな場面で一番変化を感じたいですか？`, opts: ASPIRATION_OPTS });
      } else if (level === 'self') {
        const whatOpts = SELF_WHAT_OPTS[areaKey] || SELF_WHAT_OPTS['_default'];
        questions.push({
          key: 'what',
          text: `${area.label}のケアで今やっていることを教えてください`,
          opts: whatOpts
        });
        questions.push({ key: 'frequency', text: 'どのくらいの頻度でやっていますか？', opts: FREQUENCY_OPTS });
        questions.push({
          key: 'struggle',
          text: '自分でやってみて、一番困っていることは何ですか？',
          opts: [
            { value: 'no_result',       icon: '📉', title: 'やっているが変化が感じられない' },
            { value: 'inconsistent',    icon: '🔄', title: '続けられない・サボってしまう' },
            { value: 'dont_know_right', icon: '❓', title: '自分のやり方が正しいか自信がない' },
            { value: 'reached_limit',   icon: '🧱', title: '自分でできることに限界を感じている' },
            { value: 'no_feedback',     icon: '👁️', title: '客観的な意見をもらえる人がいない' }
          ]
        });
        questions.push({ key: 'aspiration', text: `${area.label}が改善されたら、どんな場面で一番変化を感じたいですか？`, opts: ASPIRATION_OPTS });
      } else if (level === 'pro') {
        questions.push({
          key: 'dissatisfaction',
          text: 'プロに任せていて、今一番満足できていないことは何ですか？',
          opts: [
            { value: 'not_changing',        icon: '📉', title: '思ったほど変化が感じられない' },
            { value: 'no_advice',           icon: '💬', title: 'アドバイスが少ない・提案が一方的' },
            { value: 'high_cost',           icon: '💰', title: 'コストが高く続けることが不安' },
            { value: 'relationship',        icon: '🤝', title: '担当の人との関係がしっくりこない' },
            { value: 'satisfied_want_more', icon: '🚀', title: '今は満足しているがもっと良くしたい' }
          ]
        });
        questions.push({ key: 'frequency', text: '通っている頻度を教えてください', opts: FREQUENCY_OPTS });
        questions.push({ key: 'aspiration', text: `${area.label}が改善されたら、どんな場面で一番変化を感じたいですか？`, opts: ASPIRATION_OPTS });
      }

      return questions;
    }

    let activeAreas = [];
    let flatSteps = [];
    let currentStep = 0;
    let totalSteps = 0;
    const stage2State = { areas: {} };

    function showScreen(id) {
      document.querySelectorAll('.diag-screen').forEach(el => el.classList.remove('is-active'));
      const el = document.getElementById(id);
      if (el) el.classList.add('is-active');
    }

    function updateProgress() {
      const pct = totalSteps === 0 ? 0 : Math.round((currentStep / totalSteps) * 100);
      document.getElementById('diag-progress-fill').style.width = pct + '%';
      document.getElementById('diag-progress-text').textContent = currentStep + ' / ' + totalSteps;
    }

    function buildOptions(opts) {
      return opts.map(o => {
        const icon = o.icon ? `<span class="diag-option-icon">${o.icon}</span>` : '';
        return `<button class="diag-option" data-value="${o.value}">${icon}<span class="diag-option-body"><span class="diag-option-title">${o.title}</span></span></button>`;
      }).join('');
    }

    function generateScreens() {
      const container = document.getElementById('dynamic-screens');
      let html = '';

      activeAreas.forEach(({ areaKey, level, questions }) => {
        const area = AREA_DEFS[areaKey];
        questions.forEach((q, qIdx) => {
          const screenId = `screen-${areaKey}-q${qIdx}`;
          const areaQNum = qIdx + 1;
          const areaQTotal = questions.length;
          html += `
<div class="diag-screen" id="${screenId}" data-area="${areaKey}" data-q="${qIdx}">
  <button class="diag-back-btn" data-back>← 戻る</button>
  <div class="diag-card">
    <div class="s2-area-header">
      <span class="s2-area-icon">${area.icon}</span>
      <span>${area.label}</span>
      <span class="s2-area-progress">${areaQNum} / ${areaQTotal}</span>
    </div>
    <h2 class="diag-q">${q.text}</h2>
    <p class="diag-hint">今の状況に一番近いものを選んでください。</p>
    <div class="diag-options" id="opts-${areaKey}-q${qIdx}">
      ${buildOptions(q.opts)}
    </div>
  </div>
</div>`;
        });
      });

      container.innerHTML = html;

      container.querySelectorAll('.diag-option').forEach(btn => {
        btn.addEventListener('click', function () {
          const screen = this.closest('.diag-screen');
          screen.querySelectorAll('.diag-option').forEach(b => b.classList.remove('selected'));
          this.classList.add('selected');
          const areaKey = screen.dataset.area;
          const qIdx = parseInt(screen.dataset.q, 10);
          const qKey = activeAreas.find(a => a.areaKey === areaKey).questions[qIdx].key;
          if (!stage2State.areas[areaKey]) stage2State.areas[areaKey] = {};
          stage2State.areas[areaKey][qKey] = this.dataset.value;
          setTimeout(() => advanceStep(), 220);
        });
      });

      container.querySelectorAll('[data-back]').forEach(btn => {
        btn.addEventListener('click', goBack);
      });
    }

    function advanceStep() {
      currentStep++;
      updateProgress();
      if (currentStep >= totalSteps) {
        saveAndFinishStage2();
        return;
      }
      const step = flatSteps[currentStep];
      showScreen(`screen-${step.areaKey}-q${step.qIdx}`);
    }

    function goBack() {
      if (currentStep === 0) {
        showScreen('screen-landing');
        document.getElementById('diag-progress').style.display = 'none';
        return;
      }
      currentStep--;
      updateProgress();
      const step = flatSteps[currentStep];
      showScreen(`screen-${step.areaKey}-q${step.qIdx}`);
    }

    function saveAndFinishStage2() {
      showScreen('screen-complete');
      const result = { at: Date.now(), areas: stage2State.areas };
      localStorage.setItem('fineme:diagnosis:stage2', JSON.stringify(result));
      setTimeout(function () {
        window.location.href = '/diagnosis/result?stage2=1';
      }, 1800);
    }

    function init() {
      let stage1 = null;
      try {
        const raw = localStorage.getItem('fineme:diagnosis:latest');
        if (raw) stage1 = JSON.parse(raw);
      } catch (e) {}

      const careLevels = (stage1 && stage1.care_levels) ? stage1.care_levels : null;

      if (!careLevels) {
        window.location.href = '/diagnosis/result';
        return;
      }

      CONCERN_AREA_KEYS.forEach(key => {
        const level = careLevels[key];
        if (level && level !== 'none') {
          const questions = buildQuestionsForArea(key, level);
          if (questions.length > 0) {
            activeAreas.push({ areaKey: key, level, questions });
          }
        }
      });

      if (activeAreas.length === 0) {
        window.location.href = '/diagnosis/result';
        return;
      }

      activeAreas.forEach(({ areaKey, questions }) => {
        questions.forEach((q, qIdx) => {
          flatSteps.push({ areaKey, qIdx, questionDef: q });
        });
      });
      totalSteps = flatSteps.length;

      const tagsEl = document.getElementById('landing-area-tags');
      if (tagsEl) {
        tagsEl.innerHTML = activeAreas.map(({ areaKey }) => {
          const area = AREA_DEFS[areaKey];
          return `<span class="s2-area-tag"><span>${area.icon}</span>${area.label}</span>`;
        }).join('');
      }

      generateScreens();

      document.getElementById('btn-start').addEventListener('click', function () {
        document.getElementById('diag-progress').style.display = 'block';
        updateProgress();
        if (flatSteps.length > 0) {
          const first = flatSteps[0];
          showScreen(`screen-${first.areaKey}-q${first.qIdx}`);
        } else {
          saveAndFinishStage2();
        }
      });
    }

    init();

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
          <div className="diag-progress-text" id="diag-progress-text">0 / 0</div>
        </div>

        {/* SCREEN: Landing */}
        <div className="diag-screen is-active" id="screen-landing">
          <div className="diag-card">
            <div className="diag-landing">
              <p style={{fontSize:'12px',fontWeight:'700',color:'#6366f1',letterSpacing:'.06em',textTransform:'uppercase',margin:'0 0 10px'}}>Stage 2 — Deep Profile</p>
              <h1>地図をさらに<br />詳しくする</h1>
              <p>Stage 1で「気になっている」「取り組んでいる」と答えたエリアについて、もう少し詳しく教えてください。</p>
              <p style={{fontSize:'13px',color:'#9ca3af'}}>あなただけの変容ロードマップが、さらに精度を増します。</p>
              <div className="diag-badges">
                <span className="diag-badge">⏱️ 約3〜5分</span>
                <span className="diag-badge">🗺️ ロードマップ強化</span>
              </div>
              <div className="s2-area-tags" id="landing-area-tags"></div>
              <button className="diag-nav-next" id="btn-start" style={{width:'100%',fontSize:'18px',padding:'16px'}}>詳細診断をはじめる</button>
            </div>
          </div>
        </div>

        {/* Dynamic question screens (generated by JS) */}
        <div id="dynamic-screens"></div>

        {/* SCREEN: Complete */}
        <div className="diag-screen" id="screen-complete">
          <div className="diag-card">
            <div className="s2-complete">
              <div className="s2-complete-icon">🗺️</div>
              <h2>地図が完成しました</h2>
              <p>あなたの変容プロファイルが<br />より詳細になりました。<br />ロードマップを更新しています…</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
