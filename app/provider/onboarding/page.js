'use client';
import { useEffect, useRef } from 'react';

export default function ProviderOnboardingPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ─── ページ固有スタイル ───
    const style = document.createElement('style');
    style.textContent = `
      .ob-wrap{ max-width: 920px; margin: 0 auto }
      .ob-step{ background:#fff; border:1px solid var(--color-border); border-radius:12px; padding:16px; box-shadow: var(--shadow-sm) }
      .ob-step h2{ margin:0 0 8px; }
      .ob-nav{ display:flex; gap:8px; justify-content:space-between; align-items:center }
      .ob-steps{ display:grid; grid-template-columns:repeat(5,1fr); gap:6px; margin-bottom:12px }
      .ob-steps .dot{ height:6px; border-radius:999px; background:#e5e7eb }
      .ob-steps .dot.is-active{ background:linear-gradient(90deg,var(--primary),#0e3760) }
      .ob-note{ color:var(--color-muted) }
      .muted{ color:var(--color-muted) }
      .ob-checklist{ list-style: none; padding:0; margin:8px 0 }
      .ob-checklist li{ display:flex; align-items:flex-start; gap:8px; margin:6px 0 }
      .ob-card{ background:#fff; border:1px solid var(--color-border); border-radius:8px; padding:12px }
      .ob-actions{ display:flex; gap:8px; justify-content:flex-end; margin-top:12px }
      textarea{ width:100%; min-height: 90px }
    `;
    document.head.appendChild(style);

    // ─── auth helpers (inlined from scripts/auth.js) ───
    const PROVIDER_SESSION_KEY = 'glowup:providerSession';
    function getProviderSession() {
      try {
        const raw = sessionStorage.getItem(PROVIDER_SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    }

    // ─── provider-onboarding.js ported logic ───
    const PROVIDERS_KEY = 'glowup:providers';
    function qs(s, el = document) { return el.querySelector(s); }
    function loadProviders() {
      try {
        const raw = localStorage.getItem(PROVIDERS_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    }
    function saveProviders(list) { localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list)); }
    function getMe() {
      const sess = getProviderSession();
      if (!sess) return null;
      const list = loadProviders();
      return list.find(p => p.id === sess.id) || null;
    }
    function setDot(i) {
      for (let k = 0; k < 5; k++) {
        const d = qs('#dot-' + k);
        if (d) { d.classList.toggle('is-active', k <= i); }
      }
    }

    let step = 0; // 0..4
    // URLで初期ステップを指定可能に（?step=1 や #diagnosis / #profile）
    let REEDIT_MODE = false;
    try {
      const u = new URL(location.href);
      const qsStep = Number(u.searchParams.get('step') || '');
      if (!Number.isNaN(qsStep) && qsStep >= 0 && qsStep <= 4) step = qsStep;
      const hash = (u.hash || '').toLowerCase();
      if (hash.includes('diagnosis')) step = 1;
      if (hash.includes('profile')) step = 3;
      REEDIT_MODE = hash.includes('reedit');
    } catch {}

    // 再編集モードの可視マーカー（reeditモード時に即時表示）
    try {
      if (REEDIT_MODE) {
        const host = document.getElementById('ob-host');
        if (host) {
          const note = document.createElement('div');
          note.className = 'ob-step';
          note.style.border = '1px dashed var(--color-border)';
          note.style.background = '#f9fafb';
          note.innerHTML = '<strong>再編集モードを起動しています…</strong><p class="muted">診断体験と思想入力を同時表示します。</p>';
          host.appendChild(note);
        }
      }
    } catch (e) {}

    function persist(me) {
      const list = loadProviders();
      const idx = list.findIndex(p => p.id === me.id);
      if (idx !== -1) { list[idx] = me; saveProviders(list); }
    }

    function render() {
      setDot(step);
      const host = qs('#ob-host');
      if (!host) return;
      host.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'ob-step';
      host.appendChild(card);
      const me = getMe();
      if (!me) return;

      if (step === 0) {
        // STEP0 世界観共有
        card.innerHTML = `
          <h2>STEP0：ようこそ Fineme へ（最初に必ず読む）</h2>
          <div class="stack">
            <div class="ob-card">
              <strong>ようこそ、Finemeへ。</strong>
              <p>Finemeは、<strong>「検索される場所」ではなく「相性で選ばれる場所」</strong>です。価格やクーポンではなく、<em>あなたの考え方・向き合い方・得意な変化</em>が、ユーザーの診断結果と結びつき、表示されます。</p>
            </div>
            <div class="ob-card">
              <strong>Finemeで起きていること</strong>
              <p>ユーザーは最初に<strong>どんな変化を求めているか</strong>を診断します。その結果に合わせて、<strong>"合う可能性が高い掲載者"から順に表示</strong>されます。</p>
            </div>
            <div class="ob-card">
              <strong>重要なことを1つだけ</strong>
              <p>Finemeでは、<strong>プロフィールは「広告」ではありません。</strong> あなたのページは、<em>診断との相性／書かれている内容／更新・改善の積み重ね</em>によって、<strong>資産のように育っていきます。</strong></p>
            </div>
            <div class="ob-card">
              <strong>段階解放について</strong>
              <p>最初からすべてを設定する必要はありません。<br/>Finemeは<strong>取り組んだ分だけ、表示と評価が広がる設計</strong>です。<br/>
              <em>・書いた人が有利 ／ ・向き合った人が残る ／ ・放置すると伸びない</em></p>
            </div>
            <div class="ob-card">
              <strong>お願いがあります</strong>
              <p>Finemeは「載せたら集客できる場所」ではなく、<strong>「選ばれる理由を一緒に育てる場所」</strong>です。この考えに共感できる方と、長く一緒にサービスを育てていきたいと考えています。</p>
            </div>
            <div class="ob-card">
              <strong>では、最初の一歩へ</strong>
              <p>まずは<strong>「どんな人に、どんな変化を届けたいか」</strong>を言葉にしてください。そこから、すべてが始まります。</p>
            </div>
            <label class="cluster" style="align-items:center; gap:8px"><input type="checkbox" id="ob-ack-0" /> <span>理解した上で進みます</span></label>
          </div>`;
      } else if (step === 1) {
        // STEP1 診断体験
        const diag = me.onboarding?.diag || {};
        const resultLine = (diag.intent_type_name)
          ? `<p class="muted">あなたの診断結果（第2階層）: <strong>${diag.intent_type_name}</strong></p>`
          : `<p class="muted">まだ診断結果が読み込まれていません。</p>`;
        card.innerHTML = `
          <h2>STEP1：診断体験（掲載者自身が受ける）</h2>
          <div class="stack">
            <p>ユーザー向け診断をそのまま受けてください。診断はラベルではなく"納得のための道しるべ"です。</p>
            <div class="cluster" style="gap:8px">
              <a class="btn" href="/diagnosis" target="_blank" rel="noopener">診断ページを開く</a>
              <button id="ob-import-diag" class="btn btn-ghost" type="button">診断結果を読み込む</button>
            </div>
            ${resultLine}
            <p class="muted">ユーザーはこの視点（第2階層タイプ）であなたを探します。</p>
          </div>`;
        qs('#ob-import-diag')?.addEventListener('click', () => {
          try {
            const raw = localStorage.getItem('fineme:diagnosis:latest');
            const obj = raw ? JSON.parse(raw) : null;
            if (obj && obj.intent) {
              me.onboarding.diag = {
                intent_type_id: obj.intent.type_id,
                intent_type_name: (obj.step2?.classification?.type_name) || obj.intent.type_name,
                why_avg: (obj.why?.avg) || null,
                how_scores: (obj.how?.scores) || []
              };
              persist(me);
              render();
            } else { alert('診断結果が見つかりませんでした。診断を完了して再度読み込んでください。'); }
          } catch (e) { alert('診断結果の読み込みに失敗しました。'); }
        });
      } else if (step === 2) {
        // STEP2 診断ロジック説明
        card.innerHTML = `
          <h2>STEP2：診断ロジックの説明（理解フェーズ）</h2>
          <div class="stack">
            <p>診断は3階層構造です。第1階層：動機（WHY）、第2階層：変化軸（WHAT）、第3階層：支援スタイル（HOW）。ユーザーには第2階層のみ表示され、第1・第3階層は相性の精度向上に使われます。</p>
            <div class="ob-card"><p>フローチャート（簡略）</p><p class="muted">ユーザー回答 → WHAT決定 → WHY/HOWで相性補正 → 表示順位</p></div>
            <p>この構造は「自分が選ばれる理由」を言語化できるよう設計されています。</p>
            <div class="ob-card">
              <strong>来店確認で価値が発生する流れ</strong>
              <ol>
                <li>予約される</li>
                <li>来店する</li>
                <li>掲載者が「来店確認」</li>
                <li>ユーザーにポイント付与</li>
                <li>次の予約につながる</li>
              </ol>
              <p class="muted">来店が確認された時だけ、価値が発生します。</p>
              <p><a class="btn btn-ghost" href="/provider/reservations">来店確認ボタンを見る</a></p>
            </div>
            <label class="cluster" style="align-items:center; gap:8px"><input type="checkbox" id="ob-ack-2" /> <span>3階層構造と公開範囲を理解しました</span></label>
          </div>`;
      } else if (step === 3) {
        // STEP3 思想入力
        const prof = me.onboarding?.profile || (me.onboarding.profile = {});
        const whatList = [
          { id: 'w01', name: '清潔感タイプ' },
          { id: 'w02', name: '自然体タイプ' },
          { id: 'w03', name: '大人落ち着きタイプ' },
          { id: 'w04', name: '男らしさタイプ' },
          { id: 'w05', name: '選ばれる恋愛タイプ' },
          { id: 'w06', name: '自信醸成タイプ' },
          { id: 'w07', name: '第一印象変化タイプ' },
          { id: 'w08', name: '節目変化タイプ' }
        ];
        const selected = Array.isArray(prof.whatTypes) ? new Set(prof.whatTypes) : new Set();

        const title = document.createElement('h2');
        title.textContent = 'STEP3：掲載者プロフィールの思想入力（重要）';
        card.appendChild(title);
        const help = document.createElement('p');
        help.textContent = '「誰に・どんな変化を届けるのか」を言語化してください。実績や肩書のみの入力は禁止です。';
        card.appendChild(help);

        const block1 = document.createElement('div');
        block1.className = 'ob-card';
        block1.innerHTML = '<strong>最も力になれる第2階層タイプ（複数選択可）</strong>';
        card.appendChild(block1);
        const wrapChips = document.createElement('div');
        wrapChips.className = 'cluster';
        wrapChips.style.flexWrap = 'wrap';
        wrapChips.style.gap = '8px';
        whatList.forEach(w => {
          const lab = document.createElement('label');
          lab.className = 'chip';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = selected.has(w.id);
          cb.addEventListener('change', () => {
            if (cb.checked) selected.add(w.id); else selected.delete(w.id);
            prof.whatTypes = Array.from(selected);
            persist(me);
          });
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode(' ' + w.name));
          wrapChips.appendChild(lab);
        });
        block1.appendChild(wrapChips);

        const block2 = document.createElement('div');
        block2.className = 'ob-card';
        block2.innerHTML = '<strong>どんな悩みを持つ男性と向き合ってきたか</strong>';
        const ta2 = document.createElement('textarea');
        ta2.id = 'ob-q-problems';
        ta2.placeholder = '例：第一印象に自信が持てず、恋愛や仕事で一歩踏み出せない男性...';
        ta2.value = prof.problems || '';
        ta2.addEventListener('input', () => { prof.problems = ta2.value; persist(me); });
        block2.appendChild(ta2);
        card.appendChild(block2);

        const block3 = document.createElement('div');
        block3.className = 'ob-card';
        block3.innerHTML = '<strong>初めての人にどう寄り添うか</strong>';
        const ta3 = document.createElement('textarea');
        ta3.id = 'ob-q-first';
        ta3.placeholder = '例：理由を言語化しながら伴走します。納得できるまで説明と提案を繰り返します...';
        ta3.value = prof.first || '';
        ta3.addEventListener('input', () => { prof.first = ta3.value; persist(me); });
        block3.appendChild(ta3);
        card.appendChild(block3);

        const block4 = document.createElement('div');
        block4.className = 'ob-card';
        block4.innerHTML = '<strong>結果が出るまでに大切にしていること</strong>';
        const ta4 = document.createElement('textarea');
        ta4.id = 'ob-q-values';
        ta4.placeholder = '例：習慣化の仕組み化、レビューと改善の反復...';
        ta4.value = prof.values || '';
        ta4.addEventListener('input', () => { prof.values = ta4.value; persist(me); });
        block4.appendChild(ta4);
        card.appendChild(block4);

        const block5 = document.createElement('div');
        block5.className = 'ob-card';
        block5.innerHTML = '<strong>価格ではなく何で選ばれたいか</strong>';
        const ta5 = document.createElement('textarea');
        ta5.id = 'ob-q-beyond';
        ta5.placeholder = '例：伴走の質、説明のわかりやすさ、提案の一貫性...';
        ta5.value = prof.beyond || '';
        ta5.addEventListener('input', () => { prof.beyond = ta5.value; persist(me); });
        block5.appendChild(ta5);
        card.appendChild(block5);

        const note = document.createElement('p');
        note.className = 'muted';
        note.textContent = '良い例 / 悪い例を参照し、感情・考え・姿勢が伝わる文章を重視してください。この文章は診断結果と一緒に表示され、相性判断にも使われます。';
        card.appendChild(note);

        // 提供スタンス（A-D + E）入力
        const scores = me.onboarding.scores || (me.onboarding.scores = { A: 2, B: 2, C: 2, D: 2, E_tags: [] });
        const stBlock = document.createElement('div');
        stBlock.className = 'ob-card';
        stBlock.innerHTML = '<strong>あなたの店舗が大切にしていること（診断と同じ軸で）</strong>';
        card.appendChild(stBlock);

        // Q1 A（複数選択 → 重み付け）
        const q1 = document.createElement('div');
        q1.className = 'stack';
        q1.id = 'ob-a-group';
        q1.innerHTML = '<em>Q1｜どんな理由で来る人に一番向き合いたいですか？（複数選択可）</em>';
        const q1wrap = document.createElement('div');
        q1wrap.className = 'cluster';
        q1wrap.style.flexWrap = 'wrap';
        q1wrap.style.gap = '8px';
        const A_OPTS = ['自信を持てるように', '周囲の目を気にせず一歩', '人生の節目の変化', '明確な目的（恋愛・仕事）'];
        const A_sel = new Set();
        A_OPTS.forEach(label => {
          const lab = document.createElement('label');
          lab.className = 'chip';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = false;
          cb.addEventListener('change', () => {
            if (cb.checked) A_sel.add(label); else A_sel.delete(label);
            scores.A = Math.min(4, Math.max(1, A_sel.size));
            persist(me);
          });
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode(' ' + label));
          q1wrap.appendChild(lab);
        });
        q1.appendChild(q1wrap);
        stBlock.appendChild(q1);

        // Q2 B（単一選択）
        const q2 = document.createElement('div');
        q2.className = 'stack';
        q2.id = 'ob-b-group';
        q2.innerHTML = '<em>Q2｜初回で一番大切にしていることは？（単一選択）</em>';
        const q2wrap = document.createElement('div');
        q2wrap.className = 'cluster';
        q2wrap.style.flexWrap = 'wrap';
        q2wrap.style.gap = '8px';
        const B_OPTS = [{ t: '不安を聞き切る', v: 4 }, { t: '選択肢を整理して説明', v: 3 }, { t: 'こちらから明確に提案', v: 2 }, { t: 'すぐ施術・サービスへ', v: 1 }];
        B_OPTS.forEach(o => {
          const lab = document.createElement('label');
          lab.className = 'chip';
          const rb = document.createElement('input');
          rb.type = 'radio';
          rb.name = 'ob-b';
          rb.checked = (scores.B === o.v);
          rb.addEventListener('change', () => { if (rb.checked) { scores.B = o.v; persist(me); } });
          lab.appendChild(rb);
          lab.appendChild(document.createTextNode(' ' + o.t));
          q2wrap.appendChild(lab);
        });
        q2.appendChild(q2wrap);
        stBlock.appendChild(q2);

        // Q3 C（単一選択）
        const q3 = document.createElement('div');
        q3.className = 'stack';
        q3.id = 'ob-c-group';
        q3.innerHTML = '<em>Q3｜提供する変化のスタンス（単一選択）</em>';
        const q3wrap = document.createElement('div');
        q3wrap.className = 'cluster';
        q3wrap.style.flexWrap = 'wrap';
        q3wrap.style.gap = '8px';
        const C_OPTS = [{ t: '少し整える', v: 1 }, { t: '印象が変わる', v: 2 }, { t: '周囲に気づかれる', v: 3 }, { t: '別人レベル歓迎', v: 4 }];
        C_OPTS.forEach(o => {
          const lab = document.createElement('label');
          lab.className = 'chip';
          const rb = document.createElement('input');
          rb.type = 'radio';
          rb.name = 'ob-c';
          rb.checked = (scores.C === o.v);
          rb.addEventListener('change', () => { if (rb.checked) { scores.C = o.v; persist(me); } });
          lab.appendChild(rb);
          lab.appendChild(document.createTextNode(' ' + o.t));
          q3wrap.appendChild(lab);
        });
        q3.appendChild(q3wrap);
        stBlock.appendChild(q3);

        // Q4 D（単一選択）
        const q4 = document.createElement('div');
        q4.className = 'stack';
        q4.id = 'ob-d-group';
        q4.innerHTML = '<em>Q4｜意思決定の関わり方（単一選択）</em>';
        const q4wrap = document.createElement('div');
        q4wrap.className = 'cluster';
        q4wrap.style.flexWrap = 'wrap';
        q4wrap.style.gap = '8px';
        const D_OPTS = [{ t: 'こちらが主に決める', v: 1 }, { t: '一緒に相談して決める', v: 2 }, { t: 'お客さまに委ねる', v: 3 }];
        D_OPTS.forEach(o => {
          const lab = document.createElement('label');
          lab.className = 'chip';
          const rb = document.createElement('input');
          rb.type = 'radio';
          rb.name = 'ob-d';
          rb.checked = (scores.D === o.v);
          rb.addEventListener('change', () => { if (rb.checked) { scores.D = o.v; persist(me); } });
          lab.appendChild(rb);
          lab.appendChild(document.createTextNode(' ' + o.t));
          q4wrap.appendChild(lab);
        });
        q4.appendChild(q4wrap);
        stBlock.appendChild(q4);

        // Q5 E タグ（複数選択）
        const q5 = document.createElement('div');
        q5.className = 'stack';
        q5.id = 'ob-e-group';
        q5.innerHTML = '<em>Q5｜自分の強みとして近いもの（複数選択可）</em>';
        const q5wrap = document.createElement('div');
        q5wrap.className = 'cluster';
        q5wrap.style.flexWrap = 'wrap';
        q5wrap.style.gap = '8px';
        const E_OPTS = ['安心感', '理論・根拠', 'センス', '実績'];
        const E_sel = new Set(scores.E_tags || []);
        E_OPTS.forEach(t => {
          const lab = document.createElement('label');
          lab.className = 'chip';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = E_sel.has(t);
          cb.addEventListener('change', () => {
            if (cb.checked) E_sel.add(t); else E_sel.delete(t);
            scores.E_tags = Array.from(E_sel);
            persist(me);
          });
          lab.appendChild(cb);
          lab.appendChild(document.createTextNode(' ' + t));
          q5wrap.appendChild(lab);
        });
        q5.appendChild(q5wrap);
        stBlock.appendChild(q5);

        const cta = document.createElement('div');
        cta.className = 'cluster';
        cta.style.gap = '8px';
        cta.style.justifyContent = 'flex-end';
        const start = document.createElement('a');
        start.className = 'btn';
        start.href = '/provider/profile';
        start.textContent = 'この考え方で掲載をはじめる';
        const more = document.createElement('a');
        more.className = 'btn btn-ghost';
        more.href = '/provider/about';
        more.textContent = '考え方をもう少し知る';
        cta.appendChild(start);
        cta.appendChild(more);
        card.appendChild(cta);

        // フォーカス誘導（#focus=...）
        try {
          const hash = String(location.hash || '');
          const m = hash.match(/focus=([^&]+)/);
          if (m) {
            const id = decodeURIComponent(m[1]);
            const el = document.getElementById(id) || qs('#' + id);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              if (el instanceof HTMLElement) {
                el.style.outline = '2px solid var(--primary)';
                setTimeout(() => { el.style.outline = ''; }, 2000);
              }
            }
          }
        } catch {}

      } else if (step === 4) {
        // STEP4 最終確認
        card.innerHTML = `
          <h2>STEP4：マッチングされる仕組みの最終確認</h2>
          <div class="stack">
            <p>ユーザーは価格"だけ"ではなく相性で表示されます。診断スコア × プロフィール内容で表示順位が変わり、誠実な入力ほど精度が上がります。</p>
            <ul class="ob-checklist">
              <li><label class="cluster" style="gap:8px; align-items:center"><input type="checkbox" id="ob-ack-4-1" /> <span>診断を理解した</span></label></li>
              <li><label class="cluster" style="gap:8px; align-items:center"><input type="checkbox" id="ob-ack-4-2" /> <span>診断結果に基づいて選ばれることを理解した</span></label></li>
              <li><label class="cluster" style="gap:8px; align-items:center"><input type="checkbox" id="ob-ack-4-3" /> <span>価格だけで選ばれる世界ではないことを理解した</span></label></li>
            </ul>
            <p class="muted">全てのチェックが必須です。完了すると店舗が公開対象になります（サービスは「公開」設定が必要）。</p>
            <div class="cluster" style="justify-content:flex-end">
              <button id="ob-complete" class="btn" type="button">オンボーディングを完了する</button>
            </div>
          </div>`;
        qs('#ob-complete')?.addEventListener('click', () => {
          const ok = ['#ob-ack-4-1', '#ob-ack-4-2', '#ob-ack-4-3'].every(sel => {
            const el = qs(sel);
            return el && el.checked;
          });
          if (!ok) { alert('すべてのチェック項目に同意してください。'); return; }
          const me = getMe();
          if (!me) return;
          me.onboarding.completed = true;
          me.onboarding.completedAt = new Date().toISOString();
          persist(me);
          alert('オンボーディングを完了しました。ダッシュボードに移動します。');
          location.href = '/provider';
        });
      }
    }

    function onNext() {
      const me = getMe();
      if (!me) return;
      if (step === 0) {
        const ack = qs('#ob-ack-0');
        if (!ack || !ack.checked) { alert('「理解した上で進む」にチェックしてください。'); return; }
        me.onboarding.steps.step0 = true; persist(me); step++; render(); return;
      }
      if (step === 1) {
        if (!me.onboarding?.diag?.intent_type_id) { alert('診断結果を読み込んでください。'); return; }
        me.onboarding.steps.step1 = true; persist(me); step++; render(); return;
      }
      if (step === 2) {
        const ack = qs('#ob-ack-2');
        if (!ack || !ack.checked) { alert('3階層構造の理解にチェックしてください。'); return; }
        me.onboarding.steps.step2 = true; persist(me); step++; render(); return;
      }
      if (step === 3) {
        const prof = me.onboarding?.profile || {};
        const sc = me.onboarding?.scores || {};
        const ok = Array.isArray(prof.whatTypes) && prof.whatTypes.length > 0
          && (prof.problems || '').trim()
          && (prof.first || '').trim()
          && (prof.values || '').trim()
          && (prof.beyond || '').trim()
          && Number(sc.A) >= 1 && Number(sc.B) >= 1 && Number(sc.C) >= 1 && Number(sc.D) >= 1
          && Array.isArray(sc.E_tags);
        if (!ok) { alert('タイプ選択・4つの文章・提供スタンス（A-D＋価値観）をすべて入力してください。'); return; }
        me.onboarding.steps.step3 = true; persist(me); step++; render(); return;
      }
      if (step === 4) { /* handled by complete button */ }
    }

    // ─── init ───
    (function init() {
      const me = getMe();

      // 再編集モードを最優先（ログイン有無にかかわらず表示保証）
      if (REEDIT_MODE) {
        try {
          const host = qs('#ob-host');
          if (!host) return;
          setDot(3);
          const wrap = document.createElement('div');
          wrap.className = 'stack';
          wrap.style.gap = '12px';

          // STEP1 をレンダリング
          const card1 = document.createElement('div');
          card1.className = 'ob-step';
          const diag = me && me.onboarding ? (me.onboarding.diag || {}) : {};
          const resultLine = (diag.intent_type_name)
            ? `<p class="muted">あなたの診断結果（第2階層）: <strong>${diag.intent_type_name}</strong></p>`
            : `<p class="muted">まだ診断結果が読み込まれていません。</p>`;
          card1.innerHTML = `
            <h2>STEP1：診断体験（掲載者自身が受ける）</h2>
            <div class="stack">
              <p>ユーザー向け診断をそのまま受けてください。診断はラベルではなく"納得のための道しるべ"です。</p>
              <div class="cluster" style="gap:8px">
                <a class="btn" href="/diagnosis" target="_blank" rel="noopener">診断ページを開く</a>
                <button id="ob-import-diag" class="btn btn-ghost" type="button">診断結果を読み込む</button>
              </div>
              ${resultLine}
              <p class="muted">ユーザーはこの視点（第2階層タイプ）であなたを探します。</p>
            </div>`;
          wrap.appendChild(card1);

          // STEP3 をレンダリング
          const card3 = document.createElement('div');
          card3.className = 'ob-step';
          const prof = me && me.onboarding ? (me.onboarding.profile || (me.onboarding.profile = {})) : {};
          const whatListRE = [
            { id: 'w01', name: '清潔感タイプ' },
            { id: 'w02', name: '自然体タイプ' },
            { id: 'w03', name: '大人落ち着きタイプ' },
            { id: 'w04', name: '男らしさタイプ' },
            { id: 'w05', name: '選ばれる恋愛タイプ' },
            { id: 'w06', name: '自信醸成タイプ' },
            { id: 'w07', name: '第一印象変化タイプ' },
            { id: 'w08', name: '節目変化タイプ' }
          ];
          const selectedRE = Array.isArray(prof.whatTypes) ? new Set(prof.whatTypes) : new Set();
          const block1RE = document.createElement('div');
          block1RE.className = 'ob-card';
          block1RE.innerHTML = '<strong>最も力になれる第2階層タイプ（複数選択可）</strong>';
          const wrapChipsRE = document.createElement('div');
          wrapChipsRE.className = 'cluster';
          wrapChipsRE.style.flexWrap = 'wrap';
          wrapChipsRE.style.gap = '8px';
          whatListRE.forEach(w => {
            const lab = document.createElement('label');
            lab.className = 'chip';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = selectedRE.has(w.id);
            cb.addEventListener('change', () => {
              if (cb.checked) selectedRE.add(w.id); else selectedRE.delete(w.id);
              prof.whatTypes = Array.from(selectedRE);
              if (me) persist(me);
            });
            lab.appendChild(cb);
            lab.appendChild(document.createTextNode(' ' + w.name));
            wrapChipsRE.appendChild(lab);
          });
          block1RE.appendChild(wrapChipsRE);

          const block2RE = document.createElement('div');
          block2RE.className = 'ob-card';
          block2RE.innerHTML = '<strong>どんな悩みを持つ男性と向き合ってきたか</strong>';
          const ta2RE = document.createElement('textarea');
          ta2RE.id = 'ob-q-problems';
          ta2RE.placeholder = '例：第一印象に自信が持てず、恋愛や仕事で一歩踏み出せない男性...';
          ta2RE.value = prof.problems || '';
          ta2RE.addEventListener('input', () => { prof.problems = ta2RE.value; if (me) persist(me); });
          block2RE.appendChild(ta2RE);

          const block3RE = document.createElement('div');
          block3RE.className = 'ob-card';
          block3RE.innerHTML = '<strong>初めての人にどう寄り添うか</strong>';
          const ta3RE = document.createElement('textarea');
          ta3RE.id = 'ob-q-first';
          ta3RE.placeholder = '例：理由を言語化しながら伴走します。納得できるまで説明と提案を繰り返します...';
          ta3RE.value = prof.first || '';
          ta3RE.addEventListener('input', () => { prof.first = ta3RE.value; if (me) persist(me); });
          block3RE.appendChild(ta3RE);

          const block4RE = document.createElement('div');
          block4RE.className = 'ob-card';
          block4RE.innerHTML = '<strong>結果が出るまでに大切にしていること</strong>';
          const ta4RE = document.createElement('textarea');
          ta4RE.id = 'ob-q-values';
          ta4RE.placeholder = '例：習慣化の仕組み化、レビューと改善の反復...';
          ta4RE.value = prof.values || '';
          ta4RE.addEventListener('input', () => { prof.values = ta4RE.value; if (me) persist(me); });
          block4RE.appendChild(ta4RE);

          const block5RE = document.createElement('div');
          block5RE.className = 'ob-card';
          block5RE.innerHTML = '<strong>価格ではなく何で選ばれたいか</strong>';
          const ta5RE = document.createElement('textarea');
          ta5RE.id = 'ob-q-beyond';
          ta5RE.placeholder = '例：伴走の質、説明のわかりやすさ、提案の一貫性...';
          ta5RE.value = prof.beyond || '';
          ta5RE.addEventListener('input', () => { prof.beyond = ta5RE.value; if (me) persist(me); });
          block5RE.appendChild(ta5RE);

          const title3 = document.createElement('h2');
          title3.textContent = 'STEP3：掲載者プロフィールの思想入力（重要）';
          const help3 = document.createElement('p');
          help3.textContent = '「誰に・どんな変化を届けるのか」を言語化してください。実績や肩書のみの入力は禁止です。';
          card3.appendChild(title3);
          card3.appendChild(help3);
          card3.appendChild(block1RE);
          card3.appendChild(block2RE);
          card3.appendChild(block3RE);
          card3.appendChild(block4RE);
          card3.appendChild(block5RE);

          const noteRE = document.createElement('p');
          noteRE.className = 'muted';
          noteRE.textContent = '良い例 / 悪い例を参照し、感情・考え・姿勢が伝わる文章を重視してください。この文章は診断結果と一緒に表示され、相性判断にも使われます。';
          card3.appendChild(noteRE);

          const ctaRE = document.createElement('div');
          ctaRE.className = 'cluster';
          ctaRE.style.gap = '8px';
          ctaRE.style.justifyContent = 'flex-end';
          const startRE = document.createElement('a');
          startRE.className = 'btn';
          startRE.href = '/provider/profile';
          startRE.textContent = 'この考え方で掲載をはじめる';
          const moreRE = document.createElement('a');
          moreRE.className = 'btn btn-ghost';
          moreRE.href = '/provider/about';
          moreRE.textContent = '考え方をもう少し知る';
          ctaRE.appendChild(startRE);
          ctaRE.appendChild(moreRE);
          card3.appendChild(ctaRE);

          wrap.appendChild(card3);
          host.innerHTML = '';
          host.appendChild(wrap);

          // 再編集モードではナビゲーションボタンを非表示
          const prev = qs('#prev');
          const next = qs('#next');
          if (prev) prev.style.display = 'none';
          if (next) next.style.display = 'none';

          // フォーカス誘導（#focus=...）
          try {
            const hash = String(location.hash || '');
            const m = hash.match(/focus=([^&]+)/);
            if (m) {
              const id = decodeURIComponent(m[1]);
              const el = document.getElementById(id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if (el instanceof HTMLElement) {
                  el.style.outline = '2px solid var(--primary)';
                  setTimeout(() => { el.style.outline = ''; }, 2000);
                }
              }
            }
          } catch {}

          // 診断読み込みボタンを有効化
          qs('#ob-import-diag')?.addEventListener('click', () => {
            try {
              const raw = localStorage.getItem('fineme:diagnosis:latest');
              const obj = raw ? JSON.parse(raw) : null;
              if (obj && obj.intent) {
                if (me && me.onboarding) {
                  me.onboarding.diag = {
                    intent_type_id: obj.intent.type_id,
                    intent_type_name: (obj.step2?.classification?.type_name) || obj.intent.type_name,
                    why_avg: (obj.why?.avg) || null,
                    how_scores: (obj.how?.scores) || []
                  };
                  persist(me);
                }
                // 再描画
                init();
              } else { alert('診断結果が見つかりませんでした。診断を完了して再度読み込んでください。'); }
            } catch (e) { alert('診断結果の読み込みに失敗しました。'); }
          });
        } catch (e) { console.warn('reedit render failed', e); }
        return;
      }

      // ここから通常フロー（ログイン不要のデモ表示あり）
      if (!me) {
        try {
          const host = qs('#ob-host');
          if (host) {
            setDot(step);
            const demo = document.createElement('div');
            demo.className = 'ob-step';
            demo.innerHTML = `
              <h2>デモ表示：Finemeオンボーディングの要点</h2>
              <div class="stack">
                <div class="ob-card">
                  <strong>STEP1：診断体験（掲載者自身が受ける）</strong>
                  <p>ユーザー向け診断をそのまま受けてください。診断は"納得のための道しるべ"。</p>
                  <div class="cluster" style="gap:8px">
                    <a class="btn" href="/diagnosis" target="_blank" rel="noopener">診断ページを開く</a>
                  </div>
                </div>
                <div class="ob-card">
                  <strong>STEP3：掲載者プロフィールの思想入力（重要）</strong>
                  <p>「誰に・どんな変化を届けるのか」を言語化してください。</p>
                  <div class="cluster" style="gap:8px">
                    <a class="btn" href="/provider/profile">プロフィール入力へ</a>
                  </div>
                </div>
                <p class="muted">ログイン後は進行管理と保存が有効になり、全STEPが表示されます。</p>
              </div>`;
            host.innerHTML = '';
            host.appendChild(demo);
          }
        } catch {}
        return; // デモ表示で終了
      }

      if (!me.onboarding) {
        me.onboarding = { completed: false, steps: {}, profile: {}, diag: {}, completedAt: null };
        persist(me);
      }
      render();
      qs('#prev')?.addEventListener('click', () => { if (step > 0) { step--; render(); } });
      qs('#next')?.addEventListener('click', onNext);
    })();

    return () => {
      try { document.head.removeChild(style); } catch {}
    };
  }, []);

  return (
    <main className="section">
      <div className="container ob-wrap stack">
        <h1 className="section-title">掲載者オンボーディング</h1>
        <p className="muted">Finemeの思想理解と、診断に対応したプロフィール入力を進めます。完了まで店舗は非公開です。</p>
        <div className="ob-steps" aria-hidden="true">
          <div className="dot" id="dot-0"></div>
          <div className="dot" id="dot-1"></div>
          <div className="dot" id="dot-2"></div>
          <div className="dot" id="dot-3"></div>
          <div className="dot" id="dot-4"></div>
        </div>
        <div id="ob-host" className="stack" style={{ gap: '12px' }}></div>
        <div className="ob-actions">
          <button id="prev" className="btn btn-ghost" type="button">戻る</button>
          <button id="next" className="btn" type="button">次へ</button>
        </div>
      </div>
    </main>
  );
}
