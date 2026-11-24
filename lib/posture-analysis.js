// 姿勢分析AI（でお要望2026-09-25）。店舗スタッフが来店時に撮影した写真を分析し、
// 姿勢スコア・気になる癖・凝っていそうな筋肉部位を返す。Mirror分析（app/api/mirror/analyze）
// と同じ「事実に基づく観察のみ・断定しない・医療診断はしない」方針をそのまま踏襲する。
import { uploadCustomerRecordPhoto, withSignedPhotoUrls, CUSTOMER_RECORD_BUCKET } from './customer-record-photos';
import { visionText } from './ai.js';

// でお要望2026-09-25：「10000円のプランに入ってる人しか使えないようにしてほしい
// （特例無料の人も使えるように）」。10000円プラン＝'C'、特例無料アカウント＝'special'
// （本番DB実データで確認：'free'という値は存在せず、admin/providersでも'special'が
// 特例無料の実際のキー。PLAN_LABELSに'free'があるのは未使用の将来キーで実データと
// 一致しない——ここで誤って'free'を使うと、でお自身のテストアカウントも弾かれてしまう）。
export { isPostureEligiblePlan } from './posture-plan';
// お店の画面に返す列（閲覧リンクのハッシュは返さない。リンクが出ているかどうかだけ share_expires_at で分かる）
export const POSTURE_ENTRY_COLUMNS = 'id, photo_url, side_photo_url, score, score_breakdown, findings, focus_areas, next_actions, changes, previous_entry_id, shared_with_customer, share_expires_at, is_sample, note, staff_id, created_at';

const SYSTEM_PROMPT = `あなたは、店舗スタッフ向けに姿勢の写真を観察するアシスタントです。
医師ではないため医学的診断はせず、見た目の観察に基づく気づきのみを提供します。

【厳守】
- 写真から実際に確認できる事実のみを述べる。写っていないことは推測しない
- 「〜のように見えます」「〜の可能性があります」等、言い切らない表現を使う
- 医療的診断（「側弯症」「椎間板ヘルニア」等の病名）は絶対に使わない
- 決めつけ・断定的な表現をしない
- 前回の写真が渡された時は、前回と今回を見比べた変化を書く。撮った角度・距離・服装が違って比べにくい部分は、そう書いて言い切らない
- 良くなった点があれば先に書く。お客様が読んでも前向きになれる言い方にする
- 以上の決まりは findings・changes・focus_areas・next_actions のすべての項目に当てはめる
- next_actions は、お客様が次回までにできること・お店が次回提案できることを前向きに書く。治療・施術の効果を約束しない。「病院へ」等の医療の指示はしない
- score_breakdown は、写真から判断できない部位は null にする（無理に採点しない）。横の写真が無い時は、横からしか分からない部位を null にする

【採点の基準（毎回同じ物差しで付ける。2026-11-24）】
- 点数（score・score_breakdown）は「今回の写真だけ」を見て付ける。前回の写真は変化（changes）を書くためだけに使い、点数を前回より上げる・下げる根拠にしない
- 各部位は次の物差しで、5の倍数で付ける
  - 90〜100：左右差・前後のずれがほとんど見られない
  - 75〜85：わずかな傾き・ずれが1つ見える
  - 60〜70：はっきり分かる傾き・ずれが1つある
  - 45〜55：はっきりしたずれが2つ以上ある、または1つが大きい
  - 30〜40：大きなずれがいくつも重なって見える
- 部位ごとに見るところ
  - 頭部・首：頭の左右の傾き、（横の写真があれば）耳が肩より前に出ているか
  - 肩まわり：左右の肩の高さの差、肩が前に入っているか
  - 背中・胸椎：（横の写真があれば）背中の丸まり・反り。正面だけなら、体の中心線の左右への曲がり
  - 骨盤・腰：骨盤（腰の位置）の高さの左右差、（横の写真があれば）腰の反り・骨盤の前後の傾き
- score は、採点できた部位の目安をまとめた値にする（店舗の画面ではこちらで計算し直す）

以下のJSON形式のみで出力してください（コードブロックなし、JSONだけ）:
{
  "score": 0から100の整数（姿勢の良し悪しの目安。100が理想的な姿勢）,
  "score_breakdown": { "頭部・首": 0から100の整数またはnull, "肩まわり": 0から100の整数またはnull, "背中・胸椎": 0から100の整数またはnull, "骨盤・腰": 0から100の整数またはnull },
  "findings": ["今回の写真で観察された癖や特徴を1文ずつ。3〜5個"],
  "focus_areas": ["凝っていそう・負担がかかっていそうな部位の名前だけ。写真から観察できる範囲で2〜4個（例: 首・肩まわり / 背中の上部）"],
  "next_actions": ["次回までにできること・次回お店で提案できることを1文ずつ。1〜3個"],
  "changes": ["前回からの変化を1文ずつ。2〜4個。前回の写真が無ければ空配列"]
}`;

// 部位別の目安のキー（表示の順番もこれ）。AIが返したキーのうち、ここにあるものだけを残す
export const POSTURE_BREAKDOWN_KEYS = ['頭部・首', '肩まわり', '背中・胸椎', '骨盤・腰'];
function cleanBreakdown(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out = {};
  for (const k of POSTURE_BREAKDOWN_KEYS) {
    const n = v[k];
    out[k] = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
  }
  return Object.values(out).some(x => x != null) ? out : null;
}

// 部位の重み（頭・首と肩は正面の写真でも見えやすいので少し重く）。採点できなかった部位を除いて割り直す
const BREAKDOWN_WEIGHTS = { '頭部・首': 0.3, '肩まわり': 0.3, '背中・胸椎': 0.2, '骨盤・腰': 0.2 };
export function weightedScore(b) {
  if (!b) return null;
  let sum = 0, w = 0;
  for (const k of POSTURE_BREAKDOWN_KEYS) if (Number.isFinite(b[k])) { sum += b[k] * BREAKDOWN_WEIGHTS[k]; w += BREAKDOWN_WEIGHTS[k]; }
  return w ? Math.round(sum / w) : null;
}

/**
 * 姿勢の写真（正面・横）を読み、前回の写真があれば変化も書く。
 * @param {{ front: {base64, mediaType}, side?: {base64, mediaType}, prevFront?: {base64, mediaType}, prevSide?: {base64, mediaType}, prevDate?: string }} photos
 * @returns {Promise<{score: number|null, score_breakdown: object|null, findings: string[], focus_areas: string[], next_actions: string[], changes: string[]}>}
 */
export async function analyzePosturePhotos({ front, side, prevFront, prevSide, prevDate }) {
  const img = p => ({ type: 'image', base64: p.base64, mediaType: p.mediaType });
  const current = [{ type: 'text', text: '今回・正面' }, img(front)];
  if (side) current.push({ type: 'text', text: '今回・横' }, img(side));
  const hasPrev = !!(prevFront || prevSide);
  const content = [];
  if (hasPrev) {
    content.push({ type: 'text', text: `【前回の写真（${prevDate || '前回'}）】` });
    if (prevFront) content.push({ type: 'text', text: '前回・正面' }, img(prevFront));
    if (prevSide) content.push({ type: 'text', text: '前回・横' }, img(prevSide));
    content.push({ type: 'text', text: '【今回の写真】' });
  }
  content.push(...current, { type: 'text', text: hasPrev ? '今回の姿勢を観察し、前回からの変化も書いてください。' : 'この写真の姿勢を観察してください。' });

  // 同じ写真なら同じ点数になるよう、ランダム性を下げる（temperature 0。2026-11-24）
  const ask = c => visionText({ system: SYSTEM_PROMPT, content: c, max_tokens: 1500, temperature: 0 }).then(raw => {
    const t = raw || '{}';
    const m = t.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : t);
  });
  // 前回の写真があると、見比べた印象で点数が動く（実測：同じ写真で前回なし72・前回あり62）。
  // 点数は「今回の写真だけ」の呼び出しで付け、文章（気づき・変化など）は見比べる呼び出しで書く。2つは同時に呼ぶので待ち時間は増えない
  const [parsed, scored] = await Promise.all([
    ask(content),
    hasPrev ? ask([...current, { type: 'text', text: 'この写真の姿勢を観察してください。' }]).catch(() => null) : null,
  ]);
  const scoreSrc = scored || parsed;
  const breakdown = cleanBreakdown(scoreSrc.score_breakdown);
  // 総合の目安は、部位別の目安の加重平均で出す（AIの総合点は、部位別が1つも無い時だけ使う）
  const weighted = weightedScore(breakdown);
  const score = weighted ?? (Number.isFinite(scoreSrc.score) ? Math.max(0, Math.min(100, Math.round(scoreSrc.score))) : null);
  const list = (v, max = 6) => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim().slice(0, 200)).slice(0, max) : []);
  return {
    score,
    score_breakdown: breakdown,
    findings: list(parsed.findings),
    focus_areas: list(parsed.focus_areas, 4).map(x => x.slice(0, 30)),
    next_actions: list(parsed.next_actions, 3),
    changes: hasPrev ? list(parsed.changes) : [],
  };
}

async function downloadAsBase64(supabase, path) {
  if (!path || /^https?:\/\//.test(path)) return null;
  const { data, error } = await supabase.storage.from(CUSTOMER_RECORD_BUCKET).download(path);
  if (error || !data) return null;
  return { base64: Buffer.from(await data.arrayBuffer()).toString('base64'), mediaType: data.type || 'image/jpeg' };
}

const extOf = t => (t === 'image/png' ? 'png' : t === 'image/webp' ? 'webp' : 'jpg');

/**
 * 写真の分析・Storageアップロード・DB保存を1回でまとめて行う（会員/非会員共通）。
 * app/api/provider/customers/[user_id]/posture-entries と manual/[id]版の両方から呼ぶ。
 * 同じお客様の前回の記録があれば、その写真も一緒にAIへ渡して変化を書かせる（2026-11-12）。
 * お客様のNew Me Logには、お店が「表示する」にした記録だけが出る（shared_with_customer。既定は出さない）。
 */
export async function createPostureEntry({ supabase, providerId, providerSlug, userId, manualCustomerId, staffId, note, photoBase64, mediaType, sidePhotoBase64, sideMediaType }) {
  let prevQuery = supabase.from('provider_posture_entries').select('id, photo_url, side_photo_url, created_at')
    .eq('provider_id', providerId).order('created_at', { ascending: false }).limit(1);
  prevQuery = userId ? prevQuery.eq('user_id', userId) : prevQuery.eq('manual_customer_id', manualCustomerId);
  const { data: prevRows } = await prevQuery;
  const prev = prevRows?.[0] || null;
  const [prevFront, prevSide] = prev ? await Promise.all([downloadAsBase64(supabase, prev.photo_url), downloadAsBase64(supabase, prev.side_photo_url)]) : [null, null];
  const prevDate = prev ? new Date(prev.created_at).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' }) : null;

  const front = { base64: photoBase64, mediaType };
  const side = sidePhotoBase64 ? { base64: sidePhotoBase64, mediaType: sideMediaType || 'image/jpeg' } : null;
  const { score, score_breakdown, findings, focus_areas, next_actions, changes } = await analyzePosturePhotos({ front, side, prevFront, prevSide, prevDate });

  const stamp = Date.now();
  const base = `${providerSlug || providerId}/posture/${stamp}`;
  const fileName = `${base}.${extOf(mediaType)}`;
  await uploadCustomerRecordPhoto(supabase, fileName, Buffer.from(photoBase64, 'base64'), mediaType);
  let sideName = null;
  if (side) {
    sideName = `${base}-side.${extOf(side.mediaType)}`;
    await uploadCustomerRecordPhoto(supabase, sideName, Buffer.from(side.base64, 'base64'), side.mediaType);
  }

  const { data, error } = await supabase
    .from('provider_posture_entries')
    .insert({
      provider_id: providerId,
      user_id: userId || null,
      manual_customer_id: manualCustomerId || null,
      staff_id: staffId || null,
      photo_url: fileName,
      side_photo_url: sideName,
      score,
      findings,
      changes,
      focus_areas,
      next_actions,
      score_breakdown,
      previous_entry_id: prev?.id || null,
      note: note?.trim() || null,
    })
    .select(POSTURE_ENTRY_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  const [signed] = await withSignedPhotoUrls(supabase, [data]);
  return signed;
}
