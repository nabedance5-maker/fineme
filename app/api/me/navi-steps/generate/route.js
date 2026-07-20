// POST /api/me/navi-steps/generate
// ユーザーの診断データ + body_data を Claude Sonnet に渡して
// この人専用の変容ステップリストを生成し profiles.navi_steps に保存する
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { BRAND_PHILOSOPHY } from '@/lib/brand-philosophy';

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

  const _req = await request.json().catch(() => ({}));
  const { diagnosis, mirror_only } = _req;
  let body_data = _req.body_data;
  if (!mirror_only && !diagnosis?.transform_vectors) {
    return Response.json({ error: 'diagnosis.transform_vectors が必要です' }, { status: 400 });
  }

  // 1日1回制限: generated_at が今日(JST)なら拒否
  // ただし mirror_only の場合: 最新Mirrorセッションが既存Mapより新しければ通す
  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('navi_steps, body_data')
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
  let mirrorSessionDate = null;
  let mirrorSessionId = null;
  try {
    const { data: mirrorSession } = await getSupabase()
      .from('mirror_sessions')
      .select('id, analysis, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (mirrorSession?.analysis?.axes?.length) {
      mirrorAxes = mirrorSession.analysis.axes;
      mirrorSessionDate = mirrorSession.created_at || null;
      mirrorSessionId = mirrorSession.id || null;
    }
  } catch {}

  // 過去の行動×結果記録を取得（step_outcomesがあれば生成プロンプトに注入）
  let pastOutcomes = [];
  try {
    const { data: snapshots } = await getSupabase()
      .from('navi_snapshots')
      .select('year_month, step_outcomes')
      .eq('user_id', user.id)
      .not('step_outcomes', 'is', null)
      .order('year_month', { ascending: false })
      .limit(3);
    if (snapshots?.length) {
      pastOutcomes = snapshots;
    }
  } catch {}

  // mirror_only モード: Me Scan あり → 土台として使用（Mirror は合成で優先）
  //                     Me Scan なし → Mirror 軸データから transform_vectors を合成
  // color軸はfashionにマッピング（女性Mirrorでcolorが返ることがある）
  const MIRROR_AXIS_MAP = { eyebrow: 'eyebrow', skin: 'skin', hair: 'hair', body: 'body', posture: 'body', fashion: 'fashion', color: 'fashion' };
  const POTENTIAL_TO_TV = {
    // '高'は「改善余地が大きい」であって「未着手」ではない。concerned（気になっているが始めていない）が適切
    '高': { current: 1, ideal: 3, care_type: 'concerned' },
    '中': { current: 2, ideal: 3, care_type: 'self' },
    '低': { current: 3, ideal: 3, care_type: 'self_regular' }, // gap=0で axisLines には使われないが念のため
  };
  let derivedDiagnosis = diagnosis;
  if (mirror_only) {
    const { data: diagResult } = await supabase
      .from('diagnosis_results')
      .select('raw_data')
      .eq('user_id', user.id)
      .single().catch(() => ({ data: null }));

    if (diagResult?.raw_data?.transform_vectors) {
      // Me Scan あり → 土台として使用（Mirror はプロンプト内で優先）
      derivedDiagnosis = diagResult.raw_data;
      if (!body_data || !Object.keys(body_data).length) {
        body_data = profile?.body_data || {};
      }
    } else if (mirrorAxes) {
      // Me Scan なし → Mirror 軸から transform_vectors を合成
      const tv_derived = {};
      for (const ax of mirrorAxes) {
        const naviAxis = MIRROR_AXIS_MAP[ax.id];
        if (!naviAxis) continue;
        tv_derived[naviAxis] = POTENTIAL_TO_TV[ax.potential_level] || { current: 2, ideal: 3, care_type: 'concerned' };
      }
      derivedDiagnosis = { transform_vectors: tv_derived };
    } else {
      return Response.json({ error: 'Mirror分析データが見つかりません。先にMirrorで写真を分析してください。' }, { status: 400 });
    }
  }

  const tv = derivedDiagnosis?.transform_vectors || {};
  const bd = body_data || {};

  // 基礎チェックリスト対象軸（UIでステップ0を別表示するため、AI生成では入門ステップを省略させる）
  // priority_order 上位5軸を対象にする（care_typeではなくCompass優先度で判定）
  const BASELINE_AXES = new Set(['eyebrow', 'skin', 'hair', 'fashion', 'body', 'teeth', 'nail', 'hairremoval']);
  const baselineAxes = (derivedDiagnosis?.priority_order || [])
    .filter(axis => BASELINE_AXES.has(axis))
    .slice(0, 5);
  const budget = diagnosis?.budget || null;
  const goalScene = diagnosis?.goal_scene || null;
  const triggerType = diagnosis?.trigger_type || null;

  // Mirror軸をNavi軸IDで引けるMapを構築（Mode B: gap=0軸のMirror観察表示用）
  const mirrorByNaviAxis = {};
  if (mirrorAxes) {
    const _mirrorToNavi = { eyebrow: 'eyebrow', skin: 'skin', hair: 'hair', body: 'body', posture: 'body', fashion: 'fashion', color: 'fashion' };
    for (const ax of mirrorAxes) {
      const naviId = _mirrorToNavi[ax.id];
      if (naviId && !mirrorByNaviAxis[naviId]) mirrorByNaviAxis[naviId] = ax;
    }
  }
  const mirrorMonthLabel = mirrorSessionDate ? mirrorSessionDate.slice(0, 7) : null;

  // 各軸情報をテキスト化（Mode A: 外見評価禁止注記 / Mode B: Mirror観察を追記）
  const axisLines = Object.entries(AXIS_LABELS).map(([id, label]) => {
    const v = tv[id];
    if (!v) return null;
    const gap = (v.ideal || 3) - (v.current || 1);
    if (gap <= 0) {
      if (mirrorAxes) {
        const mAx = mirrorByNaviAxis[id];
        const mirrorNote = mAx
          ? ` Mirror観察（${mirrorMonthLabel}）: 変容余地=${mAx.potential_level}${mAx.summary ? `「${mAx.summary}」` : ''}`
          : ` Mirror観察なし（この軸は写真分析対象外）`;
        return `- ${label}: ケア済み申告: 現状${v.current || 1}/${v.ideal || 3}。${mirrorNote}`;
      } else {
        return `- ${label}: ケア済み申告: 現状${v.current || 1}/${v.ideal || 3} ※写真による観察データなし。外見の評価は行わないこと`;
      }
    }
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

  // 過去の行動×結果の記録をテキスト化（step_outcomesが空の場合はスキップ）
  const pastOutcomesSection = (() => {
    const blocks = pastOutcomes
      .map(snap => {
        const outcomes = Array.isArray(snap.step_outcomes) ? snap.step_outcomes : [];
        if (!outcomes.length) return null;
        const lines = outcomes.map(o => {
          const done = o.done ? '完了' : '未完了';
          const mc = o.mirror_change === true  ? '・Mirror変化あり'
            : o.mirror_change === false ? '・Mirror変化なし'
            : '';
          const note = o.note ? `「${o.note}」` : '';
          return `  - ${o.step_id || '?'}（${o.axis || '?'}軸）: ${done}${mc}${note}`;
        }).filter(Boolean).join('\n');
        return lines ? `【${snap.year_month}】\n${lines}` : null;
      })
      .filter(Boolean);
    return blocks.length ? blocks.join('\n\n') : null;
  })();

  const bodyDataSectionHeader = mirrorAxes
    ? '## 現状把握データ（本人申告）'
    : '## 現状把握データ（本人申告のみ・写真による確認なし）';

  const userContext = `## ユーザーの変容軸データ
${axisLines || '（データなし）'}

${bodyDataSectionHeader}
${bodyDataLines || '（まだ入力なし）'}

## 予算・ゴール・きっかけ
- 予算志向: ${BUDGET_LABELS[budget] || '不明'}
- 変容ゴール: ${goalSceneText}
${triggerType ? `- 変容のきっかけ: ${triggerType}` : ''}${mirrorDataLines ? `

## Fineme Mirror 写真分析データ（最新セッション）
写真から直接観察された変容余地データ。体型・外見のリアルな現状を反映。
${mirrorDataLines}` : ''}${pastOutcomesSection ? `

## 過去の変容記録（行動×結果）
このユーザーの過去の取り組みデータ。効いたアプローチ・継続できた習慣を今月のステップ選びに活かすこと。
${pastOutcomesSection}` : ''}`;

  const modeRules = mirrorAxes ? `
## ⚠️ 外見評価のルール（Mirror撮影済み）
- 外見の状態評価（「整っている」「きれいな」「透明感がある」「清潔感がある」等）は、
  「Fineme Mirror 写真分析データ」の観察テキストに根拠がある場合のみ許可
- potential_level=低 の軸にのみ「すでに良い状態のため維持を」のような表現可
- Mirrorデータに記載のない軸への外見評価は、最優先ルールと同様に禁止

## Mirror分析データの活用ルール
「Fineme Mirror 写真分析データ」が提供されている場合は以下のルールに従う。
- 変容余地「高」の軸：その軸のステップを早めに配置し、より具体的・熱量の高い文章で書く
- 変容余地「低」（すでに整っている）の軸：維持ステップのみ1〜2件に絞り、称賛として書く
- このデータは写真から直接観察された情報なので、ユーザーの自己申告より優先度が高い
- Mirror軸とNavi軸の対応: eyebrow→eyebrow, skin→skin, hair→hair, body→body, fashion→fashion, posture→body
` : `
## ⚠️ 外見評価の追加禁止ルール（Mirror未撮影・最優先）
Mirrorデータが提供されていないため、以下を厳守すること：
- 外見の状態評価を一切出力しない：「整っている」「きれいな」「透明感がある」「すっきりしている」
  「清潔感がある」「良い状態」等、外見を評価するすべての表現が禁止
- 「ケア済み申告」の軸でも外見状態は不明。写真がなければ実態はわからない
- 書いてよいのは「行動（何をするか）」のみ。「外見状態（どう見えるか）」は書いてはいけない
`;

  const genderLabel = diagnosis?.gender === 'female' ? '女性' : '男性';
  const systemPrompt = `あなたは「変容の旅コンシェルジュ」です。
恋愛・外見に悩む${genderLabel}ユーザーの診断データをもとに、この人専用の変容ステップリストを生成してください。

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
${modeRules}
## ⚠️ 自走行動ルール（最優先・外部サービス誘導の排除）
このステップリストは「今日から一人でできる自走ロードマップ」です。
ユーザーが求めているのは「サービス紹介」ではなく「自分でコツコツできることの整理と継続支援」です。

action_type別の制約:
- quick: 完全に自力でできる行動のみ。「サロンに行く」「カウンセリングを予約する」「サービスを申し込む」等の外部サービス誘導は禁止
- habit: 自宅でできる習慣行動。外部サービスへの言及は禁止
- ongoing: 専門家サービスの利用を含めてよい唯一のaction_type。ただし「検索する」「Webで探す」等のナビゲーション表現は禁止

guide別の制約:
- none/LOW: 自力で完全にできる内容。外部サービスへの言及は禁止
- MID: 「プロのアドバイスがあると精度が上がる」程度の言及はよいが、具体的なサービス名・URLは禁止
- HIGH: 専門家サービスの利用を推奨してよい（ただしURLは禁止）

ステップテキストの基本方針:
- ステップの70%以上は guide:none（自力で完全にできる）にすること
- 「道具が必要なら何を・どこで・いくらで手に入るか」を含める（ドラッグストア・100円ショップ等）
- URLは一切記載しない（/search・/mypage等のFineme内URLも含めて禁止）
- 「Finemeで確認する」「サイトをチェックする」等のナビゲーション表現は禁止

## 生成ルール

1. ステップは変容の旅の**一本の道**として25〜35件生成する
2. 異なる軸を自然に混在させる（同じ軸を3回以上連続させない）
3. このユーザーのデータから判断して不要・無関係なステップは省く
   例: ひげが薄い人に医療ヒゲ脱毛の高コストステップは不要
   例: すでにプロ通い中の軸に入門ステップは不要
   例: 変容済みの軸は維持ステップのみ1〜2件に絞る
   例: ケア済み申告（gap=0）の軸でMirrorデータがない場合は、今月は省いてよい
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
   - Mirrorデータがある場合: 変容余地「高」の軸のステップを特に序盤に優先配置する
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
11. eval_type（月次振り返り判定タイプ）:
    - action = 自分でやったかどうかで確認できるステップ（行動実績のみ）
    - mirror = 次のMirror撮影で外見変化を確認するステップ
    - both = 行動実績とMirror変化の両方で確認するステップ（多くの継続型ステップ）
    hairremoval / teeth / nail 軸は必ず "action" にすること
12. 「過去の変容記録」が提供されている場合:
    - 「完了・Mirror変化あり」のステップと同じ軸・アプローチは積極的に継続・発展させる
    - 「未完了」が続いているステップは、難易度を下げたバリエーションに差し替えるか省く
    - 「完了・Mirror変化なし」のステップは、同じアプローチを繰り返さず別の切り口で提案する
${baselineAxes.length ? `13. 以下の軸は「基礎習慣チェックリスト」が別途UIから提供される。
    この軸について「現状把握・道具購入・最低限の頻度習慣の開始」系のステップは省略し、
    製品選択・記録・プロ活用・比較・継続改善 のレベルから生成すること: ${baselineAxes.join('・')}` : ''}

${BRAND_PHILOSOPHY}
※上記の思想はステップ文（text）の言葉選び・温度にのみ効かせる。最優先ルール（提供データ外の身体的特性に言及しない）と生成ルール・並び順・JSON構造は一切変えない。

## 出力形式（JSONのみ・コードブロック不要）
{"steps":[{"id":"eyebrow-001","axis":"eyebrow","eval_type":"both","text":"...","action_type":"quick","guide":"none","hint":"..."},{"id":"hair-001","axis":"hair","eval_type":"action","text":"...","action_type":"quick","guide":"none"},...]}'`;

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
    // コードフェンス（```json...```）を除去してからJSONを抽出
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    generated = JSON.parse(jsonMatch ? jsonMatch[0] : stripped);
    if (!Array.isArray(generated?.steps) || generated.steps.length === 0) {
      throw new Error('steps配列が空または不正');
    }
    // eval_type の後処理: hairremoval/teeth/nail は強制 action、未設定は both
    const FORCE_ACTION_AXES = new Set(['hairremoval', 'teeth', 'nail']);
    for (const step of generated.steps) {
      if (FORCE_ACTION_AXES.has(step.axis)) step.eval_type = 'action';
      else if (!step.eval_type) step.eval_type = 'both';
    }
  } catch (e) {
    console.error('Claude navi-steps error:', e);
    return Response.json({ error: `Claude error: ${e.message}` }, { status: 500 });
  }

  // スナップショット：上書き前に現月のデータを保存（既存月は無視）
  try {
    const existingSteps = profile?.navi_steps;
    if (existingSteps?.generated_at) {
      const snapMonth = String(existingSteps.generated_at).slice(0, 7); // 'YYYY-MM'
      await supabase.from('navi_snapshots').upsert(
        {
          user_id: user.id,
          year_month: snapMonth,
          navi_steps: existingSteps,
          axis_progress: profile?.axis_progress ?? null,
          mirror_session_id: mirrorSessionId ?? null,
        },
        { onConflict: 'user_id,year_month', ignoreDuplicates: true }
      );
    }
  } catch (e) {
    console.warn('navi_snapshots snapshot failed (non-fatal):', e);
  }

  const navi_steps = {
    steps: generated.steps,
    generated_at: new Date().toISOString(),
    diagnosis_at: derivedDiagnosis?.at || null,
    source: !mirror_only ? 'diagnosis_only' : derivedDiagnosis?.at ? 'diagnosis_mirror' : 'mirror_only',
  };

  const { error: saveError } = await supabase
    .from('profiles')
    .update({ navi_steps })
    .eq('id', user.id);

  if (saveError) return Response.json({ error: saveError.message }, { status: 500 });
  return Response.json({ ok: true, navi_steps });
}
