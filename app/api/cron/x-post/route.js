// GET /api/cron/x-post
// 毎日9時JST(0時UTC)にX（Twitter）へ自動投稿する
// Schedule: "0 0 * * *"
// 投稿タイプを3パターンでローテーション:
//   1. 診断誘導（Me Scan → Fineme Compass）
//   2. 変容思想（外見を整えることで生まれる自信）
//   3. 記事リンク（Supabaseの公開済み記事から1本）

import crypto from 'crypto';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;
const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;
const BASE_URL = 'https://www.fineme.me';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

// 添付用のブランド画像を取得しbase64化（失敗時はnull）
async function fetchPromoImage(postType) {
  try {
    const res = await fetch(`${BASE_URL}/api/og/x-promo?type=${encodeURIComponent(postType)}`);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString('base64');
  } catch (e) {
    console.error('[x-post] promo image fetch error:', e.message);
    return null;
  }
}

// 本日のX投稿文をオーナーにメール送信（自動投稿の成否に応じて文面を出し分け／画像は時々添付）
async function emailDailyDraft({ tweetText, posted, postType, withImage }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const imageBase64 = withImage ? await fetchPromoImage(postType) : null;
    const subject = posted
      ? '【Fineme X】本日の投稿（自動投稿済み・操作不要）'
      : '【Fineme X】本日の投稿（コピーして手動投稿してください）';
    const lead = posted
      ? 'X APIで自動投稿しました。記録用です（操作不要）。'
      : 'X APIの書き込み枠が無いため自動投稿していません。下記をコピーして @deo_fineme から投稿してください。';
    const imageNote = imageBase64
      ? '<p style="font-size:13px;color:#b8860b;font-weight:700">🖼 今日は画像つき推奨。添付の fineme-x.png を投稿に追加してください。</p>'
      : '<p style="font-size:12px;color:#999">※ リンクを含む投稿は、Xがリンク先のOGP画像をカード表示します。</p>';
    const html = `
      <h2 style="color:#111">📣 本日のX投稿</h2>
      <p style="color:#666;font-size:13px">${lead}</p>
      <div style="background:#f8f8fb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin:16px 0;max-width:560px;font-size:15px;color:#111;line-height:1.9;white-space:pre-line">${tweetText.replace(/</g, '&lt;')}</div>
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

// 投稿タイプ別テンプレート（日付ベースでローテーション）
const POST_TYPES = ['diagnosis', 'philosophy', 'mirror', 'article'];

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
${BASE_URL}/mirror

#外見磨き #メンズ美容 #AI`,

  `「清潔感がない」と言われても、どこを直せばいいか分からない。

その"どこ"を、写真1枚からAIが特定します。
無料で7軸の概要が見れる。続きが要らなければ0円。

${BASE_URL}/mirror

#垢抜け #メンズ #自己投資`,

  `自分では気づけない伸びしろを、AIが映し出す。

スコアじゃない。「今、何から変えると最も効くか」の見取り図。
写真はAI分析後に削除されます。

${BASE_URL}/mirror

#外見改善 #メンズ美容 #Fineme`,
];

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

  let tweetText = '';

  if (postType === 'diagnosis') {
    tweetText = DIAGNOSIS_POSTS[dayOfYear % DIAGNOSIS_POSTS.length];
  } else if (postType === 'philosophy') {
    tweetText = PHILOSOPHY_POSTS[dayOfYear % PHILOSOPHY_POSTS.length];
  } else if (postType === 'mirror') {
    tweetText = MIRROR_POSTS[dayOfYear % MIRROR_POSTS.length];
  } else {
    // article: Supabaseから公開済み記事を1本取得
    const db = getSupabase();
    const { data: features } = await db
      .from('features')
      .select('slug, title')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(30);

    if (features && features.length > 0) {
      const article = features[dayOfYear % features.length];
      tweetText = `${article.title}

${BASE_URL}/feature/${article.slug}

#外見磨き #メンズ #Fineme`;
    } else {
      // 記事がなければ診断投稿にフォールバック
      tweetText = DIAGNOSIS_POSTS[0];
    }
  }

  let posted = false, tweetId = null;
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

  // 成否にかかわらず本日の投稿文をオーナーにメール（手動投稿できるように）
  // 画像は3〜4回に1回（dayOfYear % 4 === 0）添付
  const withImage = dayOfYear % 4 === 0;
  await emailDailyDraft({ tweetText, posted, postType, withImage });

  return Response.json({ posted, emailed: !!process.env.RESEND_API_KEY, withImage, type: postType, tweetId });
}
