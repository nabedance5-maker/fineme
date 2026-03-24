// Fineme ロゴ — SVG ワードマーク
// ゴールドメタリックグラデーション + スパークル（宝発見の輝き）
export default function FinemeLogo({ height = 32 }) {
  return (
    <svg
      viewBox="0 0 158 42"
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Fineme"
    >
      <defs>
        {/* ── ゴールドメタリックグラデーション：斜め光源で刻印感 ── */}
        <linearGradient id="fg-gold" x1="0%" y1="0%" x2="8%" y2="100%">
          <stop offset="0%"   stopColor="#6a4d0e"/>
          <stop offset="15%"  stopColor="#b8902a"/>
          <stop offset="38%"  stopColor="#e2c05c"/>
          <stop offset="50%"  stopColor="#f8e898"/>
          <stop offset="62%"  stopColor="#e2c05c"/>
          <stop offset="85%"  stopColor="#b8902a"/>
          <stop offset="100%" stopColor="#5c4010"/>
        </linearGradient>

        {/* ── スパークル用グロー ── */}
        <radialGradient id="fg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fffbe8"/>
          <stop offset="50%"  stopColor="#f5e090" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#c9a84c" stopOpacity="0"/>
        </radialGradient>

        {/* ── 微細ノイズフィルター：古い金属刻印感 ── */}
        <filter id="fg-etch" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3"
            seed="5" result="noise"/>
          <feColorMatrix type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"
            in="noise" result="dimNoise"/>
          <feComposite in="SourceGraphic" in2="dimNoise" operator="over"/>
        </filter>
      </defs>

      {/* ── ワードマーク本体 ── */}
      <text
        x="4" y="30"
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight="900"
        fontSize="30"
        fill="url(#fg-gold)"
        filter="url(#fg-etch)"
        letterSpacing="-0.4"
      >Fineme</text>

      {/* ── スパークル①：右上・大（メインの輝き） ── */}
      <g transform="translate(141, 7)">
        {/* 外側のグロー */}
        <circle r="9" fill="url(#fg-glow)" opacity="0.6"/>
        {/* 4点星・大 */}
        <path d="M0,-9 L1.6,-1.6 L9,0 L1.6,1.6 L0,9 L-1.6,1.6 L-9,0 L-1.6,-1.6 Z"
          fill="#fff5c8" opacity="0.9"/>
        {/* 4点星・小（同位置・白コア） */}
        <path d="M0,-4.5 L0.7,-0.7 L4.5,0 L0.7,0.7 L0,4.5 L-0.7,0.7 L-4.5,0 L-0.7,-0.7 Z"
          fill="#fffef0" opacity="0.95"/>
        {/* 中心点 */}
        <circle r="1.2" fill="#ffffff" opacity="0.9"/>
      </g>

      {/* ── スパークル②：左上・小 ── */}
      <g transform="translate(9, 7)">
        <circle r="5" fill="url(#fg-glow)" opacity="0.4"/>
        <path d="M0,-5 L0.8,-0.8 L5,0 L0.8,0.8 L0,5 L-0.8,0.8 L-5,0 L-0.8,-0.8 Z"
          fill="#f5e07a" opacity="0.75"/>
        <circle r="0.8" fill="#fff8d0" opacity="0.8"/>
      </g>

      {/* ── スパークル③：下・極小（散らばる光） ── */}
      <g transform="translate(78, 38)">
        <path d="M0,-3.5 L0.55,-0.55 L3.5,0 L0.55,0.55 L0,3.5 L-0.55,0.55 L-3.5,0 L-0.55,-0.55 Z"
          fill="#e8cc60" opacity="0.6"/>
      </g>

      {/* ── スパークル④：テキスト内・極小（偶発的な輝き） ── */}
      <g transform="translate(56, 5)">
        <path d="M0,-2.5 L0.4,-0.4 L2.5,0 L0.4,0.4 L0,2.5 L-0.4,0.4 L-2.5,0 L-0.4,-0.4 Z"
          fill="#f0d870" opacity="0.5"/>
      </g>
    </svg>
  );
}
