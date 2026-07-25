// /belle 配下の全ページ上部に出す面内インジケーター。
// 共通ヘッダーからBelle識別を外した代わりに、ここで「今はBelle（女性向け）」を面内で示す。
export default function BelleTrackBadge() {
  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(200,100,140,0.12), rgba(200,140,160,0.06))',
      borderBottom: '1px solid rgba(200,140,160,0.22)',
      padding: '7px 16px',
      textAlign: 'center',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 6,
        fontFamily: "'Noto Serif JP', Georgia, serif", letterSpacing: '.04em',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f0d8e0' }}>Fineme Belle</span>
        <span style={{ fontSize: 11, color: 'rgba(240,216,224,0.6)' }}>・ 女性向け</span>
      </span>
    </div>
  );
}
