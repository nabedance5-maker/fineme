// POST /api/mirror/analyze
// 写真をClaude Visionで分析し、New Me Logを生成
// 写真はサーバーに保存しない。分析結果（テキスト）のみSupabaseに保存。
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';

export const maxDuration = 60;

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const AXIS_TO_SEARCH = {
  body: 'gym', eyebrow: 'eyebrow', fashion: 'fashion',
  hair: 'hair', skin: 'esthetic', teeth: 'whitening', nail: 'nail',
};

function buildCompassInstruction(userState, diagnosisInfo) {
  const actionInstruction = `この軸について、今日または今週中にできる具体的な行動を1文で書く（何を・どこで・どのくらいの費用かを含める。「〇〇を始めましょう」などの抽象表現は禁止。「〇〇プログラム」「〇〇診断」などの架空の機能名も禁止）。`;
  if (userState === 'guest') {
    return `${actionInstruction}その後に必ず以下のいずれか1つだけを付け加える（実在するURLのみ）:\n「Me Scan（無料の外見診断）で優先軸と行動ロードマップが作れます → /diagnosis」\nまたは\n「会員登録で分析結果を保存・行動ロードマップも作れます → /auth/login」`;
  }
  if (userState === 'member') {
    return `${actionInstruction}その後に必ず以下を付け加える（実在するURLのみ）:\n「Me Scan（無料診断）を受けると、この分析と連携した行動ロードマップ『New Me Navi』が使えます → /diagnosis」`;
  }
  // diagnosed: Me Scan受診済み
  const compassAxis = diagnosisInfo?.compass_first || null;
  const searchCat = compassAxis ? (AXIS_TO_SEARCH[compassAxis] || null) : null;
  const naviLine = `New Me Navi でこの軸の詳しいステップを確認できます → /mypage/navi`;
  const searchLine = searchCat ? `\nまたは「関連サービスを探す → /search?category=${searchCat}」` : '';
  return `${actionInstruction}その後に必ず以下を付け加える（実在するURLのみ）:\n「${naviLine}」${searchLine}`;
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

function buildSystemPrompt(userState, diagnosisInfo) {
  const compassInstruction = buildCompassInstruction(userState, diagnosisInfo);
  const diagnosisContext = buildDiagnosisContext(diagnosisInfo);
  return `あなたは、外見の変容可能性を温かく・誠実に分析する専門家です。
Fineme（外見を起点に自信を再設計するサービス）の「Fineme Mirror」機能として機能します。

【絶対禁止】
- 外見を点数化・ランク付けする表現（「○点」「上位○%」等）
- 否定・批判・傷つける表現（「残念ながら」「問題があります」等）
- 医学的診断（「肌荒れが深刻」「肥満」等）
- 根拠のない断定（「〜に違いない」「確実に〜」等）

【分析の本質】
「今の自分」を責めるのではなく、「変わった自分への距離」を地図として示す。
変容余地とは「努力で変えられる余白の大きさ」であり、余地が大きいほどチャンスが大きい。

【写真から読み取れる範囲のみ分析する】
- 顔写真：眉・目元・肌感・ヘア・表情・全体の雰囲気
- 全身写真：姿勢・シルエット・服装・コーデのフィット感
- 写っていないものは分析しない

以下のJSON形式のみで出力してください（コードブロックなし、JSONだけ）:
{
  "photo_type": "face" または "fullbody" または "both",
  "first_impression": "写真全体から感じる第一印象を2〜3文で。温かく・誠実に・可能性を感じさせる表現で。",
  "axes": [
    {
      "id": "eyebrow",
      "name": "眉・目元",
      "icon": "🎯",
      "potential_level": "高" または "中" または "低",
      "potential_reason": "変容余地レベルの理由を一言で（例：整えるだけで印象が激変する）",
      "summary": "この軸の現状と可能性を1〜2文で。無料プレビューとして表示される。傷つかない・前向きな表現で。",
      "detail": "より詳細な分析を3〜4文で。具体的に何がどう見えるか、どう変わり得るか。",
      "hints": [
        "具体的な改善ヒント1（何を・どこで・どのくらいの費用か）",
        "具体的な改善ヒント2",
        "具体的な改善ヒント3"
      ],
      "compass_action": "${compassInstruction}"
    }
  ],
  "overall_message": "分析全体を締めくくる、背中を押す一言。変わることへの期待感と安心感を込めて。50文字以内。"
}

【軸の選択ルール】
- 顔写真のみ：eyebrow / skin / hair / expression / overall の5軸
- 全身写真のみ：posture / body / fashion / color / overall の5軸
- 両方：全7軸（eyebrow / skin / hair / posture / body / fashion / overall）

各軸のid・nameの対応:
eyebrow → 眉・目元
skin → 肌・清潔感
hair → ヘアスタイル
expression → 表情・雰囲気
posture → 姿勢・立ち居振る舞い
body → 体型・シルエット
fashion → 服装・色・フィット
color → 色・テイスト
overall → 総合変容余地

potential_levelについて:
「高」= 少しの変化で大きく印象が変わる余地がある
「中」= 磨けば確実に向上する余地がある
「低」= すでに整っている（称賛すべき点として伝える）${diagnosisContext}`;
}

export async function POST(request) {
  try {
    const { photo_base64, media_type, user_id, user_state, diagnosis_info, ref } = await request.json();

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

    const systemPrompt = buildSystemPrompt(user_state || 'guest', diagnosis_info || null);

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
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

    // paid判定: オーナーバイパス → サブスク月1無料 → 通常（未払い）の順で評価
    let isPaidBypass = false;

    // オーナーバイパス
    const ownerEmail = process.env.OWNER_EMAIL;
    if (user_id && ownerEmail) {
      try {
        const { data: { user: authUser } } = await getSupabase().auth.admin.getUserById(user_id);
        if (authUser?.email === ownerEmail) isPaidBypass = true;
      } catch {}
    }

    // サブスク会員の月3回無料判定
    if (!isPaidBypass && user_id) {
      try {
        const { data: profile } = await getSupabase()
          .from('profiles')
          .select('subscription_status, mirror_monthly_free_count, mirror_monthly_free_month')
          .eq('id', user_id)
          .single();

        if (profile?.subscription_status === 'active') {
          const MAX_FREE = 3;
          const jst = (d) => new Date(new Date(d).getTime() + 9 * 3600000);
          const nowJST = jst(new Date());
          const currentMonth = `${nowJST.getFullYear()}-${String(nowJST.getMonth() + 1).padStart(2, '0')}`;

          const storedMonth = profile.mirror_monthly_free_month;
          const storedCount = storedMonth === currentMonth ? (profile.mirror_monthly_free_count || 0) : 0;

          if (storedCount < MAX_FREE) {
            isPaidBypass = true;
            await getSupabase()
              .from('profiles')
              .update({
                mirror_monthly_free_count: storedCount + 1,
                mirror_monthly_free_month: currentMonth,
              })
              .eq('id', user_id);
          }
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

    // 写真は保存せず、分析結果（テキスト）のみ保存
    const { data: session, error: dbError } = await supabase
      .from('mirror_sessions')
      .insert({
        user_id: user_id || null,
        analysis,
        paid: isPaidBypass,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('mirror_sessions insert error:', dbError);
      return Response.json({ error: 'セッション保存エラー' }, { status: 500 });
    }

    return Response.json({ session_id: session.id, analysis, paid: isPaidBypass });
  } catch (e) {
    console.error('mirror analyze error:', e);
    return Response.json({ error: `分析エラー: ${e.message}` }, { status: 500 });
  }
}
