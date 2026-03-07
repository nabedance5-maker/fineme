/**
 * home-roadmap.js
 * ヒーロー直下のセクションを生成。
 * - 診断済みユーザー → 変容ロードマップ（3フェーズ＋ゲーミフィケーション）
 * - 未診断ユーザー   → 診断結果サンプル3パターン
 */

const DIAG_KEY     = 'fineme:diagnosis:v2';
const PROGRESS_KEY = 'fineme:roadmap:progress';

const ITEMS = [
  { key: 'eyebrow',      label: '眉',     icon: '✏️', searchParam: 'eyebrow'      },
  { key: 'hair',         label: '髪',     icon: '💈', searchParam: 'hair'         },
  { key: 'body',         label: '体型',   icon: '💪', searchParam: 'gym'          },
  { key: 'skin',         label: '肌',     icon: '🧴', searchParam: 'skin'         },
  { key: 'hair_removal', label: 'ムダ毛', icon: '⚡', searchParam: 'hair_removal' },
  { key: 'teeth',        label: '歯',     icon: '😁', searchParam: 'whitening'    },
  { key: 'nail',         label: '爪',     icon: '💅', searchParam: 'nail'         },
  { key: 'makeup',       label: 'メイク', icon: '✨', searchParam: 'makeup'       },
];

// ── スコア×項目ごとのパーソナライズコピー ──────────────────────────────
// 「一般論」ではなく「あなたのスコア」に直接語りかける言葉にする。
const ITEM_COPY = {
  eyebrow: s => s <= 3
    ? `眉が${s}点。顔の輪郭を決めているのは眉です。1回のサロンで、別人のような印象になります。`
    : `眉が${s}点。「なんか清潔感ある」と思われる顔への、一番の近道がここです。`,
  hair: s => s <= 3
    ? `髪が${s}点。「垢抜けない」と言われる人の原因を辿ると、ほぼここに行き着きます。`
    : `髪が${s}点。恋愛で「清潔感がない」と感じられている人の多くが、ここで止まっています。`,
  body: s => s <= 3
    ? `体型が${s}点。服が「似合う体」になると、持っている服の全部が変わって見えます。`
    : `体型が${s}点。あと少しで、選べる着こなしの幅が大きく広がります。`,
  skin: s => s <= 3
    ? `肌が${s}点。触れたくなる肌は、スキンケアで本当に変わります。近づいた時の印象が別物になります。`
    : `肌が${s}点。ここを整えると、清潔感の「底上げ」がひとつ完成します。`,
  hair_removal: s => s <= 3
    ? `ムダ毛が${s}点。これだけで「なぜか清潔感がある人」になります。短期間で一生モノの変化です。`
    : `ムダ毛が${s}点。ここを片付けると、全体の清潔感がひとつに揃います。`,
  teeth: s => s <= 3
    ? `歯が${s}点。笑顔に自信が持てると、会話の質が変わります。距離が縮まるスピードが変わります。`
    : `歯が${s}点。ここを直すと、笑った瞬間の印象が別物になります。`,
  nail: s => s <= 3
    ? `爪が${s}点。手元は、自分が思っているより10倍見られています。`
    : `爪が${s}点。ここを整えると、あなたの「丁寧さ」が相手に伝わります。`,
  makeup: s => s <= 3
    ? `メイクが${s}点。男性のメイクは「整って見える」だけで十分です。自然な仕上がりが武器になります。`
    : `メイクが${s}点。素の清潔感を最大化するメイクを1つ覚えると、全体が揃います。`,
};

// Phase 3 固定サービス（外見の「統合・活用」フェーズ）
const FINISH_ITEMS = [
  {
    key: 'consultant', label: '外見コンサル', icon: '🧑‍⚕️', searchParam: 'consulting', isService: true,
    copy: '個々のパーツを超えた「全体の統合」へ。プロの目線で、自分では気づけない部分が変わります。',
  },
  {
    key: 'photo', label: 'プロフィール写真', icon: '📸', searchParam: 'photo', isService: true,
    copy: '変わった外見を、出会いの場に活かす最後のステップ。写真1枚で、マッチング率が変わります。',
  },
  {
    key: 'marriage', label: '婚活・出会いの場', icon: '💍', searchParam: 'marriage', isService: true,
    copy: '外見が整ったら、次は出会いの場へ。準備が整った状態で動くと、結果が全然違います。',
  },
];

// ── フェーズ分類 ──────────────────────────────────────────────────────
function classifyPhases(scores) {
  const p1 = [], p2 = [], p3 = [];
  ITEMS.forEach(item => {
    const s = scores[item.key] ?? 5;
    if      (s <= 5) p1.push({ ...item, score: s });
    else if (s <= 8) p2.push({ ...item, score: s });
    else             p3.push({ ...item, score: s });
  });
  p3.push(...FINISH_ITEMS); // Phase3には仕上げサービスを常に追加
  return { p1, p2, p3 };
}

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch { return {}; }
}
function saveProgress(data) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(data)); } catch {}
}
function getCurrentPhase(progress) {
  if (progress.phase2_complete) return 3;
  if (progress.phase1_complete) return 2;
  return 1;
}

// ── 診断済みユーザー向けレンダリング ────────────────────────────────
function renderDiagnosed(diag) {
  const { scores, result } = diag;
  const { p1, p2, p3 }    = classifyPhases(scores);
  const progress           = loadProgress();
  const currentPhase       = getCurrentPhase(progress);

  // パーソナライズされたサブコピー
  const topItem = [...p1, ...p2].sort((a, b) => a.score - b.score)[0];
  const subText = topItem
    ? `${topItem.label}が${topItem.score}点。まずここから。それだけで、今日から見た目は変わりはじめます。`
    : `すべての土台が整っています。次は、外見全体を「武器」に仕上げる段階です。`;

  const el = id => document.getElementById(id);
  if (el('roadmap-sub'))          el('roadmap-sub').textContent = subText;
  if (el('roadmap-badge-text'))   el('roadmap-badge-text').textContent = result?.badge || '診断済み';
  const phaseLabels = { 1: '清潔感の土台を作る段階', 2: '印象を引き上げる段階', 3: '全体を仕上げる段階' };
  if (el('roadmap-current-phase'))
    el('roadmap-current-phase').textContent = `Phase ${currentPhase} — ${phaseLabels[currentPhase]}`;

  // 進捗ドット更新
  for (let i = 1; i <= 3; i++) {
    const dot  = el(`phase-dot-${i}`);
    const conn = el(`phase-conn-${i}`);
    if (dot) {
      if      (i < currentPhase) { dot.className = 'roadmap-dot is-done';    dot.textContent = '✓'; }
      else if (i === currentPhase){ dot.className = 'roadmap-dot is-current'; dot.textContent = i; }
      else                        { dot.className = 'roadmap-dot is-locked';  dot.textContent = i; }
    }
    if (conn) conn.className = `roadmap-conn${i < currentPhase ? ' is-done' : ''}`;
  }

  renderPhaseBlock('roadmap-phase-1', p1, 1, currentPhase, progress);
  renderPhaseBlock('roadmap-phase-2', p2, 2, currentPhase, progress);
  renderPhaseBlock('roadmap-phase-3', p3, 3, currentPhase, progress);
  renderTop3(result, p1, p2, scores);
}

function renderPhaseBlock(elId, items, phaseNum, currentPhase, progress) {
  const block = document.getElementById(elId);
  if (!block) return;

  const isDone   = phaseNum < currentPhase;
  const isActive = phaseNum === currentPhase;
  const isLocked = phaseNum > currentPhase;
  block.className = `roadmap-phase-block${isDone ? ' is-done' : isActive ? ' is-active' : ' is-locked'}`;

  const NAMES = {
    1: '清潔感の土台を作る',
    2: '印象を引き上げる',
    3: '全体を仕上げる',
  };
  const DESCS = {
    1: 'ここが揃わないと、どんな努力も表面に出てきません。スコアの低い項目から、着実に着手します。',
    2: '土台が整ったら、次は「印象をコントロールする」段階へ。細部の積み重ねが、全体の差になります。',
    3: '個々のパーツを超えて、外見全体を統合します。写真・コンサル・出会いの場へ進みます。',
  };

  const statusClass = isDone ? 'done' : isActive ? 'active' : 'locked';
  const statusText  = isDone ? '完了' : isActive ? '進行中' : '解放待ち';
  const clickedInPhase = progress.clicks?.[phaseNum] || [];

  const itemsHtml = items.length === 0
    ? '<p style="font-size:13px;color:#6b7280;margin:8px 0;">この段階の課題はありません。</p>'
    : items.map(item => {
        const isClicked = clickedInPhase.includes(item.key);
        const copyText  = item.copy || ITEM_COPY[item.key]?.(item.score) || '';
        const searchUrl = `./pages/search.html?category=${item.searchParam}`;
        return `
        <div class="roadmap-item${isClicked ? ' is-visited' : ''}${isLocked ? ' is-locked' : ''}">
          <span class="roadmap-item-icon">${item.icon}</span>
          <div class="roadmap-item-body">
            <div class="roadmap-item-label">
              ${item.label}
              ${item.score != null ? `<span class="roadmap-item-score">${item.score}点</span>` : ''}
              ${isClicked ? '<span class="roadmap-item-visited">確認済</span>' : ''}
            </div>
            <div class="roadmap-item-copy">${copyText}</div>
          </div>
          ${!isLocked
            ? `<a class="btn btn-ghost roadmap-item-btn" href="${searchUrl}"
                onclick="roadmapTrackClick('${item.key}',${phaseNum})">サービスを見る</a>`
            : ''}
        </div>`;
      }).join('');

  const unlockHint = isActive && phaseNum < 3
    ? `<div class="roadmap-unlock-hint">
        この段階に着手したら、Phase ${phaseNum + 1} に進んでください。
        <button class="btn btn-ghost" style="font-size:12px;padding:4px 12px;margin-left:6px;"
          onclick="roadmapCompletePhase(${phaseNum})">Phase ${phaseNum} 完了 →</button>
      </div>`
    : '';

  block.innerHTML = `
    <div class="roadmap-phase-header">
      <div class="roadmap-phase-num ${statusClass}">
        ${isDone ? '✓' : `Phase ${phaseNum}`}
      </div>
      <div style="flex:1;min-width:0;">
        <div class="roadmap-phase-name">
          ${NAMES[phaseNum]}
          <span class="roadmap-status ${statusClass}">${statusText}</span>
        </div>
        <div class="roadmap-phase-desc">${DESCS[phaseNum]}</div>
      </div>
      ${isLocked ? '<span style="font-size:20px;color:#9ca3af;flex-shrink:0;">&#x1F512;</span>' : ''}
    </div>
    <div class="roadmap-items">${itemsHtml}</div>
    ${unlockHint}`;
}

function renderTop3(result, p1, p2, scores) {
  const el = document.getElementById('roadmap-top3-list');
  if (!el) return;

  const priorities = result?.priorities;
  if (priorities && priorities.length > 0) {
    el.innerHTML = priorities.slice(0, 3).map((p, i) => {
      const scoreVal = scores[p.key];
      const copy = p.desc || (p.key && ITEM_COPY[p.key] ? ITEM_COPY[p.key](scoreVal) : '');
      return `
      <div class="top3-item">
        <div class="top3-num">${i + 1}</div>
        <div class="top3-body">
          <div class="top3-label">${p.title}</div>
          <div class="top3-copy">${copy}</div>
        </div>
      </div>`;
    }).join('');
    return;
  }

  // フォールバック: p1+p2の低スコア順Top3
  const top3 = [...p1, ...p2].sort((a, b) => a.score - b.score).slice(0, 3);
  el.innerHTML = top3.map((item, i) => `
    <div class="top3-item">
      <div class="top3-num">${i + 1}</div>
      <div class="top3-body">
        <div class="top3-label">${item.icon} ${item.label} <span class="roadmap-item-score">${item.score}点</span></div>
        <div class="top3-copy">${ITEM_COPY[item.key]?.(item.score) || ''}</div>
      </div>
      <a class="btn" href="./pages/search.html?category=${item.searchParam}"
        onclick="roadmapTrackClick('${item.key}',1)"
        style="font-size:13px;flex-shrink:0;">探す</a>
    </div>`).join('');
}

// ── 未診断ユーザー向けサンプル ────────────────────────────────────────
function renderSamples() {
  const grid = document.getElementById('sample-grid');
  if (!grid) return;

  // 「これ自分だ」と感じるパターン設計
  const PATTERNS = [
    {
      badge: '全体的に低め',
      tagline: '「なんか垢抜けない」が口癖になっているタイプ。',
      phase1: ['眉(3点)', '歯(3点)', '肌(4点)', '髪(4点)'],
      phase1Copy: '眉・歯・肌の順に着手。3ヶ月で、周囲の反応が変わります。',
      accent: '#4f46e5',
    },
    {
      badge: '部分的に引っかかる',
      tagline: '他はそこそこ整っているのに、特定の部分だけ気になる。',
      phase1: ['体型(4点)', '歯(5点)'],
      phase1Copy: '体型と歯を片付けると、土台が整って全体のバランスが取れます。',
      accent: '#0891b2',
    },
    {
      badge: '土台は整っているが...',
      tagline: '見た目は悪くないのに、なぜか恋愛につながっていない。',
      phase1: ['外見コンサル', 'プロフィール写真', '婚活・出会いの場'],
      phase1Copy: '土台は十分。コンサルで全体を統合し、出会いの場に活かす段階です。',
      accent: '#059669',
    },
  ];

  grid.innerHTML = PATTERNS.map(p => `
    <div class="card" style="padding:18px;border-top:3px solid ${p.accent};">
      <div style="display:inline-block;font-size:11px;font-weight:800;padding:3px 10px;
        background:${p.accent};color:#fff;border-radius:99px;margin-bottom:10px;">${p.badge}</div>
      <p style="font-size:14px;font-weight:600;margin:0 0 10px;line-height:1.5;">${p.tagline}</p>
      <div style="margin-bottom:12px;">
        <p style="font-size:11px;font-weight:700;color:#9ca3af;margin:0 0 4px;
          text-transform:uppercase;letter-spacing:.06em;">Phase 1 — 着手項目</p>
        ${p.phase1.map(item => `<div style="font-size:13px;padding:3px 0;color:#374151;">&#9654; ${item}</div>`).join('')}
      </div>
      <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 14px;">${p.phase1Copy}</p>
      <a href="./pages/diagnosis.html" class="btn btn-ghost"
        style="font-size:13px;width:100%;text-align:center;display:block;">自分の結果を見る</a>
    </div>`).join('');
}

// ── ゲーミフィケーション ──────────────────────────────────────────────
window.roadmapTrackClick = function(itemKey, phaseNum) {
  try {
    const progress = loadProgress();
    if (!progress.clicks) progress.clicks = {};
    if (!progress.clicks[phaseNum]) progress.clicks[phaseNum] = [];
    if (!progress.clicks[phaseNum].includes(itemKey)) {
      progress.clicks[phaseNum].push(itemKey);
    }
    saveProgress(progress);
  } catch {}
};

window.roadmapCompletePhase = function(phaseNum) {
  try {
    const progress = loadProgress();
    if (phaseNum === 1) progress.phase1_complete = true;
    if (phaseNum === 2) progress.phase2_complete = true;
    progress.lastUpdated = new Date().toISOString();
    saveProgress(progress);
    init(); // 再レンダリング
  } catch {}
};

// ── 初期化 ────────────────────────────────────────────────────────────
function init() {
  try {
    const raw    = localStorage.getItem(DIAG_KEY);
    const diag   = raw ? JSON.parse(raw) : null;
    // スコアが1つ以上あれば有効（>= 8 は厳しすぎるため緩和）
    const hasDiag = diag && diag.scores && Object.keys(diag.scores).length >= 1;

    const roadmapEl = document.getElementById('roadmap-section');
    const sampleEl  = document.getElementById('sample-section');

    if (hasDiag) {
      if (roadmapEl) roadmapEl.style.display = '';
      if (sampleEl)  sampleEl.style.display  = 'none';
      renderDiagnosed(diag);
      return;
    }

    // 旧形式の診断データ（fineme:diagnosis:latest）が存在する場合 → 再診断プロンプトを表示
    const oldRaw = localStorage.getItem('fineme:diagnosis:latest');
    if (oldRaw) {
      if (roadmapEl) roadmapEl.style.display = '';
      if (sampleEl)  sampleEl.style.display  = 'none';
      renderRediagnoseBanner();
      return;
    }

    // 未診断
    if (roadmapEl) roadmapEl.style.display = 'none';
    if (sampleEl)  sampleEl.style.display  = '';
    renderSamples();
  } catch (e) {
    console.error('[home-roadmap]', e);
  }
}

function renderRediagnoseBanner() {
  const roadmapEl = document.getElementById('roadmap-section');
  if (!roadmapEl) return;
  roadmapEl.innerHTML = `
    <section class="container" style="padding:40px 0;">
      <div class="card" style="padding:28px 24px;text-align:center;max-width:520px;margin:0 auto;
        border-top:3px solid #4f46e5;">
        <div style="font-size:28px;margin-bottom:12px;">🗺️</div>
        <h2 style="font-size:18px;font-weight:800;margin:0 0 8px;color:#111827;">
          ロードマップを更新してください
        </h2>
        <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 20px;">
          以前の診断データは旧形式のため、スコアを読み込めません。<br>
          もう一度診断すると、あなた専用のロードマップが表示されます。
        </p>
        <a href="./pages/diagnosis.html" class="btn"
          style="font-size:14px;padding:10px 28px;display:inline-block;">
          診断をやり直す（1分）
        </a>
      </div>
    </section>`;
}

document.addEventListener('DOMContentLoaded', init);
