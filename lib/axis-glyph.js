// 軸アイコンの一字表記。サイト全体で絵文字を使わない方針（でお決定 2026-09-30）のため、
// これまで絵文字（💪✂️💇など）を置いていたアイコン枠には、この漢字一字を明朝で表示する。
// Me Scan / New Me Log / Mirror の軸ID、およびカテゴリslugを網羅する。
export const AXIS_GLYPH = {
  body: '体', eyebrow: '眉', fashion: '服', hair: '髪', skin: '肌', skincare: '肌',
  teeth: '歯', teeth_white: '歯', teeth_ortho: '歯', nail: '爪', hairremoval: '毛',
  headspa: '頭', posture: '姿', eyelash: '睫', makeup: '粧', expression: '表',
  overall: '全', aga: '髪', esthetic: '肌', whitening: '歯', orthodontics: '歯',
  gym: '体', photo: '写', marriage: '婚', consulting: '談', diagnosis: '診',
  colordiagnosis: '色', bonediagnosis: '骨', skeletal: '骨', personalcolor: '色', clean: '清',
};

export function axisGlyph(id, fallback = '・') {
  return AXIS_GLYPH[id] || fallback;
}
