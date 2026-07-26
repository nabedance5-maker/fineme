// New Me Log の LINE通知の「声」。
//
// 事務連絡にしない。Fineme は大航海がモチーフ（master.md §5）なので、
// 通知は船のクルーが船長（＝利用者）に報告する体裁で書く。
// 面倒になってしまう人にこそ使ってほしいツールなので、
// 事実だけ並べた企業アカウント調では意味がない（でお指摘 2026-07-26）。
//
// ただし責めない・見下さない（vision.md §8-4「始点を絶対に嘲笑わない」）。
// クルーは急かすが、それは仲間として損をさせたくないから。呆れたり叱ったりはしない。
//
// 同じ文面を繰り返さない（master.md「定型/金太郎飴を禁止」）ため、
// 各パターンを複数用意して日替わりで選ぶ。

// 日付を種にした決定的な選択（同じ日は同じ、日が変わると変わる）
function pickByDay(arr, seed = 0) {
  if (!arr.length) return '';
  const day = Math.floor((Date.now() + 9 * 3600000) / 86400000);
  return arr[(day + seed) % arr.length];
}

// ── 軸ごとのひとこと（クルーの見立て）──
// 全軸ぶんは持たない。無い軸は汎用にフォールバックする。
const AXIS_FLAVOR = {
  hair: [
    '風になびく髪も、伸びすぎりゃただの海藻ですぜ',
    '船長の髪型は、船の看板でさぁ',
  ],
  eyebrow: [
    '眉が茂ると、視界も人相も曇りまさぁ',
    'ここが整うと、顔つきが一段変わりますぜ',
  ],
  skin: [
    '潮風にやられる前に手入れを',
    '肌の調子は、いちばん近くで見られてまさぁ',
  ],
  nail: [
    '手元は、思ってるより見られてますぜ',
    '指先まで整ってる船長は、格が違いまさぁ',
  ],
  eyelash: [
    '目元ひとつで、印象は変わりまさぁ',
  ],
  body: [
    '筋肉は裏切らねえが、サボると逃げていきますぜ',
    '航海は体が資本でさぁ',
  ],
  teeth: [
    '笑った時の口元、覚えられてますぜ',
  ],
  hairremoval: [
    '見えてないつもりでも、案外見えてまさぁ',
  ],
  headspa: [
    '頭が軽くなると、航海も軽くなりまさぁ',
  ],
  posture: [
    '姿勢が変わりゃ、見える景色も変わりますぜ',
  ],
  makeup: [
    '道具の見直しも、立派な航海準備でさぁ',
  ],
};

const GENERIC_FLAVOR = [
  'いい波が来てまさぁ',
  '整えとくと、後がラクですぜ',
  'ここらで一度、寄っときやしょう',
];

export function axisFlavor(axisId, seed = 0) {
  const list = AXIS_FLAVOR[axisId] || GENERIC_FLAVOR;
  return pickByDay(list, seed);
}

// ── 見出し（状況ごと）──

// 予約はまだ。目安が近づいてきた。
const HEAD_SOON = [
  'お頭！ 見張り台から報告ですぜ🔭',
  'お頭、そろそろ潮時ですぜ⚓',
  'お頭！ いい風が吹いてまさぁ🌊',
];

// 予約もまだで、目安を過ぎている。
// 超過中は一定間隔で送り続けるため、繰り返しても飽きないよう多めに用意する。
const HEAD_OVERDUE = [
  'お頭ーっ！ 大変ですぜ🚨',
  'お頭！ 見張り番が騒いでまさぁ🔔',
  'お頭、そろそろ本気で舵を切りやしょう🧭',
  'お頭…そろそろ港が恋しくねぇですかい⚓',
  'お頭！ このままじゃお宝が逃げちまいまさぁ💰',
  'お頭、風向きが変わっちまう前に🌀',
];

// 予約済みで日が近い。
const HEAD_REMINDER = [
  'お頭、寄港の日が近いですぜ⚓',
  'お頭！ 準備はよろしいですかい🗺️',
];

// ── 締め（状況ごと）──

// 予約を取るものとは限らない（ジム・部屋の整理なども登録される）ので、
// 「席が埋まる前に」のような予約前提の言い回しは置かない。
const TAIL_SOON = [
  '早めに舵を切っときやしょう。',
  '押さえとくと、後がラクでさぁ。',
  'ひとつ、動いときやしょう。',
];

const TAIL_OVERDUE = [
  'まだ間に合いまさぁ。行きやしょう。',
  '気づいた今日が、いちばん早い日ですぜ。',
  '焦らんでいい。けど、そろそろ。',
  '予定を入れりゃ、あっしも静かにしてまさぁ。',
  '一本、電話を入れるだけでさぁ。',
];

const TAIL_REMINDER = [
  '忘れずに、いってらっしゃいまし。',
  '準備は万端ですかい？',
];

const FOOTER = '▸ 記録をつける\nhttps://www.fineme.me/mypage/log';

function fmtWeeks(w) {
  if (w === null || w === undefined) return '';
  if (w === 0) return '今週';
  return `${w}週間`;
}

// 超過ぶんの言い方。ジム（週1）のような短い周期で「7日オーバー」と言うと
// 大げさになるので、1週を超えたら週単位で言う。
function fmtOverdue(days) {
  if (days >= 7) {
    const w = Math.floor(days / 7);
    return `${w}週ぶん`;
  }
  return `${days}日`;
}

/**
 * 通知本文を組み立てる。
 * @param {Array} booking  予約まだ（{axis, custom_icon, name, weeksSince, freq, overdueDays}）
 * @param {Array} reminder 予約済み（{axis, custom_icon, name, next_visit, diff}）
 * @param {Function} resolveAxis  軸→{icon,label} を返す関数（lib/log-axes.js のもの）
 */
export function buildLogMessage(booking, reminder, resolveAxis) {
  const lines = [];
  const hasOverdue = booking.some(b => b.overdueDays > 0);

  if (booking.length) {
    lines.push(pickByDay(hasOverdue ? HEAD_OVERDUE : HEAD_SOON));
    lines.push('');

    booking.forEach((b, i) => {
      const def = resolveAxis(b.axis, b.custom_icon);
      lines.push(`${def.icon} ${def.label}（${b.name}）`);

      if (b.overdueDays > 0) {
        const cycle = b.freq ? `${b.freq}週ごとの目安を` : '目安を';
        lines.push(`　前回から${fmtWeeks(b.weeksSince)}。${cycle}${fmtOverdue(b.overdueDays)}オーバーでさぁ`);
      } else {
        const cycle = b.freq ? `（${b.freq}週ごとが目安）` : '';
        lines.push(`　前回から${fmtWeeks(b.weeksSince)}${cycle}`);
      }
      // ひとことは先頭の1件にだけ添える（全部に付けるとくどい）
      if (i === 0) lines.push(`　— ${axisFlavor(b.axis, booking.length)}`);
    });

    lines.push('');
    lines.push(pickByDay(hasOverdue ? TAIL_OVERDUE : TAIL_SOON));
  }

  if (reminder.length) {
    if (booking.length) {
      // すでに一度呼びかけているので、2つ目は繋ぎにする（見出しを重ねない）
      lines.push('');
      lines.push('それと、こっちは押さえてありまさぁ⚓');
    } else {
      lines.push(pickByDay(HEAD_REMINDER));
    }
    lines.push('');
    for (const r of reminder) {
      const def = resolveAxis(r.axis, r.custom_icon);
      const when = r.diff <= 0 ? '本日' : r.diff === 1 ? '明日' : `${r.diff}日後`;
      lines.push(`${def.icon} ${def.label}（${r.name}）— ${when} ${r.next_visit}`);
    }
    lines.push('');
    lines.push(pickByDay(TAIL_REMINDER));
  }

  lines.push('');
  lines.push(FOOTER);
  return lines.join('\n');
}
