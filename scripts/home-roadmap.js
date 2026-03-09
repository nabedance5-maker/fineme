/**
 * home-roadmap.js
 * ヒーロー直下のセクションを生成。
 * - 診断済みユーザー → 変容ロードマップ（3フェーズ＋ゲーミフィケーション）
 * - 未診断ユーザー   → 診断結果サンプル3パターン
 */

const DIAG_KEY_V2  = 'fineme:diagnosis:v2';
const DIAG_KEY_V4  = 'fineme:diagnosis:latest';
const PROGRESS_KEY = 'fineme:roadmap:progress';

// v4形式（変容プロファイル）をv2形式のscores/resultに変換
function adaptV4toDiag(v4) {
  if (!v4 || v4.version !== 'v4') return null;
  // concern_areas の気になり度（0-4）をスコア（1-10）に変換
  // すごく(4)→1点, かなり(3)→3点, そこそこ(2)→5点, 少し(1)→7点, 全然(0)→10点
  const levelToScore = [10, 7, 5, 3, 1];
  // ⚠️ v4にない項目はデフォルト10（Phase3=気にしていない）にする
  // デフォルト5にすると未回答項目がすべてPhase1に出てしまうバグを防ぐ
  const ALL_KEYS = ['eyebrow','hair','body','skin','hair_removal','teeth','nail','makeup','fashion'];
  const scores = {};
  ALL_KEYS.forEach(k => { scores[k] = 10; }); // 全項目をまず「気にしていない」で初期化
  const areaMap = { hair:'hair', skin:'skin', eyebrow:'eyebrow', body:'body', fashion:'fashion' };
  // photo/overallはFINISH_ITEMSに任せるためITEMSに含めない
  for (const [area, level] of Object.entries(v4.concern_areas || {})) {
    const key = areaMap[area];
    if (key) scores[key] = levelToScore[level] ?? 10;
  }
  // urgencyが高い場合、気になり度が高い項目のみスコアを下げてPhase1に集中
  if (v4.urgency === 'high') {
    for (const k in scores) {
      if (scores[k] <= 5) scores[k] = Math.max(1, scores[k] - 2);
    }
  }
  // バッジテキスト
  const triggerBadge = {
    matching_app:'マッチングアプリ向け', love:'恋愛向け',
    career:'キャリア向け', word:'気になり解消', vague:'外見磨き中'
  };
  return {
    scores,
    result: {
      badge: triggerBadge[v4.trigger] || '診断済み',
      trigger: v4.trigger,
      style: v4.style,
      urgency: v4.urgency,
      failure_pattern: v4.failure_pattern,
    }
  };
}

const ITEMS = [
  { key: 'eyebrow',      label: '眉',     icon: '✏️', searchParam: 'eyebrow'      },
  { key: 'hair',         label: '髪',     icon: '💈', searchParam: 'hair'         },
  { key: 'body',         label: '体型',   icon: '💪', searchParam: 'gym'          },
  { key: 'skin',         label: '肌',     icon: '🧴', searchParam: 'skin'         },
  { key: 'hair_removal', label: 'ムダ毛', icon: '⚡', searchParam: 'hair_removal' },
  { key: 'teeth',        label: '歯',     icon: '😁', searchParam: 'whitening'    },
  { key: 'nail',         label: '爪',     icon: '💅', searchParam: 'nail'         },
  { key: 'makeup',       label: 'メイク', icon: '✨', searchParam: 'makeup'       },
  { key: 'fashion',     label: '服・コーデ', icon: '👔', searchParam: 'fashion'   },
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
  fashion: s => s <= 3
    ? `服・コーデが気になっている。サイズ感と色だけで、印象は別物になります。体型より「選び方」で変えられます。`
    : `服・コーデを整える段階。パーソナルスタイリストに1度見てもらうと、自分に合う軸ができます。`,
};

// ── ⑤予約連携用: サービスカテゴリ → ロードマップitemKeyマッピング ────
// 将来、予約システムから「category: 'gym'」が届いたとき、
// このマップで 'body' アイテムにチェックを入れる。
const CATEGORY_TO_ITEM = {
  eyebrow:      'eyebrow',
  hair:         'hair',
  gym:          'body',
  skin:         'skin',
  hair_removal: 'hair_removal',
  whitening:    'teeth',
  nail:         'nail',
  makeup:       'makeup',
  consulting:   'consultant',
  photo:        'photo',
  marriage:     'marriage',
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
  if (progress.all_complete)    return 4; // 全フェーズ完了
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
    ? `${topItem.label}が${topItem.score}点。まずここだけ片付けろ。それだけで、周囲の反応が変わり始める。`
    : `土台は整った。次は外見全体を武器に変える段階だ。`;

  const el = id => document.getElementById(id);
  if (el('roadmap-sub'))        el('roadmap-sub').textContent = currentPhase === 4
    ? '外見の第一章が完了しました。次は、それを人生に活かす番です。'
    : subText;
  if (el('roadmap-badge-text')) el('roadmap-badge-text').textContent = result?.badge || '診断済み';
  const phaseLabels = { 1: '清潔感の土台を作る段階', 2: '印象を引き上げる段階', 3: '全体を仕上げる段階' };
  if (el('roadmap-current-phase'))
    el('roadmap-current-phase').textContent = currentPhase === 4
      ? '変容の第一章、完了'
      : `Phase ${currentPhase} — ${phaseLabels[currentPhase]}`;

  // 進捗ドット更新（currentPhase=4 のとき全ドットが完了）
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

  // 全フェーズ完了バナー
  const phase3Block = document.getElementById('roadmap-phase-3');
  const existingBanner = document.getElementById('rm-all-done-banner');
  if (currentPhase === 4 && phase3Block && !existingBanner) {
    const banner = document.createElement('div');
    banner.id = 'rm-all-done-banner';
    banner.style.cssText = 'background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:20px;margin-top:16px;text-align:center;';
    banner.innerHTML = `
      <p style="font-size:16px;font-weight:800;margin:0 0 6px;color:#15803d;">✓ 変容の第一章、完了</p>
      <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0 0 16px;">
        外見は放置すると崩れる。3ヶ月後に再診断して、<br>今日の自分を基準点にしろ。
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
        <a href="./pages/diagnosis.html" class="btn" style="font-size:13px;">3ヶ月後に再診断する</a>
        <a href="./pages/mypage/index.html" class="btn btn-ghost" style="font-size:13px;">マイページへ</a>
      </div>`;
    phase3Block.insertAdjacentElement('afterend', banner);
  } else if (currentPhase !== 4 && existingBanner) {
    existingBanner.remove();
  }
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
    1: '「なんか垢抜けない」の原因は、ほぼここにある。1つ片付けるだけで、何も変えていないのに周囲の反応が変わり始める。',
    2: '清潔感は出た。次は「なぜか気になる人」になる段階だ。ここを越えると、自分への自信の持ち方が変わる。',
    3: '一人でできる限界は、ここまでやり切った。プロに仕上げてもらう。整った外見で出会いの場に出たとき、それ以前とは別次元の体験になる。',
  };
  const PHASE_META = {
    1: '目安 1〜3ヶ月',
    2: '目安 2〜4ヶ月',
    3: '目安 1〜2ヶ月',
  };

  const statusClass = isDone ? 'done' : isActive ? 'active' : 'locked';
  const statusText  = isDone ? '完了' : isActive ? '進行中' : '解放待ち';
  const clickedInPhase = progress.clicks?.[phaseNum]  || [];
  const checkedInPhase = progress.checked?.[phaseNum] || [];

  const itemsHtml = items.length === 0
    ? '<p style="font-size:13px;color:#6b7280;margin:8px 0;">この段階の課題はありません。</p>'
    : items.map(item => {
        const isClicked = clickedInPhase.includes(item.key);
        const isChecked = checkedInPhase.includes(item.key);
        const copyText  = item.copy || ITEM_COPY[item.key]?.(item.score) || '';
        const searchUrl = `./pages/search.html?category=${item.searchParam}`;
        return `
        <div class="roadmap-item${isChecked ? ' is-checked' : isClicked ? ' is-visited' : ''}${isLocked ? ' is-locked' : ''}">
          <span class="roadmap-item-icon">${item.icon}</span>
          <div class="roadmap-item-body">
            <div class="roadmap-item-label">
              ${item.label}
              ${item.score != null ? `<span class="roadmap-item-score">${item.score}点</span>` : ''}
              ${isChecked ? '<span class="roadmap-item-checked-badge">完了</span>' : isClicked ? '<span class="roadmap-item-visited">確認済</span>' : ''}
            </div>
            <div class="roadmap-item-copy">${copyText}</div>
          </div>
          ${!isLocked ? `
            <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
              <a class="btn btn-ghost roadmap-item-btn" href="${searchUrl}"
                style="font-size:12px;padding:4px 10px;white-space:nowrap;"
                onclick="roadmapTrackClick('${item.key}',${phaseNum})">サービスを見る</a>
              <button class="roadmap-check-btn${isChecked ? ' is-done' : ''}"
                onclick="roadmapCheckItem('${item.key}',${phaseNum})">
                ${isChecked ? '✓ やった' : 'やった'}
              </button>
            </div>` : ''}
        </div>`;
      }).join('');

  const unlockHint = isActive && phaseNum < 3
    ? `<div class="roadmap-unlock-hint">
        この段階に着手したら、Phase ${phaseNum + 1} に進んでください。
        <button class="btn btn-ghost" style="font-size:12px;padding:4px 12px;margin-left:6px;"
          onclick="roadmapCompletePhase(${phaseNum})">Phase ${phaseNum} 完了 →</button>
      </div>`
    : isActive && phaseNum === 3
    ? `<div class="roadmap-unlock-hint">
        全ての項目に取り組んだら、変容の第一章を完了しましょう。
        <button class="btn btn-ghost" style="font-size:12px;padding:4px 12px;margin-left:6px;"
          onclick="roadmapCompletePhase(3)">変容の第一章を完了する ✨</button>
      </div>`
    : '';

  const revertHint = isActive && phaseNum > 1
    ? `<div class="roadmap-unlock-hint" style="margin-top:8px;">
        <button class="btn btn-ghost" style="font-size:12px;padding:4px 12px;color:#6b7280;"
          onclick="roadmapRevertPhase(${phaseNum})">← Phase ${phaseNum - 1} に戻す</button>
      </div>`
    : '';

  const lockedTeaser = isLocked && phaseNum === 3
    ? `<div style="margin-top:12px;padding:12px 14px;background:#f5f3ff;border-radius:8px;border-left:3px solid #4f46e5;">
        <p style="font-size:11px;font-weight:700;color:#4f46e5;margin:0 0 4px;text-transform:uppercase;letter-spacing:.05em;">Phase 3 を越えた人の世界</p>
        <p style="font-size:12px;color:#374151;margin:0;line-height:1.8;">眉・歯・肌を整え、外見コンサルを受け、プロフィール写真を撮った。<br>それだけで、出会いの場での反応は別次元になる。</p>
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
          ${!isDone ? `<span style="font-size:11px;font-weight:400;color:#9ca3af;margin-left:6px;">${PHASE_META[phaseNum]}</span>` : ''}
        </div>
        <div class="roadmap-phase-desc">${DESCS[phaseNum]}</div>
      </div>
      ${isLocked ? '<span style="font-size:20px;color:#9ca3af;flex-shrink:0;">&#x1F512;</span>' : ''}
    </div>
    <div class="roadmap-items">${itemsHtml}</div>
    ${lockedTeaser}${unlockHint}${revertHint}`;
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

// ── UI ヘルパー ───────────────────────────────────────────────────────
function injectRoadmapStyles() {
  if (document.getElementById('rm-styles')) return;
  const s = document.createElement('style');
  s.id = 'rm-styles';
  s.textContent = `
    .roadmap-item.is-checked { background:#f0fdf4 !important; }
    .roadmap-item-checked-badge { display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;background:#16a34a;color:#fff;border-radius:99px;margin-left:6px;vertical-align:middle; }
    .roadmap-check-btn { display:block;font-size:12px;padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:600;white-space:nowrap;border:1.5px solid #d1d5db;background:#fff;color:#374151;line-height:1.4; }
    .roadmap-check-btn.is-done { background:#111;color:#fff;border-color:#111; }
    .rm-toast { position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 20px;border-radius:99px;font-size:14px;font-weight:600;z-index:9999;white-space:nowrap;pointer-events:none;transition:opacity .4s; }
    .rm-overlay { position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px; }
    .rm-modal { background:#fff;border-radius:16px;padding:28px 24px;max-width:360px;width:100%;text-align:center; }
  `;
  document.head.appendChild(s);
}

const _ITEM_LABELS_ALL = {
  eyebrow:'眉', hair:'髪', body:'体型', skin:'肌', hair_removal:'ムダ毛',
  teeth:'歯', nail:'爪', makeup:'メイク',
  consultant:'外見コンサル', photo:'プロフィール写真', marriage:'婚活・出会いの場',
};

function showToast(itemKey) {
  document.querySelector('.rm-toast')?.remove();
  const label = _ITEM_LABELS_ALL[itemKey] || itemKey;
  const el = document.createElement('div');
  el.className = 'rm-toast';
  el.textContent = `✓ ${label}、チェックしました`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; }, 1800);
  setTimeout(() => el.remove(), 2200);
}

function showInlineError(phaseNum) {
  const block = document.getElementById(`roadmap-phase-${phaseNum}`);
  if (!block || block.querySelector('.rm-inline-err')) return;
  const el = document.createElement('div');
  el.className = 'rm-inline-err';
  el.style.cssText = 'font-size:12px;color:#ef4444;padding:8px 12px;background:#fef2f2;border-radius:6px;margin-top:8px;';
  el.textContent = '1つ以上「やった」にチェックを付けてから進んでください';
  block.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showPhaseCompleteModal(phaseNum) {
  const DATA = {
    1: { icon: '🎉', title: 'Phase 2 解放！', sub: '清潔感の土台が整いました。次は「印象を引き上げる」段階へ。' },
    2: { icon: '🏆', title: 'Phase 3 解放！', sub: '印象アップが完了。いよいよ外見全体を統合する最終段階です。' },
    3: { icon: '✨', title: '変容の第一章、完了。', sub: '外見が変わった。これは維持するものだ。放置すれば崩れる。3ヶ月後に再診断して、今日の自分を基準点にしろ。' },
  };
  const d = DATA[phaseNum];
  if (!d) return;
  const isAllDone = phaseNum === 3;
  const overlay = document.createElement('div');
  overlay.className = 'rm-overlay';
  overlay.innerHTML = `
    <div class="rm-modal">
      <div style="font-size:40px;margin-bottom:12px;">${d.icon}</div>
      <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;">${d.title}</h2>
      <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 16px;">${d.sub}</p>
      ${isAllDone
        ? `<div style="background:#f0fdf4;border-radius:10px;padding:12px;margin-bottom:20px;">
            <p style="font-size:13px;font-weight:700;color:#15803d;margin:0 0 4px;">3ヶ月後に再診断しよう</p>
            <p style="font-size:12px;color:#6b7280;margin:0;">外見の変化は時間をかけて現れます。定期的なスコア確認で、成長を見える化しましょう。</p>
          </div>`
        : `<div style="background:#f4f4ff;border-radius:10px;padding:12px;margin-bottom:20px;">
            <p style="font-size:13px;font-weight:700;color:#4f46e5;margin:0 0 4px;">取り組みの成果を確認しましょう</p>
            <p style="font-size:12px;color:#6b7280;margin:0;">再診断でスコアが上がれば、次のフェーズが自動で解放されます。</p>
          </div>`
      }
      <div style="display:flex;flex-direction:column;gap:8px;">
        <a href="./pages/diagnosis.html" class="btn" style="text-align:center;">${isAllDone ? '3ヶ月後に再診断する' : '再診断してスコアを更新する'}</a>
        <button class="btn btn-ghost rm-modal-close" style="text-align:center;">${isAllDone ? 'マイページへ' : 'このまま続ける'}</button>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('.rm-modal-close').addEventListener('click', () => {
    overlay.remove();
    if (isAllDone) location.href = './pages/mypage/index.html';
  });
  document.body.appendChild(overlay);
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

window.roadmapRevertPhase = function(phaseNum) {
  try {
    const progress = loadProgress();
    if (phaseNum === 2) delete progress.phase1_complete;
    if (phaseNum === 3) delete progress.phase2_complete;
    progress.lastUpdated = new Date().toISOString();
    saveProgress(progress);
    init();
  } catch {}
};

window.roadmapCheckItem = function(itemKey, phaseNum) {
  try {
    const progress = loadProgress();
    if (!progress.checked) progress.checked = {};
    if (!progress.checked[phaseNum]) progress.checked[phaseNum] = [];
    const arr = progress.checked[phaseNum];
    const idx = arr.indexOf(itemKey);
    if (idx === -1) { arr.push(itemKey); showToast(itemKey); }
    else arr.splice(idx, 1);
    saveProgress(progress);
    init();
  } catch {}
};

window.roadmapCompletePhase = function(phaseNum) {
  try {
    const progress = loadProgress();
    if ((progress.checked?.[phaseNum] || []).length === 0) {
      showInlineError(phaseNum);
      return;
    }
    if (phaseNum === 1) progress.phase1_complete = true;
    if (phaseNum === 2) progress.phase2_complete = true;
    if (phaseNum === 3) progress.all_complete = true;
    progress.lastUpdated = new Date().toISOString();
    saveProgress(progress);
    init();
    showPhaseCompleteModal(phaseNum);
  } catch {}
};

// ── 初期化 ────────────────────────────────────────────────────────────
function init() {
  try {
    injectRoadmapStyles();
    // 診断データがあればロードマップを表示（ログイン不要）
    // ※旧 glowup:userSession はSupabase移行済みのため参照しない

    // v4（最新）→ v2（旧形式）の順で読み込み
    let diag = null;
    const rawV4 = localStorage.getItem(DIAG_KEY_V4);
    if (rawV4) {
      try {
        const v4 = JSON.parse(rawV4);
        if (v4.version === 'v4') diag = adaptV4toDiag(v4);
        else if (v4.scores) diag = v4; // 旧形式がlatest keyに入っている場合
      } catch {}
    }
    if (!diag) {
      const rawV2 = localStorage.getItem(DIAG_KEY_V2);
      if (rawV2) { try { diag = JSON.parse(rawV2); } catch {} }
    }
    const hasDiag = diag && diag.scores && Object.keys(diag.scores).length >= 1;

    const roadmapEl = document.getElementById('roadmap-section');
    const sampleEl  = document.getElementById('sample-section');

    if (hasDiag) {
      if (roadmapEl) roadmapEl.style.display = '';
      if (sampleEl)  sampleEl.style.display  = 'none';
      renderDiagnosed(diag);
      // マイページ「ロードマップを見る」経由の場合、ロードマップ箇所にスクロール
      if (new URLSearchParams(location.search).get('scrollTo') === 'roadmap') {
        setTimeout(() => {
          const el = document.getElementById('roadmap-section');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
      return;
    }

    // 未診断（旧形式データがあっても、トップページではサンプル表示）
    if (roadmapEl) roadmapEl.style.display = 'none';
    if (sampleEl)  sampleEl.style.display  = '';
    renderSamples();
  } catch (e) {
    console.error('[home-roadmap]', e);
  }
}

document.addEventListener('DOMContentLoaded', init);
// bfcache（ブラウザの戻る/進む）で復元された場合も再チェック
// → ログアウト後に「戻る」で戻ってきた時にロードマップが残らないようにする
window.addEventListener('pageshow', e => { if (e.persisted) init(); });
