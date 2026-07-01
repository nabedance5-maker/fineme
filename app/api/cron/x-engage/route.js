// GET /api/cron/x-engage
// 毎日 0:00 UTC = 9:00 JST
// 恋愛系の「直近24h」投稿を X recent search で発見し、でお口調のリプ下書き＋
// いいね/フォロー候補をメールで届ける（=ドラフト支援）。
// ★自動リプ・自動フォローはしない（凍結リスク回避・self-serve API廃止のため）。
// ★$20/月ハードキャップ：_x-budget で当月コストを監視し、上限手前で縮小／停止。
// Schedule: "0 0 * * *"

import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { loadMonth, addUsage, allowedReads, estCost, MONTHLY_CAP, ALERT_AT } from '../_x-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const X_API_KEY = process.env.X_API_KEY;
const X_API_SECRET = process.env.X_API_SECRET;
const X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
const X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

// 禁止ワード（master.md §3）。リプ下書きで絶対に使わない。
const BANNED = ['外見改善', 'モテる', '非モテ', 'イケメン', 'ブサイク', '清潔感'];

// 恋愛系の悩み投稿を狙う検索クエリ（日本語・RT/リプ除外）
const SEARCH_QUERY =
  '(マッチングアプリ OR マッチアプリ OR 婚活 OR 恋愛 OR デート) (疲れた OR うまくいかない OR 自信ない OR つらい OR 緊張 OR いいね来ない) lang:ja -is:retweet -is:reply';

// 発見の取得件数（読み取り課金＝返却件数。フィルタで多くが除外されるので少し多め）。
// 60秒制限は下書きの並列生成で吸収。
const FETCH_MAX = 50;
// リプ対象は「表示回数1万以上」だけ（高リーチ投稿に絞る）。
const MIN_IMPRESSIONS = 10000;
// 表示回数が他人投稿で取得できない階層のフォールバック：いいね数で高リーチを近似。
const FALLBACK_MIN_LIKES = 50;
// 下書き生成する最大件数（60秒制限・下書き数の抑制）。
const MAX_DRAFTS = 20;

// RFC3986 厳密エンコード（OAuth 1.0a 用。!*'() も%エンコード）
function enc(str) {
  return encodeURIComponent(str).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function oauthSign(method, baseUrl, allParams) {
  const sorted = Object.keys(allParams).sort().map(k => `${enc(k)}=${enc(allParams[k])}`).join('&');
  const base = `${method}&${enc(baseUrl)}&${enc(sorted)}`;
  const signingKey = `${enc(X_API_SECRET)}&${enc(X_ACCESS_TOKEN_SECRET)}`;
  return crypto.createHmac('sha1', signingKey).update(base).digest('base64');
}

// 署名付き GET（クエリパラメータを署名に含める）
async function signedGet(baseUrl, queryParams) {
  const oauth = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };
  const all = { ...oauth, ...queryParams };
  oauth.oauth_signature = oauthSign('GET', baseUrl, all);
  const header = 'OAuth ' + Object.keys(oauth).sort()
    .map(k => `${enc(k)}="${enc(oauth[k])}"`).join(', ');
  const qs = Object.keys(queryParams).map(k => `${enc(k)}=${enc(queryParams[k])}`).join('&');
  const res = await fetch(`${baseUrl}?${qs}`, { headers: { Authorization: header } });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// recent search で直近24hの恋愛系投稿を取得（最大 maxResults 件）。返り値の各件＝1read。
async function searchRecent(maxResults) {
  const baseUrl = 'https://api.twitter.com/2/tweets/search/recent';
  const params = {
    query: SEARCH_QUERY,
    max_results: String(Math.max(10, Math.min(100, maxResults))),
    sort_order: 'relevancy', // 人気/関連度の高い投稿を上位に
    'tweet.fields': 'created_at,author_id,public_metrics',
    expansions: 'author_id',
    'user.fields': 'username,name',
  };
  const { ok, status, data } = await signedGet(baseUrl, params);
  if (!ok) {
    console.error('[x-engage] search failed', status, JSON.stringify(data).slice(0, 300));
    return { error: data?.title || `HTTP ${status}`, tweets: [], reads: 0 };
  }
  const users = {};
  (data?.includes?.users || []).forEach(u => { users[u.id] = u; });
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const tweets = (data?.data || [])
    .filter(t => t.created_at && new Date(t.created_at).getTime() >= cutoff) // 24h以内のみ
    .map(t => {
      const u = users[t.author_id] || {};
      const pm = t.public_metrics || {};
      return {
        id: t.id,
        text: t.text,
        createdAt: t.created_at,
        handle: u.username || '',
        name: u.name || '',
        url: u.username ? `https://x.com/${u.username}/status/${t.id}` : `https://x.com/i/status/${t.id}`,
        impressions: pm.impression_count ?? 0,
        likes: pm.like_count ?? 0,
        rts: pm.retweet_count ?? 0,
      };
    });
  return { tweets, reads: (data?.data || []).length }; // 課金は返却件数ベース
}

// でお口調のリプ下書き生成。無関係なら 'SKIP'。
async function draftReply(client, tweetText) {
  if (!tweetText || tweetText.length < 8) return 'SKIP';
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 220,
      messages: [{
        role: 'user',
        content: `あなたは恋愛・人間関係で悩む男性向けサービス「Fineme」運営者「でお」（元・非モテ→現役モデル）のX運用担当。
次の投稿への自然なリプライ下書きを1つ作る。

投稿:
${tweetText}

要件:
- 120文字以内・共感ファースト・でお口調（先輩感、温かい、「！」可、絵文字1個まで）
- 相手をジャッジしない／説教しない／宣伝しない／リンクなし
- 次の語は絶対に使わない: ${BANNED.join(' / ')}
- 投稿と無関係・絡むのが不自然なら「SKIP」だけ返す
出力はリプ本文のみ。`,
      }],
    });
    const text = ((msg.content || []).find(b => b.type === 'text')?.text || '').trim();
    if (!text || text === 'SKIP') return 'SKIP';
    if (BANNED.some(w => text.includes(w))) return 'SKIP'; // 念のため禁止ワード混入を弾く
    return text;
  } catch (e) {
    console.error('[x-engage] draft error:', e.message);
    return 'SKIP';
  }
}

async function sendDraftEmail({ drafts, monthRow, note }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const rows = drafts.map(d => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;color:#666">${d.createdAt}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;color:#111;white-space:nowrap">👁${(d.impressions || 0).toLocaleString()}<br>❤${(d.likes || 0).toLocaleString()} 🔁${(d.rts || 0).toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee"><a href="${d.url}">${d.url}</a><br><span style="color:#888;font-size:12px">@${d.handle}</span></td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#333">${d.text}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:#111;font-weight:600">${d.reply}</td>
      </tr>`).join('');
    const cost = estCost(monthRow);
    const html = `
      <h2 style="color:#111">📝 X 恋愛エンゲージ下書き（手動で実行してください）</h2>
      <p style="color:#555">対象=直近24hの恋愛系投稿。<b>いいね/フォロー/リプはでおが手動で。</b>自動投稿はしていません。</p>
      ${note ? `<p style="color:#b45309"><b>注記：</b>${note}</p>` : ''}
      <p style="color:#555;font-size:13px">当月X APIコスト（推定）：<b>$${cost.toFixed(2)}</b> / 上限 $${MONTHLY_CAP}（読${monthRow.reads}・投稿${monthRow.writes_plain + monthRow.writes_link}）</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead><tr>
          <th style="text-align:left;padding:8px;background:#f8f8fb">投稿時刻</th>
          <th style="text-align:left;padding:8px;background:#f8f8fb">👁表示/反応</th>
          <th style="text-align:left;padding:8px;background:#f8f8fb">投稿(URL/@)</th>
          <th style="text-align:left;padding:8px;background:#f8f8fb">本文</th>
          <th style="text-align:left;padding:8px;background:#f8f8fb">リプ下書き</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="padding:10px;color:#999">条件に該当する投稿なし</td></tr>'}</tbody>
      </table>`;
    await resend.emails.send({
      from: 'Fineme X <noreply@fineme.me>',
      to: OWNER_EMAIL,
      subject: `【Fineme X】恋愛エンゲージ下書き ${drafts.length}件（当月$${cost.toFixed(2)}）`,
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

  try {
  // ── 予算ゲート（$20ハードキャップ）＋ 60秒制限のため件数上限 ──
  const monthRow = await loadMonth();
  const budget = Math.min(allowedReads(monthRow), FETCH_MAX);
  if (budget <= 0) {
    await sendDraftEmail({ drafts: [], monthRow, note: `当月の上限（$${MONTHLY_CAP}）に達したため、今月は発見を停止しています。` });
    return Response.json({ skipped: 'budget cap reached', cost: estCost(monthRow) });
  }

  // ── 発見（残予算ぶんだけ）──
  const { tweets, reads, error } = await searchRecent(budget);
  if (reads > 0) await addUsage({ reads }); // 実読み取り件数を即計上

  if (error) {
    await sendDraftEmail({ drafts: [], monthRow, note: `検索エラー：${error}（recent searchのアクセス階層/課金設定をご確認ください）` });
    return Response.json({ error, reads });
  }

  // ── 品質フィルタ：表示回数1万以上。取れない階層なら いいね数で代替 ──
  const anyImpressions = tweets.some(t => (t.impressions || 0) > 0);
  let filterLabel;
  let targets;
  if (anyImpressions) {
    targets = tweets.filter(t => (t.impressions || 0) >= MIN_IMPRESSIONS)
                    .sort((a, b) => b.impressions - a.impressions);
    filterLabel = `表示回数 ${MIN_IMPRESSIONS.toLocaleString()}回以上`;
  } else {
    // impression が全件0＝APIが他人の表示回数を返さない → いいね数で高リーチを近似
    targets = tweets.filter(t => (t.likes || 0) >= FALLBACK_MIN_LIKES)
                    .sort((a, b) => b.likes - a.likes);
    filterLabel = `⚠️表示回数がAPIで取得できないため「いいね ${FALLBACK_MIN_LIKES}以上」で代替`;
  }
  targets = targets.slice(0, MAX_DRAFTS);

  // ── 下書き生成（投稿はしない）。並列生成で60秒制限に収める ──
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results = await Promise.all(targets.map(async (t) => {
    const reply = await draftReply(client, t.text);
    return reply === 'SKIP' ? null : { ...t, reply };
  }));
  const drafts = results.filter(Boolean);

  const after = await loadMonth();
  const costNote = estCost(after) >= ALERT_AT
    ? `⚠️ 当月コストが$${ALERT_AT}を超えました（$${estCost(after).toFixed(2)}）。上限$${MONTHLY_CAP}に近づいています。 `
    : '';
  const note = `対象条件：${filterLabel}（24h以内）。発見${tweets.length}件→該当${targets.length}件。 ${costNote}`;
  await sendDraftEmail({ drafts, monthRow: after, note });

  return Response.json({
    found: tweets.length,
    matched: targets.length,
    drafts: drafts.length,
    reads,
    filter: filterLabel,
    monthCost: estCost(after),
  });
  } catch (e) {
    // 想定外エラーでも必ずでおへ通知（サイレント失敗を防ぐ）
    console.error('[x-engage] fatal:', e?.message);
    try {
      await sendDraftEmail({ drafts: [], monthRow: await loadMonth(), note: `想定外エラー：${e?.message || e}` });
    } catch {}
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
