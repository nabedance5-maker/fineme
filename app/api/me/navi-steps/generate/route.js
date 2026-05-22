// POST /api/me/navi-steps/generate
// ユーザーの診断データ + body_data を Claude Sonnet に渡して
// この人専用の変容ステップリストを生成し profiles.navi_steps に保存する
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

const AXIS_LABELS = {
  body:        '体型・ボディ',
  eyebrow:     '眉',
  fashion:     '服・ファッション',
  hair:        '髪・ヘアスタイル',
  skin:        '肌ケア',
  hairremoval: '脱毛（ひげ・体毛）',
  teeth:       '歯（ホワイトニング・矯正）',
  nail:        '爪',
};
const CARE_LABELS = {
  none:         '未着手・気にしていない',
  concerned:    '気になっているが何も始めていない',
  self:         '自己流で取り組み中',
  self_regular: '自己流で定期的に続けている',
  pro:          'プロのサービスに通っている',
};
const BUDGET_LABELS = {
  low:     '低予算（できるだけ安く）',
  mid:     '中程度',
  high:    '積極的に投資',
  premium: 'プレミアム',
};
const GOAL_SCENE_LABELS = {
  first_impression: '初対面の印象を変える',
  date_confidence:  'デートの自信をつける',
  photo_self:       '写真映えする外見になる',
  morning_mirror:   '朝の鏡で自信を持てるようになる',
  approach:         '積極的に行動できる自信をつける',
};

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { diagnosis, body_data } = await request.json().catch(() => ({}));
  if (!diagnosis?.transform_vectors) {
    return Response.json({ error: 'diagnosis.transform_vectors が必要です' }, { status: 400 });
  }

  const tv = diagnosis.transform_vectors || {};
  const bd = body_data || {};
  const budget = diagnosis.budget || null;
  const goalScene = diagnosis.goal_scene || null;
  const triggerType = diagnosis.trigger_type || null;

  // 各軸情報をテキスト化（ギャップが0以下の軸は変容済みとして除外）
  const axisLines = Object.entries(AXIS_LABELS).map(([id, label]) => {
    const v = tv[id];
    if (!v) return null;
    const gap = (v.ideal || 3) - (v.current || 1);
    if (gap <= 0) return `- ${label}: 変容済み・維持フェーズ（ケア状況：${CARE_LABELS[v.care_type] || '不明'}）`;
    return `- ${label}: 現在${v.current || 1}/理想${v.ideal || 3}（ギャップ${gap}）、状況：${CARE_LABELS[v.care_type] || '未着手'}`;
  }).filter(Boolean).join('\n');

  const bodyDataLines = [
    bd.skin_type           && `- 肌タイプ: ${bd.skin_type}`,
    bd.skin_concerns?.length && `- 肌悩み: ${[].concat(bd.skin_concerns).join('・')}`,
    bd.beard_density       && `- ひげの濃さ: ${bd.beard_density}`,
    bd.hair_type           && `- 髪質: ${bd.hair_type}`,
    bd.hair_additional     && `- 髪・頭皮の悩み: ${[].concat(bd.hair_additional).join('・')}`,
    bd.face_shape          && `- 顔型: ${bd.face_shape}`,
    bd.face_type           && `- 顔タイプ: ${bd.face_type}`,
    bd.skeletal_type       && `- 骨格タイプ: ${bd.skeletal_type}`,
    bd.body_concern?.length && `- 体型の気になる部分: ${[].concat(bd.body_concern).join('・')}`,
    bd.body_goal           && `- 体型目標: ${bd.body_goal}`,
    bd.teeth_concern       && `- 歯の悩み: ${bd.teeth_concern}`,
    bd.eyebrow_concerns    && `- 眉の悩み: ${[].concat(bd.eyebrow_concerns).join('・')}`,
    bd.fashion_self        && `- 目指すスタイル: ${bd.fashion_self}`,
    bd.depilation_target?.length && `- 気になる脱毛部位: ${[].concat(bd.depilation_target).join('・')}`,
    bd.nail_concerns?.length && `- 爪の悩み: ${[].concat(bd.nail_concerns).join('・')}`,
  ].filter(Boolean).join('\n');

  const goalSceneText = Array.isArray(goalScene)
    ? goalScene.map(g => GOAL_SCENE_LABELS[g] || g).join('、')
    : (GOAL_SCENE_LABELS[goalScene] || goalScene || '未設定');

  const userContext = `## ユーザーの変容軸データ
${axisLines || '（データなし）'}

## 現状把握データ（本人が確認・入力済み）
${bodyDataLines || '（まだ入力なし）'}

## 予算・ゴール・きっかけ
- 予算志向: ${BUDGET_LABELS[budget] || '不明'}
- 変容ゴール: ${goalSceneText}
${triggerType ? `- 変容のきっかけ: ${triggerType}` : ''}`;

  const systemPrompt = `あなたは「変容の旅コンシェルジュ」です。
恋愛・外見に悩む男性ユーザーの診断データをもとに、この人専用の変容ステップリストを生成してください。

## ⚠️ 絶対禁止：提供データにない身体的特性を推測・仮定すること

以下のルールを最優先とする。違反は出力品質の致命的な欠陥となる。

- 「現状把握データ」に「髪質」の記載がない場合：くせ毛・直毛・剛毛・細毛・軟毛など一切言及禁止
- 「現状把握データ」に「肌タイプ」の記載がない場合：乾燥肌・脂性肌・混合肌・敏感肌など一切言及禁止
- 「現状把握データ」に「ひげの濃さ」の記載がない場合：ひげが濃い・薄い・目立つなど一切言及禁止
- 「現状把握データ」に「顔型」の記載がない場合：面長・丸顔・エラ張りなど特定の顔型に言及禁止
- 「現状把握データ」に「骨格タイプ」の記載がない場合：ストレート・ウェーブ・ナチュラルなど言及禁止
- 「現状把握データ」に「体型の気になる部分」の記載がない場合：具体的な部位（腹・二の腕等）に言及禁止
- 記載のない特性について「おそらく」「〜の可能性がある」「〜かもしれない」などの推測表現も禁止
- ステップテキストに使えるのは、提供されたデータに明示された情報のみ
- データに記載がある場合は積極的にその情報を活用して具体的なステップを書くこと

## 生成ルール

1. ステップは変容の旅の**一本の道**として25〜35件生成する
2. 異なる軸を自然に混在させる（同じ軸を3回以上連続させない）
3. このユーザーのデータから判断して不要・無関係なステップは省く
   例: ひげが薄い人に医療ヒゲ脱毛の高コストステップは不要
   例: すでにプロ通い中の軸に入門ステップは不要
   例: 変容済みの軸は維持ステップのみ1〜2件に絞る
4. ステップテキストはこのユーザーの状況に即した**具体的な言葉**で書く（汎用表現を避ける）
   悪い例: 「肌ケアを始める」
   良い例（肌タイプが脂性肌と判明している場合）: 「脂性肌向けの洗顔料をドラッグストアで1本選んで今日から使い始める」
   良い例（肌タイプ不明の場合）: 「まず肌タイプを把握するためにセルフチェックを行い、洗顔料選びの方針を決める」
5. action_type（行動タイプ）:
   - quick = 今日〜数日で完結する一回限りの行動
   - habit = 毎日または毎週繰り返す習慣
   - ongoing = 数週間〜数ヶ月続けるプログラム（ジム・脱毛通院など）
6. guide（サポート推奨度）:
   - none = 自力で完全にできる
   - LOW = 少しサポートがあると助かる
   - MID = プロと進めると精度が上がる
   - HIGH = ここはプロに任せると確実に変わる
7. 予算が低い場合、guide:HIGH のステップは最小限にして後半に配置する
8. hint は省略可。必要なときだけ1〜2文で具体的に書く
9. id は「軸名-3桁連番」形式（例: hair-001, body-002）

## 出力形式（JSONのみ・コードブロック不要）
{"steps":[{"id":"eyebrow-001","axis":"eyebrow","text":"...","action_type":"quick","guide":"none","hint":"..."},{"id":"hair-001","axis":"hair","text":"...","action_type":"quick","guide":"none"},...]}'`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let generated;
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContext }],
    });
    const raw = msg.content[0]?.text?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    generated = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    if (!Array.isArray(generated?.steps) || generated.steps.length === 0) {
      throw new Error('steps配列が空または不正');
    }
  } catch (e) {
    console.error('Claude navi-steps error:', e);
    return Response.json({ error: `Claude error: ${e.message}` }, { status: 500 });
  }

  const navi_steps = {
    steps: generated.steps,
    generated_at: new Date().toISOString(),
    diagnosis_at: diagnosis.at || null,
  };

  const { error: saveError } = await supabase
    .from('profiles')
    .update({ navi_steps })
    .eq('id', user.id);

  if (saveError) return Response.json({ error: saveError.message }, { status: 500 });
  return Response.json({ ok: true, navi_steps });
}
