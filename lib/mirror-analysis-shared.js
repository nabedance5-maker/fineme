// lib/mirror-analysis-shared.js
// app/api/mirror/analyze（無料プレビュー用の軽量呼び出し）と
// app/api/mirror/report（paid確定後のフル統合レポート呼び出し）で共有するプロンプト部品。
// 元は app/api/mirror/analyze/route.js に inline定義されていたものをそのまま移設（挙動変更なし）。
import { getSupabase } from '@/lib/supabase';

export const AXIS_CHECKLISTS = {
  eyebrow: `【眉の観察チェックリスト】以下を写真から確認し、detail・summaryに反映すること:
□ 左右の眉の高さ・形が揃っているか
□ 眉山の位置が目尻の上あたりにあるか（適切か外れているか）
□ ラインから外れた産毛・余分な毛がラインを崩していないか
□ 眉の太さ・幅が顔型に対して適切か（細すぎ/太すぎ/適切）
□ 眉頭と眉尻のバランス（スタートとエンドの位置関係）
□ 眉の密度・色（薄い部分・まばらな部分があるか）
□ 眉全体の毛の流れが整っているか`,

  skin: `【肌の観察チェックリスト】以下を写真から確認し、detail・summaryに反映すること:
□ 肌トーンの均一さ（赤み・くすみ・色ムラの有無と程度）
□ ツヤ感の状態（乾燥してパサついているか・適度なツヤか・テカリすぎか）
□ 毛穴の目立ち（特に鼻まわり・頬の状態）
□ 顔色の明暗（明るく見えるか・暗く沈んでいるか）
□ 色素沈着・ニキビ痕の有無（写真に見えるものだけ）
□ 肌のキメ感（きめ細かく見えるか・粗く見えるか）`,

  hair: `【ヘアの観察チェックリスト】以下を写真から確認し、detail・summaryに反映すること:
□ ヘアスタイルのシルエットが顔型に対して合っているか
□ トップのボリューム状態（つぶれているか・適度か・ふくらみすぎか）
□ 毛先の状態（まとまっているか・パサついているか・傷んでいるか）
□ スタイリングがされているか（セットされているか・無造作か・崩れているか）
□ 清潔感（艶・ベタつき・フケ感）
□ カラーの状態（色が活きているか・褪色・根元の伸び具合）
□ 全体のシルエットが「顔型を活かしている」か「損なっているか」`,

  expression: `【表情の観察チェックリスト】以下を写真から確認し、detail・summaryに反映すること:
□ 口角の位置（自然に上がっているか・下がっているか・横一文字か）
□ 目の開き具合と目力（大きく開いているか・細いか・力強いか）
□ 顔全体の緊張感・力みの有無
□ 第一印象として「話しかけやすい」か「近づきにくい」か
□ 全体から漂う雰囲気（柔和・自信・緊張・無表情 等）`,

  posture: `【姿勢の観察チェックリスト】以下を写真から確認し、detail・summaryに反映すること:
□ 肩の位置（左右差・前傾ぐあい・下がり具合）
□ 首の位置（前に出ていないか・まっすぐか）
□ 背中・腰のライン（丸まり・反り腰・まっすぐ）
□ 重心のバランス（片足重心か・両足均等か）
□ 全体的に「自信を感じさせる立ち方」か「自信なさそうに見えるか」`,

  body: `【体型・シルエットの観察チェックリスト】以下を写真から確認し、detail・summaryに反映すること:
□ 全体シルエットの印象（すっきり・重い・バランスよい・アンバランス）
□ 肩幅と腰幅のバランス比率
□ 縦のライン（縦長に見えるか・横に広がって見えるか）
□ 服のシルエットと体型のマッチ感`,

  fashion: `【ファッションの観察チェックリスト】以下を写真から確認し、detail・summaryに反映すること:
□ 服のサイズ感（大きすぎ・ちょうどよい・小さすぎ）
□ 肩の縫い目位置が肩骨の上に来ているか（サイズの最重要基準）
□ 全体のカラーバランス（まとまっているか・バラバラか）
□ 素材感・しわ・清潔感（きれいな状態か・くたびれているか）
□ コーデ全体の統一感・テイストの一致
□ 着ている服が体型を活かしているか・目立った弱点を作っていないか`,

  color: `【カラー・テイストの観察チェックリスト】以下を写真から確認し、detail・summaryに反映すること:
□ 肌色に対してカラーが似合っているか・浮いていないか
□ 明るい色/暗い色のバランスが全体でまとまっているか
□ カラーパレットが統一されているか・色が多すぎないか
□ テイスト（カジュアル/フォーマル/スポーティ等）が統一されているか`,

  overall: `【総合観察】全軸を踏まえ、今最も変化させると全体の印象が変わる「1軸」を特定して言及すること。`,
};

export const AGE_SKIN_CONTEXT = {
  '10s':      '10代。皮脂・ニキビ・毛穴の目立ちやすさに注目する（乾燥や老化の観点は持ち込まない）。',
  '20s':      '20代。皮脂バランスの変化や毛穴・肌荒れに注目する。',
  '30s':      '30代。乾燥・キメの粗さ・ハリの低下が出始めやすい時期という観点も踏まえる。',
  '40s':      '40代。乾燥・ハリ低下・くすみが出やすい時期という観点も踏まえる。',
  '50s_plus': '50代以上。乾燥・ハリ低下・くすみに加え、透明感の変化という観点も踏まえる。',
};

export function buildCompassInstruction(userState) {
  const selfAction = `この軸について、今日または今週中に「自宅で一人でできる」具体的な行動を1文で書く。
ルール:
- 「サロンに予約する」「カウンセリングを受ける」「サービスを申し込む」等の外部サービス誘導は禁止
- 「〜を始めましょう」等の抽象表現は禁止
- 「何を・どこで（自宅・100円ショップ・ドラッグストア等）・費用感（○○円程度）」を含める
- URLは一切記載しない
- 良い例：「今日の入浴後、眉用スクリューブラシで眉の流れを整える。ブラシは100円ショップで購入可能」
- 良い例：「洗顔後3分以内にコットンで化粧水を顔全体に馴染ませる習慣を今日から始める」`;
  if (userState === 'guest') {
    return `${selfAction}\nその後に1文だけ付け加える: 「Me Scan（無料診断）を受けると優先軸と行動ロードマップが作れます → /diagnosis」`;
  }
  if (userState === 'member') {
    return `${selfAction}\nその後に1文だけ付け加える: 「Me Scan（無料診断）を受けると、この分析と連携した行動ロードマップ『New Me Navi』が使えます → /diagnosis」`;
  }
  // diagnosed: Me Scan受診済み → 純粋な自走アクションのみ
  return selfAction;
}

export function buildDiagnosisContext(diagnosisInfo) {
  if (!diagnosisInfo) return '';
  const lines = [];
  if (diagnosisInfo.self_score != null) lines.push(`自己採点: ${diagnosisInfo.self_score}/10`);
  if (diagnosisInfo.rel_status) {
    const relMap = { crush:'気になる人がいる', active_dating:'マッチング・婚活中', want_to_meet:'出会いを増やしたい段階', self_growth:'自己成長・仕事優先' };
    lines.push(`恋愛状況: ${relMap[diagnosisInfo.rel_status] || diagnosisInfo.rel_status}`);
  }
  if (diagnosisInfo.key_scene_type) {
    const sceneMap = { romance:'好きな人・デート', career:'仕事・面接・キャリア', social:'友人・グループ', general:'特定シーンなし' };
    lines.push(`最重要シーン: ${sceneMap[diagnosisInfo.key_scene_type] || diagnosisInfo.key_scene_type}`);
  }
  if (diagnosisInfo.reference_type) {
    const refMap = { person:'特定の人・モデルがいる', category:'スタイルカテゴリがある', none_yet:'イメージなし', find_self:'自分らしさを探したい' };
    lines.push(`スタイルイメージ: ${refMap[diagnosisInfo.reference_type] || diagnosisInfo.reference_type}`);
  }
  if (diagnosisInfo.past_change_exp) {
    const pastMap = { success:'過去に変化経験あり（効果あった）', tried_no_effect:'試したが効果薄', short_term:'短期で挫折', none:'変化経験ほぼなし' };
    lines.push(`過去の経験: ${pastMap[diagnosisInfo.past_change_exp] || diagnosisInfo.past_change_exp}`);
  }
  if (lines.length === 0) return '';
  return `\n\n【ユーザー補足情報（compass_actionの優先度・表現の参考に）】\n${lines.join('\n')}`;
}

// キュレーション済みInstagram/TikTok投稿プール（New Me Mapと同じ仕組み。
// 軸の観察内容に本当に合う場合だけAIがrelated_post_idを付ける）
export async function fetchCuratedPostsPrompt(gender) {
  try {
    const supabase = getSupabase();
    const userTrack = gender === 'female' ? 'belle' : 'fineme';
    const { data: curatedPosts } = await supabase
      .from('curated_posts')
      .select('id, axis, topic_tags, target_concerns, caption')
      .eq('status', 'approved')
      .eq('is_active', true)
      .in('track', [userTrack, 'common']);
    if (!curatedPosts?.length) return '';
    const lines = curatedPosts.map(cp =>
      `- id:${cp.id} 軸:${cp.axis || '?'} トピック:${(cp.topic_tags || []).join('/')} 対象:${(cp.target_concerns || []).join('/') || '指定なし'} 内容:${cp.caption}`
    ).join('\n');
    return `\n\n## 紹介してよい投稿一覧（でお承認済み。本当に合う場合だけ使う）\n${lines}\n\n各軸の観察内容が投稿のトピック・対象と本当に合致する場合だけ、その軸のオブジェクトに\`related_post_id\`（投稿のid）を付けてよい。写真から見えていないことの根拠に投稿を使わない。合う投稿が無ければ付けない（省略またはnull）。`;
  } catch {
    return '';
  }
}
