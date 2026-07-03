// GET /api/cron/seo-improve
// 週次（月曜・seo-report後）。Search Consoleの成績から「惜しいページ」を抽出し、
// タイトル/メタ/内部リンク/追記を自動改善して Supabase features を更新（SEOのAct自動化）。
// 既定は「提案モード」（メールのみ・DB未変更）。?apply=1 または SEO_AUTO_APPLY=1 で本適用。
// Schedule: "30 0 * * 1"
import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { getSupabase } from '@/lib/supabase';
import { getGoogleAccessToken, querySearchConsole, dateRange } from '@/lib/gsc';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const HOST = 'www.fineme.me';
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '4fbd52dc-784e-4ab8-97c4-f1f99e48b504';

const MAX_PAGES = 3;          // 週あたり改善件数
const MIN_IMPRESSIONS = 80;   // 「表示が付いている」下限（28日）
const LOW_CTR = 0.012;        // 1.2%未満＝タイトル/メタが弱い候補
const POS_MIN = 8, POS_MAX = 20; // あと一歩で1ページ目

function slugFromUrl(u) {
  const m = (u || '').match(/\/feature\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function sendMail(subject, html) {
  if (!process.env.RESEND_API_KEY) return;
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({ from: 'Fineme SEO <noreply@fineme.me>', to: OWNER_EMAIL, subject, html });
}

async function indexNowSubmit(urls) {
  if (!urls.length) return 0;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`, urlList: urls }),
    });
    return urls.length;
  } catch (e) { console.error('[seo-improve] indexnow', e.message); return 0; }
}

// 既存の自動改善ブロックを剥がす（冪等化）
function stripBlock(body) {
  return (body || '').replace(/<!-- seo-improve:start -->[\s\S]*?<!-- seo-improve:end -->/g, '').trim();
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const APPLY = new URL(request.url).searchParams.get('apply') === '1' || process.env.SEO_AUTO_APPLY === '1';

  try {
    // ── Check：Search Console から機会ページ抽出 ──
    const token = await getGoogleAccessToken();
    const range = dateRange(28);
    const rows = await querySearchConsole(token, { ...range, dimensions: ['page'], rowLimit: 200 });

    const candidates = rows
      .map(r => ({
        url: r.keys?.[0] || '',
        slug: slugFromUrl(r.keys?.[0]),
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 99,
      }))
      .filter(c => c.slug && c.impressions >= MIN_IMPRESSIONS)
      .map(c => {
        const lowCtr = c.ctr < LOW_CTR;
        const almost = c.position >= POS_MIN && c.position <= POS_MAX;
        // スコア：表示数×（惜しさ）。低CTR or 8〜20位 を優先
        const reasons = [];
        if (lowCtr) reasons.push(`高表示・低CTR(${(c.ctr * 100).toFixed(1)}%)`);
        if (almost) reasons.push(`平均${c.position.toFixed(1)}位（あと一歩）`);
        return { ...c, lowCtr, almost, reasons };
      })
      .filter(c => c.lowCtr || c.almost)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, MAX_PAGES);

    if (candidates.length === 0) {
      await sendMail('【Fineme SEO】改善候補なし', `<p>今週は改善条件（表示≥${MIN_IMPRESSIONS} かつ CTR<${LOW_CTR * 100}% or 8〜20位）に該当するページがありませんでした。</p>`);
      return Response.json({ candidates: 0 });
    }

    const sb = getSupabase();
    // 内部リンク候補（公開記事の一覧）
    const { data: allArticles } = await sb.from('features')
      .select('slug,title,category').eq('status', 'published').limit(120);
    const linkPool = (allArticles || []).filter(a => a.slug);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const results = [];

    for (const c of candidates) {
      // 対象ページの検索クエリ上位（何で表示されているか）
      let topQueries = [];
      try {
        const qrows = await querySearchConsole(token, {
          ...range, dimensions: ['query'], rowLimit: 8,
          dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'equals', expression: c.url }] }],
        });
        topQueries = qrows.map(q => q.keys?.[0]).filter(Boolean);
      } catch {}

      const { data: art } = await sb.from('features').select('*').eq('slug', c.slug).maybeSingle();
      if (!art) continue;

      const poolForPrompt = linkPool.filter(a => a.slug !== c.slug).slice(0, 40)
        .map(a => `- ${a.slug} : ${a.title}`).join('\n');

      const prompt = `Finemeの既存SEO記事を改善する。事実を盛らず、既存の主張を壊さず、検索意図に素直に寄せること。

【記事】slug=${c.slug} / カテゴリ=${art.category}
現タイトル：${art.title}
現メタ説明：${art.description || ''}
この記事が実際に検索表示されている上位クエリ：${topQueries.join(' / ') || '（不明）'}
改善観点：${c.reasons.join(' / ')}

【内部リンク候補（この中から関連する2〜3件だけ選ぶ・無ければ空）】
${poolForPrompt}

次のJSONだけを出力（コードブロックなし）:
{
  "title": "改善後タイトル（日本語30〜40字・主要クエリを自然に含む・煽りすぎない）",
  "description": "改善後メタ説明（日本語100〜120字・検索意図と要点・クリックしたくなる）",
  "addition_html": "検索意図を補う追記（<h3>と<p>のみ・150〜300字・事実ベース・無理なら空文字）",
  "link_slugs": ["関連slug", "..."]
}`;

      let gen = null;
      try {
        const msg = await client.messages.create({
          model: 'claude-haiku-4-5-20251001', max_tokens: 900, temperature: 0.5,
          messages: [{ role: 'user', content: prompt }],
        });
        const txt = ((msg.content || []).find(b => b.type === 'text')?.text || '').trim().replace(/^```json?|```$/g, '').trim();
        gen = JSON.parse(txt);
      } catch (e) { console.error('[seo-improve] gen/parse', c.slug, e.message); continue; }
      if (!gen?.title || !gen?.description) continue;

      const links = (gen.link_slugs || [])
        .map(s => linkPool.find(a => a.slug === s))
        .filter(Boolean).slice(0, 3);
      const linksHtml = links.length
        ? `<h3>関連記事</h3><ul>${links.map(l => `<li><a href="/feature/${l.slug}">${l.title}</a></li>`).join('')}</ul>` : '';
      const block = (gen.addition_html || linksHtml)
        ? `<!-- seo-improve:start -->\n<div class="seo-improve">${gen.addition_html || ''}${linksHtml}</div>\n<!-- seo-improve:end -->`
        : '';
      const newBody = block ? `${stripBlock(art.body)}\n\n${block}` : art.body;

      const record = {
        slug: c.slug,
        reasons: c.reasons,
        impressions: c.impressions,
        before: { title: art.title, description: art.description },
        after: { title: gen.title, description: gen.description },
        links: links.map(l => l.slug),
        applied: false,
      };

      if (APPLY) {
        const { error } = await sb.from('features')
          .update({ title: gen.title, description: gen.description, summary: gen.description, body: newBody })
          .eq('slug', c.slug);
        if (!error) {
          record.applied = true;
          try { revalidatePath(`/feature/${c.slug}`); } catch {}
        } else { record.error = error.message; }
      }
      results.push(record);
    }

    if (APPLY) {
      const urls = results.filter(r => r.applied).map(r => `https://${HOST}/feature/${r.slug}`);
      await indexNowSubmit(urls);
    }

    // ── レポートメール（変更前後・復元用） ──
    const modeLabel = APPLY ? '✅ 本適用（features更新済・IndexNow再送信）' : '📝 提案モード（DB未変更・確認用）';
    const rowsHtml = results.map(r => `
      <div style="border:1px solid #eee;border-radius:8px;padding:12px;margin:10px 0">
        <div style="font-size:12px;color:#888">/feature/${r.slug}（表示${r.impressions}・${r.reasons.join(' / ')}）${r.applied ? '<b style="color:#059669"> 適用済</b>' : ''}${r.error ? `<b style="color:#dc2626"> 失敗:${r.error}</b>` : ''}</div>
        <div style="margin-top:6px"><b>タイトル</b><br><span style="color:#999">${r.before.title}</span><br>→ ${r.after.title}</div>
        <div style="margin-top:6px"><b>メタ</b><br><span style="color:#999">${r.before.description || '(なし)'}</span><br>→ ${r.after.description}</div>
        ${r.links.length ? `<div style="margin-top:6px;font-size:12px">内部リンク追加: ${r.links.join(', ')}</div>` : ''}
      </div>`).join('');
    await sendMail(
      `【Fineme SEO】自動改善 ${results.length}件（${APPLY ? '適用' : '提案'}）`,
      `<h2>SEO Actループ ${modeLabel}</h2>
       <p style="color:#555;font-size:13px">対象期間 ${range.startDate}〜${range.endDate}。惜しいページ（高表示・低CTR / 8〜20位）を自動改善。<br>
       ${APPLY ? '変更前の値は下記に保管（復元用）。' : '本適用するには cron path に <code>?apply=1</code> を付けるか、Vercel環境変数 <code>SEO_AUTO_APPLY=1</code> を設定。'}</p>
       ${rowsHtml || '<p>該当なし</p>'}`
    );

    return Response.json({ mode: APPLY ? 'apply' : 'propose', count: results.length, applied: results.filter(r => r.applied).length });

  } catch (e) {
    console.error('[seo-improve]', e.message);
    // GSC未連携などは安全に通知して終了
    await sendMail('【Fineme SEO】seo-improve 停止', `<p>seo-improve が実行できませんでした：<br><code>${e.message}</code></p><p>Google Search Console連携（GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY）をご確認ください。</p>`).catch(() => {});
    return Response.json({ error: e.message }, { status: 500 });
  }
}
