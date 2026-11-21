// ENCOMPASS（Total Gym）の種目データ。メニューボード（Fineme の店舗SaaSとは別商品・2026-11-19〜）で使う。
// 動画は Total Gym 社・日本総代理店が YouTube に公開しているもの（埋め込み可を 2026-11-12 に確認）。
// 動画へのアクセスにお金を取る形にはしない（YouTube 開発者ポリシー III.G.1）。お店が払うのは機能。
// 出典：https://totalgym.jp/product/encompass/ ・ https://totalgym.com/pages/elevate-videos
//
// load の印（痛い所がある時に外す種目の判定用・目安。最終判断はトレーナー）：
//   impact = 跳ぶ・弾む動き / neck 首 / shoulder 肩 / elbow ひじ / wrist 手首 / lowBack 腰 / hip 股関節 / knee ひざ / ankle 足首
//   2026-11-20 に痛い所を8か所に細かくした時、Claude Code が動画と一般的な動きから付けた仮の印。今野くん（トレーナー）の確認待ち。
//   迷う種目は「負担あり」に倒している（痛い所を選んだ時に、外れる種目が多くなる側＝安全側）。
// 姿勢・バランスのむずかしさ：2026-11-21 に公式の姿勢別一覧（/blogs/body-position）から付けた。足した種目は catalog.js。

import { BASE_EXTRA, MORE } from './catalog';

export const PARTS = [
  { key: 'legs', label: '脚・お尻' },
  { key: 'back', label: '背中' },
  { key: 'chest', label: '胸' },
  { key: 'shoulders', label: '肩' },
  { key: 'arms', label: '腕' },
  { key: 'core', label: 'お腹・体幹' },
];

export const PART_LABEL = Object.fromEntries(PARTS.map(p => [p.key, p.label]));
// きたえる場所ごとの色（どの種目がどこをきたえるか、ひと目で分かるように。2026-11-20 渡邉要望）。白い字が読める濃さにしている
export const PART_COLOR = {
  legs: '#2e7d32',      // 緑
  back: '#1565c0',      // 青
  chest: '#c62828',     // 赤
  shoulders: '#e65100', // オレンジ
  arms: '#6a1b9a',      // 紫
  core: '#00796b',      // 青緑
};

const BASE = [
  // 脚・お尻
  { id: 'squat', name: 'スクワット', part: 'legs', yt: 'atmadLfMEQQ', load: ['knee', 'hip', 'ankle'] },
  { id: 'deadlift', name: 'デッドリフト', part: 'legs', yt: '4GC_0_cJ124', load: ['lowBack', 'hip'] },
  { id: 'hamstring-curl', name: 'ハムストリングカール', part: 'legs', yt: 'pxonhfnFYq4', load: ['knee'] },
  { id: 'repeater-lunge', name: 'リピーターランジ', part: 'legs', yt: 'kjcHcRySwvM', load: ['knee', 'hip', 'ankle'] },
  { id: 'single-leg-squat', name: '片脚スクワット', part: 'legs', yt: 'QcfFARn2g7E', load: ['knee', 'hip', 'ankle'] },
  { id: 'plyo-squat', name: 'プライオスクワット（ジャンプ）', part: 'legs', yt: 'ZPmVzFGmIcM', load: ['impact', 'knee', 'hip', 'ankle'] },
  // 背中
  { id: 'row', name: 'ロウ', part: 'back', yt: '8w4Mwlcs0N0', load: ['elbow'] },
  { id: 'upright-row', name: 'アップライトロウ', part: 'back', yt: '-MbM3wB_uYo', load: ['shoulder', 'wrist'] },
  { id: 'surfer-lat-pull', name: 'サーファーラットプル', part: 'back', yt: 'kyyLEbLQqJM', load: ['shoulder'] },
  { id: 'cross-body-rise', name: 'クロスボディライズ', part: 'back', yt: 'n3Axehlh400', load: ['shoulder'] },
  { id: 'swimmer', name: 'スイマー', part: 'back', yt: '9yLQYQ5wFWk', load: ['lowBack', 'neck'] },
  { id: 'pull-up', name: 'プルアップ', part: 'back', yt: '2HnsCfx-vP4', load: ['shoulder', 'elbow', 'wrist'] },
  { id: 'chin-up', name: 'チンアップ', part: 'back', yt: 'nVS_LN70x3s', load: ['shoulder', 'elbow', 'wrist'] },
  // 胸
  { id: 'chest-press', name: 'チェストプレス', part: 'chest', yt: 'WtHmkjP1TbY', load: ['wrist', 'elbow'] },
  { id: 'chest-fly', name: 'チェストフライ', part: 'chest', yt: 'PqMjzsf4e_0', load: ['shoulder'] },
  { id: 'chest-fly-incline', name: 'チェストフライ（傾斜）', part: 'chest', yt: 'GiGgwIiNBlY', load: ['shoulder'] },
  { id: 'wide-sweep', name: 'ワイドスウィープ', part: 'chest', yt: '2LSPPpOgrP8', load: ['shoulder'] },
  { id: 'iron-cross', name: 'アイアンクロス', part: 'chest', yt: 'SsCtVCulrb0', load: ['shoulder'] },
  { id: 'pullover', name: 'プルオーバー', part: 'chest', yt: 'rEJBXLo8bhM', load: ['shoulder'] },
  { id: 'plyo-cardio-pull', name: 'プライオカーディオプル（弾む）', part: 'chest', yt: 'r9g8t-BTVHQ', load: ['impact', 'shoulder', 'elbow'] },
  // 肩
  { id: 'shoulder-press', name: 'ショルダープレス', part: 'shoulders', yt: 'Sqv_zq_PQVQ', load: ['shoulder', 'wrist', 'elbow'] },
  { id: 'overhand-shoulder-press', name: 'オーバーハンドショルダープレス', part: 'shoulders', yt: '7j6r45UuV-0', load: ['shoulder', 'wrist', 'elbow'] },
  { id: 'shoulder-abduction', name: 'ショルダーアブダクション', part: 'shoulders', yt: '3_MNvD7ieR0', load: ['shoulder'] },
  { id: 'shoulder-rotation', name: 'ショルダーローテーション', part: 'shoulders', yt: 'ensPXgo9Bug', load: ['shoulder'] },
  { id: 'high-elbow-row', name: 'ハイエルボーロウ', part: 'shoulders', yt: 'qUwdI-HONo0', load: ['shoulder', 'elbow'] },
  // 腕
  { id: 'hand-press', name: 'ハンドプレス', part: 'arms', yt: 'sKfiYOO2q-o', load: ['wrist', 'elbow'] },
  { id: 'biceps-curl-single', name: 'バイセップスカール（片腕）', part: 'arms', yt: 'yV-p5hAr3po', load: ['elbow', 'wrist'] },
  { id: 'biceps-curl-lateral', name: 'バイセップスカール（横向き）', part: 'arms', yt: 'EuEomCtJB68', load: ['elbow', 'wrist'] },
  { id: 'cardio-pull', name: 'カーディオプル', part: 'arms', yt: 'LtCRlFYAnPo', load: ['shoulder', 'elbow'] },
  { id: 'wood-chop', name: 'ウッドチョップ', part: 'arms', yt: 'R67E0lezfgE', load: ['lowBack', 'shoulder'] },
  // お腹・体幹
  { id: 'seated-twist', name: 'シーテッドツイスト', part: 'core', yt: 'DHVbua7JXOk', load: ['lowBack'] },
  { id: 'torso-rotation', name: 'トーソローテーション（膝立ち）', part: 'core', yt: 'c3xptXnVQ4Y', load: ['knee', 'lowBack'] },
  { id: 'abs-pullover-crunch', name: 'アブズプルオーバークランチ', part: 'core', yt: 'aCT9fmUIdjc', load: ['neck', 'shoulder'] },
  { id: 'scrunch', name: 'スクランチ', part: 'core', yt: 'nfmrA99Kg2E', load: ['hip'] },
  { id: 'scrunch-knee-tuck', name: 'スクランチ＋ニータック', part: 'core', yt: 'rqmUvl56Zno', load: ['hip'] },
  { id: 'scrunch-pike', name: 'スクランチ＋パイク', part: 'core', yt: 'fqRz1S_84yc', load: ['lowBack', 'hip'] },
];

// 姿勢（公式の分け方を、やさしい言葉にまとめたもの）
export const POSTURES = [
  { key: 'sit', label: '座って' },
  { key: 'back', label: 'あおむけ' },
  { key: 'front', label: 'うつぶせ' },
  { key: 'side', label: '横向きに寝て' },
  { key: 'kneel', label: '膝立ち' },
  { key: 'kneel1', label: '片膝立ち' },
  { key: 'stand', label: '立って' },
];
export const POSTURE_LABEL = Object.fromEntries(POSTURES.map(p => [p.key, p.label]));

// バランスのむずかしさ（2026-11-21 今野くん要望：50歳以上のお店では、バランスを取るのがむずかしい種目はできない）
//   1 安定（座る・あおむけ・うつぶせ） / 2 ふつう（膝立ち・横向き・片脚） / 3 むずかしい（立つ・片膝立ち・プランク系・ジャンプ・ランジ）
//   姿勢と動きから付けた仮の値。今野くんの確認で直す。
export const BALANCE = [
  { key: 1, label: '安定' },
  { key: 2, label: 'ふつう' },
  { key: 3, label: 'バランスがむずかしい' },
];
export const BALANCE_LABEL = Object.fromEntries(BALANCE.map(b => [b.key, b.label]));

// 最初の36種目（よく使う基本の種目）を先に並べる。おまかせはこの順で選ぶので、基本の種目から入る。
export const EXERCISES = [
  ...BASE.map(e => ({ ...e, pos: BASE_EXTRA[e.id]?.[0] || '', balance: BASE_EXTRA[e.id]?.[1] || 2 })),
  ...MORE.map(([id, name, part, yt, pos, load, balance]) => ({ id, name, part, yt, pos, load: load ? load.split('|') : [], balance })),
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

// YouTube の動画IDは英数字・-・_ の11文字だけを通す（URL組み立て前の念のための確認）
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function thumbUrl(yt) {
  return YT_ID.test(yt) ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '';
}

// 自動再生は音なし（ブラウザの決まり）。プレイヤーは改変しない（規約 III.I.6）。
// enablejsapi：再生中に音が出てしまう端末があり（2026-11-20 実機）、声の案内と重なるため、プレイヤーの公式の命令（mute）で音を消す。
export function embedUrl(yt, { autoplay = false } = {}) {
  if (!YT_ID.test(yt)) return '';
  const p = new URLSearchParams({
    rel: '0', playsinline: '1', mute: '1', loop: '1', playlist: yt, modestbranding: '1', enablejsapi: '1',
    autoplay: autoplay ? '1' : '0',
  });
  return `https://www.youtube-nocookie.com/embed/${yt}?${p.toString()}`;
}

export function watchUrl(yt) {
  return YT_ID.test(yt) ? `https://www.youtube.com/watch?v=${yt}` : '';
}
