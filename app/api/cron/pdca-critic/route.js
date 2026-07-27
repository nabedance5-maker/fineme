// GET /api/cron/pdca-critic
// 毎日、直近の自動生成物（記事・X投稿）を「年商10億を狙うCMO」として辛口批評し、
// 定型化・金太郎飴・目的不一致を自分で見つけて自動改善する。＝受け身をやめる自己批評ループ。
// Schedule: "0 21 * * *"（JST 6:00 / 日報の前）
import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'no anthropic key' }, { status: 500 });

  const sb = getSupabase();

  // ── 直近の自動生成物を収集（男性向けFineme・女性向けFineme Belle 両トラックを区別して扱う） ──
  const [{ data: arts }, { data: xposts }] = await Promise.all([
    sb.from('features').select('slug,title,description,category,track,published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(12),
    sb.from('sns_posts').select('text,created_at').eq('channel', 'x').order('created_at', { ascending: false }).limit(7),
  ]);
  const articles = arts || [];
  if (articles.length === 0) return Response.json({ skipped: 'no articles' });

  // ── Claudeに辛口批評させる（構造化JSON） ──
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const trackLabel = a => (a.track === 'belle' ? 'Belle/女性向け' : 'Fineme/男性向け');
  const artList = articles.map((a, i) => `${i}: [${trackLabel(a)}][${a.category}] ${a.title}｜${(a.description || '').slice(0, 50)}`).join('\n');
  const xList = (xposts || []).map((p, i) => `${i}: ${(p.text || '').replace(/\n/g, ' ').slice(0, 60)}`).join('\n');

  const prompt = `あなたはFineme（外見を起点に自信を再設計するAI事業／北極星=年商10億・年収1億／今は集客フェーズ）のグロースを預かる辛口CMO。
Finemeは男性向け「Fineme」トラックと女性向け「Fineme Belle」トラックの二本立て事業であり、両方とも正式なターゲット。記事の見出しに付けた[Fineme/男性向け][Belle/女性向け]はその記事が属する正しいトラックを示しており、性別・ターゲットの不一致ではない。ある記事が異性向けに見えることを理由に「ターゲットが方向違い」「北極星と方向違い」と判定するのは誤り。批評は各トラック内で完結させ、トラックを跨いだターゲット比較はしないこと。
自社が自動生成した直近の成果物を批評し、"今日自分で直すべき改善"を出す。忖度しない。

【直近の自動生成SEO記事（新しい順）】
${artList}

【直近のX投稿】
${xList || '（なし）'}

観点：①タイトル/切り口が定型・金太郎飴になっていないか（同じ骨格の連発、同トラック内で比較）②内容が差別化され読者の得になるか③10億ゴール(集客→販売)に効くか④検索/SNSで実際に勝てるか。

次のJSONのみ出力（コードブロック無し・日本語）：
{
  "verdict": "全体評価を辛口で2〜3文",
  "rewriteTitles": [ {"index": 記事番号, "reason": "なぜ弱い", "newTitle": "改善タイトル(30〜42字・前後と型を変える)", "newDescription": "改善メタ(100〜120字)"} ],  // 定型/弱いものを最大2件。無ければ空配列
  "strategicIssues": [ "記事単体では直せない、事業レベルで手を打つべき弱点や機会。具体的に。最大3件" ]
}`;

  let critique = { verdict: '', rewriteTitles: [], strategicIssues: [] };
  try {
    const msg = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1200, temperature: 0.5, messages: [{ role: 'user', content: prompt }] });
    const txt = ((msg.content || []).find(b => b.type === 'text')?.text || '').trim().replace(/^```json?|```$/g, '').trim();
    critique = { ...critique, ...JSON.parse(txt) };
  } catch (e) { return Response.json({ error: 'critique parse failed: ' + e.message }, { status: 500 }); }

  // ── 自動改善①：定型タイトルをその場でリライト（green・可逆） ──
  const applied = [];
  for (const r of (critique.rewriteTitles || []).slice(0, 2)) {
    const a = articles[r.index];
    if (!a || !r.newTitle) continue;
    const { error } = await sb.from('features').update({ title: r.newTitle, description: r.newDescription || a.description, summary: r.newDescription || a.description }).eq('slug', a.slug);
    if (!error) {
      try { revalidatePath(a.track === 'belle' ? `/belle/journal/${a.slug}` : `/feature/${a.slug}`); } catch {}
      applied.push({ slug: a.slug, track: a.track || 'fineme', from: a.title, to: r.newTitle, reason: r.reason });
    }
  }

  // ── 自動改善②：戦略級の弱点は改善キューに記録（自走flow/日報が拾う） ──
  for (const s of (critique.strategicIssues || []).slice(0, 3)) {
    try { await sb.from('sns_posts').insert({ channel: 'improvement-queue', post_type: 'critic', text: s, posted: false }); } catch {}
  }

  // ── でおへ批評サマリ（何を自分で直したか） ──
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appliedHtml = applied.length
      ? applied.map(a => `<li><span style="color:#999">${a.from}</span><br>→ <b>${a.to}</b><br><span style="font-size:12px;color:#888">理由: ${a.reason}</span></li>`).join('')
      : '<li style="color:#999">今回タイトルの自動リライトは無し</li>';
    const stratHtml = (critique.strategicIssues || []).map(s => `<li>${s}</li>`).join('') || '<li style="color:#999">なし</li>';
    await resend.emails.send({
      from: 'Fineme 自己批評 <noreply@fineme.me>', to: OWNER_EMAIL,
      subject: `🔎 Fineme 自己批評｜タイトル自動改善${applied.length}件・戦略課題${(critique.strategicIssues || []).length}件`,
      html: `<h2>🔎 自己批評ループ</h2>
        <p style="background:#fff7ed;border-left:3px solid #f59e0b;padding:8px 14px"><b>辛口評価：</b>${critique.verdict}</p>
        <h3>✅ 自分で直したこと（タイトル/メタ）</h3><ul>${appliedHtml}</ul>
        <h3>🧩 事業レベルの改善課題（改善キューに記録済・自走で対処）</h3><ul>${stratHtml}</ul>`,
    });
  }

  return Response.json({ ok: true, verdict: critique.verdict, rewritten: applied.length, strategic: (critique.strategicIssues || []).length });
}
