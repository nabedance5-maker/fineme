// POST /api/admin/affiliates/auto-fill
// サービス名（＋任意でサービスURL）からAIがFinemeの各フィールドを自動生成
import Anthropic from '@anthropic-ai/sdk';

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { service_name, service_url } = await request.json();
  if (!service_name) return Response.json({ error: 'service_name は必須です' }, { status: 400 });

  // サービスURLが提供されていればページコンテンツを取得
  let pageContent = '';
  if (service_url) {
    try {
      const res = await fetch(service_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Fineme/1.0)' },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const html = await res.text();
        pageContent = stripHtml(html);
      }
    } catch {
      // フェッチ失敗はスキップ。Claudeの学習知識で補完する。
    }
  }

  const userMessage = pageContent
    ? `サービス名: ${service_name}\n\nサービスサイトの内容（参考）:\n${pageContent}`
    : `サービス名: ${service_name}`;

  const systemPrompt = `あなたは世界水準のコピーライターであり、Fineme（外見磨きサービスポータル）の掲載情報クリエイターです。
与えられたサービス情報から、「見た瞬間に行きたくなる」「自分のことだと思う」掲載文を生成してください。

【Finemeのユーザー像】
- 30代前後の男性。恋愛・人間関係に自信がなく、「外見を変えれば何かが変わるかも」と感じている
- でも一歩が踏み出せない。「自分なんかが行っていいのか」という不安もある
- Me Scan（外見診断）→ New Me Navi（変容ロードマップ）という旅を経てこのサービスに出会う
- 求めているのは施術ではなく「新しい自分になれる許可証」

【文章の大原則】
× 避けること：事務的な説明、機能の羅列、「〜ができます」という語尾、カタログ感
○ 目指すこと：読んで胸が動く文章。変容への期待感。「自分のことだ」という共鳴。温かみと誠実さ。
- 具体的な場面・感情・変化を描く（例：「鏡を見るのが怖かった」→「初デートで自信を持って笑えた」）
- 語りかける口調（「あなたは〜」「きっと〜」「もし〜なら」）
- サービスの機能より、その先にある感情と変化を描写する

以下のJSON形式のみで返してください（コードブロックなし、JSONだけ）：
{
  "main_category": "",
  "catchphrase": "",
  "description": "",
  "target_desc": "",
  "philosophy": "",
  "guide_message": "",
  "unique_strengths": "",
  "ideal_client_desc": "",
  "client_before_state": "",
  "transformation_pattern": "",
  "best_fit_desc": "",
  "provider_style": "",
  "suitable_triggers": [],
  "handles_failure_patterns": [],
  "price_from": null
}

【各フィールドの指示】

main_category（以下の値のみ使用可・必ず1つ選択・それ以外の値は絶対に使わないこと）:
gym / eyebrow / hair / esthetic / fashion / photo / consulting / makeup / nail / hairremoval / whitening / orthodontics / marriage / diagnosis / aga
※ マッチングアプリ・婚活・結婚相談所は必ず "marriage"。"matching_app" は存在しない。

catchphrase（20〜40文字）:
変わりたい30代男性の「心の声」を代弁するコピー。「あなた」に語りかける形で、読んだ瞬間「自分のことだ」と思わせる。
× 悪い例：「プロのスタイリストによるファッション診断サービス」
○ 良い例：「その服、あなたの魅力を半分も引き出せていない」

description（100〜200文字）:
サービスを使ったあとの"景色"を描く。機能説明ではなく、ユーザーが体験する感情と変化のストーリーで書く。
× 悪い例：「プロのカウンセラーが婚活をサポートするサービスです。」
○ 良い例：「初めて会う相手に、少し自信を持って話しかけられた。そんな小さな変化が、あなたの恋愛を動かし始める。」

target_desc（改行区切りで3〜5項目、各25文字以内）:
「これ、自分だ」と思わせる共感フレーズ。状況や感情を具体的に。
× 悪い例：「外見を改善したい方」
○ 良い例：「何年も恋愛がうまくいっていない」「自分に自信が持てない」

philosophy（50〜100文字）:
このサービスの核心にある信念を、詩のような一文で。引用文スタイル。読んで「なるほど」と唸らせる深さを。

guide_message（50〜100文字）:
不安を抱えた男性の背中を、温かく優しく押す一言。「大丈夫」という安心感と「一緒に行こう」という誘い。

unique_strengths（50〜120文字）:
他のサービスと何が違うのか。数字・実績・具体的な方法論など「この場所でしか得られない理由」を明快に。

ideal_client_desc（80〜150文字）:
よく来る人の具体的な人物像。職業・年齢・状況・心理状態を織り交ぜてリアルな「あの人」を描く。

client_before_state（80〜150文字）:
来る前のリアルな悩み。「鏡を見るたびに自信をなくしていた」のような、感情が宿る具体的な描写で。

transformation_pattern（80〜150文字）:
利用後に起きた変化を、感情と行動の両面から描写。「〜するようになった」という行動変容＋その先の感情変化まで。

best_fit_desc（80〜150文字）:
「このサービスが最も力を発揮できる人・タイミング」を、共感を呼ぶ言葉で描く。

provider_style（以下から1つ）:
explanation（理由を丁寧に説明）/ consultation（相談しながら）/ delegate（任せて結果）/ cautious（小さく試す）

suitable_triggers（以下から当てはまるものを複数）:
matching_app / love / career / word / vague

handles_failure_patterns（以下から当てはまるものを複数）:
lost_direction / no_continuation / no_result / cost / awkward

price_from:
最低価格（円・整数）。不明な場合はnull。`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const raw = message.content[0]?.text?.trim() || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: `AI生成エラー: ${e.message}` }, { status: 500 });
  }
}
