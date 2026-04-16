// POST /api/admin/affiliates/auto-fill
// サービス名（＋任意でサービスURL）からAIがFinemeの各フィールドを自動生成
import Anthropic from '@anthropic-ai/sdk';

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

// 簡易レートリミット（同一IPから1分間に10回まで）
const _rateMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = _rateMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60000; }
  entry.count++;
  _rateMap.set(ip, entry);
  return entry.count <= 10;
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
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) return Response.json({ error: 'Too Many Requests' }, { status: 429 });

  const { service_name, service_url, affiliate_notes } = await request.json();
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

  const notesSection = affiliate_notes
    ? `\n【⚠️ このアフィリエイトの表現規約・注意事項（必ず遵守）】\n${affiliate_notes}\n上記の規約に違反する表現は一切使用しないこと。規約に抵触しそうな表現は別の言い回しに置き換えること。\n`
    : '';

  const userMessage = pageContent
    ? `サービス名: ${service_name}${notesSection}\n\nサービスサイトの内容（参考）:\n${pageContent}`
    : `サービス名: ${service_name}${notesSection}`;

  const systemPrompt = `あなたは日本最高峰のコピーライターであり、男性の恋愛・自己変容に精通したマーケターです。
Fineme（外見変容ポータル）に掲載するアフィリエイトの紹介文を生成してください。

【絶対禁止】以下に該当する文章は生成禁止。違反した場合は書き直し。
- 「〜ができます」「〜を提供しています」等の機能説明口調
- 「プロの〜が」「専門家が」「充実したサポート」等の使い古されたフレーズ
- 同カテゴリの他サービスと入れ替えても成立する汎用的な文章
- 効果・結果の断定表現（「必ず変われます」「確実に」等）
- before/afterの数字保証（「○kg痩せる」等）

【Finemeのユーザー像（この人に刺さる文章を書け）】
彼の名前は仮に「ケンジ」としよう。32歳、営業職。
- マッチングアプリで全然マッチしない。プロフ写真を何度変えても、最後に「ごめんなさい」が来る
- 鏡を見るたびに「自分、なんか違う」と思うが、何が違うのかわからない
- 「外見を変えたい」と思いながら、「でも自分なんかが行っていいのか」と踏み出せない
- 変わることへの期待と、変われなかったときの恐怖を同時に持っている
- Me Scan（7軸外見診断）を終えて、自分の課題が「${service_name}」だとわかった。今まさにこのサービスと出会っている

【各フィールドの個性出しルール】
同カテゴリのサービスが複数ある中で、このサービス「${service_name}」だけが持つ固有の価値・雰囲気・特徴を抽出せよ。
サービス名・ブランドの個性（価格帯・アプローチ・対象者・スタイル）を文章に滲ませること。

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
※ マッチングアプリ・婚活・結婚関連サービスは必ず "marriage"。"matching_app" は存在しない。

catchphrase（20〜40文字）:
「ケンジ」が見た瞬間「これ、俺のことだ」と思うコピー。
彼の「言えなかった本音」を代弁すること。疑問形・否定形・逆説も使う。
× 「プロのスタイリストによるファッション診断」← 機能説明
× 「あなたの魅力を最大限に引き出します」← 使い古されたフレーズ
○ 「その服、3年前から変わってないだろう」← 痛いところを突く
○ 「変わりたいのに、何から始めればいいかわからなかった」← 感情の代弁

description（100〜200文字）:
このサービスを使った「その後の景色」を一枚の絵として描く。
施術の説明ゼロ。感情と場面だけで構成する。
主語は「あなた」ではなく「その日から」「あの体験の後」等で始めてもよい。

target_desc（改行区切りで4〜5項目、各30文字以内）:
「これ書いた人、俺のこと見てた？」と思わせる具体的な状況描写。
感情・行動・場面を織り交ぜる。抽象的なものは不可。
○ 「マッチングアプリで3ヶ月マッチゼロ」
○ 「写真を撮るたび、削除を繰り返している」
○ 「清潔感があると言われたことが一度もない」

philosophy（50〜100文字）:
このブランドの哲学を、詩か名言のように。「〜とは、〜だ」構文か体言止めで締める。
ブランドの個性が滲む表現にすること。

guide_message（50〜100文字）:
踏み出す前の彼の不安（「自分なんかが行っていいのか」）に応える言葉。
「大丈夫」「あなたにちょうどいい」という温度感で。命令形は使わない。

unique_strengths（50〜120文字）:
同カテゴリの他サービスとの違いを、具体的な数字・方法論・アプローチで。
「なぜこのサービスなのか」が一読で伝わること。

ideal_client_desc（80〜150文字）:
「ケンジ」のリアルな分身を描く。職業・年齢・きっかけ・心理状態を具体的に。
「よくいる人物像」ではなく「あの人」が目に浮かぶ描写で。

client_before_state（80〜150文字）:
このサービスに来る前の「ケンジ」の状態。感情・行動・思考の三層で描く。
「〜だった」の過去形。自分を責めるでもなく、諦めているわけでもない微妙な心理を捉える。

transformation_pattern（80〜150文字）:
このサービスを経て変わった「その後」。外見の変化より、それによって変わった行動・感情・関係性を描く。
「〜するようになった」「〜が怖くなくなった」等の具体的な行動変容まで。

best_fit_desc（80〜150文字）:
「今このタイミングで、このサービスが最も効く人」を描く。
ライフイベント・心理状態・変容のフェーズで絞り込む。

provider_style（以下から1つ・ブランドの雰囲気に合わせて選ぶ）:
explanation（理由を丁寧に説明・納得してから動く人向け）
consultation（相談しながら一緒に進める）
delegate（プロに全部任せて結果だけ受け取る）
cautious（まず無料・小さく試してから決める）

suitable_triggers（このサービスが効くきっかけ・複数可）:
matching_app / love / career / word / vague

handles_failure_patterns（このサービスが得意な「来た道」・複数可）:
lost_direction / no_continuation / no_result / cost / awkward

price_from:
最低価格（円・整数）。不明ならnull。無料体験があっても本来の最低価格を入れる。`;

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
