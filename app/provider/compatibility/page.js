'use client';
import { useEffect, useRef } from 'react';

export default function ProviderCompatibilityPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // ─── Auth helper (inlined from scripts/auth.js) ───
    const PROVIDER_SESSION_KEY = 'glowup:providerSession';
    function getProviderSession() {
      try { const raw = sessionStorage.getItem(PROVIDER_SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }
    function requireProviderAuth() {
      const session = getProviderSession();
      if (!session) {
        const current = (location.pathname || '/') + (location.search || '') + (location.hash || '');
        location.href = '/login?returnTo=' + encodeURIComponent(current);
        return null;
      }
      return session;
    }

    const session = requireProviderAuth();
    if (!session) return;

    // ─── Data helpers ───
    const PROVIDERS_KEY = 'glowup:providers';
    function loadProviders() {
      try { const raw = localStorage.getItem(PROVIDERS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
    }

    function classifyTypeFromScores(sc) {
      try {
        const A = Number(sc.A || 2), B = Number(sc.B || 2), C = Number(sc.C || 2), D = Number(sc.D || 2);
        const E = String((sc.E_tags || [])[0] || '');
        const ideal = {
          t01: { name: '慎重・納得重視タイプ', vec: { A: 3, B: 3, C: 2, D: 2 }, bonus: ['理論・根拠'] },
          t02: { name: '安心・寄り添い重視タイプ', vec: { A: 2, B: 4, C: 1, D: 1 }, bonus: ['安心感'] },
          t03: { name: '効率・最短重視タイプ', vec: { A: 2, B: 1, C: 3, D: 3 }, bonus: ['実績'] },
          t04: { name: '変化・アップデート重視タイプ', vec: { A: 4, B: 1, C: 4, D: 2 }, bonus: ['センス'] },
          t05: { name: '直感・フィーリング重視タイプ', vec: { A: 2, B: 2, C: 2, D: 2 }, bonus: ['センス'] },
          t06: { name: '伴走・共同決定重視タイプ', vec: { A: 3, B: 2, C: 2, D: 2 }, bonus: ['安心感', '理論・根拠'] }
        };
        const entries = Object.values(ideal).map(meta => {
          const v = meta.vec;
          let d = Math.abs(A - v.A) + Math.abs(B - v.B) + Math.abs(C - v.C) + Math.abs(D - v.D);
          if (E && meta.bonus.includes(E)) d -= 0.6;
          return { name: meta.name, dist: d };
        });
        entries.sort((a, b) => a.dist - b.dist);
        return entries.map(e => e.name);
      } catch { return []; }
    }

    function render() {
      const host = document.getElementById('compat-host');
      if (!host) return;
      host.textContent = '';

      const me = loadProviders().find(p => p.id === session.id) || {};
      const sc = me.onboarding?.scores || {};
      const order = classifyTypeFromScores(sc);

      if (!order.length) {
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'まだスコアが設定されていません。オンボーディングから入力してください。';
        host.appendChild(p);
        return;
      }

      const zones = [
        { label: '相性がいい', items: order.slice(0, 1) },
        { label: '合いそう', items: order.slice(1, 3) },
        { label: '表示されにくい', items: order.slice(3) }
      ];

      zones.forEach(z => {
        if (!z.items.length) return;
        const card = document.createElement('div');
        card.className = 'card';
        card.style.padding = '12px';
        const h = document.createElement('strong');
        h.textContent = z.label;
        card.appendChild(h);
        const ul = document.createElement('ul');
        z.items.forEach(n => {
          const li = document.createElement('li');
          li.textContent = n;
          ul.appendChild(li);
        });
        card.appendChild(ul);
        host.appendChild(card);
      });

      const note = document.createElement('p');
      note.className = 'muted';
      note.textContent = '表示順はゾーン内で適度に前後します。価値観タグの一致で微調整されます。';
      host.appendChild(note);

      // タイプ別アクション
      try {
        const wrap = document.getElementById('type-actions-body');
        if (!wrap) return;
        const top = order[0] || '';
        const map = {
          '慎重・納得重視タイプ': [
            '事前説明とプロセスの可視化（合意の取り方/失敗時の対応）',
            '事例写真に「なぜそうしたか」を1文付記',
            '小さな試行（初回の進め方）を明記'
          ],
          '安心・寄り添い重視タイプ': [
            '相談/確認のタイミングを明文化（初回〜定期）',
            '不安へのQ&Aを追加（よくある質問に短く答える）',
            'やり直し/調整の安全網を提示'
          ],
          '効率・最短重視タイプ': [
            'ゴール/評価指標/期間の明文化',
            '短期スプリントの設計（1〜2週間の改善サイクル）',
            '比較写真で結果の見え方を提示'
          ],
          '変化・アップデート重視タイプ': [
            '更新提案（次の一歩）を用意',
            '大ぶりではなく安全な挑戦の設計',
            '変化の意図と言語化'
          ],
          '直感・フィーリング重視タイプ': [
            '世界観を言語化（どんな価値観の人に合うか）',
            '事例でイメージを作る（近距離での心地よさ）',
            '小さく試して振り返る導線'
          ],
          '伴走・共同決定重視タイプ': [
            '選択肢提示と共同意思決定の流れ',
            '定期チェックインとメモ共有',
            '習慣化の仕組み（ルール化/振り返り）'
          ]
        };
        const actions = map[top] || ['プロフィールに具体的な言葉を増やす'];
        const list = document.createElement('ul');
        list.className = 'stack';
        actions.forEach(t => {
          const li = document.createElement('li');
          li.textContent = String(t);
          list.appendChild(li);
        });
        wrap.textContent = '';
        wrap.appendChild(list);
      } catch { /* optional */ }
    }

    render();
  }, []);

  return (
    <main className="section">
      <div className="container stack">
        <h1 className="section-title">Fineme内での"相性の見え方"</h1>
        <p className="muted">順位は表示せず、ゾーンで伝えます。表示されないのは「悪い」からではなく、合わない人に無理に届かない設計です。</p>

        <section className="card" style={{padding:'12px'}}>
          <strong>Finemeの核（運営視点の要約）</strong>
          <ul className="stack" style={{marginTop:'8px'}}>
            <li>価格や露出ではなく「相性」で選ばれる体験を設計します。</li>
            <li>外見はゴールではなく入口。自信の再設計につながる変化を扱います。</li>
            <li>ユーザーは診断で価値観を言語化し、相性順で出会います。</li>
            <li>掲載者は「どんな人に向いているか」「価値観」「得意な変化」を言語化します。</li>
          </ul>
        </section>

        <section id="compat-host" className="stack"></section>

        <section className="card" style={{padding:'12px'}}>
          <strong>ゾーンの見方（表示の意図）</strong>
          <ul className="stack" style={{marginTop:'8px'}}>
            <li>相性がいい：今のあなたのプロフィールと言語化が、特定タイプの人に強く届いています。</li>
            <li>合いそう：届き始めています。具体例や進め方の言語化を増やすと安定します。</li>
            <li>表示されにくい：悪いのではなく、今は合わない人に無理に届かない設計です。</li>
          </ul>
        </section>

        <section id="type-actions" className="card" style={{padding:'12px'}}>
          <strong>タイプ別に「届き方」を高めるアクション</strong>
          <div id="type-actions-body" className="stack" style={{marginTop:'8px'}}></div>
        </section>

        <section className="card" style={{padding:'12px'}}>
          <strong>運用ループ（2週間サイクル）</strong>
          <ol className="stack" style={{marginTop:'8px'}}>
            <li>仮説：どんな人に何が伝わるか（価値観・進め方）を1点決める</li>
            <li>編集：サービス説明に、進め方/合意/リスク対応/Q&Aを具体化</li>
            <li>観察：予約/来店/再訪のログを見て、届いたかを振り返る</li>
            <li>調整：届いた要素を残し、届かなかった要素を言葉で補う</li>
          </ol>
          <p className="muted" style={{margin:'6px 0 0'}}>順位ではなく、合う人への到達度で改善します。</p>
        </section>

        <section className="card" style={{padding:'12px'}}>
          <strong>注意と前提</strong>
          <ul className="stack" style={{marginTop:'8px'}}>
            <li>写真や価格だけで選ばれた来店は、満足度が不安定になりやすいです。</li>
            <li>「世界観」だけの訴求は、診断の価値観と接続しないと再現性が下がります。</li>
            <li>オンボーディング未完了や店舗を非公開にすると、サイト上の表示は抑制されます。</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
