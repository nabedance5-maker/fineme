// POST /api/mirror/analyze
// 写真をClaude Visionで分析し、New Me Logを生成
// 写真はサーバーに保存しない。分析結果（テキスト）のみSupabaseに保存。
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { BRAND_PHILOSOPHY } from '@/lib/brand-philosophy';
import {
  AXIS_CHECKLISTS, AGE_SKIN_CONTEXT,
  buildCompassInstruction, buildDiagnosisContext, fetchCuratedPostsPrompt,
} from '@/lib/mirror-analysis-shared';

export const maxDuration = 60;

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

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
    const curatedPostsPrompt = await fetchCuratedPostsPrompt(gender);

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
