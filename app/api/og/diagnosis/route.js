import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const AXIS_MAP = {
  body:        { icon: '💪', label: '体型', color: '#6ee7b7' },
  eyebrow:     { icon: '✂️', label: '眉',   color: '#c9a84c' },
  hair:        { icon: '💇', label: '髪',   color: '#93c5fd' },
  fashion:     { icon: '👔', label: '服',   color: '#f9a8d4' },
  skin:        { icon: '✨', label: '肌',   color: '#fde68a' },
  hairremoval: { icon: '🪒', label: '脱毛', color: '#a5b4fc' },
  teeth:       { icon: '🦷', label: '歯',   color: '#e2e8f0' },
  nail:        { icon: '💅', label: '爪',   color: '#ddd6fe' },
};

const GOAL_COPY = {
  others_perception: '他者の目を変えたい',
  self_confidence:   '自分を好きになりたい',
  action_ease:       '行動できる自分になりたい',
  life_options:      '諦めを一つずつ減らしたい',
};

const TRIGGER_COPY = {
  matching_app: 'マッチングアプリで結果を出したい',
  love:         '好きな人がいる',
  career:       '大事な場面が控えている',
  word:         '誰かの一言がきっかけ',
  vague:        '何となく変わりたい',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const compass = searchParams.get('compass') || 'eyebrow';
  const goal = searchParams.get('goal') || '';
  const trigger = searchParams.get('trigger') || '';
  // 136タイプをOGの主役にする（type/name が無ければ従来のCompass軸表示にフォールバック）
  const typeCode = (searchParams.get('type') || '').slice(0, 8);
  const typeName = (searchParams.get('name') || '').slice(0, 40);

  const axisDef = AXIS_MAP[compass] || AXIS_MAP.eyebrow;
  const motiveCopy = GOAL_COPY[goal] || TRIGGER_COPY[trigger] || '外見を変えて自信を手に入れたい';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #080d1a 0%, #0d1528 60%, #060c1a 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景グロー */}
        <div style={{
          position: 'absolute', top: '-100px', left: '50%',
          transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 65%)',
          borderRadius: '50%',
        }} />

        {/* ブランド */}
        <div style={{
          fontSize: '18px', fontWeight: 800, color: '#c9a84c',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: '28px', opacity: 0.9,
          display: 'flex',
        }}>
          FINEME — Me Scan 診断結果
        </div>

        {typeName ? (
          <>
            {/* タイプコード */}
            <div style={{
              fontSize: '15px', fontWeight: 800, color: 'rgba(201,168,76,0.75)',
              letterSpacing: '0.24em', marginBottom: '14px', display: 'flex',
            }}>
              TYPE-{typeCode}
            </div>

            {/* タイプ名（主役） */}
            <div style={{
              fontSize: '68px', fontWeight: 900, color: '#fff',
              textAlign: 'center', lineHeight: 1.2, marginBottom: '22px',
              maxWidth: '1000px', display: 'flex', justifyContent: 'center',
            }}>
              {typeName}
            </div>

            {/* Compass軸（副次情報） */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 22px', borderRadius: '999px',
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.35)',
              marginBottom: '34px',
            }}>
              <div style={{ fontSize: '22px', display: 'flex' }}>{axisDef.icon}</div>
              <div style={{ fontSize: '19px', fontWeight: 700, color: 'rgba(240,236,228,0.85)', display: 'flex' }}>
                最初の一手は「{axisDef.label}」から
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Compass軸 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: `rgba(201,168,76,0.15)`,
                border: '2px solid rgba(201,168,76,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '36px',
              }}>
                {axisDef.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', display: 'flex' }}>
                  FINEME COMPASS
                </div>
                <div style={{ fontSize: '42px', fontWeight: 900, color: '#fff', lineHeight: 1.1, display: 'flex' }}>
                  {axisDef.label}
                </div>
              </div>
            </div>

            {/* メインコピー */}
            <div style={{
              fontSize: '28px', fontWeight: 800, color: 'rgba(240,236,228,0.92)',
              textAlign: 'center', lineHeight: 1.5, marginBottom: '24px',
              maxWidth: '800px', display: 'flex', flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              「{motiveCopy}」
            </div>

            {/* サブコピー */}
            <div style={{
              fontSize: '17px', color: 'rgba(255,255,255,0.5)',
              textAlign: 'center', marginBottom: '36px', display: 'flex',
            }}>
              8軸の外見診断で、今の自分に最も効く変容ルートが見つかった。
            </div>
          </>
        )}

        {/* CTA */}
        <div style={{
          padding: '14px 36px',
          background: 'linear-gradient(135deg, #c9a84c, #e8c97a)',
          borderRadius: '8px', color: '#0a0f1e',
          fontWeight: 800, fontSize: '16px', display: 'flex',
        }}>
          136タイプ、あなたはどれ？ → fineme.me/diagnosis
        </div>

        {/* 下部ライン */}
        <div style={{
          position: 'absolute', bottom: '28px',
          fontSize: '12px', color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.1em', display: 'flex',
        }}>
          fineme.me — 外見を起点に、自信を再設計する。
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
