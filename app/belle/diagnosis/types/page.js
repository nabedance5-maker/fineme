import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'Belle タイプ一覧 | Fineme Belle',
  description: 'Fineme Belleの診断（Me Scan）で出現する全136タイプの一覧。8軸×17花タイプ。あなたのタイプを確認できます。',
};

const TYPE_CREATURE = {
  NV:'薔薇', NK:'芙蓉', ND:'野菫',
  CV:'蕾', CQ:'紫陽花', CK:'夾竹桃', CL:'牡丹', CD:'椿',
  AV:'新芽', AQ:'勿忘草', AK:'月見草', AL:'山茶花', AD:'白梅',
  PQ:'落梅', PK:'百合', PL:'蓮', PD:'桜',
};
const AXIS_WORD = { B:'しなやかな', E:'眉の', F:'纏いの', H:'光髪の', S:'麗肌の', R:'素肌の', T:'白磁の', W:'花爪の' };
const TYPE_MODIFIER = {
  NV:'眠れる', NK:'鏡なき', ND:'咲き続ける',
  CV:'凍れる', CQ:'散り際の', CK:'迷える', CL:'眠れる', CD:'紅の',
  AV:'揺れる', AQ:'忘れゆく', AK:'独り咲く', AL:'休める', AD:'白き',
  PQ:'散りかけの', PK:'委ねた', PL:'封じた', PD:'黎明の',
};
const AXIS_LABEL = { B:'ボディ', E:'眉', F:'ファッション', H:'ヘア', S:'肌', R:'脱毛', T:'歯・笑顔', W:'爪・手元' };
const AXIS_COLOR = { B:'#ef4444', E:'#8b5cf6', F:'#10b981', H:'#3b82f6', S:'#f59e0b', R:'#06b6d4', T:'#eab308', W:'#14b8a6' };
const AXIS_EMOJI = { B:'💪', E:'✂️', F:'👗', H:'💇', S:'✨', R:'🪒', T:'😁', W:'💅' };

const AXES   = ['B','E','F','H','S','R','T','W'];
const COMBOS = ['NV','NK','ND','CV','CQ','CK','CL','CD','AV','AQ','AK','AL','AD','PQ','PK','PL','PD'];

function fullName(axis, combo) {
  return `${AXIS_WORD[axis]}${TYPE_MODIFIER[combo]}${TYPE_CREATURE[combo]}`;
}

export default function BelleTypesPage() {
  const allTypes = AXES.flatMap(axis =>
    COMBOS.map(combo => ({
      code: `${axis}${combo}`,
      axis,
      combo,
      name: fullName(axis, combo),
      flower: TYPE_CREATURE[combo],
      color: AXIS_COLOR[axis],
    }))
  );

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 900 }}>

        {/* ヘッダー */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(200,100,140,0.8)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Belle Me Scan
          </p>
          <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: 'rgba(232,228,220,0.90)', margin: '0 0 12px', lineHeight: 1.3 }}>
            全 {allTypes.length} タイプ一覧
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: 1.7, margin: '0 auto 24px', maxWidth: 540 }}>
            8軸×17花タイプで構成される、あなただけの外見マップ。<br />
            タイプ名は「軸の言葉 + 修飾語 + 花の名前」で組み合わされます。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/belle/diagnosis" className="btn" style={{ fontSize: '14px', padding: '10px 22px', background: 'linear-gradient(135deg,#c8648c,#e8789e)', border: 'none', color: '#fff' }}>
              Me Scanを受ける →
            </Link>
            <Link href="/belle/diagnosis/result" className="btn btn-ghost" style={{ fontSize: '14px', padding: '10px 22px' }}>
              あなたのタイプを確認
            </Link>
          </div>
        </div>

        {/* 軸ごとのセクション */}
        {AXES.map(axis => {
          const color = AXIS_COLOR[axis];
          const types = allTypes.filter(t => t.axis === axis);
          return (
            <section key={axis} style={{ marginBottom: '56px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '12px', borderBottom: `1px solid ${color}44` }}>
                <span style={{ fontSize: '22px' }}>{AXIS_EMOJI[axis]}</span>
                <h2 style={{ fontSize: '18px', fontWeight: 900, color, margin: 0 }}>
                  {AXIS_LABEL[axis]}軸
                </h2>
                <span style={{ fontSize: '12px', color: 'rgba(232,228,220,0.4)', fontWeight: 600, marginLeft: 'auto' }}>
                  {AXIS_WORD[axis]}〇〇の〇〇
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '12px' }}>
                {types.map(t => (
                  <div
                    key={t.code}
                    style={{
                      background: 'rgba(10,15,30,0.65)',
                      border: `1px solid ${color}33`,
                      borderRadius: '14px',
                      overflow: 'hidden',
                      backdropFilter: 'blur(8px)',
                      transition: 'box-shadow .15s, transform .15s',
                    }}
                  >
                    {/* 花画像 */}
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '3/4', background: `${color}11` }}>
                      <Image
                        src={`/images/types/belle/TYPE-${t.code}.webp`}
                        alt={t.name}
                        fill
                        sizes="(max-width:600px) 50vw, 160px"
                        style={{ objectFit: 'cover' }}
                        loading="lazy"
                      />
                    </div>

                    {/* テキスト */}
                    <div style={{ padding: '10px 12px 12px' }}>
                      <p style={{ fontSize: '9px', fontWeight: 800, color: `${color}cc`, letterSpacing: '.08em', margin: '0 0 4px', textTransform: 'uppercase' }}>
                        {t.code}
                      </p>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(232,228,220,0.88)', margin: 0, lineHeight: 1.4 }}>
                        {t.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {/* フッターCTA */}
        <div style={{ textAlign: 'center', marginTop: '16px', padding: '32px', background: 'rgba(10,15,30,0.65)', borderRadius: '20px', border: '1px solid rgba(200,100,140,0.3)', backdropFilter: 'blur(8px)' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(200,100,140,0.8)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.08em' }}>あなたはどの花？</p>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'rgba(232,228,220,0.90)', margin: '0 0 10px' }}>Me Scanを受けて確認しよう</h2>
          <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.55)', lineHeight: 1.7, margin: '0 0 20px' }}>
            8軸の診断から、あなたの現在地と最初の一手を生成します。
          </p>
          <Link href="/belle/diagnosis" className="btn" style={{ fontSize: '14px', padding: '12px 26px', background: 'linear-gradient(135deg,#c8648c,#e8789e)', border: 'none', color: '#fff' }}>
            無料で診断する →
          </Link>
        </div>
      </div>
    </main>
  );
}
