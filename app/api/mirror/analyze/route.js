// POST /api/mirror/analyze
// 写真をClaude Visionで分析し、New Me Logを生成
// 写真はサーバーに保存しない。分析結果（テキスト）のみSupabaseに保存。
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { BRAND_PHILOSOPHY } from '@/lib/brand-philosophy';

export const maxDuration = 60;

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const AXIS_TO_SEARCH = {
  body: 'gym', eyebrow: 'eyebrow', fashion: 'fashion',
  hair: 'hair', skin: 'esthetic', teeth: 'whitening', nail: 'nail',
};

function buildCompassInstruction(userState) {
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

function buildDiagnosisContext(diagnosisInfo) {
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

const AXIS_CHECKLISTS = {
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

const AGE_SKIN_CONTEXT = {
  '10s':      '10代。皮脂・ニキビ・毛穴の目立ちやすさに注目する（乾燥や老化の観点は持ち込まない）。',
  '20s':      '20代。皮脂バランスの変化や毛穴・肌荒れに注目する。',
  '30s':      '30代。乾燥・キメの粗さ・ハリの低下が出始めやすい時期という観点も踏まえる。',
  '40s':      '40代。乾燥・ハリ低下・くすみが出やすい時期という観点も踏まえる。',
  '50s_plus': '50代以上。乾燥・ハリ低下・くすみに加え、透明感の変化という観点も踏まえる。',
};

function buildSystemPrompt(userState, diagnosisInfo, gender, photoTypeHint, ageBand, curatedPostsPrompt) {
  const compassInstruction = buildCompassInstruction(userState);
  const diagnosisContext = buildDiagnosisContext(diagnosisInfo);
  const genderContext = gender === 'female'
    ? '\n\n【対象ユーザー】女性の外見分析。メイク・スキンケア・ヘアスタイル・服装・ネイルを女性的な観点で分析してください。肌の印象にはメイクの仕上がりも含めて評価してください。'
    : '';
  const ageContext = AGE_SKIN_CONTEXT[ageBand]
    ? `\n\n【対象ユーザーの年代（肌の観察観点の参考。年代だけで身体的特性を断定しない）】${AGE_SKIN_CONTEXT[ageBand]}`
    : '';
  const photoTypeContext = photoTypeHint === 'face'
    ? '\n\n【アップロード写真の種類（ユーザー申告）】この写真は「顔写真」としてアップロードされました。eyebrow / skin / hair / expression / overall を中心に分析し、posture / body / fashion / color 等、全身が写っていないと判断できない軸は無理に評価しないでください。'
    : photoTypeHint === 'body'
    ? '\n\n【アップロード写真の種類（ユーザー申告）】この写真は「全身写真」としてアップロードされました。posture / body / fashion / color / hair / overall を中心に分析してください。'
    : '';
  const checklistSection = Object.entries(AXIS_CHECKLISTS)
    .map(([id, text]) => `${id}:\n${text}`)
    .join('\n\n');
  return `あなたは、外見を正確に観察し変容への具体的な道筋を示す分析の専門家です。
Fineme（外見を起点に自信を再設計するサービス）の「Fineme Mirror」機能として機能します。${genderContext}${ageContext}

【分析の原則】
- 各軸のチェックリストに基づいて写真を観察し、見えた事実をそのまま伝える（良い点も改善点も）
- 改善点は「問題がある」ではなく「ここが変わると→こう見える」という変容の視点で伝える
- 写真に写っていないこと・確認できないことは推測しない
- 点数化・ランク付けはしない（「○点」「上位○%」等は禁止）
- 医学的診断はしない（「肌荒れが深刻」「肥満」等は禁止）
- 根拠のない断定をしない（「〜に違いない」「確実に〜」等は禁止）

【各軸の観察チェックリスト】
各軸を分析する際は、以下のチェックリストを参照して観察し、具体的な根拠として detail・summary に盛り込むこと:

${checklistSection}

【summaryの書き方（最重要・無料プレビュー部分）】
- 1文目：チェックリストから読み取った最も重要な観察事実を1つ、具体的に書く
  悪い例：「目元に可能性を感じます」「印象に伸びしろがあります」
  良い例：「眉の左右の高さがやや異なり、右が少し高く見えている」「眉がラインより外に広がっていて、顔の輪郭をぼんやりとさせている」
- 2文目：それが整うとどう変わるかを1文で
  悪い例：「改善すれば印象が大きく変わるはずです」
  良い例：「形を揃えるだけで顔全体の重心が安定し、引き締まった印象に変わる」
- 励ましや曖昧な可能性表現は禁止。事実＋変容後のイメージで構成する

【detailの書き方（有料ロック解除後に表示）】
以下4点の構成で3〜4文書くこと:
1. チェックリストに基づく具体的な観察（何がどう見えるか）
2. それが現在の印象にどう影響しているか
3. 最も効果的な改善アプローチ（自宅でできることを中心に）
4. 変わった後どう見えるか

【hintsの書き方】
- hints[0]：今日自宅でできる具体的な行動（道具・費用感を含める）
- hints[1]：今週中に取り組める習慣またはステップ
- hints[2]：1ヶ月続けると出る変化・次のフェーズ
外部サービスへの誘導・URLは禁止

以下のJSON形式のみで出力してください（コードブロックなし、JSONだけ）:
{
  "photo_type": "face" または "fullbody" または "both",
  "first_impression": "写真全体から感じる第一印象を2〜3文で。チェックリストに基づいた観察を含めながら、誠実かつ変容への期待感を込めて。",
  "axes": [
    {
      "id": "eyebrow",
      "name": "眉・目元",
      "icon": "🎯",
      "potential_level": "高" または "中" または "低",
      "potential_reason": "変容余地レベルの根拠を一言で（チェックリストの観察から導いた理由）",
      "summary": "【上記summaryルール厳守】観察事実1文＋変容後イメージ1文。2文のみ。",
      "detail": "【上記detailルール厳守】観察→印象への影響→改善アプローチ→変容後イメージの4点構成で3〜4文。",
      "hints": ["今日自宅でできる行動（道具・費用感含む）", "今週中に取り組む習慣", "1ヶ月続けると出る変化"],
      "compass_action": "${compassInstruction}",
      "related_post_id": null
    }
  ],
  "overall_message": "分析全体を締めくくる一言。最も変化させるべき1軸に言及しながら、具体的に背中を押す。50文字以内。"
}

【軸の選択ルール】
- 顔写真のみ：eyebrow / skin / hair / expression / overall の5軸
- 全身写真のみ：posture / body / fashion / color / overall の5軸
- 両方：全7軸（eyebrow / skin / hair / posture / body / fashion / overall）

各軸のid・nameの対応:
eyebrow → 眉・目元 / skin → 肌・清潔感 / hair → ヘアスタイル / expression → 表情・雰囲気
posture → 姿勢・立ち居振る舞い / body → 体型・シルエット / fashion → 服装・フィット感
color → 色・テイスト / overall → 総合変容余地

potential_levelについて:
「高」= 変えると印象が大きく変わる余地がチェックリスト上で複数確認される
「中」= 磨けば確実に向上する余地が1〜2点確認される
「低」= チェックリスト項目のほとんどが整っている（称賛すべき点として伝える）${photoTypeContext}${diagnosisContext}
${curatedPostsPrompt || ''}

${BRAND_PHILOSOPHY}
※上記の思想はfirst_impression/summary/detail/overall_message等の自由記述の言葉選び・温度にのみ効かせる。JSON形式・チェックリスト観察義務・禁止事項は厳守し変更しない。`;
}

function getClientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || null;
}

function currentMonthJST() {
  const jst = new Date(Date.now() + 9 * 3600000);
  return `${jst.getFullYear()}-${String(jst.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(request) {
  try {
    const { photo_base64, media_type, user_id, user_state, diagnosis_info, ref, gender, photo_type, age_band } = await request.json();

    if (!photo_base64 || !media_type) {
      return Response.json({ error: '写真データが必要です' }, { status: 400 });
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(media_type)) {
      return Response.json({ error: '対応していない画像形式です（JPEG/PNG/WebP）' }, { status: 400 });
    }
    if (photo_base64.length > 6_000_000) {
      return Response.json({ error: '写真サイズが大きすぎます。圧縮してから再試行してください。' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // キュレーション済みInstagram/TikTok投稿プール（New Me Mapと同じ仕組み。
    // 軸の観察内容に本当に合う場合だけAIがrelated_post_idを付ける）
    let curatedPostsPrompt = '';
    try {
      const userTrack = gender === 'female' ? 'belle' : 'fineme';
      const { data: curatedPosts } = await supabase
        .from('curated_posts')
        .select('id, axis, topic_tags, target_concerns, caption')
        .eq('status', 'approved')
        .eq('is_active', true)
        .in('track', [userTrack, 'common']);
      if (curatedPosts?.length) {
        const lines = curatedPosts.map(cp =>
          `- id:${cp.id} 軸:${cp.axis || '?'} トピック:${(cp.topic_tags || []).join('/')} 対象:${(cp.target_concerns || []).join('/') || '指定なし'} 内容:${cp.caption}`
        ).join('\n');
        curatedPostsPrompt = `\n\n## 紹介してよい投稿一覧（でお承認済み。本当に合う場合だけ使う）\n${lines}\n\n各軸の観察内容が投稿のトピック・対象と本当に合致する場合だけ、その軸のオブジェクトに\`related_post_id\`（投稿のid）を付けてよい。写真から見えていないことの根拠に投稿を使わない。合う投稿が無ければ付けない（省略またはnull）。`;
      }
    } catch {}

    const systemPrompt = buildSystemPrompt(user_state || 'guest', diagnosis_info ?? null, gender || null, photo_type || null, age_band || null, curatedPostsPrompt);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type, data: photo_base64 },
          },
          {
            type: 'text',
            text: 'この写真を分析して、Fineme Mirror のNew Me LogをJSON形式で出力してください。',
          },
        ],
      }],
    });

    const raw = message.content[0]?.text?.trim() || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let analysis;
    try {
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      console.error('Mirror JSON parse error. stop_reason:', message.stop_reason, 'raw length:', raw.length);
      return Response.json({ error: '分析結果の生成に失敗しました。もう一度お試しください。' }, { status: 500 });
    }

    if (!analysis.axes || !Array.isArray(analysis.axes)) {
      return Response.json({ error: '分析結果の形式が不正です。もう一度試してください。' }, { status: 500 });
    }

    // paid判定: オーナーバイパス → サブスク月3回無料 → 月1回無料お試し（非サブスク）→ 紹介クレジット → 通常（未払い）の順で評価
    let isPaidBypass = false;
    let trialApplied = false;
    const clientIp = getClientIp(request);
    const currentMonth = currentMonthJST();

    // オーナーバイパス
    const ownerEmail = process.env.OWNER_EMAIL;
    if (user_id && ownerEmail) {
      try {
        const { data: { user: authUser } } = await getSupabase().auth.admin.getUserById(user_id);
        if (authUser?.email === ownerEmail) isPaidBypass = true;
      } catch {}
    }

    // ログイン済みユーザーのプロフィールを一度だけ取得（サブスク3回無料・月1トライアル判定の両方で使う）
    let profile = null;
    if (!isPaidBypass && user_id) {
      try {
        const { data } = await getSupabase()
          .from('profiles')
          .select('subscription_status, mirror_monthly_free_count, mirror_monthly_free_month, mirror_trial_month')
          .eq('id', user_id)
          .single();
        profile = data || null;
      } catch {}
    }

    // サブスク会員の月3回無料判定
    if (!isPaidBypass && profile?.subscription_status === 'active') {
      const MAX_FREE = 3;
      const storedMonth = profile.mirror_monthly_free_month;
      const storedCount = storedMonth === currentMonth ? (profile.mirror_monthly_free_count || 0) : 0;

      if (storedCount < MAX_FREE) {
        isPaidBypass = true;
        try {
          await getSupabase()
            .from('profiles')
            .update({
              mirror_monthly_free_count: storedCount + 1,
              mirror_monthly_free_month: currentMonth,
            })
            .eq('id', user_id);
        } catch {}
      }
    }

    // 月1回無料お試し（非サブスク・登録有無を問わず全員が対象）
    // フリーミアム化: 課金前にまるごと1回、無料で体験できるようにする
    if (!isPaidBypass && profile?.subscription_status !== 'active') {
      try {
        if (user_id) {
          // 登録済み: profiles.mirror_trial_month で判定
          if (profile?.mirror_trial_month !== currentMonth) {
            isPaidBypass = true;
            trialApplied = true;
            await getSupabase()
              .from('profiles')
              .update({ mirror_trial_month: currentMonth })
              .eq('id', user_id);
          }
        } else if (clientIp) {
          // 未登録: 同一IPからの当月お試し使用歴を mirror_sessions で確認（簡易チェック）
          const { data: priorTrial } = await getSupabase()
            .from('mirror_sessions')
            .select('id')
            .eq('client_ip', clientIp)
            .eq('trial_month', currentMonth)
            .limit(1);
          if (!priorTrial?.length) {
            isPaidBypass = true;
            trialApplied = true;
          }
        } else {
          // IPすら取得できない場合はクライアント側のlocalStorage判定に委ねて許可
          isPaidBypass = true;
          trialApplied = true;
        }
      } catch {}
    }

    // リファラル付与：被紹介者の初回分析時に、紹介者・被紹介者の双方へ無料チケット+1
    if (user_id && ref && ref !== user_id) {
      try {
        const { count: priorCount } = await getSupabase()
          .from('mirror_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user_id);
        if (!priorCount) {
          const { error: refErr } = await getSupabase()
            .from('referrals')
            .insert({ referrer_id: ref, referee_id: user_id });
          if (!refErr) {
            // UNIQUE違反でない＝初回紹介成立 → 双方+1
            await getSupabase().rpc('increment_referral_credit', { uid: ref });
            await getSupabase().rpc('increment_referral_credit', { uid: user_id });
          }
        }
      } catch {}
    }

    // リファラル無料チケット消費（サブスク無料枠で未バイパスのときのみ）
    if (!isPaidBypass && user_id) {
      try {
        const { data: prof } = await getSupabase()
          .from('profiles')
          .select('mirror_referral_credits')
          .eq('id', user_id)
          .single();
        const credits = prof?.mirror_referral_credits || 0;
        if (credits > 0) {
          isPaidBypass = true;
          await getSupabase()
            .from('profiles')
            .update({ mirror_referral_credits: credits - 1 })
            .eq('id', user_id);
        }
      } catch {}
    }

    const insertRow = {
      user_id: user_id || null,
      analysis,
      paid: isPaidBypass,
      gender: gender || null,
      age_band: age_band || null,
      photo_type: photo_type || null,
      client_ip: clientIp,
      trial_month: trialApplied ? currentMonth : null,
      photo_path: null,
    };
    let { data: session, error: dbError } = await supabase
      .from('mirror_sessions')
      .insert(insertRow)
      .select('id')
      .single();

    // 後方互換: 本番に新カラム（gender/age_band/photo_type/client_ip/trial_month/photo_path）未適用でも分析を失敗させない。
    // 該当のマイグレーションSQL適用後は通常経路でフル保存される。
    if (dbError && dbError.code === 'PGRST204') {
      let legacyRow = insertRow;
      for (const col of ['gender', 'age_band', 'photo_type', 'client_ip', 'trial_month', 'photo_path']) {
        if (new RegExp(col).test(dbError.message || '')) {
          const { [col]: _omit, ...rest } = legacyRow;
          legacyRow = rest;
        }
      }
      ({ data: session, error: dbError } = await supabase
        .from('mirror_sessions')
        .insert(legacyRow)
        .select('id')
        .single());
    }

    if (dbError) {
      console.error('mirror_sessions insert error:', dbError);
      return Response.json({ error: 'セッション保存エラー' }, { status: 500 });
    }

    // 写真をStorageに保存（ビジュアルレポート生成用。失敗しても分析結果自体はブロックしない）。
    // 未購入セッションの写真は app/api/cron/cleanup-unpaid-mirror-photos が数日で自動削除する。
    try {
      const ext = media_type === 'image/png' ? 'png' : media_type === 'image/webp' ? 'webp' : 'jpg';
      const photoPath = `${session.id}.${ext}`;
      const buffer = Buffer.from(photo_base64, 'base64');
      const { error: uploadError } = await supabase.storage
        .from('mirror-photos')
        .upload(photoPath, buffer, { contentType: media_type, upsert: true });
      if (!uploadError) {
        await supabase.from('mirror_sessions').update({ photo_path: photoPath }).eq('id', session.id);
      }
    } catch (e) {
      console.error('mirror photo upload error:', e);
    }

    return Response.json({ session_id: session.id, analysis, paid: isPaidBypass, trial_applied: trialApplied });
  } catch (e) {
    console.error('mirror analyze error:', e);
    return Response.json({ error: `分析エラー: ${e.message}` }, { status: 500 });
  }
}
