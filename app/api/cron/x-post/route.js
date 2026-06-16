// GET /api/cron/x-post
// 毎日9時JST(0時UTC)にX（Twitter）へ自動投稿する
// Schedule: "0 0 * * *"
// 投稿タイプ: tips / story / philosophy の3種を7日サイクルでローテーション
// 全タイプ スレッド形式（本文 + リプ欄）で投稿
// リプ欄末尾に dayOfYear % 3 で diagnosis/mirror への soft CTA を挿入（1/3の確率）

import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { fetchAgentMemory, withMemory } from '@/lib/agent-memory';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;
const BASE_URL = 'https://www.fineme.me';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

async function fetchPromoImage(postType, tweetText) {
  try {
    const hook = tweetText ? tweetText.split('\n')[0].slice(0, 55) : '';
    const url = `${BASE_URL}/api/og/x-promo?type=${encodeURIComponent(postType)}&hook=${encodeURIComponent(hook)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString('base64');
  } catch (e) {
    console.error('[x-post] promo image fetch error:', e.message);
    return null;
  }
}

async function emailDailyDraft({ tweetText, threadReply, posted, postType, withImage }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const imageBase64 = withImage ? await fetchPromoImage(postType, tweetText) : null;
    const isThread = !!threadReply;
    const subject = posted
      ? `【Fineme X】本日の投稿（自動投稿済み・操作不要）${isThread ? '【スレッド】' : ''}`
      : `【Fineme X】本日の投稿（コピーして手動投稿してください）${isThread ? '【スレッド2枚】' : ''}`;
    const lead = posted
      ? 'X APIで自動投稿しました。記録用です（操作不要）。'
      : 'X APIの書き込み枠が無いため自動投稿していません。下記をコピーして @deo_fineme から投稿してください。';
    const manualNote = (!posted && isThread)
      ? '<p style="font-size:13px;color:#1d4ed8;font-weight:700">📌 スレッド投稿: ①本文を投稿 → ②自分の投稿にリプとしてリプ欄を投稿してください。</p>'
      : '';
    const imageNote = imageBase64
      ? '<p style="font-size:13px;color:#b8860b;font-weight:700">🖼 今日は画像つき推奨。添付の fineme-x.png を投稿に追加してください。</p>'
      : '<p style="font-size:12px;color:#999">※ リンクを含む投稿は、Xがリンク先のOGP画像をカード表示します。</p>';
    const replyBlock = isThread
      ? `<h3 style="color:#111;margin-top:20px">② リプ欄（スレッド続き）</h3>
         <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:18px 20px;margin:8px 0;max-width:560px;font-size:15px;color:#111;line-height:1.9;white-space:pre-line">${threadReply.replace(/</g, '&lt;')}</div>`
      : '';
    const mainLabel = isThread ? '<h3 style="color:#111">① 本文</h3>' : '';
    const html = `
      <h2 style="color:#111">📣 本日のX投稿</h2>
      <p style="color:#666;font-size:13px">${lead}</p>
      ${manualNote}
      ${mainLabel}
      <div style="background:#f8f8fb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin:8px 0;max-width:560px;font-size:15px;color:#111;line-height:1.9;white-space:pre-line">${tweetText.replace(/</g, '&lt;')}</div>
      ${replyBlock}
      ${imageNote}
    `;

    const payload = { from: 'Fineme X <noreply@fineme.me>', to: OWNER_EMAIL, subject, html };
    if (imageBase64) {
      payload.attachments = [{ filename: 'fineme-x.png', content: imageBase64 }];
    }
    await resend.emails.send(payload);
  } catch (e) {
    console.error('[x-post] email error:', e.message);
  }
}

function oauthSign(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(base).digest('base64');
}

function buildOAuthHeader(method, url, extraParams = {}) {
  const oauthParams = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: '1.0',
    ...extraParams,
  };
  const allParams = { ...oauthParams, ...extraParams };
  oauthParams.oauth_signature = oauthSign(method, url, allParams, X_API_SECRET, X_ACCESS_TOKEN_SECRET);

  const headerStr = Object.keys(oauthParams)
    .filter(k => k.startsWith('oauth_'))
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');
  return `OAuth ${headerStr}`;
}

async function postTweet(text) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text });
  const authHeader = buildOAuthHeader('POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function postReply(text, inReplyToTweetId) {
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text, reply: { in_reply_to_tweet_id: inReplyToTweetId } });
  const authHeader = buildOAuthHeader('POST', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

// 投稿タイプ（7日サイクルでローテーション）
// diagnosis/mirror は廃止。リプ欄に soft CTA として入れる
const POST_TYPES = ['tips', 'story', 'philosophy', 'tips', 'story', 'tips', 'philosophy'];

// フォールバック用静的テンプレート（AI生成失敗時のみ使用）
const PHILOSOPHY_POSTS = [
  `外見を整えることで生まれる小さな自信が、
人に優しくなれる余白をつくる。

Finemeが目指しているのは、
そういう連鎖を増やすことです。

#Fineme #外見磨き #自信`,

  `「見た目なんて関係ない」という人もいる。

でも、鏡を見て少し誇れる自分でいることは、
人と向き合う勇気に変わる。

外見は入口。変容は内側に続いていく。

#外見改善 #自己肯定感 #Fineme`,

  `変わりたいと思った瞬間が、スタートラインです。

何から始めるかより、
まず「変わろうとしている自分」を認めることが大事。

${BASE_URL}

#外見磨き #自己投資 #メンズ`,
];

const STORY_POSTS = [
  `昔、マッチングアプリで全くマッチしなかった。

「清潔感がない」と言われても、何を直せばいいか分からなかった。
眉を整えるところから始めたら、反応が変わった。

順番があるんです。
${BASE_URL}/diagnosis

#外見磨き #自己投資`,

  `元・モテなかった自分が、現役モデルになるまでにやったこと。

才能じゃない。「どこから変えるか」を間違えなかっただけ。
その地図をFinemeにしました。

${BASE_URL}/lp/mirror

#垢抜け #メンズ美容`,
];

const STORY_CONTEXTS = [
  {
    seed: '眉毛サロンに初めて行った日の帰り道',
    hint: '鏡を見るたびに何かが違う感覚。でも何が変わったのかしばらく気づかなかった',
  },
  {
    seed: '骨格診断を受けて、10年間の服選びが根本的に間違っていたと気づいた',
    hint: 'サイズじゃなく、形が問題だった。ずっと自分のせいだと思っていた',
  },
  {
    seed: '知り合いに「最近整えてる？」と言われた瞬間',
    hint: '褒め言葉なのに、なぜか気恥ずかしかった。変わることを認めるのが怖かった',
  },
  {
    seed: '美容師に初めて「どんな印象にしたいですか？」と聞かれた日',
    hint: '今まで「短く整えて」しか言ったことがなかった。自分のなりたい像を言語化したことがなかったと気づいた',
  },
  {
    seed: '服のサイズをワンサイズ落としたら「別人みたい」と言われた',
    hint: '大きめを着るのがラクだと思ってた。でも隠してたのは体型じゃなくて自信だったかもしれない',
  },
  {
    seed: '写真を撮られるのが嫌いだった頃と、今',
    hint: '集合写真は端っこか欠席してた。今は自分から撮ってもらえるようになった。何かが変わった',
  },
  {
    seed: '「男がスキンケアとか」と思ってた時期があった',
    hint: '始めてみたら3ヶ月で周りの反応が変わった。偏見を持ってたのは、変わることが怖かったからだと後から気づいた',
  },
  {
    seed: '好きな人ができて、初めて鏡をちゃんと見た日',
    hint: '恋愛のためだったけど、気づいたら「自分のために整える」に変わっていた',
  },
  {
    seed: '清潔感がないと、面と向かって言われた日',
    hint: '傷ついた。でもあの一言がなければ、何も変わっていなかった気がする',
  },
];

const TIPS_POSTS = [
  `眉毛を整えるとき、形より「毛量」を先に減らす。

毛が多いままだと、どう整えても野暮ったく見える。
まず間引いてから、形を作る順番が正解。

眉毛サロンでも最初にやることはここです。

#外見磨き #メンズ美容 #清潔感`,

  `清潔感と垢ぬけは、別の話。

清潔感 = 不快感を与えない（最低ライン）
垢ぬけ = 印象が良くなる（加点）

多くの人は垢ぬけを目指して、清潔感を飛ばしてる。
順番が逆だと、何をやっても効きにくい。

#外見磨き #メンズ #自己投資`,

  `スキンケアで最初に買うべきものは、洗顔料じゃなくて保湿剤。

洗顔は「引き算」、保湿は「土台作り」。
土台がないところに洗顔だけしても、乾燥が進むだけ。

まず保湿から始めると、他の全部が効いてくる。

#スキンケア #メンズ美容 #外見磨き`,
];

// tips 用シード（9件・3週間ユニーク）
const TIPS_CONTEXTS = [
  { topic: '眉毛の整え方', angle: '毛量を先に減らしてから形を作る順番の話' },
  { topic: '清潔感と垢ぬけの違い', angle: '清潔感は最低ライン、垢ぬけは加点。順番を間違える人が多い' },
  { topic: 'スキンケアの始め方', angle: '洗顔より保湿が先。土台なしに洗顔だけしても乾燥が進む' },
  { topic: '服のサイズ感', angle: '大きめを着てるのは実は隠してるから。ワンサイズ落とすだけで別人になれる' },
  { topic: '美容院での頼み方', angle: '「短く整えて」だけ言ってた頃、ずっと損してた' },
  { topic: '眉毛と第一印象の関係', angle: '眉毛だけで顔の印象が大きく変わるという事実' },
  { topic: '爪の清潔感', angle: '女性は男の爪を見ている。短く整えるだけで「丁寧な人」になれる' },
  { topic: 'シャンプーの正しい選び方', angle: '香りで選んでた頃、それがベタつきの原因だった' },
  { topic: '姿勢と印象の関係', angle: '姿勢は鍛えなくても意識だけで変わる。変わると関係性も変わった' },
];

// philosophy 用シード（6件・3週間ユニーク）
const PHILOSOPHY_CONTEXTS = [
  { theme: '外見を変えたら「優しくなった？」と言われた', angle: '外見が変わると自己肯定感が上がり、他人への余裕が生まれる' },
  { theme: '変わることへの恐怖', angle: '変わることを認めると、今までの自分を否定している気がして怖い' },
  { theme: '外見は入口、自信は出口', angle: '整えることは手段。でも整え続けると、それが目的になってくる' },
  { theme: '「自分には無理」と思ってた頃の話', angle: 'ただ順番を知らなかっただけだった' },
  { theme: '見られることへの慣れ方', angle: '最初は恥ずかしかった。でもいつの間にか「見てほしい」に変わっていた' },
  { theme: '変わるには順番がある', angle: 'やみくもに始めても効かない。地図が先、行動が後' },
];

function extractText(content) {
  if (!Array.isArray(content)) return '';
  const texts = content.filter(b => b.type === 'text').map(b => (b.text || '').trim()).filter(Boolean);
  if (!texts.length) return '';
  for (let i = texts.length - 1; i >= 0; i--) {
    if (texts[i].length >= 30) return texts[i];
  }
  return texts[texts.length - 1];
}

const X_SYSTEM = `あなたはFinemeのSNS担当兼コピーライター。X(@deo_fineme)はオーナー「でお」＝元・モテなかった→現役モデル、恋愛に悩む男性向け外見磨きサービスFinemeの運営者。
【ブランド】変容の旅・地図と羅針盤・誠実で前向き。点数化/他者否定/誇大表現/煽りすぎは禁止。
【強いX投稿の条件】
- 1行目で手を止めるフック（問い・意外性・具体的痛点・本音）
- 具体性のある言葉（抽象論を避ける）。共感→気づき→行動の流れ
- 1投稿1メッセージ。改行で余白を作る
- 全体120〜140字程度。ハッシュタグは2〜3個、末尾に
- 指定があればリンクを必ず本文に入れる
【厳守】ユーザーに質問・確認を返してはいけない。情報が足りなくても最も妥当な前提を自分で置き、投稿本文を必ず1本完成させる。出力は完成した投稿本文のみ（前置き・調査メモ・説明・引用符・「承知しました」等は一切不要）。`;

// 全タイプ共通のスレッド生成関数
// 返り値: { main: string, reply: string | null } | null
async function generateThreadPost(postType, context = {}, dayOfYear = 0, system = X_SYSTEM) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stratLine = context.strategy ? `\n\n【今週の方針（参考）】\n${context.strategy}` : '';
  const recentLine = (context.recentTexts?.length)
    ? `\n\n【直近投稿（言い回しを被らせない）】\n- ${context.recentTexts.slice(0, 5).join('\n- ')}`
    : '';

  // リプ欄 CTA: 1/3 → diagnosis, 1/3 → mirror, 1/3 → なし
  const ctaMod = dayOfYear % 3;
  const ctaLine = ctaMod === 1
    ? `\n\n最後の1行（ハッシュタグの直前）:\n「外見のどこから変えるかを整理したい人は→ ${BASE_URL}/diagnosis（無料・3分）」`
    : ctaMod === 2
    ? `\n\n最後の1行（ハッシュタグの直前）:\n「変われる余白を可視化したい人は→ ${BASE_URL}/lp/mirror」`
    : '';

  let mainMsg = '';
  let replyRules = '';

  if (postType === 'tips') {
    const ctx = TIPS_CONTEXTS[dayOfYear % TIPS_CONTEXTS.length];
    mainMsg = `今日の投稿は「Tips・スレッド本文」タイプです。

【テーマ】
「${ctx.topic}」

【角度】
${ctx.angle}

【フォーマット（このとおりに書く）】
1行フック（「やりがちな間違い」か「意外な事実」を1行で）

■やりがちな間違い
・具体的な行動（3〜4個）

■実は↓↓

【ルール】
- 必ず「■実は↓↓」で終わる（続きはリプ欄）
- リンクなし、ハッシュタグなし（リプ欄に入れる）
- 投稿本文のみ出力${stratLine}${recentLine}`;

    replyRules = `【リプ欄のルール】
- 「■実は」の内容: 正しいやり方を箇条書き（3〜4個、各項目に理由1文）
- 口語でテンポよく展開（「なんだよね」「だから」「でも」等）
- 結論1行${ctaLine}
- ハッシュタグ2〜3個を末尾（例: #外見磨き #メンズ美容 #清潔感）
- リプ欄本文のみ出力（前置き不要）`;

  } else if (postType === 'story') {
    const ctx = STORY_CONTEXTS[dayOfYear % STORY_CONTEXTS.length];
    mainMsg = `今日の投稿は「体験談・スレッド本文」タイプです。

【素材（必ず使う）】
「${ctx.seed}」

【ヒント】
${ctx.hint}

【フォーマット（このとおりに書く）】
1行目: でおの体験を読者が自分に重ねられるフック

■変わる前の自分
・具体的な行動や思い込み（3〜4個）
・〃
・〃

■変わった後↓↓

【ルール】
- 必ず「■変わった後↓↓」で終わる（続きはリプ欄に書く）
- リンクなし、ハッシュタグなし（リプ欄に入れる）
- 投稿本文のみ出力（前置き不要）${stratLine}${recentLine}`;

    replyRules = `【リプ欄のルール】
- 「■変わった後」の箇条書き（3〜4個）
- 口語でテンポよく哲学的に展開（「なんだよね」「だから」「でも」等）
- 結論1行${ctaLine}
- ハッシュタグ2〜3個を末尾（例: #外見磨き #メンズ美容 #自己投資）
- リプ欄本文のみ出力（前置き不要）`;

  } else if (postType === 'philosophy') {
    const ctx = PHILOSOPHY_CONTEXTS[dayOfYear % PHILOSOPHY_CONTEXTS.length];
    mainMsg = `今日の投稿は「思想・スレッド本文」タイプです。

【テーマ】
「${ctx.theme}」

【角度】
${ctx.angle}

【フォーマット（このとおりに書く）】
気づきや問いかけを1〜2行のフックで始める
短い観察・事実を2〜3行

「なぜ↓↓」か「その理由は↓↓」で締める

【ルール】
- 必ず「↓↓」で終わる（続きはリプ欄）
- リンクなし、ハッシュタグなし（リプ欄に入れる）
- 投稿本文のみ出力（前置き不要）${stratLine}${recentLine}`;

    replyRules = `【リプ欄のルール】
- 本文の「↓↓」の答えを口語で展開（「なんだよね」「だから」「でも」等）
- 結論は1〜2行でシンプルに${ctaLine}
- ハッシュタグ2〜3個を末尾（例: #外見磨き #自己肯定感 #メンズ）
- リプ欄本文のみ出力（前置き不要）`;

  } else {
    return null;
  }

  // STEP 1: 本文生成
  let mainText = null;
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0.92,
      system,
      messages: [{ role: 'user', content: mainMsg }],
    });
    const text = extractText(msg.content);
    if (text && text.length >= 40) mainText = text;
    else console.warn(`[x-post] ${postType} main rejected. テンプレ使用。`);
  } catch (e) {
    console.error(`[x-post] ${postType} main gen error:`, e.message);
  }

  if (!mainText) return null;

  // STEP 2: リプ欄生成
  const replyMsg = `以下のX投稿の「リプ欄の続き」を書いてください。

【本文（投稿済み）】
${mainText}

${replyRules}`;

  let replyText = null;
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      temperature: 0.92,
      system,
      messages: [{ role: 'user', content: replyMsg }],
    });
    const text = extractText(msg.content);
    if (text && text.length >= 30) replyText = text;
  } catch (e) {
    console.error(`[x-post] ${postType} reply gen error:`, e.message);
  }

  return { main: mainText, reply: replyText };
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    return Response.json({ error: 'X API credentials not configured' }, { status: 500 });
  }

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const postType = POST_TYPES[dayOfYear % POST_TYPES.length];

  // 静的フォールバック（AI生成が失敗したとき用・単ツイート）
  let tweetText;
  if (postType === 'tips') tweetText = TIPS_POSTS[dayOfYear % TIPS_POSTS.length];
  else if (postType === 'philosophy') tweetText = PHILOSOPHY_POSTS[dayOfYear % PHILOSOPHY_POSTS.length];
  else tweetText = STORY_POSTS[dayOfYear % STORY_POSTS.length];

  // PDCA: 今週の方針と直近投稿（被り回避）を読み込む
  const sb = getSupabase();
  let strategy = null, recentTexts = [];
  try {
    const { data: stratRow } = await sb.from('sns_posts')
      .select('text').eq('channel', 'strategy')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    strategy = stratRow?.text || null;
    const { data: recent } = await sb.from('sns_posts')
      .select('text').eq('channel', 'x')
      .order('created_at', { ascending: false }).limit(8);
    recentTexts = (recent || []).map(r => r.text).filter(Boolean);
  } catch {}

  const memory = await fetchAgentMemory();
  const systemWithMemory = withMemory(X_SYSTEM, memory);

  const aiResult = await generateThreadPost(postType, { strategy, recentTexts }, dayOfYear, systemWithMemory);

  let posted = false, tweetId = null, threadReply = null;

  if (aiResult && aiResult.main) {
    // AI生成成功 → スレッド形式で投稿（本文 + リプ欄）
    tweetText = aiResult.main;
    threadReply = aiResult.reply || null;
    try {
      const mainResult = await postTweet(tweetText);
      posted = true;
      tweetId = mainResult.data?.id;
      console.log(`[x-post] posted main: ${tweetId}`);
      if (tweetId && threadReply) {
        await new Promise(r => setTimeout(r, 2000));
        const replyResult = await postReply(threadReply, tweetId);
        console.log(`[x-post] posted reply: ${replyResult.data?.id}`);
      }
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('problems/credits') || msg.includes('CreditsDepleted') || msg.includes('usage-capped')) {
        console.warn('[x-post] post skipped: X API credits depleted.');
      } else {
        console.error('[x-post] post error:', msg);
      }
    }
  } else {
    // AI生成失敗 → 静的フォールバック（単ツイート）
    try {
      const result = await postTweet(tweetText);
      posted = true;
      tweetId = result.data?.id;
      console.log(`[x-post] fallback posted: ${tweetId}`);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('problems/credits') || msg.includes('CreditsDepleted') || msg.includes('usage-capped')) {
        console.warn('[x-post] fallback post skipped: X API credits/quota depleted. メールで手動投稿用に送信。');
      } else {
        console.error('[x-post] fallback post error:', msg);
      }
    }
  }

  try {
    await sb.from('sns_posts').insert({ channel: 'x', post_type: postType, text: tweetText, posted });
  } catch {}

  const withImage = dayOfYear % 4 === 0;
  await emailDailyDraft({ tweetText, threadReply, posted, postType, withImage });

  return Response.json({ posted, emailed: !!process.env.RESEND_API_KEY, withImage, type: postType, tweetId });
}
