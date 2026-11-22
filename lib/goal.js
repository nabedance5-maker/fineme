// 「印象の目標（目指す場所）」の選択肢・見出し文・選ぶカード（Muse指示書 2026-11-22 §1-2・§2-1）。
//
// 保存先（診断プロフィールの goal_scene / goal_change / goal_vision）と表示側（結果ページの
// buildGoalLayers、Map の getOverallGoal）は前からあったが、設定する設問がどこにも無く、全員に
// 固定文「外見を起点に、自信を再設計する」が出ていた。Me Scan 本体は「最短で地図の骨格まで」の
// 設計なので設問は足さず、結果ページと Map で「目指す場所を決める／変える」として聞く。
// 選択肢の体系は既存の SCENE_MAP / CHANGE_MAP / VISION_MAP をそのまま使う（男女共通）。

export const GOAL_SCENES = {
  first_impression: '初対面の瞬間、相手の反応が変わる',
  date_confidence:  '好きな人といる時間、外見を気にせず相手に集中できる',
  photo_self:       '写真や動画の自分が、気にならなくなる',
  morning_mirror:   '毎朝鏡を見て、気分が上がる',
  approach:         '自分から積極的に動けるようになる',
};
export const GOAL_CHANGES = {
  others_perception: '他の人からの見られ方・評価が変わる',
  self_confidence:   '自分の気持ち・自己肯定感が変わる',
  action_ease:       '行動のしやすさ・動けるようになること',
  life_options:      '外見を理由に諦めることが減ること',
};
export const GOAL_VISIONS = {
  love_active:       '恋愛で、躊躇せず動けるようになっている',
  no_give_up:        '外見を理由に何かを諦めることが減っている',
  like_self:         '自分のことを、もう少し好きになっている',
  natural_confident: '自信が「自然な状態」になっている',
};
export const BRAND_GOAL = '外見を起点に、自信を再設計する';
const MAX_SCENES = 2;

export function goalScenesOf(p) {
  const raw = p?.goal_scene;
  const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  return list.filter(id => GOAL_SCENES[id]).slice(0, MAX_SCENES);
}

export function hasGoal(p) {
  return !!(GOAL_VISIONS[p?.goal_vision] || GOAL_CHANGES[p?.goal_change] || goalScenesOf(p).length);
}

/** 見出しのゴール。本人の回答があれば主表示、ブランド文句は副次的な一文として残す */
export function goalHeadline(p) {
  const main = GOAL_VISIONS[p?.goal_vision] || GOAL_CHANGES[p?.goal_change] || null;
  const scenes = goalScenesOf(p).map(id => GOAL_SCENES[id]);
  if (main) return { main, sub: scenes[0] || null, isOwn: true };
  if (scenes.length) return { main: scenes[0], sub: null, isOwn: true };
  return { main: BRAND_GOAL, sub: null, isOwn: false };
}

/** APIへ送る前・受けた後の形の検査（決まった値だけ通す） */
export function cleanGoals(g) {
  const scenes = (Array.isArray(g?.goal_scene) ? g.goal_scene : (g?.goal_scene ? [g.goal_scene] : []))
    .filter(id => GOAL_SCENES[id]).slice(0, MAX_SCENES);
  return {
    goal_scene: scenes,
    goal_change: GOAL_CHANGES[g?.goal_change] ? g.goal_change : null,
    goal_vision: GOAL_VISIONS[g?.goal_vision] ? g.goal_vision : null,
  };
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function chips(group, options, selected, multi) {
  return Object.entries(options).map(([id, label]) => {
    const on = multi ? selected.includes(id) : selected === id;
    return `<button type="button" class="gp-chip${on ? ' is-on' : ''}" data-gp-group="${group}" data-gp-id="${id}" aria-pressed="${on}">${escHtml(label)}</button>`;
  }).join('');
}

/**
 * 目指す場所を選ぶカード（innerHTMLで描く画面用）。bindGoalPicker で動かす。
 * @param {object} p 診断プロフィール
 * @param {{ title?: string, lead?: string }} opts
 */
export function goalPickerHtml(p, opts = {}) {
  const g = cleanGoals(p || {});
  return `
    <div class="gp-card" data-goal-picker>
      <p class="gp-title">${escHtml(opts.title || 'あなたが目指す場所を決める')}</p>
      <p class="gp-lead">${escHtml(opts.lead || '選んだ言葉が、地図のゴールとしてあなたの画面に出ます。どれも任意で、あとから変えられます。')}</p>
      <p class="gp-q">どんな場面で変わりたい？（2つまで）</p>
      <div class="gp-chips">${chips('goal_scene', GOAL_SCENES, g.goal_scene, true)}</div>
      <p class="gp-q">何が変わってほしい？</p>
      <div class="gp-chips">${chips('goal_change', GOAL_CHANGES, g.goal_change, false)}</div>
      <p class="gp-q">変わった先、どうなっていたい？</p>
      <div class="gp-chips">${chips('goal_vision', GOAL_VISIONS, g.goal_vision, false)}</div>
      <div class="gp-actions">
        <button type="button" class="gp-save" data-gp-save>この目標にする</button>
        <span class="gp-msg" data-gp-msg aria-live="polite"></span>
      </div>
    </div>`;
}

export const GOAL_PICKER_CSS = `
  .gp-card { background: #151b24; border: 1px solid rgba(200,164,90,0.28); border-radius: 14px; padding: 18px; margin: 16px 0; }
  .gp-title { font-size: 15px; font-weight: 800; color: #e8e4dc; margin: 0 0 6px; }
  .gp-lead { font-size: 12px; line-height: 1.7; color: rgba(232,228,220,0.6); margin: 0 0 12px; }
  .gp-q { font-size: 12px; font-weight: 700; color: rgba(200,164,90,0.85); margin: 12px 0 8px; }
  .gp-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .gp-chip { font-size: 12.5px; line-height: 1.5; text-align: left; padding: 8px 12px; border-radius: 10px; cursor: pointer; background: rgba(255,255,255,0.03); border: 1px solid rgba(232,228,220,0.16); color: rgba(232,228,220,0.82); font-family: inherit; }
  .gp-chip.is-on { background: rgba(200,164,90,0.16); border-color: #c8a45a; color: #f0e6cc; font-weight: 700; }
  .gp-actions { display: flex; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
  .gp-save { padding: 11px 22px; border-radius: 10px; border: none; cursor: pointer; font-weight: 800; font-size: 13.5px; background: linear-gradient(135deg,#c8a45a,#e8c86a); color: #0d1117; font-family: inherit; }
  .gp-save:disabled { opacity: .6; cursor: default; }
  .gp-msg { font-size: 12px; color: rgba(232,228,220,0.7); }
`;

/**
 * カードを動かす。保存は端末の診断プロフィール＋（ログイン中なら）サーバー。
 * @param {Element} root  カードを含む要素
 * @param {{ storageKey: string, track: 'fineme'|'belle', token?: string|null, onSaved?: (goals) => void }} opts
 */
export function bindGoalPicker(root, { storageKey, track, token, onSaved }) {
  const card = root?.querySelector('[data-goal-picker]');
  if (!card || card.dataset.bound) return;
  card.dataset.bound = '1';
  let profile = {};
  try { profile = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch {}
  const state = cleanGoals(profile);

  card.addEventListener('click', async (e) => {
    const chip = e.target.closest('.gp-chip');
    if (chip) {
      const group = chip.dataset.gpGroup;
      const id = chip.dataset.gpId;
      if (group === 'goal_scene') {
        const i = state.goal_scene.indexOf(id);
        if (i >= 0) state.goal_scene.splice(i, 1);
        else { state.goal_scene.push(id); if (state.goal_scene.length > MAX_SCENES) state.goal_scene.shift(); }
      } else {
        state[group] = state[group] === id ? null : id;
      }
      card.querySelectorAll(`.gp-chip[data-gp-group="${group}"]`).forEach(c => {
        const on = group === 'goal_scene' ? state.goal_scene.includes(c.dataset.gpId) : state[group] === c.dataset.gpId;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
      });
      return;
    }
    if (!e.target.closest('[data-gp-save]')) return;
    const btn = card.querySelector('[data-gp-save]');
    const msg = card.querySelector('[data-gp-msg]');
    btn.disabled = true;
    const goals = cleanGoals(state);
    try {
      const cur = JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
      localStorage.setItem(storageKey, JSON.stringify({ ...cur, ...goals }));
    } catch {}
    let ok = true;
    if (token) {
      try {
        const r = await fetch(`/api/me/diagnosis?track=${track}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ goals }),
        });
        ok = r.ok;
      } catch { ok = false; }
    }
    btn.disabled = false;
    if (msg) msg.textContent = ok ? '目標を保存しました' : 'この端末には保存しました（通信できず、アカウントへの保存はできませんでした）';
    if (onSaved) onSaved(goals);
  });
}

/**
 * Me Scan のフロー内の「目指す場所」画面（男女共通）。既存の .diag-option の見た目で描く。
 * どれも任意（選ばずに「地図をつくる」でよい）。渡邉指示 2026-11-22：フローの中で聞く。
 * @param {Element} container
 * @param {{goal_scene: string[], goal_change: string|null, goal_vision: string|null}} state  診断の state（直接書き換える）
 */
export function renderGoalStep(container, state) {
  if (!container) return;
  if (!Array.isArray(state.goal_scene)) state.goal_scene = state.goal_scene ? [state.goal_scene] : [];
  const groups = [
    { key: 'goal_scene', title: 'どんな場面で変わりたい？（2つまで）', options: GOAL_SCENES, multi: true },
    { key: 'goal_change', title: '何が変わってほしい？', options: GOAL_CHANGES, multi: false },
    { key: 'goal_vision', title: '変わった先、どうなっていたい？', options: GOAL_VISIONS, multi: false },
  ];
  container.innerHTML = '';
  for (const g of groups) {
    const h = document.createElement('p');
    h.className = 'diag-goal-q';
    h.textContent = g.title;
    container.appendChild(h);
    const wrap = document.createElement('div');
    wrap.className = 'diag-options';
    const paint = () => wrap.querySelectorAll('.diag-option').forEach(b => {
      const id = b.dataset.value;
      b.classList.toggle('selected', g.multi ? state.goal_scene.includes(id) : state[g.key] === id);
    });
    for (const [id, label] of Object.entries(g.options)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'diag-option';
      btn.dataset.value = id;
      const body = document.createElement('span');
      body.className = 'diag-option-body';
      const t = document.createElement('span');
      t.className = 'diag-option-title';
      t.textContent = label;
      body.appendChild(t);
      btn.appendChild(body);
      btn.addEventListener('click', () => {
        if (g.multi) {
          const i = state.goal_scene.indexOf(id);
          if (i >= 0) state.goal_scene.splice(i, 1);
          else { state.goal_scene.push(id); if (state.goal_scene.length > MAX_SCENES) state.goal_scene.shift(); }
        } else {
          state[g.key] = state[g.key] === id ? null : id;
        }
        paint();
      });
      wrap.appendChild(btn);
    }
    paint();
    container.appendChild(wrap);
  }
}

/** 受け直しの時、前回の目指す場所を初期値にする（変えたい所だけ選び直せばよい） */
export function previousGoals(storageKey) {
  try { return cleanGoals(JSON.parse(localStorage.getItem(storageKey) || '{}') || {}); } catch { return cleanGoals({}); }
}
