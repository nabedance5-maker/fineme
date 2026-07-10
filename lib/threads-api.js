// Threads API ヘルパー（graph.threads.net v1.0）
// すべて env gated：THREADS_ACCESS_TOKEN / THREADS_USER_ID が無ければ動かさない（既存フローは無傷）
// 投稿=コンテナ作成→publishの2段。リプは reply_to_id。分析=/{media}/insights と /{user}/threads_insights。
// 参考：https://developers.facebook.com/docs/threads

const HOST = 'https://graph.threads.net/v1.0';

export function threadsConfigured() {
  return !!(process.env.THREADS_ACCESS_TOKEN && process.env.THREADS_USER_ID);
}
export function threadsAutopostEnabled() {
  return threadsConfigured() && process.env.THREADS_AUTOPOST === '1';
}

function token() { return process.env.THREADS_ACCESS_TOKEN; }
function userId() { return process.env.THREADS_USER_ID; }

async function api(path, { method = 'GET', params = {} } = {}) {
  const url = new URL(`${HOST}/${path}`);
  const body = { ...params, access_token: token() };
  let res;
  if (method === 'GET') {
    for (const [k, v] of Object.entries(body)) if (v != null) url.searchParams.set(k, v);
    res = await fetch(url.toString(), { method: 'GET' });
  } else {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) if (v != null) form.set(k, v);
    res = await fetch(url.toString(), { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Threads API ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 1投稿（テキスト）を公開して media id を返す。replyToId があればリプとしてぶら下げる
export async function publishText(text, replyToId = null) {
  const clean = (text || '').slice(0, 500); // Threads TEXT は500字上限
  const params = { media_type: 'TEXT', text: clean };
  if (replyToId) params.reply_to_id = replyToId;
  const container = await api(`${userId()}/threads`, { method: 'POST', params });
  const creationId = container.id;
  if (!creationId) throw new Error('no creation id');
  await sleep(4000); // 反映待ち（テキストは短めでOK）
  const published = await api(`${userId()}/threads_publish`, { method: 'POST', params: { creation_id: creationId } });
  return published.id; // 公開された投稿の media id
}

// 本文→リプ①→リプ② を1本のスレッドとして公開。本文の media id を返す
export async function publishThread({ body, reply1, reply2 }) {
  const bodyId = await publishText(body);
  let lastId = bodyId;
  if (reply1) { await sleep(2000); lastId = await publishText(reply1, lastId); }
  if (reply2) { await sleep(2000); await publishText(reply2, lastId); }
  return bodyId;
}

// 投稿単位のインサイト（views/likes/replies/reposts/quotes/shares）
export async function getMediaInsights(mediaId) {
  try {
    const data = await api(`${mediaId}/insights`, {
      params: { metric: 'views,likes,replies,reposts,quotes,shares' },
    });
    const out = {};
    for (const m of data.data || []) {
      out[m.name] = m.values?.[0]?.value ?? m.total_value?.value ?? 0;
    }
    return out; // { views, likes, replies, reposts, quotes, shares }
  } catch (e) {
    console.error('[threads-api] media insights error:', e.message);
    return null;
  }
}

// アカウント単位のインサイト（views・followers_count 等）
export async function getUserInsights() {
  try {
    const data = await api(`${userId()}/threads_insights`, {
      params: { metric: 'views,likes,replies,reposts,quotes,followers_count' },
    });
    const out = {};
    for (const m of data.data || []) {
      out[m.name] = m.total_value?.value ?? m.values?.[0]?.value ?? 0;
    }
    return out;
  } catch (e) {
    console.error('[threads-api] user insights error:', e.message);
    return null;
  }
}

// 長期トークンの延長（60日→再60日）。新トークンを返す（呼び出し側で env 更新をでおに促す）
export async function refreshLongLivedToken() {
  const url = new URL(`${HOST}/refresh_access_token`);
  url.searchParams.set('grant_type', 'th_refresh_token');
  url.searchParams.set('access_token', token());
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`refresh failed ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data; // { access_token, token_type, expires_in }
}
