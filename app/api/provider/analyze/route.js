// POST /api/provider/analyze
// 掲載者プロフィールの全テキストをClaudeが読み取り、ai_match_profileを生成・保存する
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 掲載者のプロフィール全文を取得
  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .select(`
      id, name, catchphrase, philosophy, guide_message, unique_strengths,
      target_desc, ideal_client_desc, client_before_state,
      transformation_pattern, best_fit_desc, description
    `)
    .eq('email', user.email)
    .single();

  if (providerError) {
    console.error('Provider fetch error:', providerError);
    return Response.json({ error: `DB error: ${providerError.message}` }, { status: 500 });
  }
  if (!provider) {
    return Response.json({ error: 'Provider not found' }, { status: 404 });
  }

  // サービス内容も取得
  const { data: services } = await supabase
    .from('provider_services')
    .select('name, transformation_promise, before_text, after_text, benefit_list')
    .eq('provider_id', provider.id);

  // プロフィール全文を結合してClaudeに渡すテキストを作成
  const profileText = [
    provider.catchphrase    ? `【キャッチコピー】${provider.catchphrase}` : '',
    provider.philosophy     ? `【理念・想い】${provider.philosophy}` : '',
    provider.guide_message  ? `【ガイドメッセージ】${provider.guide_message}` : '',
    provider.unique_strengths ? `【強み・特徴】${provider.unique_strengths}` : '',
    provider.target_desc    ? `【ターゲット説明】${provider.target_desc}` : '',
    provider.ideal_client_desc ? `【よく来るお客様の状況・背景】${provider.ideal_client_desc}` : '',
    provider.client_before_state ? `【来る前の典型的な状態】${provider.client_before_state}` : '',
    provider.transformation_pattern ? `【よく起きる変化のパターン】${provider.transformation_pattern}` : '',
    provider.best_fit_desc  ? `【特に向いている人・状況】${provider.best_fit_desc}` : '',
    provider.description    ? `【サービス概要】${provider.description}` : '',
    ...(services || []).map(s => [
      s.name ? `【サービス名】${s.name}` : '',
      s.transformation_promise ? `【変容の約束】${s.transformation_promise}` : '',
      s.before_text ? `【Before】${s.before_text}` : '',
      s.after_text  ? `【After】${s.after_text}` : '',
      (s.benefit_list?.length) ? `【特徴】${s.benefit_list.join('、')}` : '',
    ].filter(Boolean).join('\n')),
  ].filter(Boolean).join('\n\n');

  if (profileText.trim().length < 30) {
    return Response.json({ error: 'プロフィールの記載が少なすぎます。まずプロフィールを充実させてください。' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `あなたは外見磨きサービスのマッチングシステムのアナリストです。
掲載者（美容院、ジム、エステ、骨格診断等のサービス提供者）のプロフィールテキストを読み、
どんなユーザーとマッチするかを構造化データとして抽出してください。

以下のJSON形式で返してください（コードブロックなし、JSONのみ）：
{
  "suitable_triggers": [],
  "handles_failure_patterns": [],
  "target_axes": [],
  "goal_alignment": [],
  "personality_tags": [],
  "summary": ""
}

各フィールドの説明と選択肢：

suitable_triggers（このサービスが向いているきっかけ・動機 — 当てはまるものを複数選択）:
- "matching_app" = マッチングアプリを使っている・始めようとしている
- "love" = 好きな人がいる・告白・デートを控えている
- "career" = 就職・転職・昇進を控えている
- "word" = 誰かの一言で外見が気になり始めた
- "vague" = 以前からなんとなく外見を変えたいと思っていた

handles_failure_patterns（過去に挫折・失敗した経験への対応力 — 当てはまるものを複数）:
- "lost_direction" = 以前やっていたが疎かになった（再開タイプ）
- "no_continuation" = 始めたが続かなかった（継続タイプ）
- "no_result" = やっているが客観的な評価を受けたことがない
- "cost" = コストで断念した経験がある
- "awkward" = プロとの関係性（話しにくい・委ねにくい）で悩んだ

target_axes（対応できる変容軸 — 当てはまるものを複数）:
- "body" = 体型・ボディ・筋肉
- "eyebrow" = 眉毛
- "fashion" = 服・コーデ・スタイリング
- "hair" = 髪・ヘアスタイル
- "skin" = 肌・エステ・フェイシャル
- "teeth" = 歯・ホワイトニング・矯正
- "nail" = ネイル

goal_alignment（ユーザーのゴールとの親和性 — 自由に3〜6語で）:
例: ["恋愛", "マッチングアプリ成功", "自己肯定感向上", "婚活", "就活", "清潔感アップ"]

personality_tags（このサービスに向いているユーザーの特徴 — 自由に3〜5語で）:
例: ["初めての方歓迎", "再スタート支援", "忙しい人向け", "本気で変わりたい人向け", "丁寧なサポート希望者"]

summary（このサービスが誰に向いているかを1〜2文で。ユーザーに見せるための文章）:
例: "マッチングアプリを始めたばかりで外見に自信がない30代男性に向いています。過去に挫折経験があっても、一から一緒に取り組むスタイルなので安心して始められます。"`;

  let aiResult;
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: profileText }],
    });
    const raw = message.content[0]?.text?.trim() || '';
    // JSON部分だけ抽出
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    aiResult = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (e) {
    console.error('Claude analyze error:', e);
    return Response.json({ error: `Claude API error: ${e.message}` }, { status: 500 });
  }

  // ai_match_profile を保存
  const profile = {
    ...aiResult,
    analyzed_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('providers')
    .update({ ai_match_profile: profile })
    .eq('id', provider.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true, profile });
}
