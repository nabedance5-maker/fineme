// GET /api/cron/pinterest-draft
// 毎週木曜10時JST(1時UTC)にPinterestへ自動投稿する
// Schedule: "0 1 * * 4"
// ソース（types/Me Scan・log/New Me Log・mirror/Mirror）を週次ローテーションし、
// /api/og/pinterest で1000x1500の縦長ピン画像を生成してPinterest API v5で自動投稿。
// PINTEREST_ACCESS_TOKEN / PINTEREST_BOARD_ID が未設定の間は、note-draftと同じ
// 「メール下書き→でおが手動でPinterest Businessアカウントへコピペ投稿」方式にフォールバックする。
// でおの手動作業は「Pinterest Businessアカウント作成＋APIトークン発行」の初回1回のみ。
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const PINTEREST_ACCESS_TOKEN = process.env.PINTEREST_ACCESS_TOKEN;
const PINTEREST_BOARD_ID = process.env.PINTEREST_BOARD_ID;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const BASE_URL = 'https://www.fineme.me';

// 週次ローテーション（3ソース）
const SOURCES = [
  {
    key: 'types',
    link: `${BASE_URL}/types?src=pinterest`,
    fallbackTitle: '136タイプ診断 | Fineme Me Scan',
    fallbackDesc: '8軸の質問で、あなたの"今のタイプ"が136種類の中から分かる。無料・3分から。',
    caption: '136タイプ診断',
  },
  {
    key: 'log',
    link: `${BASE_URL}/log?src=pinterest`,
    fallbackTitle: '美容代、月いくら？ | New Me Log',
    fallbackDesc: '美容室・ジム・ネイル…バラバラの支出を1か所にまとめて可視化。ログイン不要、無料。',
    caption: 'New Me Log',
  },
  {
    key: 'mirror',
    link: `${BASE_URL}/lp/mirror?src=pinterest`,
    fallbackTitle: '写真1枚で変われる余白が分かる | Fineme Mirror',
    fallbackDesc: 'AIが写真を分析し、変われる余白を7軸で可視化。¥500から。写真は保存されません。',
    caption: 'Mirror',
  },
];

function weekOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d - start) / (7 * 86400000));
}

async function generateCopy(source) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      temperature: 0.8,
      system: 'あなたはFinemeのPinterestピン文言（画像には乗せない、Pinterest上のタイトル/説明のみ）を書くコピーライター。日本語、簡潔・温かい・誠実・煽らない・テンプレ感なし。出力は必ず「タイトル: 」「説明: 」の2行のみ（前置き不要）。',
      messages: [{
        role: 'user',
        content: `Pinterestのピンを1枚作る。対象：${source.fallbackTitle}\n参考説明：${source.fallbackDesc}\nこのテーマで、タイトル（32字以内）・説明（100字以内）を書いて。`,
      }],
    });
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    const title = text.match(/タイトル[:：]\s*(.+)/)?.[1]?.trim();
    const description = text.match(/説明[:：]\s*(.+)/)?.[1]?.trim();
    if (!title || !description) return null;
    return { title, description };
  } catch (e) {
    console.error('[pinterest-draft] copy gen error:', e.message);
    return null;
  }
}

async function postPin({ title, description, link, imageUrl, source }) {
  const res = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: PINTEREST_BOARD_ID,
      title,
      description,
      link,
      media_source: { source_type: 'image_url', url: imageUrl },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function emailDraft({ title, description, link, imageUrl, source, posted }) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const subject = posted
      ? `【Fineme Pinterest】今週のピン（自動投稿済み・操作不要）`
      : `【Fineme Pinterest】今週のピン下書き（手動投稿してください）`;
    const lead = posted
      ? 'Pinterest APIで自動投稿しました。記録用です（操作不要）。'
      : 'PINTEREST_ACCESS_TOKEN未設定のため自動投稿していません。画像を保存し、Pinterest Businessアカウントから手動で投稿してください（初回のみ）。';
    const html = `
      <h2 style="color:#111">📌 今週のPinterestピン（${source}）</h2>
      <p style="color:#666;font-size:13px">${lead}</p>
      <img src="${imageUrl}" style="max-width:320px;border-radius:8px;border:1px solid #eee" />
      <h3 style="color:#111;margin-top:16px">タイトル</h3>
      <p style="font-size:15px">${title}</p>
      <h3 style="color:#111">説明</h3>
      <p style="font-size:14px;color:#333">${description}</p>
      <h3 style="color:#111">リンク先</h3>
      <p style="font-size:13px"><a href="${link}">${link}</a></p>
    `;
    await resend.emails.send({ from: 'Fineme Pinterest <noreply@fineme.me>', to: OWNER_EMAIL, subject, html });
  } catch (e) {
    console.error('[pinterest-draft] email error:', e.message);
  }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const week = weekOfYear();
  const source = SOURCES[week % SOURCES.length];
  const copy = await generateCopy(source);
  const title = copy?.title || source.fallbackTitle;
  const description = copy?.description || source.fallbackDesc;
  const imageUrl = `${BASE_URL}/api/og/pinterest?source=${encodeURIComponent(source.key)}&seed=${week}&caption=${encodeURIComponent(source.caption)}`;

  let posted = false;
  if (PINTEREST_ACCESS_TOKEN && PINTEREST_BOARD_ID) {
    try {
      await postPin({ title, description, link: source.link, imageUrl, source: source.key });
      posted = true;
    } catch (e) {
      console.error('[pinterest-draft] post error:', e.message);
    }
  }

  try {
    const sb = getSupabase();
    await sb.from('sns_posts').insert({ channel: 'pinterest', post_type: source.key, text: `${title}\n${description}`, posted });
  } catch {}

  await emailDraft({ title, description, link: source.link, imageUrl, source: source.key, posted });

  return Response.json({ posted, source: source.key, title, emailed: !!process.env.RESEND_API_KEY });
}
