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
import { BRAND_PHILOSOPHY } from '@/lib/brand-philosophy';
import { loadMonth, addUsage, canWrite, MONTHLY_CAP } from '../_x-budget';

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

// フォールバック用静的テンプレート（AI生成失敗時のみ使用・理想型の見本）
const PHILOSOPHY_POSTS = [
  `女の子が喜ぶLINE ランキング

3位：即レスしすぎない（余裕が伝わる）
2位：相手の言葉を拾う（見てくれてる）
1位：観察から出た一言

褒め言葉の連打より、
「ちゃんと見てる」が伝わる一言が刺さる。

保存しておいて。`,

  `デートで冷める男の言動 ランキング

3位：店で店員に横柄
2位：自分語りが止まらない
1位：予定を全部相手に合わせる

追う男ほど、女の子は冷める。
余裕は「合わせすぎない」に出る。

保存しておいて。`,

  `女の子が惚れる瞬間 ランキング

3位：本音をポロっと見せた時
2位：本性を見抜かれた感覚になった時
1位：手が届きそうで、届かない時

手に入った瞬間に冷める。
これが女の子の本音。

保存しておいて。`,
];

// 断定持論タイプの主張シード（seed=言い切りの核 / hint=補足）
const STORY_CONTEXTS = [
  { seed: '追う男ほど女の子は冷める', hint: '好意より、余裕のなさが漏れた瞬間にアウト。追わない=興味がないではない' },
  { seed: '女の子は「好きバレ」で冷めるんじゃない、必死感で冷める', hint: '好意は見せていい。ただし引ける男だけが刺さる' },
  { seed: '返信の速さより「余白」で好意は伝わる', hint: '即レスの連投は重い。間を怖がらない男に女の子は反応する' },
  { seed: '第一印象は顔じゃなく「清潔感の下地」で決まる', hint: '眉・髪・肌・爪。ここが整うだけで顔の評価まで上がる' },
  { seed: '体型が変わると、顔まで変わって見える', hint: '体脂肪を落とすとフェイスラインが出る。外見投資で一番コスパが高い' },
  { seed: '会話が続かない男は「質問」してる、続く男は「決めつけ」てる', hint: '「〜でしょ」は見透かされた感覚を作る。ありきたりな質問攻めは逆効果' },
  { seed: 'モテる男は「好意の出し方」が上手いだけ', hint: '隠すのではなく小出し。気にかけるが追わない・媚びない' },
  { seed: '自分磨きを「顔」から始める男は伸びない', hint: '順番がある。土台（体・清潔感・姿勢）が先、細部は後' },
];

const TIPS_POSTS = [
  `モテない男は「好意の出し方」で一発でバレる。

■非モテな男
・早々に「好きです」（重い）
・毎日LINE（必死感）
・機嫌を伺う（余裕がない）
・自分語りが長い（聞いてない）

好意がバレて冷めるんじゃない。
余裕のなさが漏れた瞬間にアウト。

保存しておいて。`,

  `会話が続かない男は「質問」してる。
続く男は「決めつけ」てる。

■非モテな男
・「休日なにしてるの？」
・「好きな食べ物は？」
・質問→回答→また質問

■モテる男
・「たぶん一人の時間好きでしょ」
・観察から出た一言で刺す

女の子は見透かされた感覚に弱い。
保存しておいて。`,
];

const STORY_POSTS = [
  `体脂肪率15%以上の男は、正直もったいない。

体脂肪を落とすだけで、
・フェイスラインが出る
・服が映える
・「痩せた？」と言われる
・異性の反応が変わる

整形でも美容でもなく、
体脂肪を落とすだけで外見は変わる。

これが外見投資で一番コスパが高い理由。
保存しておいて。`,

  `追う男ほど、女の子は冷める。

好意は見せていい。
でも「必死さ」が漏れた瞬間に終わる。

女の子が欲しがるのは、
手が届きそうで届かない男。

引けない男は、好意で自滅する。
保存しておいて。`,
];

// 対比型シード（topic=対比の題材 / angle=切り口）
const TIPS_CONTEXTS = [
  { topic: 'LINEの返し方', angle: '非モテは即レス連投・質問攻め。モテる男は余白と間で好意を伝える' },
  { topic: 'デートの誘い方', angle: '非モテは「いつ空いてる？」と丸投げ。モテる男は日程と店まで用意して逃げ道も残す' },
  { topic: '好意の出し方', angle: '非モテは一気に全部出す。モテる男は小出し＋引ける' },
  { topic: '会話の広げ方', angle: '非モテは質問攻め。モテる男は決めつけと自己開示で温度を上げる' },
  { topic: '店選び', angle: '非モテは高い店で盛る。モテる男は会話しやすい距離と居心地で選ぶ' },
  { topic: '第一印象の作り方', angle: '非モテは服から。モテる男は眉・髪・肌の清潔感の下地から' },
  { topic: '余裕の見せ方', angle: '非モテは必死さが漏れる。モテる男は追わない・媚びない・でも気にかける' },
  { topic: 'ボディの優先順位', angle: '非モテは筋肉を盛る。モテる男はまず体脂肪を落として輪郭を出す' },
  { topic: '自己開示の順番', angle: '非モテは自分語りが長い。モテる男は相手に話させて要所で刺す' },
];

// ランキング/女性心理型シード（theme=ランキングの主題 / angle=切り口）
const PHILOSOPHY_CONTEXTS = [
  { theme: '女の子が喜ぶLINE', angle: '褒め連打より「見てくれてる」が伝わる一言が刺さる' },
  { theme: '女の子の性欲スイッチが入る言葉', angle: '決めつけ・観察から出た一言・沈黙を埋めない余裕' },
  { theme: 'デートで好感度が上がる行動', angle: '会えた瞬間・別れ際のもう一押しなど、細部が効く' },
  { theme: '女の子が冷める男の言動', angle: '必死感・自分語り・機嫌伺い・追いすぎ' },
  { theme: 'モテる見た目の要素', angle: '体脂肪・眉・髪・清潔感の下地。顔より土台' },
  { theme: '女の子が惚れる瞬間', angle: '手が届きそうで届かない・本性を見抜かれた感覚' },
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

const X_SYSTEM = `あなたは「でお」＝元・非モテ→現役モデルの、恋愛戦略・モテ発信者（X: @deo_fineme）。男性向けに、女性心理・モテ・デート・LINE・自分磨き・外見（ボディメイク/眉/髪/服）の「持論・あるある・ノウハウ」をバズる形で発信する。
【狙う型（重要）】高インプレを取る恋愛戦略アカウントの型に寄せる。
- 1行目で強いフック（断定・意外な事実・痛点・「〜な男はオワコン」級の言い切り）
- ■見出し＋箇条書き／ランキング（%）／「■非モテ vs ■モテる」対比 など、保存したくなるリスト形式
- 具体的・実用的（そのまま使える）。抽象論・きれいごとにしない
- 断定・持論でOK（例:「女の子はね、〜が大好きなんだよ」「余裕のなさが漏れた瞬間にアウト」）。ただし人格否定・差別・過度に性的/下品は避ける
【トーン】実践者の先輩感。歯切れよく言い切る。共感で終わらせず一歩踏み込む。
【禁止ワード】Xでは適用しない（モテ/非モテ 等は使ってよい）。
【厳守】質問・確認を返さない。前提を自分で置き、投稿本文を必ず完成させる。出力は投稿本文のみ（前置き・説明・引用符・「承知しました」等は不要）。`;

// 全タイプ共通のスレッド生成関数
// 返り値: { main: string, reply: string | null } | null
async function generateThreadPost(postType, context = {}, dayOfYear = 0, system = X_SYSTEM) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stratLine = context.strategy ? `\n\n【今週の方針（参考）】\n${context.strategy}` : '';
  const recentLine = (context.recentTexts?.length)
    ? `\n\n【直近投稿（言い回しを被らせない）】\n- ${context.recentTexts.slice(0, 5).join('\n- ')}`
    : '';

  // リプ欄 CTA（リンク）は週1回のみ（月曜UTC）。コスト：リンク投稿$0.20 → 週1で月~$0.8に抑制。
  // 他の曜日はリンクなし（$0.015）。
  const isLinkDay = new Date().getUTCDay() === 1; // 月曜のみリンク
  const ctaLine = isLinkDay
    ? `\n\n最後の1行（ハッシュタグの直前）:\n「自分の最初の一手が1つだけ分かる→ ${BASE_URL}/diagnosis?src=x_deo」`
    : '';

  let mainMsg = '';
  let replyRules = '';

  if (postType === 'tips') {
    const ctx = TIPS_CONTEXTS[dayOfYear % TIPS_CONTEXTS.length];
    mainMsg = `今日は「非モテ vs モテる 対比」タイプ。

【テーマ】「${ctx.topic}」
【角度】${ctx.angle}

【フォーマット（このとおり）】
強いフック1行（断定・痛点）

■非モテな男
・ダメな具体行動（4個・短く）

■モテる男↓↓

【ルール】
- 必ず「■モテる男↓↓」で終わる（続きはリプ欄）
- リンク・ハッシュタグなし（本文）
- 投稿本文のみ出力${stratLine}${recentLine}`;

    replyRules = `【リプ欄】
- 「■モテる男」を箇条書き（4個・各に短い理由や具体セリフ）
- 本質を突く断定の結論1〜2行（「〜が漏れた瞬間にアウト」級）
- 最後に「保存しておいて」${ctaLine}
- リプ欄本文のみ出力（前置き不要・ハッシュタグは付けても1〜2個まで）`;

  } else if (postType === 'story') {
    const ctx = STORY_CONTEXTS[dayOfYear % STORY_CONTEXTS.length];
    mainMsg = `今日は「断定・持論」タイプ。

【主張の核（必ず使う）】「${ctx.seed}」
【補足】${ctx.hint}

【フォーマット（このとおり）】
言い切りフック1行（「〜な男はオワコン」「女の子はね、〜なんだよ」級）

理由/内訳を箇条書き（3〜4個・具体）

■なぜか↓↓

【ルール】
- 必ず「↓↓」で終わる（続きはリプ欄）
- リンク・ハッシュタグなし（本文）
- 投稿本文のみ出力（前置き不要）${stratLine}${recentLine}`;

    replyRules = `【リプ欄】
- 主張の根拠を持論で展開（口語・歯切れよく・「なんだよね」「だから」）
- 一番刺さる結論1〜2行
- 最後に「保存しておいて」${ctaLine}
- リプ欄本文のみ出力（前置き不要・ハッシュタグは付けても1〜2個まで）`;

  } else if (postType === 'philosophy') {
    const ctx = PHILOSOPHY_CONTEXTS[dayOfYear % PHILOSOPHY_CONTEXTS.length];
    mainMsg = `今日は「ランキング/女性心理」タイプ。

【テーマ】「${ctx.theme}」
【角度】${ctx.angle}

【フォーマット（このとおり）】
フック1行（「実は"言葉"で入る」級の意外性）

■${ctx.theme}ランキング
・下位〜中位を4個ほど（それぞれ%と一言）

1位↓↓

【ルール】
- 必ず「1位↓↓」で終わる（続きはリプ欄）
- %はそれっぽい数字でよい。リンク・ハッシュタグなし（本文）
- 投稿本文のみ出力（前置き不要）${stratLine}${recentLine}`;

    replyRules = `【リプ欄】
- 1位（%）＋なぜ効くのかの持論2〜3行（女性心理の言語化・言い切り）
- 最後に「保存しておいて」${ctaLine}
- リプ欄本文のみ出力（前置き不要・ハッシュタグは付けても1〜2個まで）`;

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

  // ── 予算ゲート（$20ハードキャップ）：投稿1本ぶんの余地が無ければ投稿せずメール下書きのみ ──
  const monthRow = await loadMonth();
  const budgetOk = canWrite(monthRow, { withLink: new Date().getUTCDay() === 1 });
  if (!budgetOk) {
    console.warn(`[x-post] 予算上限($${MONTHLY_CAP})到達のため投稿スキップ。メール下書きのみ。`);
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
  let wPlain = 0, wLink = 0; // 当回の書き込み計上用
  const hasLink = (s) => /https?:\/\//.test(s || '');

  if (!budgetOk) {
    // 予算上限：投稿しない。下書き生成だけ行いメール送信へ。
    if (aiResult && aiResult.main) { tweetText = aiResult.main; threadReply = aiResult.reply || null; }
  } else if (aiResult && aiResult.main) {
    // AI生成成功 → スレッド形式で投稿（本文 + リプ欄）
    tweetText = aiResult.main;
    threadReply = aiResult.reply || null;
    try {
      const mainResult = await postTweet(tweetText);
      posted = true;
      tweetId = mainResult.data?.id;
      hasLink(tweetText) ? wLink++ : wPlain++;
      console.log(`[x-post] posted main: ${tweetId}`);
      if (tweetId && threadReply) {
        await new Promise(r => setTimeout(r, 2000));
        const replyResult = await postReply(threadReply, tweetId);
        hasLink(threadReply) ? wLink++ : wPlain++;
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
  } else if (budgetOk) {
    // AI生成失敗 → 静的フォールバック（単ツイート）
    try {
      const result = await postTweet(tweetText);
      posted = true;
      tweetId = result.data?.id;
      hasLink(tweetText) ? wLink++ : wPlain++;
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

  // 実際に投稿した書き込みぶんを当月コストへ計上
  if (wPlain > 0 || wLink > 0) await addUsage({ writes_plain: wPlain, writes_link: wLink });

  try {
    await sb.from('sns_posts').insert({ channel: 'x', post_type: postType, text: tweetText, posted });
  } catch {}

  const withImage = dayOfYear % 4 === 0;
  await emailDailyDraft({ tweetText, threadReply, posted, postType, withImage });

  return Response.json({ posted, emailed: !!process.env.RESEND_API_KEY, withImage, type: postType, tweetId });
}
