// New Me Log の LINE通知の「声」。
//
// 事務連絡にしない。Fineme は大航海がモチーフ（master.md §5）なので、
// 通知は船の仲間が船長（＝利用者）に報告する体裁で書く。
// 面倒になってしまう人にこそ使ってほしいツールなので、
// 事実だけ並べた企業アカウント調では意味がない（でお指摘 2026-07-26）。
//
// ただし責めない・見下さない（vision.md §8-4「始点を絶対に嘲笑わない」）。
// 急かすのは仲間として損をさせたくないから。呆れたり叱ったりはしない。
//
// 声は複数用意し、マイページで選べる（でお要望 2026-07-26）。
// トラックで既定を変えるが、どちらのトラックでもすべて選べる（優劣はつけない）。

import { TRACKS } from '@/lib/track';

// 日付を種にした決定的な選択（同じ日は同じ、日が変わると変わる）
function pickByDay(arr, seed = 0) {
  if (!arr || !arr.length) return '';
  const day = Math.floor((Date.now() + 9 * 3600000) / 86400000);
  return arr[(day + seed) % arr.length];
}

const GENERIC = '_generic';

// ── 声：航海クルー（べらんめえ調・既定＝男性トラック）──
const CREW = {
  id: 'crew',
  label: '航海クルー',
  description: '船の仲間が、べらんめえ調で急かしてくる',
  sample: 'お頭！ そろそろ潮時ですぜ⚓',
  head: {
    soon: [
      'お頭！ 見張り台から報告ですぜ🔭',
      'お頭、そろそろ潮時ですぜ⚓',
      'お頭！ いい風が吹いてまさぁ🌊',
    ],
    overdue: [
      'お頭ーっ！ 大変ですぜ🚨',
      'お頭！ 見張り番が騒いでまさぁ🔔',
      'お頭、そろそろ本気で舵を切りやしょう🧭',
      'お頭…そろそろ港が恋しくねぇですかい⚓',
      'お頭！ このままじゃお宝が逃げちまいまさぁ💰',
      'お頭、風向きが変わっちまう前に🌀',
    ],
    reminder: [
      'お頭、寄港の日が近いですぜ⚓',
      'お頭！ 準備はよろしいですかい🗺️',
    ],
  },
  tail: {
    soon: [
      '早めに舵を切っときやしょう。',
      '押さえとくと、後がラクでさぁ。',
      'ひとつ、動いときやしょう。',
    ],
    overdue: [
      'まだ間に合いまさぁ。行きやしょう。',
      '気づいた今日が、いちばん早い日ですぜ。',
      '焦らんでいい。けど、そろそろ。',
      '予定を入れりゃ、あっしも静かにしてまさぁ。',
      '一本、電話を入れるだけでさぁ。',
    ],
    reminder: [
      '忘れずに、いってらっしゃいまし。',
      '準備は万端ですかい？',
    ],
  },
  bridge: 'それと、こっちは押さえてありまさぁ⚓',
  overdueLine: (weeks, freq, over) =>
    `　前回から${weeks}。${freq ? `${freq}の目安を` : '目安を'}${over}オーバーでさぁ`,
  soonLine: (weeks, freq) =>
    `　前回から${weeks}${freq ? `（${freq}が目安）` : ''}`,
  flavor: {
    hair: ['風になびく髪も、伸びすぎりゃただの海藻ですぜ', '船長の髪型は、船の看板でさぁ'],
    eyebrow: ['眉が茂ると、視界も人相も曇りまさぁ', 'ここが整うと、顔つきが一段変わりますぜ'],
    skin: ['潮風にやられる前に手入れを', '肌の調子は、いちばん近くで見られてまさぁ'],
    nail: ['手元は、思ってるより見られてますぜ', '指先まで整ってる船長は、格が違いまさぁ'],
    eyelash: ['目元ひとつで、印象は変わりまさぁ'],
    body: ['筋肉は裏切らねえが、サボると逃げていきますぜ', '航海は体が資本でさぁ'],
    teeth: ['笑った時の口元、覚えられてますぜ'],
    hairremoval: ['見えてないつもりでも、案外見えてまさぁ'],
    headspa: ['頭が軽くなると、航海も軽くなりまさぁ'],
    posture: ['姿勢が変わりゃ、見える景色も変わりますぜ'],
    makeup: ['道具の見直しも、立派な航海準備でさぁ'],
    [GENERIC]: ['いい波が来てまさぁ', '整えとくと、後がラクですぜ', 'ここらで一度、寄っときやしょう'],
  },
};

// ── 声：航海士（落ち着いた相棒・既定＝Belleトラック）──
const NAVIGATOR = {
  id: 'navigator',
  label: '航海士',
  description: '隣で海図を読む相棒が、静かに知らせてくれる',
  sample: 'キャプテン、そろそろ寄港の頃合いです⚓',
  head: {
    soon: [
      'キャプテン、海図を確認しました🗺️',
      'そろそろ寄港の頃合いです⚓',
      '穏やかな風が吹いています🌊',
    ],
    overdue: [
      'キャプテン、予定の港を通り過ぎています🧭',
      '海図より少し遅れています⚓',
      'そろそろ舵を切りませんか🌀',
      '港が遠ざかる前に、ひとつ🔭',
      'キャプテン、そろそろ時間を取りましょう🕰️',
    ],
    reminder: [
      'キャプテン、寄港の日が近づいています⚓',
      '予定の日が近づいています🗺️',
    ],
  },
  tail: {
    soon: [
      '早めに予定を決めておくと安心です。',
      '今のうちに押さえておきましょう。',
      'ひとつ、動いておきましょう。',
    ],
    overdue: [
      'まだ十分間に合います。',
      '気づいた今日が、いちばん早い日です。',
      '焦らなくて大丈夫。でも、そろそろ。',
      '予定が決まれば、私も静かにしています。',
      '連絡を1本入れるだけです。',
    ],
    reminder: [
      '忘れずに、いってらっしゃい。',
      '準備は整っていますか。',
    ],
  },
  bridge: 'こちらは予定が入っています⚓',
  overdueLine: (weeks, freq, over) =>
    `　前回から${weeks}。${freq ? `${freq}の目安を` : '目安を'}${over}過ぎています`,
  soonLine: (weeks, freq) =>
    `　前回から${weeks}${freq ? `（${freq}が目安）` : ''}`,
  flavor: {
    hair: ['伸びた分だけ、印象は静かに変わります', '整えた日の自分を、思い出してみてください'],
    eyebrow: ['ここが整うと、顔の印象が一段変わります', '短い時間で、いちばん効く場所です'],
    skin: ['季節の変わり目は、肌が先に気づきます', '積み重ねが出るところです'],
    nail: ['手元は、自分でいちばんよく見える場所です', '指先が整うと、気分も整います'],
    eyelash: ['目元ひとつで、印象は変わります'],
    body: ['続けた分だけ、確かに返ってきます', '体は、いちばん正直な相棒です'],
    teeth: ['笑った時の口元は、記憶に残ります'],
    hairremoval: ['整えておくと、迷いが減ります'],
    headspa: ['頭が軽くなると、視界も晴れます'],
    posture: ['姿勢が変わると、見える景色も変わります'],
    makeup: ['道具の見直しも、大切な準備です'],
    [GENERIC]: ['いい頃合いです', '整えておくと、後がラクになります', 'ここで一度、立ち寄りましょう'],
  },
};

// ── 声：シンプル（世界観を外して事実だけ）──
const PLAIN = {
  id: 'plain',
  label: 'シンプル',
  description: '飾らず、必要なことだけ',
  sample: '髪・美容室：前回から6週間です。',
  head: {
    soon: ['New Me Log からのお知らせです。'],
    overdue: ['New Me Log からのお知らせです。'],
    reminder: ['予約日が近づいています。'],
  },
  tail: {
    soon: ['予定を決めるとリマインドします。'],
    overdue: ['予定を登録すると、この通知は止まります。'],
    reminder: [''],
  },
  bridge: '',
  overdueLine: (weeks, freq, over) =>
    `　前回から${weeks}${freq ? `／目安 ${freq}` : ''}（${over}超過）`,
  soonLine: (weeks, freq) =>
    `　前回から${weeks}${freq ? `／目安 ${freq}` : ''}`,
  flavor: {},
};

// ── 月1回だけ添える一文（Me Scan / Mirror への接続）──
// 普段の通知に営業を混ぜるとブロックの理由になるので、その月の初回だけ1行足す。
// 金額には触れない。航路＝順番・優先度の話に限る（でお決定 2026-07-27）。
//
// URLはトラック（男女）で変わるため、文面（text）とURL直前の記号（prefix。
// crew/navigatorは「▸ 」・plainは無し、という既存の書式差）だけをここに持たせ、
// URL自体は monthlyNudgeUrl() で組み立てる。
// profiles.track は診断・Mirror・明示切替のいずれもしていないログイン済みユーザーだと
// NULL になり得るため、その場合は男性版に決め打ちせず /choose-track へ送る。
const MONTHLY_NUDGE = {
  crew: {
    diagnosis: { text: 'そういやお頭、海図の方はどうなってやすか？', prefix: '▸ ' },
    mirror:    { text: 'そういやお頭、今の面構えは測っときやしたか？', prefix: '▸ ' },
  },
  navigator: {
    diagnosis: { text: 'ところでキャプテン、海図はもうお持ちですか。', prefix: '▸ ' },
    mirror:    { text: 'ところでキャプテン、現在地はまだ測っていません。', prefix: '▸ ' },
  },
  plain: {
    diagnosis: { text: 'Me Scan（無料・約3分）で、どこから手をつけると効くかが分かります。', prefix: '' },
    mirror:    { text: 'Mirror で、いまの現在地を写真1枚から測れます。', prefix: '' },
  },
};

function monthlyNudgeUrl(kind, trackId) {
  const base = 'https://www.fineme.me';
  if (trackId === 'fineme' || trackId === 'belle') return `${base}${TRACKS[trackId][kind]}`;
  return `${base}/choose-track?dest=${kind}`;
}

export const VOICES = { crew: CREW, navigator: NAVIGATOR, plain: PLAIN };
export const VOICE_IDS = Object.keys(VOICES);

// トラックごとの既定。どちらのトラックでも3種すべて選べる。
export function defaultVoiceFor(trackId) {
  return trackId === 'belle' ? 'navigator' : 'crew';
}

export function getVoice(voiceId, trackId) {
  return VOICES[voiceId] || VOICES[defaultVoiceFor(trackId)] || CREW;
}

export function axisFlavor(voice, axisId, seed = 0) {
  const list = voice.flavor?.[axisId] || voice.flavor?.[GENERIC];
  return pickByDay(list, seed);
}

function fmtWeeks(w) {
  if (w === null || w === undefined) return '';
  if (w === 0) return '今週';
  return `${w}週間`;
}

// 超過ぶんの言い方。ジム（週1）のような短い周期で「7日オーバー」と言うと
// 大げさになるので、1週を超えたら週単位で言う。
function fmtOverdue(days) {
  if (days >= 7) return `${Math.floor(days / 7)}週ぶん`;
  return `${days}日`;
}

/**
 * 通知本文を組み立てる。
 * @param {Array} booking  予約まだ（{axis, custom_icon, name, weeksSince, freq, overdueDays}）
 * @param {Array} reminder 予約済み（{axis, custom_icon, name, next_visit, diff}）
 * @param {Function} resolveAxis  軸→{icon,label} を返す関数（lib/log-axes.js のもの）
 * @param {Object} opts    { voiceId, trackId, monthlyNudge }
 *   monthlyNudge: 'diagnosis' | 'mirror' | null
 *   その月の最初の通知にだけ、Me Scan / Mirror への一文を1行添える
 */
export function buildLogMessage(booking, reminder, resolveAxis, opts = {}) {
  const v = getVoice(opts.voiceId, opts.trackId);
  const lines = [];
  const hasOverdue = booking.some(b => b.overdueDays > 0);

  if (booking.length) {
    lines.push(pickByDay(hasOverdue ? v.head.overdue : v.head.soon));
    lines.push('');

    booking.forEach((b, i) => {
      const def = resolveAxis(b.axis, b.custom_icon);
      lines.push(`${def.icon} ${def.label}（${b.name}）`);
      lines.push(
        b.overdueDays > 0
          ? v.overdueLine(fmtWeeks(b.weeksSince), b.freq, fmtOverdue(b.overdueDays))
          : v.soonLine(fmtWeeks(b.weeksSince), b.freq)
      );
      // ひとことは先頭の1件にだけ添える（全部に付けるとくどい）。
      // flavor文は来店前提（「髪が伸びる」等）のため、買う記録には付けない。
      if (i === 0 && b.entry_type !== 'purchase') {
        const f = axisFlavor(v, b.axis, booking.length);
        if (f) lines.push(`　— ${f}`);
      }
    });

    lines.push('');
    const tail = pickByDay(hasOverdue ? v.tail.overdue : v.tail.soon);
    if (tail) lines.push(tail);
  }

  if (reminder.length) {
    if (booking.length) {
      lines.push('');
      if (v.bridge) lines.push(v.bridge);
    } else {
      lines.push(pickByDay(v.head.reminder));
    }
    lines.push('');
    for (const r of reminder) {
      const def = resolveAxis(r.axis, r.custom_icon);
      const when = r.diff < 0 ? `${-r.diff}日過ぎています`
        : r.diff === 0 ? '本日'
        : r.diff === 1 ? '明日'
        : `${r.diff}日後`;
      lines.push(`${def.icon} ${def.label}（${r.name}）— ${when} ${r.next_visit}`);
    }
    const tail = pickByDay(v.tail.reminder);
    if (tail) { lines.push(''); lines.push(tail); }
  }

  lines.push('');
  lines.push('▸ 記録をつける\nhttps://www.fineme.me/mypage/log');

  // 月1回だけ、地図（Me Scan）か現在地（Mirror）の一文を添える。
  // 両方済んでいる月は何も足さない＝送るものが無ければ静かにする。
  const nudgeDef = MONTHLY_NUDGE[v.id]?.[opts.monthlyNudge];
  if (nudgeDef) {
    lines.push('');
    lines.push('- - -');
    lines.push(`${nudgeDef.text}\n${nudgeDef.prefix}${monthlyNudgeUrl(opts.monthlyNudge, opts.trackId)}`);
  }
  return lines.join('\n');
}

// ── 通知の頻度 ──────────────────────────────
// うるさく感じてブロックされたら元も子もない（でお指摘 2026-07-26）。
// 既定はこちらの推奨。マイページで変えられる。
export const NOTIFY_LEVELS = {
  often:  { id: 'often',  label: 'こまめに', description: '早めに知らせて、過ぎたら4日おき', leadDays: 7, overdueInterval: 4,  reminderGuard: 7 },
  normal: { id: 'normal', label: 'おすすめ', description: '5日前から。過ぎたら週1回',        leadDays: 5, overdueInterval: 7,  reminderGuard: 10 },
  few:    { id: 'few',    label: '控えめ',   description: '直前だけ。過ぎたら2週に1回',      leadDays: 3, overdueInterval: 14, reminderGuard: 14 },
  off:    { id: 'off',    label: '止める',   description: 'LINEには送らない',                leadDays: 0, overdueInterval: 0,  reminderGuard: 0 },
};
export const DEFAULT_NOTIFY_LEVEL = 'normal';

export function getNotifyLevel(levelId) {
  return NOTIFY_LEVELS[levelId] || NOTIFY_LEVELS[DEFAULT_NOTIFY_LEVEL];
}
