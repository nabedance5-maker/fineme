// POST /api/mirror/analyze
// 写真をClaude Visionで分析し、変容余地マップを生成
// 写真はサーバーに保存しない。分析結果（テキスト）のみSupabaseに保存。
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';

export const maxDuration = 60;

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const SYSTEM_PROMPT = `あなたは、外見の変容可能性を温かく・誠実に分析する専門家です。
Fineme（外見を起点に自信を再設計するサービス）の「New Me Mirror」機能として機能します。

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
      "compass_action": "Me Scan診断のCompassと紐付けて、最初の一手として何をすべきかを1文で。"
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
「低」= すでに整っている（称賛すべき点として伝える）`;

export async function POST(request) {
  try {
    const { photo_base64, media_type, user_id } = await request.json();

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

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type, data: photo_base64 },
          },
          {
            type: 'text',
            text: 'この写真を分析して、New Me Mirror の変容余地マップをJSON形式で出力してください。',
          },
        ],
      }],
    });

    const raw = message.content[0]?.text?.trim() || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    if (!analysis.axes || !Array.isArray(analysis.axes)) {
      return Response.json({ error: '分析結果の形式が不正です。もう一度試してください。' }, { status: 500 });
    }

    // 写真は保存せず、分析結果（テキスト）のみ保存
    const { data: session, error: dbError } = await supabase
      .from('mirror_sessions')
      .insert({
        user_id: user_id || null,
        analysis,
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('mirror_sessions insert error:', dbError);
      return Response.json({ error: 'セッション保存エラー' }, { status: 500 });
    }

    return Response.json({ session_id: session.id, analysis });
  } catch (e) {
    console.error('mirror analyze error:', e);
    return Response.json({ error: `分析エラー: ${e.message}` }, { status: 500 });
  }
}
