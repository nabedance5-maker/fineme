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

  const { diagnosis, body_data, mirror_only } = await request.json().catch(() => ({}));
  if (!mirror_only && !diagnosis?.transform_vectors) {
    return Response.json({ error: 'diagnosis.transform_vectors が必要です' }, { status: 400 });
  }

  // 1日1回制限: generated_at が今日(JST)なら拒否
  // ただし mirror_only の場合: 最新Mirrorセッションが既存Mapより新しければ通す
  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('navi_steps')
    .eq('id', user.id)
    .single();
  if (profile?.navi_steps?.generated_at) {
    const jst = (d) => new Date(new Date(d).getTime() + 9 * 3600000);
    const lastJST = jst(profile.navi_steps.generated_at);
    const nowJST  = jst(new Date());
    const sameDay = lastJST.getFullYear() === nowJST.getFullYear()
      && lastJST.getMonth() === nowJST.getMonth()
      && lastJST.getDate()  === nowJST.getDate();
    if (sameDay) {
      // mirror_only の場合：最新Mirrorセッションが既存Mapの生成時刻より新しければ許可
      if (mirror_only) {
        const { data: latestMirror } = await getSupabase()
          .from('mirror_sessions')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        const mapAt = new Date(profile.navi_steps.generated_at).getTime();
        const mirrorAt = latestMirror?.created_at ? new Date(latestMirror.created_at).getTime() : 0;
        if (mirrorAt <= mapAt) {
          return Response.json({ error: 'daily_limit', message: 'Mirrorの最新分析はすでにMapに反映済みです。新しく分析してから更新してください。' }, { status: 429 });
        }
        // Mirror が Map より新しい → 日次制限を免除してfall-through
      } else {
        return Response.json({ error: 'daily_limit', message: '本日はすでに生成済みです。明日また生成できます。' }, { status: 429 });
      }
    }
  }

  // Mirror最新セッション取得（写真ベースの変容余地データ）
  let mirrorAxes = null;
  try {
    const { data: mirrorSession } = await getSupabase()
      .from('mirror_sessions')
      .select('analysis, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (mirrorSession?.analysis?.axes?.length) {
      mirrorAxes = mirrorSession.analysis.axes;
    }
  } catch {}

  // mirror_only モード: Mirror軸データからtransform_vectorsを合成
  const MIRROR_AXIS_MAP = { eyebrow: 'eyebrow', skin: 'skin', hair: 'hair', body: 'body', posture: 'body', fashion: 'fashion' };
  const POTENTIAL_TO_TV = {
    '高': { current: 1, ideal: 3, care_type: 'none' },
    '中': { current: 2, ideal: 3, care_type: 'concerned' },
    '低': { current: 3, ideal: 3, care_type: 'self' },
  };
  let derivedDiagnosis = diagnosis;
  if (mirror_only && mirrorAxes) {
    const tv_derived = {};
    for (const ax of mirrorAxes) {
      const naviAxis = MIRROR_AXIS_MAP[ax.id];
      if (!naviAxis) continue;
      tv_derived[naviAxis] = POTENTIAL_TO_TV[ax.potential_level] || { current: 2, ideal: 3, care_type: 'concerned' };
    }
    derivedDiagnosis = { transform_vectors: tv_derived };
  } else if (mirror_only && !mirrorAxes) {
    return Response.json({ error: 'Mirror分析データが見つかりません。先にMirrorで写真を分析してください。' }, { status: 400 });
  }

  const tv = derivedDiagnosis?.transform_vectors || {};
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

  const POTENTIAL_LEVEL_JA = { '高': '高（少しの変化で大きく印象が変わる余地あり）', '中': '中（磨けば確実に向上）', '低': '低（すでに整っている）' };
  const mirrorDataLines = mirrorAxes
    ? mirrorAxes
        .filter(ax => ax.id !== 'overall' && ax.id !== 'expression' && ax.id !== 'color')
        .map(ax => {
          const level = POTENTIAL_LEVEL_JA[ax.potential_level] || ax.potential_level;
          const obs = ax.summary || ax.potential_reason || '';
          return `- ${ax.name}（id:${ax.id}）: 変容余地=${level}${obs ? `　観察：「${obs}」` : ''}`;
        })
        .join('\n')
    : null;

  const userContext = `## ユーザーの変容軸データ
${axisLines || '（データなし）'}

## 現状把握データ（本人が確認・入力済み）
${bodyDataLines || '（まだ入力なし）'}

## 予算・ゴール・きっかけ
- 予算志向: ${BUDGET_LABELS[budget] || '不明'}
- 変容ゴール: ${goalSceneText}
${triggerType ? `- 変容のきっかけ: ${triggerType}` : ''}${mirrorDataLines ? `

## Fineme Mirror 写真分析データ（最新セッション）
写真から直接観察された変容余地データ。体型・外見のリアルな現状を反映。
${mirrorDataLines}` : ''}`;

  const systemPrompt = `あなたは「変容の旅コンシェルジュ」です。
恋愛・外見に悩む男性ユーザーの診断データをもとに、この人専用の変容ステップリストを生成してください。

## ⚠️ 最優先ルール：提供データ外の身体的特性は絶対に言及しない（全ルールより優先）

【許可条件】身体的特性への言及が許可されるのは、以下いずれかに明示された場合のみ：
1. ユーザーデータ「現状把握データ」に記載がある特性
2. ユーザーデータ「Fineme Mirror 写真分析データ」の観察テキストに記載がある特性

【禁止事項】いずれにも記載がない特性は「おそらく」「〜かもしれない」等の推測表現も含め一切禁止：
- 髪質（くせ毛・直毛・剛毛・細毛・軟毛）→ 上記データに記載なければ禁止
- 肌タイプ（乾燥肌・脂性肌・混合肌・敏感肌）→ 同上
- ひげ状態（濃い・薄い・目立つ）→ 同上
- 顔型（面長・丸顔・エラ張り等）→ 同上
- 骨格タイプ（ストレート・ウェーブ・ナチュラル）→ 同上
- 体型の具体部位（腹・二の腕・脚等）→ 同上

【許可例】
- Mirrorデータに「くせ毛が目立ちスタイリングで改善余地あり」という観察がある → くせ毛に関連したステップを書いてよい
- 現状把握データに「肌タイプ: 脂性肌」がある → 脂性肌向けステップを書いてよい
- どちらにも肌タイプ記載がない → 「まず肌タイプを確認するためセルフチェックを行う」のような汎用ステップにする

## Mirror分析データの活用ルール
「Fineme Mirror 写真分析データ」が提供されている場合は以下のルールに従う。
- 変容余地「高」の軸：その軸のステップを早めに配置し、より具体的・熱量の高い文章で書く
- 変容余地「低」（すでに整っている）の軸：維持ステップのみ1〜2件に絞り、称賛として書く
- このデータは写真から直接観察された情報なので、ユーザーの自己申告より優先度が高い
- Mirror軸とNavi軸の対応: eyebrow→eyebrow, skin→skin, hair→hair, body→body, fashion→fashion, posture→body

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
5. **並び順の絶対ルール（最重要）**:
   - 序盤（1〜8件目）: ギャップが大きい主要軸（体型・眉・髪・服・肌）の「quick」アクションを優先配置。ここで早期の達成感を作る
   - 中盤（9〜22件目）: 各軸をバランスよく混在させ、habitとongoingを組み込む
   - 終盤（23件目以降）: 爪・細部の仕上げ・guide:HIGHの専門的ステップを配置
   - 爪（nail）は必ず全体の後半（23件目以降）に配置すること。序盤・中盤に爪ステップを入れない
   - ギャップ数値が大きい軸ほど序盤に多く登場させる（ギャップ3の軸 > ギャップ1の軸）
   - 最初の3ステップは必ずaction_type:quickにする
6. action_type（行動タイプ）:
   - quick = 今日〜数日で完結する一回限りの行動
   - habit = 毎日または毎週繰り返す習慣
   - ongoing = 数週間〜数ヶ月続けるプログラム（ジム・脱毛通院など）
7. guide（サポート推奨度）:
   - none = 自力で完全にできる
   - LOW = 少しサポートがあると助かる
   - MID = プロと進めると精度が上がる
   - HIGH = ここはプロに任せると確実に変わる
8. 予算が低い場合、guide:HIGH のステップは最小限にして後半に配置する
9. hint は省略可。必要なときだけ1〜2文で具体的に書く
10. id は「軸名-3桁連番」形式（例: hair-001, body-002）

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

  // スナップショット：上書き前に現月のデータを保存（既存月は無視）
  const existingSteps = profile?.navi_steps;
  if (existingSteps?.generated_at) {
    const snapMonth = existingSteps.generated_at.slice(0, 7); // 'YYYY-MM'
    await supabase.from('navi_snapshots').upsert(
      {
        user_id: user.id,
        year_month: snapMonth,
        navi_steps: existingSteps,
        axis_progress: profile?.axis_progress ?? null,
      },
      { onConflict: 'user_id,year_month', ignoreDuplicates: true }
    ).catch(e => console.warn('navi_snapshots upsert failed (non-fatal):', e));
  }

  const navi_steps = {
    steps: generated.steps,
    generated_at: new Date().toISOString(),
    diagnosis_at: derivedDiagnosis?.at || null,
    source: mirror_only ? 'mirror' : 'diagnosis',
  };

  const { error: saveError } = await supabase
    .from('profiles')
    .update({ navi_steps })
    .eq('id', user.id);

  if (saveError) return Response.json({ error: saveError.message }, { status: 500 });
  return Response.json({ ok: true, navi_steps });
}
