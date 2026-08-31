// 軸ごとのラインアイコン（絵文字の代替）。Gemini画像生成は課金停止のため使わず、
// 手描きSVGで統一されたアイコンセットとして用意する。ストローク幅・線色を揃えることで
// 絵文字の寄せ集めより「作り込まれた」印象にする。24x24 viewBox、stroke=currentColor統一。
import { PROVIDER_AXES } from './provider-axes';

const PATHS = {
  body: <><circle cx="12" cy="5" r="2.4" /><path d="M8 21l1.5-7L7 12l1-4h8l1 4-2.5 2 1.5 7" /></>,
  eyebrow: <><path d="M4 15c2-4 6-6 8-6s6 2 8 6" /><path d="M6 15.5c1.5-2.5 4-4 6-4s4.5 1.5 6 4" strokeOpacity="0.4" /></>,
  fashion: <><path d="M9 4l3 2 3-2 4 3-2 3-2-1v11H8V9L6 10 4 7z" /></>,
  hair: <><path d="M4 10c0-4 3.5-7 8-7s8 3 8 7c0 3-1.5 4-1.5 7v2h-3v-4c0-2 1-3 1-5.5C16.5 7.5 14.5 6 12 6s-4.5 1.5-4.5 4.5C7.5 13 8.5 14 8.5 16v4h-3v-2c0-3-1.5-4-1.5-8z" /></>,
  skin: <><path d="M12 3c3 4 6 7.5 6 11a6 6 0 01-12 0c0-3.5 3-7 6-11z" /></>,
  hairremoval: <><rect x="5" y="5" width="6" height="14" rx="1.5" transform="rotate(-20 8 12)" /><path d="M14 14l6 6M17 11l3.5 3.5" /></>,
  teeth: <><path d="M8 3c-2 0-3.5 1.8-3.5 4.5 0 2 .5 3.5 1 5.5.4 1.6.7 3 1.5 3.8.5.5 1.3.5 1.7-.3.5-1 .6-2.8 1.3-2.8s.8 1.8 1.3 2.8c.4.8 1.2.8 1.7.3.8-.8 1.1-2.2 1.5-3.8.5-2 1-3.5 1-5.5C15.5 4.8 14 3 12 3c-1 0-1.7.5-2 .8-.3-.3-1-.8-2-.8z" /></>,
  nail: <><path d="M9 21c-1-3-1-6 0-9 .8-2.5 2-4.5 2-7 0-1 .8-2 1-2s1 1 1 2c0 2.5 1.2 4.5 2 7 1 3 1 6 0 9" /></>,
  expression: <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 10.5h.01M15.5 10.5h.01" strokeWidth="2.4" strokeLinecap="round" /><path d="M8.5 14.5c1 1.3 2.3 2 3.5 2s2.5-.7 3.5-2" /></>,
  posture: <><circle cx="12" cy="4.5" r="2" /><path d="M12 6.5v6M8 21l4-8 4 8M7 10l5-1.5L17 10" /></>,
  other: <><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21" /><circle cx="12" cy="12" r="6.5" /><path d="M14.8 9.2l-2 3.8-3.8 2 2-3.8z" fill="currentColor" stroke="none" /></>,
};

export function AxisIcon({ axis, size = 22, color = 'currentColor', strokeWidth = 1.6, style }) {
  const path = PATHS[axis] || PATHS.other;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {path}
    </svg>
  );
}

export const AXIS_ICON_KEYS = PROVIDER_AXES.map(a => a.key);
