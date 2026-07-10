// GET /api/cron/threads-insights
// 毎日1:00 JST(16:00 UTC)に、自動投稿した Threads 投稿の指標を取得して分析・PDCAを回す。
// Schedule: "0 16 * * *"
// - 直近14日の threads_posts の各投稿インサイト(views/likes/replies/reposts/quotes)を更新
// - 日曜：実データから「効いた切り口/外れた切り口」を分析→ threads_strategy に保存（threads-draftが翌週読む）＋週次ダイジェストをメール
// env gated：THREADS_ACCESS_TOKEN/THREADS_USER_ID が無ければ何もしない
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { threadsConfigured, getMediaInsights, getUserInsights } from '@/lib/threads-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

// 保存率の近似（≒ views に対する likes+replies+reposts+quotes の反応率で代用。Threadsは保存指標を返さないため）
function engagementScore(m) {
  const v = m.views || 0;
  const eng = (m.likes || 0) + (m.replies || 0) * 2 + (m.reposts || 0) * 2 + (m.quotes || 0) * 2;
  return v > 0 ? +(eng / v * 100).toFixed(1) : 0; // %
}

async function emailDigest(html) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Fineme Threads <noreply@fineme.me>', to: OWNER_EMAIL,
      subject: '【Fineme Threads】週次アナリティクス＆来週方針（自動PDCA）', html,
    });
  } catch (e) { console.error('[threads-insights] email error:', e.message); }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!threadsConfigured()) {
    // トークン未設定：静かにスキップ（セットアップ前）
    return Response.json({ skipped: 'threads not configured (set THREADS_ACCESS_TOKEN / THREADS_USER_ID)' });
  }

  const sb = getSupabase();
  const since = new Date(Date.now() - 14 * 86400000).toISOString();

  // 1) 直近14日の投稿インサイトを更新
  let rows = [];
  try {
    const { data } = await sb.from('threads_posts')
      .select('id, media_id, category, body, posted_at, views, likes, replies, reposts, quotes')
      .gte('posted_at', since).order('posted_at', { ascending: false });
    rows = data || [];
  } catch (e) {
    return Response.json({ error: 'threads_posts read failed (run supabase-threads-posts.sql?): ' + e.message }, { status: 500 });
  }

  let updated = 0;
  for (const r of rows) {
    const m = await getMediaInsights(r.media_id);
    if (!m) continue;
    try {
      await sb.from('threads_posts').update({
        views: m.views ?? r.views, likes: m.likes ?? r.likes, replies: m.replies ?? r.replies,
        reposts: m.reposts ?? r.reposts, quotes: m.quotes ?? r.quotes, shares: m.shares ?? null,
        last_checked: new Date().toISOString(),
      }).eq('id', r.id);
      updated++;
    } catch {}
  }

  const dow = new Date().getUTCDay();
  // 平日は指標更新のみ（軽く回す）
  if (dow !== 0) {
    return Response.json({ success: true, updated, weekly: false });
  }

  // 2) 日曜：実データからPDCA（効いた/外れた切り口を分析→来週方針＋ダイジェスト）
  const { data: fresh } = await sb.from('threads_posts')
    .select('category, body, views, likes, replies, reposts, quotes')
    .gte('posted_at', since).order('posted_at', { ascending: false });
  const scored = (fresh || []).map(r => ({ ...r, eng: engagementScore(r) }))
    .sort((a, b) => b.eng - a.eng);
  const user = await getUserInsights();

  const top = scored.slice(0, 3);
  const bottom = scored.slice(-3).reverse();
  const line = r => `[${r.category}] view${r.views ?? '-'} / 反応${(r.likes||0)+(r.replies||0)+(r.reposts||0)+(r.quotes||0)} / eng${r.eng}% ｜ ${(r.body||'').split('\n').filter(Boolean)[0]?.slice(0, 40) || ''}`;

  // AIに"来週の方針"を作らせて threads_strategy に保存（threads-draftが読む）
  let strategyText = '';
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 500, temperature: 0.4,
      messages: [{ role: 'user', content: `Threads「AI経営」アカウントの先週の実データ。エンゲージ率(eng%)が高い＝刺さった投稿。

【伸びた投稿】\n- ${top.map(line).join('\n- ') || 'データ不足'}
【伸びなかった投稿】\n- ${bottom.map(line).join('\n- ') || 'データ不足'}

このデータから、来週のThreads方針を「効いた切り口を厚く／外れた切り口を減らす」の観点で、断定・箇条書き3〜5行で簡潔に。前置き不要。` }],
    });
    strategyText = (msg.content?.[0]?.text || '').trim();
    if (strategyText) {
      await sb.from('sns_posts').insert({ channel: 'threads_strategy', post_type: 'weekly-data', text: strategyText, posted: true });
    }
  } catch (e) { console.error('[threads-insights] strategy gen error:', e.message); }

  const esc = s => (s || '').replace(/</g, '&lt;');
  const html = `
    <div style="font-family:sans-serif;max-width:660px;margin:0 auto">
      <h2 style="color:#111;font-size:20px">📊 Threads 週次アナリティクス（自動）</h2>
      <p style="font-size:13px;color:#555">アカウント：フォロワー ${user?.followers_count ?? '—'} ／ 直近14日インプレ ${user?.views ?? '—'}</p>
      <h3 style="color:#111;font-size:15px;margin:18px 0 6px">🔥 伸びた投稿 TOP3</h3>
      <div style="font-size:13px;color:#222;white-space:pre-line">${esc(top.map(line).join('\n')) || 'データ蓄積中'}</div>
      <h3 style="color:#111;font-size:15px;margin:18px 0 6px">🧊 伸びなかった投稿</h3>
      <div style="font-size:13px;color:#666;white-space:pre-line">${esc(bottom.map(line).join('\n')) || 'データ蓄積中'}</div>
      <div style="background:#eef6ff;border:1px solid #cfe3ff;border-radius:10px;padding:14px 18px;margin:18px 0 0">
        <p style="font-size:14px;font-weight:700;color:#1e3a8a;margin:0 0 6px">🧭 来週の方針（AIが実データから自動生成・threads-draftが反映）</p>
        <div style="font-size:13px;color:#334;white-space:pre-line">${esc(strategyText) || '（データ不足で今週は据え置き）'}</div>
      </div>
      <p style="font-size:11px;color:#999;margin:14px 0 0">※Threadsは"保存数"を返さないため、eng%＝(いいね＋返信×2＋リポスト×2＋引用×2)/view で近似。プロフクリックはThreads側インサイトで確認を。</p>
    </div>`;
  await emailDigest(html);

  return Response.json({ success: true, updated, weekly: true, top: top.length, strategySaved: !!strategyText });
}
