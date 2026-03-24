import Link from 'next/link';
import typesData from '@/data/types.json';

export const metadata = {
  title: '診断タイプ一覧 | Fineme',
  description: 'Finemeの外見タイプ診断（Me Scan）で出現する全16タイプの一覧。あなたのタイプを確認したり、他のタイプを知ることができます。',
};

export default function DiagnosisTypesPage() {
  const maleTypes = Object.values(typesData.male || {});

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.1em' }}>Me Scan</p>
          <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: '#111', margin: '0 0 12px', lineHeight: 1.3 }}>
            全 {maleTypes.length} タイプ一覧
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: 1.7, margin: '0 auto 24px', maxWidth: 540 }}>
            Finemeの診断（Me Scan）で出現する外見タイプを一覧で確認できます。<br />
            あなたのタイプを知って、変容の方向性を見つけましょう。
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/diagnosis" className="btn" style={{ fontSize: '14px', padding: '10px 22px' }}>
              Me Scanを受ける →
            </Link>
            <Link href="/diagnosis/result" className="btn btn-ghost" style={{ fontSize: '14px', padding: '10px 22px' }}>
              あなたのNew Me Mapを見る
            </Link>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '16px' }}>
          {maleTypes.map((type) => (
            <div
              key={type.type_id}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,.04)',
                transition: 'box-shadow .15s, transform .15s',
              }}
            >
              {/* タイプ番号バッジ */}
              <div style={{
                background: 'linear-gradient(135deg, #0f172a, #1e1b4b)',
                padding: '16px 18px 12px',
                position: 'relative',
              }}>
                <span style={{
                  fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,.4)',
                  letterSpacing: '.1em', textTransform: 'uppercase',
                }}>
                  Type {type.type_id?.replace('t', '').padStart(2, '0')}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '4px 0 6px', lineHeight: 1.2 }}>
                  {type.name}
                </h2>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,.5)', margin: 0, fontWeight: 600, letterSpacing: '.04em' }}>
                  {type.label}
                </p>
              </div>

              <div style={{ padding: '14px 18px 16px' }}>
                {/* キャッチコピー */}
                <p style={{
                  fontSize: '13px', fontWeight: 700, color: '#4f46e5',
                  lineHeight: 1.55, margin: '0 0 10px',
                  borderLeft: '2px solid #c7d2fe', paddingLeft: '10px',
                }}>
                  {type.catch}
                </p>

                {/* 説明（短縮） */}
                <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.65, margin: '0 0 12px' }}>
                  {type.description?.slice(0, 80)}{type.description?.length > 80 ? '…' : ''}
                </p>

                {/* トレイトバッジ */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(type.traits || []).map((trait) => (
                    <span
                      key={trait}
                      style={{
                        fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                        borderRadius: '99px', background: '#f3f4f6', color: '#374151',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px', padding: '32px', background: 'linear-gradient(135deg,#f5f7ff,#eef2ff)', borderRadius: '20px', border: '1.5px solid #e0e7ff' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.08em' }}>あなたはどのタイプ？</p>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#111', margin: '0 0 10px' }}>Me Scanを受けて確認しよう</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.7, margin: '0 0 20px' }}>
            7軸の診断から、あなたの現在地・理想・最初の一手を生成します。
          </p>
          <Link href="/diagnosis" className="btn" style={{ fontSize: '14px', padding: '12px 26px' }}>
            無料で診断する →
          </Link>
        </div>
      </div>
    </main>
  );
}
