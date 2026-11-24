// デモ店舗のAI姿勢分析のサンプル記録（2026-11-24 渡邉承認の指示書 §10）。
// 営業デモで、記録・前回との並べ比べ・変化・お客様への表示の切り替えを、その場で見せられるようにする。
// 写真は実在の人物ではなく、ここで描く線画のシルエット（AIの分析もしていない、書き起こしたサンプル文）。
// is_sample=true で、実在のお客様の記録と区別する。毎晩のデモの作り直し（lib/demo-seed.js）で入れ直す。
import sharp from 'sharp';
import { CUSTOMER_RECORD_BUCKET } from './customer-record-photos.js';
import { normalizePostureChecks, scoreFromChecks } from './posture-scoring.js';

const W = 600, H = 800;

// 線画の人の形。lean＝頭と肩が前に出ている度合い（0〜1）。正面は肩の左右差（tilt）で描き分ける
function figureSvg({ view, lean, tilt }) {
  const bg = `<rect width="${W}" height="${H}" fill="#eef0f3"/><line x1="0" y1="740" x2="${W}" y2="740" stroke="#c9ced6" stroke-width="4"/>
    <line x1="300" y1="40" x2="300" y2="740" stroke="#b9c6dd" stroke-width="2" stroke-dasharray="10 10"/>
    <text x="24" y="44" font-family="sans-serif" font-size="22" fill="#8a93a3">SAMPLE</text>`;
  const line = 'stroke="#3b4658" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
  const st = `fill="#d8dde5" ${line}`;
  const ln = `fill="none" ${line}`;
  if (view === 'front') {
    const dy = Math.round(tilt * 18);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}
      <circle cx="300" cy="140" r="52" ${st}/>
      <path d="M300 192 L300 214" ${st}/>
      <path d="M210 ${226 - dy} Q300 ${206} 390 ${226 + dy} L372 470 Q300 492 228 470 Z" ${st}/>
      <path d="M210 ${226 - dy} L176 ${420 - dy} M390 ${226 + dy} L424 ${420 + dy}" ${ln}/>
      <path d="M238 470 L246 732 M362 470 L354 732" ${ln}/>
    </svg>`;
  }
  const hx = 300 + Math.round(lean * 46);
  const sx = 300 + Math.round(lean * 22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bg}
    <circle cx="${hx}" cy="140" r="50" ${st}/>
    <path d="M${hx - 8} 188 L${sx} 222" ${st}/>
    <path d="M${sx - 40} 222 Q${sx + 30} ${232 + lean * 20} ${sx + 26} 330 Q${300 + 20} 420 ${300 + 24} 470 L${300 - 34} 470 Q${300 - 46} 360 ${sx - 40} 222 Z" ${st}/>
    <path d="M${sx} 238 L${sx + 6 + lean * 20} 430" ${ln}/>
    <path d="M${300 - 6} 470 L${300 - 2} 732 M${300 + 14} 470 L${300 + 18} 732" ${ln}/>
  </svg>`;
}

const SAMPLES = [
  {
    daysAgo: 42, lean: 0.9, tilt: 0.6,
    // チェック項目ごとの判定（点数はここから lib/posture-scoring.js で計算する。2026-11-25）
    checks: {
      head_tilt: { level: 0, note: '正面では、頭の左右の傾きはほとんど見られないように見えます' },
      forward_head: { level: 2, note: '横から見て、頭が肩よりはっきり前に出ているように見えます' },
      shoulder_height: { level: 2, note: '正面では、右肩が左肩よりはっきり高く見えます' },
      rounded_shoulders: { level: 1, note: '横から見て、肩がわずかに前に入っているように見えます' },
      upper_back_round: { level: 2, note: '横から見て、背中の上部が丸くなっているように見えます' },
      trunk_shift: { level: 0, note: '体の中心線は、ほぼまっすぐに見えます' },
      pelvis_height: { level: 0, note: '左右の腰の高さは、そろっているように見えます' },
      lumbar_tilt: { level: 0, note: '腰の反りは目立たないように見えます' },
    },
    findings: ['横の写真では、頭が肩より前に出ているように見えます', '正面の写真では、右肩が左肩より上がっているように見えます', '横の写真では、背中の上部が丸くなっているように見えます'],
    focus_areas: ['首・肩まわり', '背中の上部', '胸の前側'],
    next_actions: ['デスクワークの合間に、肩を後ろに回す動きを1日数回取り入れてみるのもよいかもしれません', '次回は胸まわりをほぐすストレッチを一緒に試してみましょう'],
    changes: [],
  },
  {
    daysAgo: 6, lean: 0.45, tilt: 0.25,
    checks: {
      head_tilt: { level: 0, note: '正面では、頭の左右の傾きはほとんど見られないように見えます' },
      forward_head: { level: 1, note: '横から見て、頭がわずかに肩より前にあるように見えます' },
      shoulder_height: { level: 1, note: '正面では、右肩がわずかに高く見えます' },
      rounded_shoulders: { level: 1, note: '横から見て、肩がわずかに前に入っているように見えます' },
      upper_back_round: { level: 1, note: '横から見て、背中の上部にわずかな丸みが残っているように見えます' },
      trunk_shift: { level: 0, note: '体の中心線は、ほぼまっすぐに見えます' },
      pelvis_height: { level: 0, note: '左右の腰の高さは、そろっているように見えます' },
      lumbar_tilt: { level: 0, note: '腰の反りは目立たないように見えます' },
    },
    findings: ['横の写真では、頭の位置が肩の上に近づいているように見えます（まだわずかに前にあるように見えます）', '正面の写真では、肩の高さの左右差は前回より小さく見えます', '背中の上部の丸みは、まだ少し残っている可能性があります'],
    focus_areas: ['背中の上部', '首・肩まわり'],
    next_actions: ['肩を回す習慣は、このまま続けていけるとよさそうです', '次回は背中の上部を動かすトレーニングを加えてみましょう'],
    changes: ['前回と比べて、頭が前に出ている度合いが小さくなっているように見えます', '前回と比べて、肩の高さの左右差が小さくなっているように見えます', '背中の丸みは前回と大きくは変わっていないように見えます（撮った距離が少し違うため、目安としてご覧ください）'],
  },
];

async function uploadPng(db, path, svg) {
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const { error } = await db.storage.from(CUSTOMER_RECORD_BUCKET).upload(path, buf, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

// デモ店舗の1人のお客様に、初回と2回目のサンプル記録を入れる。戻り値は入れた件数
export async function seedDemoPostureSamples(db, { providerId, userId, slug, jstIsoDaysAgo }) {
  let prevId = null, n = 0;
  for (let i = 0; i < SAMPLES.length; i++) {
    const s = SAMPLES[i];
    const base = `${slug}/posture/sample-${i + 1}`;
    const [front, side] = await Promise.all([
      uploadPng(db, `${base}.png`, figureSvg({ view: 'front', lean: s.lean, tilt: s.tilt })),
      uploadPng(db, `${base}-side.png`, figureSvg({ view: 'side', lean: s.lean, tilt: s.tilt })),
    ]);
    const details = normalizePostureChecks(s.checks, { hasSide: true });
    const { score, breakdown } = scoreFromChecks(details);
    const { data, error } = await db.from('provider_posture_entries').insert({
      provider_id: providerId, user_id: userId, photo_url: front, side_photo_url: side,
      score, score_breakdown: breakdown, score_details: details, findings: s.findings, focus_areas: s.focus_areas,
      next_actions: s.next_actions, changes: s.changes, previous_entry_id: prevId,
      note: 'デモ用のサンプル記録です（写真は線画・文章は書き起こしたもの）', is_sample: true, created_at: jstIsoDaysAgo(s.daysAgo),
    }).select('id').single();
    if (error) throw new Error(error.message);
    prevId = data.id; n++;
  }
  return n;
}
