// POST /api/admin/affiliates/auto-fill
// サービス名（＋任意でサービスURL）からAIがFinemeの各フィールドを自動生成
import Anthropic from '@anthropic-ai/sdk';

const ADMIN_KEY = process.env.ADMIN_API_KEY || process.env.UPLOAD_API_KEY || '';

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

  const systemPrompt = `あなたは外見磨きサービスポータル「Fineme」の掲載情報作成アシスタントです。
与えられたサービス名（および可能であればサイト内容）から、Finemeのアフィリエイト掲載に必要な各フィールドの内容を生成してください。

Finemeは「恋愛に悩む男性向けの外見磨きサービス」のポータルサイトです。
ユーザーは「変わりたい男性」で、Me Scan（診断）→ New Me Navi（ロードマップ）という旅を通じてサービスと出会います。
全ての文章は「外見を起点に自信を再設計する男性のための変容の旅」というコンセプトに沿った表現で書いてください。

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

main_category（以下から必ず1つ選択）:
gym / eyebrow / hair / esthetic / fashion / photo / consulting / makeup / nail / hairremoval / whitening / orthodontics / marriage / diagnosis / aga

catchphrase（20〜40文字）:
変わりたい30代男性に刺さるコピー。「あなた」に語りかける形で。

description（100〜200文字）:
サービスの概要。何ができるか、どんなプロセスか。

target_desc（改行区切りで3〜5項目、各20文字以内）:
こんな方に向いています、の箇条書き。

philosophy（50〜100文字）:
このサービスが大切にしていること・理念。引用文スタイルで。

guide_message（50〜100文字）:
変容の旅を始めようとしている男性への一言。ガイドとしての温かいメッセージ。

unique_strengths（50〜120文字）:
他サービスとの違い・このサービスだけの強み。

ideal_client_desc（80〜150文字）:
よく来るお客様の状況・背景。具体的な人物像で。

client_before_state（80〜150文字）:
利用前の典型的な状態・悩み。

transformation_pattern（80〜150文字）:
利用後によく起きる変化のパターン。

best_fit_desc（80〜150文字）:
特に向いている人・状況。

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
