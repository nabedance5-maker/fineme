// GET /api/cron/note-draft
// 毎週水曜9時JST（0時UTC水曜）にAIがnote記事ドラフトを1本書いてオーナーへメール
// Schedule: "0 0 * * 3"
// メールにHTML整形済み記事 + アイキャッチ画像を添付 → コピペですぐ投稿できる
import Anthropic from '@anthropic-ai/sdk';
import { fetchAgentMemory, withMemory } from '@/lib/agent-memory';
import { BRAND_PHILOSOPHY } from '@/lib/brand-philosophy';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const BASE_URL = 'https://www.fineme.me';

const TOPICS = [
  '「清潔感がない」と言われる男性が最初に直すべき1か所',
  'マッチングアプリでマッチしない原因は写真の"どこ"にあるか',
  '垢抜けには順番がある — 何から始めれば最短で印象が変わるか',
  '眉を整えるだけで顔の印象が激変する理由と、失敗しない始め方',
  '自己肯定感は外見から上げられる — 鏡の前で誇れる自分の作り方',
  'ジム・美容院・眉サロン…お金をかける前に知るべき優先順位',
  '元・モテなかった僕が現役モデルになるまでに変えた7つのこと',
  'AIに自分の写真を分析させたら、変わるべき場所が一瞬で分かった話',
];

async function generateNote(topic) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const baseSystem = `あなたはFineme代表「でお」（note名義「抜けアドバイザー」）。元・非モテ→現役モデル。一人称は「僕」。

【この文章の根本的な立場（最重要）】
「尊敬している先輩（読者）に向かって、自分の失敗と成功体験を交えながら、人生が少し良くなるヒントを熱心に共有する後輩」として書く。

先生でも専門家でもない。

読者を上に置く。

知識を配るのではなく、体験を共有する。

読者が最後に「なるほど」ではなく「ちょっとやってみようかな」で終わる記事を書く！

【文末ルール（絶対厳守）】
・すべての文末は「！」か「？」で終わる
・「。」は1記事で最大3個まで。それ以外は「！」か「？」に置き換える
・NG：「〜することが大切です。」→ OK：「〜が大事なんですよ！」
・NG：「〜です。」→ OK：「〜です！」「〜なんです！」「〜なんですよ！」

【改行ルール（絶対厳守）】
・1センテンス＝1行。必ず改行する。2センテンスを同じ行に続けない
・段落の間は必ず空行を入れる
・短い文を連続させてリズムを作る

【会話リズムの例（この呼吸感を再現する）】
でもね！

実は違うんですよ！

なんでかというと。

〜なんです！

【文体の7原則】
1. 後輩目線：「僕も昔そうだったんですよ」「僕も悩んでいました」の流れ。先生・専門家として教えない
2. 読者を上に置く：「先輩、実はこんなことがあったんですよ！」の話し方。断定していても押しつけにならない
3. 失敗を材料にする：成功談より失敗談。モテなかった・ダサかった・遠回りした。恥としてではなく材料として使う
4. 提案型で書く：命令しない。「こういう考え方もあると思うんです！」「〜してみませんか？」
5. 会話リズム：句読点ではなく呼吸が見える。短い文を積み重ねてテンポを作る
6. 熱量は自分に向ける：「お前誰やねん(笑)」のように自己突っ込みで自分をいじる。読者を攻撃しない
7. 応援文体：読者に「あ、自分も変われるかもしれない！」と思わせることがゴール。ノウハウより感情が残る

【絶対禁止】
・「。」で文を終わらせる（1記事最大3個。それ以外はすべて「！」か「？」）
・教科書的文体：「〜することが大切です」「〜が重要です」「〜を心がけましょう」
・上から目線・先生目線・専門家口調
・長い段落（3文以上を同じ段落に入れない）

【構成】問いかけの導入（読者に問いかけ）→ 共感（読者の痛み）→ 本質（順番・考え方）→ 具体的な一歩 → 自然なCTA
【CTA】記事末に Me Scan（${BASE_URL}/diagnosis）か Fineme Mirror（${BASE_URL}/lp/mirror）への自然な導線を1つ。押し売りしない。
【長さ】1800〜2600字。見出し（##）を3〜5個使う。
【出力形式】
1行目: # {タイトル}
2行目: 空行
3行目以降: 本文（Markdownで見出し##, 段落, **太字** を使う）
前置き・説明文は不要。記事のみ出力。

【文体サンプル（このスタイル・呼吸感を必ず守る）】
以下は正しい文体の例。これと同じリズム・句読点の使い方で書くこと。

---
あなたは今、自分の外見に自信がありますか？

100点満点で言うと何点ですか？

正直に答えてみてください！

20歳頃の僕は、たぶん20点くらいでした(笑)

モテない。

服もダサい。

鏡を見るたびに「なんか違う」って思うのに、何を変えればいいかわからない。

でもね！

実は、そこで止まっている人がほとんどなんですよ！

「変わりたい」って気持ちはある。

でも「どこから始めればいいか」がわからない。

だから動けない。

これ、ものすごくもったいないんですよ！

友達に聞いてみたことがある人、いますか？

「俺ってどこが変だと思う？」って。

「別に普通じゃん」って言われませんでしたか？(笑)

悪気はないんですよ！

でも、それじゃ何も変わらないんです！

正直に言います。

友達はあなたの外見の欠点を教えてくれません。

なぜなら、傷つけたくないから。

だから「大丈夫だよ」って言う。

でも大丈夫じゃなかったりするんですよね(笑)
---

上の例のように：「！」で終わる文が大多数・1センテンス1行・空行で余白・読者への問いかけ・自己突っ込み(笑)・短文の連続でリズムを作る。これを必ず守ること。

${BRAND_PHILOSOPHY}
※思想は記事の根っこに流れる温度として効かせる。上の文体ルール（後輩目線・「！」文末・短文リズム）は引き続き厳守する。`;

  const memory = await fetchAgentMemory();
  const system = withMemory(baseSystem, memory);

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    temperature: 0.9,
    system,
    messages: [{ role: 'user', content: `今週のnote記事テーマ：「${topic}」\nこのテーマで、最後まで読まれて行動につながる記事を1本書いてください。` }],
  });
  return msg.content?.[0]?.text?.trim() || null;
}

// Markdownをメール用HTMLに変換（<h1><h2><p>でレンダリング）
function mdToHtml(md) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#1d4ed8">$1</a>');

  const blocks = md.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
  return blocks.map(block => {
    const lines = block.split('\n');
    const first = lines[0];

    if (first.startsWith('# ')) {
      return `<h1 style="font-size:26px;font-weight:800;color:#111;line-height:1.4;margin:0 0 24px;letter-spacing:-0.01em">${inline(first.slice(2))}</h1>`;
    }
    if (first.startsWith('## ')) {
      return `<h2 style="font-size:20px;font-weight:700;color:#111;margin:36px 0 10px;padding-bottom:8px;border-bottom:2px solid #f0ede6">${inline(first.slice(3))}</h2>`;
    }
    if (first.startsWith('### ')) {
      return `<h3 style="font-size:16px;font-weight:700;color:#1a1a1a;margin:24px 0 6px">${inline(first.slice(4))}</h3>`;
    }

    const text = lines.map(l => inline(l)).join('<br>');
    return `<p style="margin:0 0 18px;line-height:1.95;color:#222;font-size:15px">${text}</p>`;
  }).join('\n');
}

// 記事からタイトル行を抽出し、{ title, body } を返す
function parseArticle(raw) {
  const lines = raw.split('\n');
  let title = '';
  let bodyStart = 0;

  // # タイトル 形式
  if (lines[0].startsWith('# ')) {
    title = lines[0].slice(2).trim();
    bodyStart = lines[1]?.trim() === '' ? 2 : 1;
  }
  // タイトル：〜 形式（旧フォーマット対応）
  else if (lines[0].startsWith('タイトル：') || lines[0].startsWith('タイトル:')) {
    title = lines[0].replace(/^タイトル[：:]/, '').trim();
    bodyStart = lines[1]?.trim() === '' ? 2 : 1;
  }

  const body = lines.slice(bodyStart).join('\n').trim();
  return { title, body };
}

// note アイキャッチ画像を取得して base64 化
async function fetchNoteCover(title) {
  try {
    const url = `${BASE_URL}/api/og/note-cover?title=${encodeURIComponent(title)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString('base64');
  } catch (e) {
    console.error('[note-draft] cover image error:', e.message);
    return null;
  }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const week = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (7 * 86400000));
  const topic = TOPICS[week % TOPICS.length];

  try {
    const raw = await generateNote(topic);
    if (!raw) return Response.json({ error: 'no article generated' }, { status: 500 });

    const { title, body } = parseArticle(raw);
    const displayTitle = title || topic;
    const bodyHtml = mdToHtml(body || raw);
    const coverBase64 = await fetchNoteCover(displayTitle);

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const coverNote = coverBase64
        ? '<p style="margin:0 0 4px;font-size:13px;color:#059669;font-weight:700">✅ アイキャッチ画像 → 添付ファイル（note-cover.png）を保存してアップロード</p>'
        : '<p style="margin:0 0 4px;font-size:13px;color:#dc2626">⚠️ アイキャッチ画像の生成に失敗しました。手動で用意してください。</p>';

      const html = `
        <div style="font-family:sans-serif;max-width:680px;margin:0 auto">

          <h2 style="color:#111;font-size:20px;margin:0 0 4px">📝 今週のnote記事ドラフト</h2>
          <p style="color:#666;font-size:13px;margin:0 0 20px">テーマ：${topic}</p>

          <!-- 投稿手順 -->
          <div style="background:#fefce8;border:1px solid #fbbf24;border-radius:10px;padding:16px 20px;margin:0 0 24px">
            <p style="font-size:14px;font-weight:700;color:#92400e;margin:0 0 10px">📋 投稿手順（3ステップ）</p>
            ${coverNote}
            <p style="margin:0 0 4px;font-size:13px;color:#333">② タイトルをコピー → noteのタイトル欄に貼り付け</p>
            <p style="margin:0;font-size:13px;color:#333">③ 下の本文をコピー → note本文欄に貼り付け → 公開</p>
          </div>

          <!-- タイトル -->
          <p style="font-size:13px;font-weight:700;color:#555;margin:0 0 6px">① タイトル（コピーして貼り付け）</p>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin:0 0 24px;font-size:18px;font-weight:700;color:#0f172a;line-height:1.4">
            ${displayTitle.replace(/</g, '&lt;')}
          </div>

          <!-- 本文 -->
          <p style="font-size:13px;font-weight:700;color:#555;margin:0 0 6px">③ 本文（コピーして貼り付け）</p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:28px 32px;margin:0 0 20px">
            ${bodyHtml}
          </div>

          <!-- 確認事項 -->
          <p style="font-size:12px;color:#999;margin:0">
            ※ 本文末のリンクが <strong>${BASE_URL}/diagnosis</strong> または <strong>${BASE_URL}/lp/mirror</strong> になっているか確認を。
          </p>
        </div>
      `;

      const payload = {
        from: 'Fineme note <noreply@fineme.me>',
        to: OWNER_EMAIL,
        subject: `【Fineme note】${displayTitle}`,
        html,
      };
      if (coverBase64) {
        payload.attachments = [{ filename: 'note-cover.png', content: coverBase64 }];
      }
      await resend.emails.send(payload);
    }

    console.log(`[note-draft] Sent. title="${displayTitle}"`);
    return Response.json({ success: true, topic, title: displayTitle });
  } catch (e) {
    console.error('[note-draft] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
