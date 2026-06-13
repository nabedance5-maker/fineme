// GET /api/cron/x-engage
// 週3回（月・水・金 0:00 UTC = 9:00 JST）
// 外見磨き/男磨き系の伸びている投稿にリプライ＋フォローし、でおのX存在感を高める
// Schedule: "0 0 * * 1,3,5"

import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;
const X_USER_ID = process.env.X_USER_ID;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

// OAuth 1.0a 署名
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
  };
  const allParams = { ...oauthParams, ...extraParams };
  oauthParams.oauth_signature = oauthSign(method, url, allParams, X_API_SECRET, X_ACCESS_TOKEN_SECRET);

  const headerStr = Object.keys(oauthParams)
    .filter(k => k.startsWith('oauth_'))
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(', ');
  return `OAuth ${headerStr}`;
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

async function followUser(targetUserId) {
  if (!X_USER_ID) return null;
  const url = `https://api.twitter.com/2/users/${X_USER_ID}/following`;
  const body = JSON.stringify({ target_user_id: targetUserId });
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

// web_search でトレンド投稿を探し、tweet URL と本文テキストを最大 maxCount 件返す
async function findTrendingTweets(client, maxCount = 3) {
  const queries = [
    'site:x.com 外見磨き 男磨き',
    'site:x.com メンズ美容 垢抜け',
    'site:x.com 清潔感 外見 男性',
  ];
  const results = [];

  for (const q of queries) {
    if (results.length >= maxCount) break;
    try {
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 1 }],
        messages: [{
          role: 'user',
          content: `「${q}」で検索し、最近の投稿URL（x.com/xxx/status/数字 形式）を最大2件抽出。
その投稿のテキスト内容も合わせて返す。
形式：
URL: https://x.com/xxx/status/123456
TEXT: （投稿本文）
---
URLやテキストが見つからなければ「NONE」と返す。`,
        }],
      });
      const rawText = (msg.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text || '')
        .join('\n');

      if (rawText.includes('NONE')) continue;

      const blocks = rawText.split('---').map(s => s.trim()).filter(Boolean);
      for (const block of blocks) {
        const urlMatch = block.match(/URL:\s*(https:\/\/x\.com\/\S+\/status\/(\d+))/i);
        const textMatch = block.match(/TEXT:\s*([\s\S]+)/i);
        if (urlMatch && textMatch && results.length < maxCount) {
          results.push({
            tweetId: urlMatch[2],
            tweetUrl: urlMatch[1],
            tweetText: textMatch[1].trim().slice(0, 280),
            authorHandle: urlMatch[1].split('/')[3] || '',
          });
        }
      }
    } catch (e) {
      console.error('[x-engage] search error:', e.message);
    }
  }

  return results;
}

// でおの視点でリプライ文案を生成。投稿と無関係なら 'SKIP' を返す
async function generateReply(client, tweetText) {
  if (!tweetText || tweetText.length < 10) return 'SKIP';
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `あなたは外見磨きを実践する「でお」（元・非モテ→現役モデル）のアカウント運営担当。
以下のツイートに対して、でおの視点で自然なリプライを1つ生成せよ。

ツイート内容:
${tweetText}

要件:
- 150文字以内
- 共感 or 補足 + でお自身の体験を1文
- Finemeへの誘導は厳禁
- このツイートの内容と関係ない・または返信が不自然なら「SKIP」とだけ返す
- 絵文字使用可（1〜2個まで）

出力はリプライ本文のみ（前置き不要）。`,
      }],
    });
    const text = ((msg.content || []).find(b => b.type === 'text')?.text || '').trim();
    return text || 'SKIP';
  } catch (e) {
    console.error('[x-engage] reply gen error:', e.message);
    return 'SKIP';
  }
}

async function sendReport({ replies, follows }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const replyRows = replies.map(r =>
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee"><a href="${r.tweetUrl}">${r.tweetUrl}</a></td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:#333">${r.reply}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:${r.ok ? '#16a34a' : '#dc2626'}">${r.ok ? '✅ 投稿済' : '❌ 失敗'}</td></tr>`
    ).join('');

    const followRows = follows.map(f =>
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">@${f.handle}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;color:${f.ok ? '#16a34a' : '#dc2626'}">${f.ok ? '✅ フォロー済' : '❌ 失敗'}</td></tr>`
    ).join('');

    const html = `
      <h2 style="color:#111">🤝 X エンゲージメントレポート</h2>
      <h3>リプライ (${replies.length}件)</h3>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <thead><tr><th style="text-align:left;padding:6px 8px;background:#f8f8fb">元ツイート</th><th style="text-align:left;padding:6px 8px;background:#f8f8fb">投稿したリプライ</th><th style="padding:6px 8px;background:#f8f8fb">結果</th></tr></thead>
        <tbody>${replyRows || '<tr><td colspan="3" style="padding:8px;color:#999">なし</td></tr>'}</tbody>
      </table>
      <h3 style="margin-top:24px">フォロー (${follows.length}件)</h3>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <thead><tr><th style="text-align:left;padding:6px 8px;background:#f8f8fb">アカウント</th><th style="padding:6px 8px;background:#f8f8fb">結果</th></tr></thead>
        <tbody>${followRows || '<tr><td colspan="2" style="padding:8px;color:#999">なし</td></tr>'}</tbody>
      </table>
    `;
    await resend.emails.send({
      from: 'Fineme X <noreply@fineme.me>',
      to: OWNER_EMAIL,
      subject: '【Fineme X】エンゲージメントレポート',
      html,
    });
  } catch (e) {
    console.error('[x-engage] email error:', e.message);
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // トレンド投稿を検索（最大3件）
  const tweets = await findTrendingTweets(client, 3);
  console.log(`[x-engage] found ${tweets.length} tweets`);

  const replies = [];
  const follows = [];
  let replyCount = 0;
  let followDone = false;

  for (const tweet of tweets) {
    if (replyCount >= 2) break;

    const replyText = await generateReply(client, tweet.tweetText);
    if (replyText === 'SKIP' || !replyText) {
      console.log(`[x-engage] SKIP: ${tweet.tweetUrl}`);
      continue;
    }

    let ok = false;
    try {
      await postReply(replyText, tweet.tweetId);
      ok = true;
      replyCount++;
      console.log(`[x-engage] replied to ${tweet.tweetId}`);
    } catch (e) {
      console.error(`[x-engage] reply failed: ${e.message}`);
    }

    replies.push({ tweetUrl: tweet.tweetUrl, reply: replyText, ok });

    // 最初の成功リプライ相手を1アカウントフォロー
    if (ok && !followDone && tweet.authorHandle) {
      try {
        // author handle → user id は X API v2 で取得
        const lookupUrl = `https://api.twitter.com/2/users/by/username/${tweet.authorHandle}`;
        const authH = buildOAuthHeader('GET', lookupUrl);
        const lookupRes = await fetch(lookupUrl, { headers: { Authorization: authH } });
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          const targetId = lookupData?.data?.id;
          if (targetId) {
            await followUser(targetId);
            follows.push({ handle: tweet.authorHandle, ok: true });
            followDone = true;
            console.log(`[x-engage] followed @${tweet.authorHandle}`);
          }
        }
      } catch (e) {
        console.error(`[x-engage] follow failed: ${e.message}`);
        follows.push({ handle: tweet.authorHandle, ok: false });
        followDone = true;
      }
    }
  }

  await sendReport({ replies, follows });

  return Response.json({
    replies: replies.length,
    repliesPosted: replies.filter(r => r.ok).length,
    follows: follows.filter(f => f.ok).length,
  });
}
