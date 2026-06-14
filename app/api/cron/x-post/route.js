// GET /api/cron/x-post
// 毎日9時JST(0時UTC)にX（Twitter）へ自動投稿する
// Schedule: "0 0 * * *"
// 投稿タイプを3パターンでローテーション:
//   1. 診断誘導（Me Scan → Fineme Compass）
//   2. 変容思想（外見を整えることで生まれる自信）
//   3. 記事リンク（Supabaseの公開済み記事から1本）

import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;
const BASE_URL = 'https://www.fineme.me';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

// 添付用のブランド画像を取得しbase64化（失敗時はnull）
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

// 本日のX投稿文をオーナーにメール送信（自動投稿の成否に応じて文面を出し分け／画像は時々添付）
async function emailDailyDraft({ tweetText, storyReply, posted, postType, withImage }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const imageBase64 = withImage ? await fetchPromoImage(postType, tweetText) : null;
    const isStoryThread = postType === 'story' && !!storyReply;
    const subject = posted
      ? `【Fineme X】本日の投稿（自動投稿済み・操作不要）${isStoryThread ? '【スレッド】' : ''}`
      : `【Fineme X】本日の投稿（コピーして手動投稿してください）${isStoryThread ? '【スレッド2枚】' : ''}`;
    const lead = posted
      ? 'X APIで自動投稿しました。記録用です（操作不要）。'
      : 'X APIの書き込み枠が無いため自動投稿していません。下記をコピーして @deo_fineme から投稿してください。';
    const manualNote = (!posted && isStoryThread)
      ? '<p style="font-size:13px;color:#1d4ed8;font-weight:700">📌 スレッド投稿: ①本文を投稿 → ②自分の投稿にリプとしてリプ欄を投稿してください。</p>'
      : '';
    const imageNote = imageBase64
      ? '<p style="font-size:13px;color:#b8860b;font-weight:700">🖼 今日は画像つき推奨。添付の fineme-x.png を投稿に追加してください。</p>'
      : '<p style="font-size:12px;color:#999">※ リンクを含む投稿は、Xがリンク先のOGP画像をカード表示します。</p>';
    const replyBlock = isStoryThread
      ? `<h3 style="color:#111;margin-top:20px">② リプ欄（スレッド続き）</h3>
         <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:18px 20px;margin:8px 0;max-width:560px;font-size:15px;color:#111;line-height:1.9;white-space:pre-line">${storyReply.replace(/</g, '&lt;')}</div>`
      : '';
    const mainLabel = isStoryThread ? '<h3 style="color:#111">① 本文</h3>' : '';
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

// OAuth 1.0a 署名生成
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
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
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

// 投稿タイプ（日付ベースでローテーション）。本文はAI生成、失敗時は下記テンプレにフォールバック
const POST_TYPES = ['tips', 'story', 'tips', 'philosophy', 'story', 'diagnosis', 'mirror'];

const DIAGNOSIS_POSTS = [
  `恋愛がうまくいかない理由、外見だけじゃないかもしれない。

自分の「外見タイプ」を診断すると、何から始めればいいかが見えてくる。

無料で診断できます👇
${BASE_URL}/diagnosis

#外見磨き #恋愛 #垢抜け`,

  `「何から始めればいいかわからない」

それ、診断で解決します。
外見軸・印象軸・取り組みやすさ軸で、あなた専用のロードマップをつくります。

${BASE_URL}/diagnosis

#外見改善 #メンズ美容 #自己投資`,

  `垢抜けたい男性へ。

ジム・ヘア・骨格診断・写真撮影──
どれが自分に効くかは人によって違う。

診断で優先順位がわかります。
${BASE_URL}/diagnosis

#メンズ #外見磨き #自信`,
];

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

const MIRROR_POSTS = [
  `写真1枚で、AIが「あなたの変われる余白」を地図にする。

眉・肌・ヘア・姿勢・体型・服・爪の7軸を分析。
今いちばん変わりやすい場所がわかります。

まずは無料で👇
${BASE_URL}/lp/mirror

#外見磨き #メンズ美容 #AI`,

  `「清潔感がない」と言われても、どこを直せばいいか分からない。

その"どこ"を、写真1枚からAIが特定します。
無料で7軸の概要が見れる。続きが要らなければ0円。

${BASE_URL}/lp/mirror

#垢抜け #メンズ #自己投資`,

  `自分では気づけない伸びしろを、AIが映し出す。

スコアじゃない。「今、何から変えると最も効くか」の見取り図。
写真はAI分析後に削除されます。

${BASE_URL}/lp/mirror

#外見改善 #メンズ美容 #Fineme`,
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

// 投稿タイプ別の生成方針（AI用）
function angleFor(postType, article, dayOfYear = 0) {
  switch (postType) {
    case 'tips':
      return `外見磨きの実用的な知識・Tip を1つ届ける。「なぜそうなのか」の理由を1文入れる。リンク不要。読んだだけで何か得した気分になる内容。テーマ候補（今日のWeb検索トレンドを踏まえて選ぶ）：眉毛の整え方・清潔感 vs 垢ぬけの違い・スキンケアの優先順位・服のサイズ感の見極め・ヘアスタイルと顔型・シャンプーの選び方。`;
    case 'story': {
      const ctx = STORY_CONTEXTS[dayOfYear % STORY_CONTEXTS.length];
      return `オーナー「でお」の実体験を素材に投稿を書く。素材：「${ctx.seed}」。ヒント：「${ctx.hint}」。この出来事から読者が得られる気づき・共感を中心に。最後のリンクは任意（入れるなら ${BASE_URL}/lp/mirror か ${BASE_URL}/diagnosis）。自分語りではなく「読者が自分に重ねられる」角度で書く。`;
    }
    case 'mirror':
      return `Fineme Mirror を使って「自分の変われる余白」を可視化した体験・気づきをシェアする角度で書く。「試してみたら分かった」「意外だった」という発見ベースのトーンで。必ず ${BASE_URL}/lp/mirror を入れる。押し売り・広告感は厳禁。`;
    case 'diagnosis':
      return `Me Scan（無料の外見診断・3分で自分の優先軸＝Compassが分かる）への誘導。必ず ${BASE_URL}/diagnosis を入れる。`;
    case 'philosophy':
      return `外見磨きの思想・共感（外見を起点に自信を再設計する／変わるには順番がある等）。リンク不要。純粋に「共感・気づき」だけで完結させる。`;
    default:
      return `Fineme（外見を起点に自信を再設計するサービス）の紹介。`;
  }
}

// レスポンスから「最後のまとまったテキストブロック」を取り出す（検索前の前置きを除外）
function extractText(content) {
  if (!Array.isArray(content)) return '';
  const texts = content.filter(b => b.type === 'text').map(b => (b.text || '').trim()).filter(Boolean);
  if (!texts.length) return '';
  for (let i = texts.length - 1; i >= 0; i--) {
    if (texts[i].length >= 30) return texts[i];
  }
  return texts[texts.length - 1];
}

// 質問返し・前置き・短すぎ・リンク欠落などの「弱い/不正な出力」を弾く
const QUESTION_MARKERS = ['確認させ', 'ご指示', 'どちらでしょう', 'お教えいただけ', '不明な点', '申し訳ございません', 'いただけますでしょうか', 'すればよいでしょうか', 'でしょうか？\n', '教えてください'];
function isUsableTweet(text, postType, article) {
  if (!text || text.length < 40) return false;
  if (QUESTION_MARKERS.some(m => text.includes(m))) return false;
  const needsLink = postType === 'mirror' || postType === 'diagnosis';
  if (needsLink && !text.includes('fineme.me')) return false;
  // /mirror（誤）が /lp/mirror（正）なしに使われていたら弾く
  if (text.includes('fineme.me/mirror') && !text.includes('fineme.me/lp/mirror')) return false;
  return true;
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

// story タイプ専用の生成関数（seed 強制・web_search なし・本文+リプ欄の2段生成）
// 返り値: { main: string, reply: string | null } | null
async function generateStoryTweet(context = {}, dayOfYear = 0) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const ctx = STORY_CONTEXTS[dayOfYear % STORY_CONTEXTS.length];
  const stratLine = context.strategy ? `\n\n【今週の方針（参考）】\n${context.strategy}` : '';
  const recentLine = (context.recentTexts?.length)
    ? `\n\n【直近投稿（言い回しを被らせない）】\n- ${context.recentTexts.slice(0, 5).join('\n- ')}`
    : '';

  // STEP 1: 本文（フック + 変わる前の箇条書き + ↓↓ で締める）
  const mainMsg = `今日の投稿は「体験談・スレッド本文」タイプです。

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

  let mainText = null;
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0.92,
      system: X_SYSTEM,
      messages: [{ role: 'user', content: mainMsg }],
    });
    const text = extractText(msg.content);
    if (text && text.length >= 40) mainText = text;
    else console.warn('[x-post] story main rejected, テンプレ使用。');
  } catch (e) {
    console.error('[x-post] story main gen error:', e.message);
  }

  if (!mainText) return null;

  // STEP 2: リプ欄（続き: 変わった後の箇条書き + 哲学的展開 + 結論）
  const replyMsg = `以下のX投稿の「リプ欄の続き」を書いてください。

【本文（投稿済み）】
${mainText}

【リプ欄のルール】
- 「■変わった後」の箇条書き（3〜4個）を書く
- その後、口語でテンポよく哲学的に展開（「なんだよね」「だから」「でも」等）
- 最後はシンプルな1行結論
- ハッシュタグ2〜3個を末尾に
- リプ欄本文のみ出力（前置き不要）`;

  let replyText = null;
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      temperature: 0.92,
      system: X_SYSTEM,
      messages: [{ role: 'user', content: replyMsg }],
    });
    const text = extractText(msg.content);
    if (text && text.length >= 30) replyText = text;
  } catch (e) {
    console.error('[x-post] story reply gen error:', e.message);
  }

  return { main: mainText, reply: replyText };
}

// Claudeで当日のX投稿を生成。まずWeb検索で”今のトレンド”を分析し反映（失敗時はnull）
// context = { strategy: 今週の方針, recentTexts: 直近投稿（被り回避用） }
async function generateTweet(postType, article, context = {}, dayOfYear = 0) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  // story タイプは seed 強制ルートで生成（web_search はスキップ）
  if (postType === 'story') return generateStoryTweet(context, dayOfYear);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stratLine = context.strategy ? `\n\n【今週の方針（参考・反映するが質問はしない）】\n${context.strategy}` : '';
  const recentLine = (context.recentTexts && context.recentTexts.length)
    ? `\n\n【直近の投稿（言い回し・切り口を被らせない）】\n- ${context.recentTexts.slice(0, 8).join('\n- ')}`
    : '';

  // ① Web検索つきで生成（リアルタイムのトレンド分析）
  try {
    const userMsg = postType === 'tips'
      ? `今日のテーマ：${angleFor(postType, article, dayOfYear)}

Web検索で「メンズ 外見 美容 今週 話題」を1回検索し、今週よく出ているキーワードを1つ特定する。そのキーワードに関連した「外見磨きの実用的な知識（Tip）」を1つ選び、でおの視点で投稿を1本書く。質問は返さず、投稿本文のみ出力。${stratLine}${recentLine}`
      : `今日のテーマ：${angleFor(postType, article, dayOfYear)}

Web検索で「メンズ 外見 美容 垢抜け 今週」などで検索し、今Xで具体的に話題になっている言葉・切り口を1つ特定する。その切り口をでおの視点（元・非モテ→現役モデル）で語り直した投稿を1本完成させる。トレンドをそのまま使わずでおの文脈に変換する。質問は返さず、投稿本文のみ出力。${stratLine}${recentLine}`;
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      temperature: 0.9,
      system: X_SYSTEM,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: postType === 'tips' ? 1 : 2 }],
      messages: [{ role: 'user', content: userMsg }],
    });
    const text = extractText(msg.content);
    if (isUsableTweet(text, postType, article)) return text;
    console.warn('[x-post] web_search output rejected (weak/question). fallback.');
  } catch (e) {
    console.error('[x-post] web_search generate failed, fallback:', e.message);
  }

  // ② フォールバック：Web検索なしで生成
  try {
    const userMsg = `今日のテーマ：${angleFor(postType, article, dayOfYear)}\n\nこのテーマで、いつもと言い回しが被らない強い投稿を1本「完成」させる。質問は返さず、投稿本文のみ出力。${stratLine}${recentLine}`;
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      temperature: 0.9,
      system: X_SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
    });
    const text = extractText(msg.content);
    if (isUsableTweet(text, postType, article)) return text;
    console.warn('[x-post] fallback output rejected. テンプレ使用。');
    return null;
  } catch (e) {
    console.error('[x-post] AI generate error:', e.message);
    return null;
  }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    return Response.json({ error: 'X API credentials not configured' }, { status: 500 });
  }

  // 日付ベースでタイプをローテーション（0:diagnosis / 1:philosophy / 2:article）
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const postType = POST_TYPES[dayOfYear % POST_TYPES.length];

  // 静的フォールバック（AI生成が失敗したとき用）
  let tweetText;
  if (postType === 'tips') tweetText = TIPS_POSTS[dayOfYear % TIPS_POSTS.length];
  else if (postType === 'diagnosis') tweetText = DIAGNOSIS_POSTS[dayOfYear % DIAGNOSIS_POSTS.length];
  else if (postType === 'philosophy') tweetText = PHILOSOPHY_POSTS[dayOfYear % PHILOSOPHY_POSTS.length];
  else if (postType === 'mirror') tweetText = MIRROR_POSTS[dayOfYear % MIRROR_POSTS.length];
  else if (postType === 'story') tweetText = STORY_POSTS[dayOfYear % STORY_POSTS.length];
  else tweetText = DIAGNOSIS_POSTS[0];

  // PDCA: 今週の方針（strategy）と直近投稿（被り回避）を読み込む
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

  // AI生成を優先（失敗時は上のフォールバックのまま）
  const aiResult = await generateTweet(postType, null, { strategy, recentTexts }, dayOfYear);

  let posted = false, tweetId = null, storyReply = null;

  if (postType === 'story' && aiResult && typeof aiResult === 'object' && aiResult.main) {
    // story: 本文 + リプ欄の2ツイート
    tweetText = aiResult.main;
    storyReply = aiResult.reply || null;
    try {
      const mainResult = await postTweet(tweetText);
      posted = true;
      tweetId = mainResult.data?.id;
      console.log(`[x-post] story main posted: ${tweetId}`);
      if (tweetId && storyReply) {
        await new Promise(r => setTimeout(r, 2000));
        const replyResult = await postReply(storyReply, tweetId);
        console.log(`[x-post] story reply posted: ${replyResult.data?.id}`);
      }
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('problems/credits') || msg.includes('CreditsDepleted') || msg.includes('usage-capped')) {
        console.warn('[x-post] story post skipped: X API credits depleted.');
      } else {
        console.error('[x-post] story post error:', msg);
      }
    }
  } else {
    // story 以外（or story の AI 失敗）
    if (aiResult && typeof aiResult === 'string') tweetText = aiResult;
    try {
      const result = await postTweet(tweetText);
      posted = true;
      tweetId = result.data?.id;
      console.log(`[x-post] Posted: ${tweetId}`);
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('problems/credits') || msg.includes('CreditsDepleted') || msg.includes('usage-capped')) {
        console.warn('[x-post] Auto-post skipped: X API credits/quota depleted. メールで手動投稿用に送信。');
      } else {
        console.error('[x-post] Auto-post error:', msg);
      }
    }
  }

  // 投稿ログ保存（PDCA・被り防止・振り返り材料）
  try {
    await sb.from('sns_posts').insert({ channel: 'x', post_type: postType, text: tweetText, posted });
  } catch {}

  // 成否にかかわらず本日の投稿文をオーナーにメール（手動投稿できるように）
  // 画像は3〜4回に1回（dayOfYear % 4 === 0）添付
  const withImage = dayOfYear % 4 === 0;
  await emailDailyDraft({ tweetText, storyReply, posted, postType, withImage });

  return Response.json({ posted, emailed: !!process.env.RESEND_API_KEY, withImage, type: postType, tweetId });
}
