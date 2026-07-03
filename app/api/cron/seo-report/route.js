// GET /api/cron/seo-report
// 毎週月曜9時JST（0時UTC）にGoogle Search ConsoleのSEOデータをオーナーにメール送信
// Schedule: "0 0 * * 1"
import crypto from 'crypto';
import { sendLinePush } from '@/lib/line-push';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const OWNER_LINE_USER_ID = process.env.OWNER_LINE_USER_ID;
const SITE_URL = 'https://www.fineme.me/'; // URLプレフィックス型プロパティ

// Google Service Account JWT を生成してアクセストークンを取得
async function getGoogleAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) throw new Error('Google credentials not configured');

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
  if (!res.ok) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Search Console クエリ
async function querySearchConsole(token, { startDate, endDate, dimensions, rowLimit = 10 }) {
  const encodedSite = encodeURIComponent(SITE_URL);
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Search Console error: ${JSON.stringify(data)}`);
  return data.rows || [];
}

function fmt(n, dec = 0) {
  if (n === undefined || n === null) return '—';
  return Number(n).toLocaleString('ja-JP', { maximumFractionDigits: dec });
}

function diffStr(now, prev) {
  if (!prev) return '';
  const d = now - prev;
  const pct = prev > 0 ? Math.round((d / prev) * 100) : 0;
  return d >= 0 ? `（▲${pct}%）` : `（▼${Math.abs(pct)}%）`;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 今週と先週の日付範囲
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const endDate = new Date(jst); endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 6);
  const prevEndDate = new Date(startDate); prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate); prevStartDate.setDate(prevStartDate.getDate() - 6);

  const fmt8 = d => d.toISOString().slice(0, 10);
  const thisWeek = { startDate: fmt8(startDate), endDate: fmt8(endDate) };
  const lastWeek = { startDate: fmt8(prevStartDate), endDate: fmt8(prevEndDate) };

  try {
    const token = await getGoogleAccessToken();

    // 今週・先週のサマリー（全体）
    const [thisTotal, prevTotal] = await Promise.all([
      querySearchConsole(token, { ...thisWeek, dimensions: ['date'], rowLimit: 7 }),
      querySearchConsole(token, { ...lastWeek, dimensions: ['date'], rowLimit: 7 }),
    ]);

    const sumRows = rows => rows.reduce((a, r) => ({
      clicks: a.clicks + (r.clicks || 0),
      impressions: a.impressions + (r.impressions || 0),
    }), { clicks: 0, impressions: 0 });

    const thisTotals = sumRows(thisTotal);
    const prevTotals = sumRows(prevTotal);

    // トップキーワード・トップページ
    const [topQueries, topPages] = await Promise.all([
      querySearchConsole(token, { ...thisWeek, dimensions: ['query'], rowLimit: 10 }),
      querySearchConsole(token, { ...thisWeek, dimensions: ['page'], rowLimit: 10 }),
    ]);

    // メール本文（HTML）
    const qRows = topQueries.map((r, i) =>
      `<tr style="border-bottom:1px solid #eee">
        <td style="padding:8px 12px;color:#666">${i + 1}</td>
        <td style="padding:8px 12px">${r.keys?.[0] || ''}</td>
        <td style="padding:8px 12px;text-align:right">${fmt(r.impressions)}</td>
        <td style="padding:8px 12px;text-align:right">${fmt(r.clicks)}</td>
        <td style="padding:8px 12px;text-align:right">${fmt(r.position, 1)}位</td>
      </tr>`
    ).join('');

    const pRows = topPages.map((r, i) => {
      const path = (r.keys?.[0] || '').replace('https://www.fineme.me', '');
      return `<tr style="border-bottom:1px solid #eee">
        <td style="padding:8px 12px;color:#666">${i + 1}</td>
        <td style="padding:8px 12px;font-size:12px;word-break:break-all">${path || '/'}</td>
        <td style="padding:8px 12px;text-align:right">${fmt(r.impressions)}</td>
        <td style="padding:8px 12px;text-align:right">${fmt(r.clicks)}</td>
      </tr>`;
    }).join('');

    const label = `${thisWeek.startDate} 〜 ${thisWeek.endDate}`;

    const html = `
      <div style="font-family:-apple-system,sans-serif;max-width:640px;margin:0 auto">
        <h2 style="color:#111;border-bottom:2px solid #c9a84c;padding-bottom:12px">
          📊 Fineme 週次SEOレポート
        </h2>
        <p style="color:#666;font-size:13px">${label}</p>

        <h3 style="color:#111;margin-top:28px">サマリー</h3>
        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:10px">
          <tr>
            <td style="padding:14px 20px;color:#666;border-bottom:1px solid #eee">インプレッション</td>
            <td style="padding:14px 20px;font-weight:700;font-size:18px;border-bottom:1px solid #eee">
              ${fmt(thisTotals.impressions)}
              <span style="font-size:13px;font-weight:400;color:${thisTotals.impressions >= prevTotals.impressions ? '#059669' : '#dc2626'}">
                ${diffStr(thisTotals.impressions, prevTotals.impressions)}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px;color:#666">クリック数</td>
            <td style="padding:14px 20px;font-weight:700;font-size:18px">
              ${fmt(thisTotals.clicks)}
              <span style="font-size:13px;font-weight:400;color:${thisTotals.clicks >= prevTotals.clicks ? '#059669' : '#dc2626'}">
                ${diffStr(thisTotals.clicks, prevTotals.clicks)}
              </span>
            </td>
          </tr>
        </table>

        <h3 style="color:#111;margin-top:28px">トップ10キーワード</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px 12px;text-align:left;color:#666">#</th>
              <th style="padding:8px 12px;text-align:left;color:#666">キーワード</th>
              <th style="padding:8px 12px;text-align:right;color:#666">表示</th>
              <th style="padding:8px 12px;text-align:right;color:#666">クリック</th>
              <th style="padding:8px 12px;text-align:right;color:#666">平均順位</th>
            </tr>
          </thead>
          <tbody>${qRows || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#999">データなし</td></tr>'}</tbody>
        </table>

        <h3 style="color:#111;margin-top:28px">トップ10ページ</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f3f4f6">
              <th style="padding:8px 12px;text-align:left;color:#666">#</th>
              <th style="padding:8px 12px;text-align:left;color:#666">URL</th>
              <th style="padding:8px 12px;text-align:right;color:#666">表示</th>
              <th style="padding:8px 12px;text-align:right;color:#666">クリック</th>
            </tr>
          </thead>
          <tbody>${pRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#999">データなし</td></tr>'}</tbody>
        </table>

        <p style="margin-top:32px">
          <a href="https://search.google.com/search-console" style="background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700">Search Console で詳細を見る</a>
        </p>

        <hr style="margin:32px 0;border:none;border-top:1px solid #eee">
        <p style="color:#999;font-size:12px">Fineme 自動SEOレポート（毎週月曜9時JST）</p>
      </div>
    `;

    // メール送信
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Fineme SEO <noreply@fineme.me>',
        to: OWNER_EMAIL,
        subject: `【Fineme SEO】週次レポート ${label}`,
        html,
      });
    }

    // LINE通知（サマリーのみ）
    if (OWNER_LINE_USER_ID) {
      const lineText = `📊 週次SEOレポート（${label}）\n\nインプレッション: ${fmt(thisTotals.impressions)} ${diffStr(thisTotals.impressions, prevTotals.impressions)}\nクリック数: ${fmt(thisTotals.clicks)} ${diffStr(thisTotals.clicks, prevTotals.clicks)}\n\nトップKW: ${topQueries[0]?.keys?.[0] || 'データなし'}\n\n詳細はメールを確認してください。`;
      await sendLinePush(OWNER_LINE_USER_ID, lineText);
    }

    console.log(`[seo-report] Sent. impressions: ${thisTotals.impressions}, clicks: ${thisTotals.clicks}`);
    return Response.json({ success: true, impressions: thisTotals.impressions, clicks: thisTotals.clicks });

  } catch (e) {
    console.error('[seo-report] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
