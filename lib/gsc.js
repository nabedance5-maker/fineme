// Google Search Console クライアント（seo-report / seo-improve 共用）
import crypto from 'crypto';

const SITE_URL = 'sc-domain:fineme.me';

// Service Account JWT → アクセストークン
export async function getGoogleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new Error('GSC credentials not configured');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, 'base64url');
  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GSC token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

// searchAnalytics.query。rows を返す（clicks/impressions/ctr/position, keys[]）
export async function querySearchConsole(token, { startDate, endDate, dimensions, rowLimit = 25, dimensionFilterGroups } = {}) {
  const encodedSite = encodeURIComponent(SITE_URL);
  const body = { startDate, endDate, dimensions, rowLimit };
  if (dimensionFilterGroups) body.dimensionFilterGroups = dimensionFilterGroups;
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`GSC query error: ${JSON.stringify(data)}`);
  return data.rows || [];
}

// 直近N日の日付範囲（GSCは2〜3日遅延するので endは-1日）
export function dateRange(days = 28) {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const end = new Date(jst); end.setDate(end.getDate() - 1);
  const start = new Date(end); start.setDate(start.getDate() - (days - 1));
  const f = d => d.toISOString().slice(0, 10);
  return { startDate: f(start), endDate: f(end) };
}
