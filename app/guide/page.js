import GuideInteractive from './GuideInteractive';

const AXES = [
  {
    id: 'eyebrow', icon: '✂️', label: '眉毛', tier: 1,
    quick_win: '1〜2回のサロンで劇的に変わる。コスパ最高の即効軸。',
    start: '眉サロン 1回（¥3,000〜）',
    effect: '顔の印象・清潔感が即日アップ',
    href: '/search?category=eyebrow',
    paths: {
      virgin: '初めてでも「骨格に合わせた形」をプロに任せれば失敗なし。',
      quit: '続かない原因は「間隔が空きすぎること」。2〜3ヶ月定期に設定するだけ。',
      blind: '「今の自分の眉がどう見えているか」を一度プロに評価してもらうだけで変わる。',
      lapsed: '再開のハードルは低い。「また来ました」で通える関係性を作ること。',
    },
  },
  {
    id: 'hair', icon: '💇', label: '髪・ヘア', tier: 1,
    quick_win: '毎日目に入る。スタイリング習慣が変われば毎朝の自信が変わる。',
    start: '信頼できる美容師との出会い',
    effect: '第一印象・清潔感・毎朝の気分',
    href: '/search?category=hair',
    paths: {
      virgin: '「いつも任せます」が一番危険。「短く・清潔感」の2ワードから始めよう。',
      quit: 'スタイルが決まらないのは担当者との相性かも。「来た道」を正直に話せるスタイリストを探す。',
      blind: '「いつも同じスタイル」になるのは指示が曖昧だから。写真を1枚持っていくだけで変わる。',
      lapsed: '間隔が空きすぎると崩れが定着する。2ヶ月ルールを習慣にするだけで変わる。',
    },
  },
  {
    id: 'body', icon: '💪', label: '体型・ボディ', tier: 1,
    quick_win: '姿勢だけで今日から印象が変わる。継続で確実に積み上がる軸。',
    start: 'まず姿勢チェック＆体脂肪率把握',
    effect: '見た目・健康・自信の土台',
    href: '/search?category=gym',
    paths: {
      virgin: '「ジムに通う」ではなく「何を変えたいか」から決める。最初は週2回以下でもOK。',
      quit: '続かない原因の95%は「目標と負荷のミスマッチ」。小さく設定し直すことが正解。',
      blind: '「自己流でやっているが変わっている気がしない」なら、一度客観的に評価を受ける価値がある。',
      lapsed: 'リスタートはゼロからではなく50から。体は覚えている。再開のハードルを下げることが先。',
    },
  },
  {
    id: 'fashion', icon: '👔', label: '服・コーデ', tier: 1,
    quick_win: '「似合う色×体型に合うシルエット」2軸を押さえれば全体が変わる。',
    start: '骨格診断 or パーソナルカラー診断',
    effect: '全体の調和・おしゃれな印象',
    href: '/search?category=fashion',
    paths: {
      virgin: '「なんとなく」で選んでいる服を一度プロに見てもらう。それだけで基準が生まれる。',
      quit: '「試したがしっくりこなかった」のは、自分の骨格・顔タイプを知らなかったから。',
      blind: 'TPOで「なんか違う」と言われたことがある人は客観評価が必要。',
      lapsed: '去年の服が似合わなくなるのは当然。体型・年齢・ライフスタイルが変わるから。',
    },
  },
  {
    id: 'skin', icon: '✨', label: '肌・エステ', tier: 2,
    quick_win: '毎日の洗顔・保湿から。プロの施術で確実に底上げできる軸。',
    start: 'スキンケア習慣の見直し',
    effect: '清潔感・健康的な印象',
    href: '/search?category=esthetic',
    paths: {
      virgin: '「男性がスキンケアするのは変」は昭和の話。洗顔＋保湿だけで5年分変わる。',
      quit: '続かないスキンケアは「ステップが多すぎる」から。最小3ステップにする。',
      blind: 'やっているのに変わらない人は、成分・順番・量のどれかがズレている。',
      lapsed: '再開は今日から。「明日から」は永遠に来ない。',
    },
  },
  {
    id: 'teeth', icon: '🦷', label: '歯・口元', tier: 3,
    quick_win: '笑顔への自信が変わる。投資対効果が高い中期プロジェクト。',
    start: 'ホワイトニング or 歯科相談',
    effect: '笑顔の自信・口元の印象',
    href: '/search?category=whitening',
    paths: {
      virgin: '一歩が踏み出せないのは「費用・痛み・時間」への不安から。まず相談だけ。',
      quit: '途中で止まった人は「目標が抽象的すぎた」ことが多い。「笑顔を隠さなくなる」が正しいゴール設定。',
      blind: '「自分の歯が人からどう見えているか」を知ることが最初の一歩。',
      lapsed: '再開のきっかけはいつでも作れる。まず歯医者の定期健診から。',
    },
  },
  {
    id: 'nail', icon: '💅', label: '爪', tier: 4,
    quick_win: '整えるだけ。汚れ・長さ・形。それだけで「細部まで気を使う人」になる。',
    start: '長さを整える＋甘皮ケア',
    effect: '細部の清潔感・手元の印象',
    href: '/search?category=nail',
    paths: {
      virgin: '爪を整えるだけで「清潔感が高い」という評価が生まれる。月1回で十分。',
      quit: '続かない人は「自分でやろうとしていた」から。サロンに任せると習慣になる。',
      blind: '「自分は爪を整えているつもり」が一番危ない。客観的に見てもらう機会を作る。',
      lapsed: '再開は15分で終わる。ネイルサロンに予約を入れるだけ。',
    },
  },
];

const TIER_INFO = {
  1: { label: 'Tier 1 — 今すぐ着手', color: '#c9a84c', bg: 'rgba(201,168,76,0.12)', border: 'rgba(201,168,76,0.3)', desc: '即効性が高く、コスト・時間ともに参入しやすい軸。変化の実感を得やすい。' },
  2: { label: 'Tier 2 — 早めに着手',  color: '#065f46', bg: '#d1fae5', border: '#86efac', desc: '継続が必要だが確実に変わる軸。Tier 1と並走で取り組むと効果的。' },
  3: { label: 'Tier 3 — 中期計画',   color: '#92400e', bg: '#fef3c7', border: '#fcd34d', desc: '投資額・時間ともに大きいが、変化の質と永続性が高い軸。' },
  4: { label: 'Tier 4 — 長期・細部', color: '#374151', bg: '#f3f4f6', border: '#d1d5db', desc: '完成度を上げる仕上げの軸。Tier 1〜3が整ってから取り組む。' },
};

export default function GuidePage() {
  return (
    <>
      <style>{`
        .guide-hero {
          position: relative; padding: 96px 24px 80px;
          background:
            linear-gradient(rgba(10,15,30,0.72), rgba(10,15,30,0.82)),
            url('/assets/images/hero-bg.webp') center / cover no-repeat;
          text-align: center; overflow: hidden;
        }
        .guide-hero-eyebrow {
          font-size: 11px; font-weight: 800; letter-spacing: .18em;
          color: rgba(201,168,76,0.55); text-transform: uppercase; margin: 0 0 18px;
        }
        .guide-hero h1 {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(26px, 5.5vw, 42px); font-weight: 700;
          margin: 0 0 14px; color: #fff; letter-spacing: -.01em; line-height: 1.4;
        }
        .guide-hero p {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(14px, 2.2vw, 17px); color: rgba(255,255,255,.65);
          margin: 0 auto; line-height: 2; max-width: 500px;
        }
        .guide-wrap { max-width: 860px; margin: 0 auto; padding: 0 20px 80px; }
        .guide-sec { margin: 48px 0 0; }
        .guide-sec-label {
          font-size: 11px; font-weight: 800; letter-spacing: .14em;
          text-transform: uppercase; color: var(--color-gold, #c9a84c); margin: 0 0 10px;
        }
        .guide-sec h2 {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(20px, 4vw, 28px); font-weight: 700;
          color: var(--color-fg, #0a0f1e); margin: 0 0 8px;
        }
        .guide-sec-lead { font-size: 15px; color: var(--color-muted, #7a6e65); line-height: 1.9; margin: 0 0 24px; }
        .compass-banner {
          background: rgba(201,168,76,0.06); border: 1.5px solid rgba(201,168,76,0.3);
          border-radius: 10px; padding: 20px 22px; margin-bottom: 24px;
          display: flex; gap: 14px; align-items: flex-start;
        }
        .compass-banner-icon { font-size: 32px; flex-shrink: 0; }
        .compass-banner-title { font-size: 16px; font-weight: 800; color: var(--color-fg, #0a0f1e); margin: 0 0 4px; }
        .compass-banner-desc { font-size: 13px; color: var(--color-gold, #c9a84c); margin: 0; line-height: 1.7; }
        .no-diag-banner {
          background: var(--color-bg-parchment, #f5f0e8);
          border: 1.5px solid rgba(201,168,76,0.45);
          border-radius: 10px; padding: 22px; text-align: center; margin-bottom: 24px;
        }
        .tier-legend { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
        .guide-axis-card {
          background: #fff; border: 1px solid var(--color-border-gold, rgba(201,168,76,0.28));
          border-radius: 12px; overflow: hidden; margin-bottom: 14px;
          box-shadow: var(--shadow-sm); transition: box-shadow .15s, transform .12s;
        }
        .guide-axis-card:hover { box-shadow: var(--shadow-gold); transform: translateY(-2px); }
        .guide-axis-card.is-compass {
          border-color: rgba(201,168,76,0.55);
          box-shadow: 0 4px 20px rgba(201,168,76,0.18);
        }
        .guide-axis-header { display: flex; align-items: center; gap: 14px; padding: 18px 20px; }
        .guide-axis-icon { font-size: 28px; flex-shrink: 0; }
        .guide-axis-label { font-size: 17px; font-weight: 800; color: var(--color-fg, #0a0f1e); flex: 1; }
        .guide-axis-tier-badge {
          font-size: 10px; font-weight: 700; padding: 3px 10px;
          border-radius: 99px; flex-shrink: 0;
        }
        .guide-axis-body { padding: 0 20px 20px; }
        .guide-axis-quick { font-size: 14px; color: var(--color-fg, #0a0f1e); line-height: 1.7; margin: 0 0 12px; }
        .guide-axis-meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 14px; }
        .guide-axis-chip {
          font-size: 12px; padding: 4px 12px; border-radius: 99px;
          background: var(--color-bg-parchment, #f5f0e8);
          color: var(--color-muted, #7a6e65);
          border: 1px solid var(--color-border-gold, rgba(201,168,76,0.25));
          display: flex; align-items: center; gap: 5px;
        }
        .guide-axis-path {
          background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.2);
          border-radius: 10px; padding: 12px 16px; margin: 0 0 14px;
          font-size: 13px; color: var(--color-fg, #0a0f1e); line-height: 1.8;
        }
        .guide-axis-path-label { font-size: 10px; font-weight: 800; color: var(--color-gold, #c9a84c); margin: 0 0 4px; letter-spacing: .08em; }
        .guide-axis-cta {
          display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px;
          border: 1.5px solid var(--color-gold, #c9a84c); color: var(--color-gold, #c9a84c);
          background: transparent; border-radius: 6px; font-size: 13px; font-weight: 700;
          text-decoration: none; transition: background .18s, color .18s;
        }
        .guide-axis-cta:hover { background: var(--color-gold, #c9a84c); color: #0a0f1e; }
        .compass-crown {
          font-size: 10px; font-weight: 700; color: var(--color-gold, #c9a84c);
          background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,.3);
          padding: 2px 10px; border-radius: 99px;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .guide-scan-cta {
          background: var(--color-bg-dark, #0a0f1e); border-radius: 12px;
          padding: 44px 28px; text-align: center; margin-top: 56px;
          border: 1px solid rgba(201,168,76,0.2);
        }
        .guide-scan-cta h2 {
          font-family: 'Noto Serif JP', Georgia, serif;
          font-size: clamp(20px,4vw,26px); font-weight: 700; color: #fff; margin: 0 0 12px;
        }
        .guide-scan-cta p { font-size: 14px; color: rgba(255,255,255,.6); margin: 0 0 28px; line-height: 1.8; }
        .guide-scan-btn {
          display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px;
          border: 1.5px solid #c9a84c; color: #c9a84c; background: transparent;
          border-radius: 3px; font-size: 15px; font-weight: 700; text-decoration: none;
          letter-spacing: .06em; transition: background .2s, color .2s, box-shadow .2s;
        }
        .guide-scan-btn:hover { background: #c9a84c; color: #0a0f1e; box-shadow: 0 0 28px rgba(201,168,76,.35); }
        @media (max-width: 600px) { .guide-wrap { padding: 0 14px 60px; } }
      `}</style>

      <section className="guide-hero">
        <p className="guide-hero-eyebrow">7-Axis Transformation Guide</p>
        <h1>7軸 変容ガイド</h1>
        <p>
          外見を7つの軸に分解し、どこから・どう変えるかを整理した地図。<br />
          Me Scanを受けると、あなた専用の優先順位が生成されます。
        </p>
      </section>

      <main className="guide-wrap">
        <GuideInteractive axes={AXES} tierInfo={TIER_INFO} />
      </main>
    </>
  );
}
