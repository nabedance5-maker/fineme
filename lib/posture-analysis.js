// 姿勢分析AI（でお要望2026-09-25）。店舗スタッフが来店時に撮影した写真を分析し、
// 姿勢スコア・気になる癖・凝っていそうな筋肉部位を返す。Mirror分析（app/api/mirror/analyze）
// と同じ「事実に基づく観察のみ・断定しない・医療診断はしない」方針をそのまま踏襲する。
import { uploadCustomerRecordPhoto, withSignedPhotoUrls, CUSTOMER_RECORD_BUCKET } from './customer-record-photos';
import { visionText, HAIKU } from './ai.js';
import { POSTURE_CHECKS, POSTURE_LEVELS, normalizePostureChecks, scoreFromChecks } from './posture-scoring.js';

// でお要望2026-09-25：「10000円のプランに入ってる人しか使えないようにしてほしい
// （特例無料の人も使えるように）」。10000円プラン＝'C'、特例無料アカウント＝'special'
// （本番DB実データで確認：'free'という値は存在せず、admin/providersでも'special'が
// 特例無料の実際のキー。PLAN_LABELSに'free'があるのは未使用の将来キーで実データと
// 一致しない——ここで誤って'free'を使うと、でお自身のテストアカウントも弾かれてしまう）。
export { isPostureEligiblePlan } from './posture-plan';
// お店の画面に返す列（閲覧リンクのハッシュは返さない。リンクが出ているかどうかだけ share_expires_at で分かる）
export const POSTURE_ENTRY_COLUMNS = 'id, photo_url, side_photo_url, score, score_breakdown, score_details, findings, focus_areas, next_actions, changes, previous_entry_id, shared_with_customer, share_expires_at, is_sample, note, staff_id, created_at';

// 今回の写真を見る問い（2026-11-25 作り直し）。チェック項目の判定と、気づき・気になる部位・次の一手を「同じ1回」で出させ、
// 点数の根拠と文章が食い違わないようにする（別々に聞くと、文章では「頭が前に出ている」、判定では「ずれなし」となった）。
// AIには点数を付けさせない。点数は判定から lib/posture-scoring.js で計算する（各部位100点から、ずれの大きさに応じて決まった点を引く）
const OBSERVE_PROMPT = `あなたは、店舗スタッフ向けに姿勢の写真を観察するアシスタントです。
医師ではないため医学的診断はせず、見た目の観察に基づく気づきのみを提供します。
渡された「今回の写真」を見て、まずチェック項目ごとにずれの大きさを判定し、その判定に沿って気づき・気になる部位・次の一手を書いてください。

【ずれの大きさ】（まっすぐ・左右がそろった姿勢と比べる）
${POSTURE_LEVELS.map(l => `- ${l.level}（${l.label}）：${l.guide}`).join('\n')}

【チェック項目】（見るのに要る写真）
${POSTURE_CHECKS.map(c => `- ${c.key}：${c.label}（${c.view === 'front' ? '正面' : c.view === 'side' ? '横' : '正面か横のどちらか'}）`).join('\n')}

【厳守】
- 写真から実際に確認できる事実のみを述べる。写っていないことは推測しない
- その向きの写真が無い・体が隠れている等で確認できない項目は level を null にする
- 判定と文章を食い違わせない。findings で「〜が見られる」と書いたことは、対応する項目の level を1以上にする。level が0の項目を、findings で癖として書かない
- note は判定の根拠として写真から見えたことを1文（40字以内）で書く
- 「〜のように見えます」「〜の可能性があります」等、言い切らない表現を使う。決めつけない
- 医療的診断（「側弯症」「椎間板ヘルニア」等の病名）は絶対に使わない
- 良い点があれば先に書く。お客様が読んでも前向きになれる言い方にする
- next_actions は、お客様が次回までにできること・お店が次回提案できることを前向きに書く。治療・施術の効果を約束しない。「病院へ」等の医療の指示はしない

以下のJSON形式のみで出力してください（コードブロックなし、JSONだけ）:
{
  "checks": { ${POSTURE_CHECKS.map(c => `"${c.key}": { "level": 0〜3の整数またはnull, "note": "..." }`).join(', ')} },
  "findings": ["今回の写真で観察された癖や特徴を1文ずつ。3〜5個"],
  "focus_areas": ["凝っていそう・負担がかかっていそうな部位の名前だけ。2〜4個（例: 首・肩まわり / 背中の上部）"],
  "next_actions": ["次回までにできること・次回お店で提案できることを1文ずつ。1〜3個"]
}`;

// 判定は Sonnet で行う（2026-11-25 実測：Haiku は頭が基準線よりはっきり前に出た線画でも「ずれなし」と判定し、根拠の説明にならなかった。
// Sonnet は同じ線画で「頭が前に出ている −15・猫背 −15」等と見分け、同じ写真で3回とも同じ点数）。変化の文章は Haiku のまま
const POSTURE_OBSERVE_MODEL = 'claude-sonnet-5-5';

// 答えの形（構造化出力）。2026-11-25 実測：形を指定しないと Sonnet の JSON が途中で崩れることがあった
const strList = { type: 'array', items: { type: 'string' } };
const OBSERVE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['checks', 'findings', 'focus_areas', 'next_actions'],
  properties: {
    checks: {
      type: 'object',
      additionalProperties: false,
      required: POSTURE_CHECKS.map(c => c.key),
      properties: Object.fromEntries(POSTURE_CHECKS.map(c => [c.key, {
        type: 'object', additionalProperties: false, required: ['level', 'note'],
        properties: { level: { type: ['integer', 'null'] }, note: { type: 'string' } },
      }])),
    },
    findings: strList,
    focus_areas: strList,
    next_actions: strList,
  },
};

// 前回との変化だけを書く問い（前回の写真がある時だけ）
const CHANGES_PROMPT = `あなたは、店舗スタッフ向けに姿勢の写真を見比べるアシスタントです。医学的診断はしません。
前回と今回の写真を見比べ、変化を書いてください。
- 写真から確認できることだけを書く。撮った角度・距離・服装が違って比べにくい部分は、そう書いて言い切らない
- 良くなった点があれば先に書く。「〜のように見えます」等、言い切らない。病名は使わない
以下のJSON形式のみで出力してください（コードブロックなし、JSONだけ）:
{ "changes": ["前回からの変化を1文ずつ。2〜4個"] }`;

/**
 * 姿勢の写真（正面・横）を読み、前回の写真があれば変化も書く。
 * @param {{ front: {base64, mediaType}, side?: {base64, mediaType}, prevFront?: {base64, mediaType}, prevSide?: {base64, mediaType}, prevDate?: string }} photos
 * @returns {Promise<{score: number|null, score_breakdown: object|null, score_details: object[]|null, findings: string[], focus_areas: string[], next_actions: string[], changes: string[]}>}
 */
export async function analyzePosturePhotos({ front, side, prevFront, prevSide, prevDate }) {
  const img = p => ({ type: 'image', base64: p.base64, mediaType: p.mediaType });
  const current = [{ type: 'text', text: '今回・正面' }, img(front)];
  if (side) current.push({ type: 'text', text: '今回・横' }, img(side));
  const hasPrev = !!(prevFront || prevSide);

  // 同じ写真なら同じ判定になるよう、ランダム性を下げる（temperature 0。2026-11-24）
  // Sonnet 5.5 は temperature を受け付けない（400）ので、Haiku の時だけ 0 にする。
  // Sonnet は答える前に考える分も出力に数えるため、上限を大きくとる（2000だと途中で切れてJSONが崩れた）
  const once = (system, c, model, schema) => visionText({ system, content: c, max_tokens: model === HAIKU ? 2000 : 8000, schema, ...(model === HAIKU ? { temperature: 0 } : { model }) }).then(raw => {
    const t = raw || '{}';
    const m = t.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : t);
  });
  // AIの返すJSONがまれに壊れるため、壊れていた時は1回だけ聞き直す
  const ask = (system, c, model, schema) => once(system, c, model, schema).catch(e => (e instanceof SyntaxError ? once(system, c, model, schema) : Promise.reject(e)));
  // 判定と文章は「今回の写真だけ」で出す（前回の写真があると、見比べた印象で点数が動いたため。実測：同じ写真で前回なし72・前回あり62）。
  // 前回との変化は別に聞く。2つは同時に呼ぶので待ち時間は増えない
  const compare = [];
  if (hasPrev) {
    compare.push({ type: 'text', text: `【前回の写真（${prevDate || '前回'}）】` });
    if (prevFront) compare.push({ type: 'text', text: '前回・正面' }, img(prevFront));
    if (prevSide) compare.push({ type: 'text', text: '前回・横' }, img(prevSide));
    compare.push({ type: 'text', text: '【今回の写真】' }, ...current, { type: 'text', text: '前回からの変化を書いてください。' });
  }
  const [parsed, changed] = await Promise.all([
    ask(OBSERVE_PROMPT, [...current, { type: 'text', text: 'この写真の姿勢を観察してください。' }], POSTURE_OBSERVE_MODEL, OBSERVE_SCHEMA),
    hasPrev ? ask(CHANGES_PROMPT, compare, HAIKU).catch(() => ({ changes: [] })) : { changes: [] },
  ]);
  const checks = normalizePostureChecks(parsed.checks, { hasSide: !!side });
  const { score, breakdown } = scoreFromChecks(checks);
  const list = (v, max = 6) => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim().slice(0, 200)).slice(0, max) : []);
  return {
    score,
    score_breakdown: breakdown,
    score_details: score != null ? checks : null,
    findings: list(parsed.findings),
    focus_areas: list(parsed.focus_areas, 4).map(x => x.slice(0, 30)),
    next_actions: list(parsed.next_actions, 3),
    changes: hasPrev ? list(changed.changes) : [],
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
  const { score, score_breakdown, score_details, findings, focus_areas, next_actions, changes } = await analyzePosturePhotos({ front, side, prevFront, prevSide, prevDate });

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
      score_details,
      previous_entry_id: prev?.id || null,
      note: note?.trim() || null,
    })
    .select(POSTURE_ENTRY_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  const [signed] = await withSignedPhotoUrls(supabase, [data]);
  return signed;
}
