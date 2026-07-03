// GET /api/cron/feature-article
// 毎週火曜9時JST（0時UTC火曜）に /feature SEO記事を1本生成してSupabaseに自動公開
// Schedule: "0 0 * * 2"
import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { getSupabase } from '@/lib/supabase';
import { BRAND_PHILOSOPHY } from '@/lib/brand-philosophy';
import { getGoogleAccessToken, querySearchConsole, dateRange } from '@/lib/gsc';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '4fbd52dc-784e-4ab8-97c4-f1f99e48b504';

// GSCで「勝てそうなクエリ」を探す：表示があり順位15〜70位（=土台はあるが上げ切れてない）長めのクエリ
async function pickOpportunityTheme() {
  try {
    const token = await getGoogleAccessToken();
    const rows = await querySearchConsole(token, { ...dateRange(28), dimensions: ['query'], rowLimit: 100 });
    const opp = rows
      .map(r => ({ q: r.keys?.[0] || '', imp: r.impressions || 0, pos: r.position || 99, clicks: r.clicks || 0 }))
      .filter(r => r.q && r.imp >= 1 && r.pos >= 8 && r.pos <= 70 && r.q.length >= 6) // 長めロングテール優先
      .sort((a, b) => b.imp - a.imp)[0];
    if (!opp) return null;
    return { axis: opp.q, prompt: `検索クエリ「${opp.q}」の検索意図に、他のどのページより丁寧に答える実用記事（現在${Math.round(opp.pos)}位・表示${opp.imp}/月＝上げ切る余地あり）。タイトルと見出しにこのクエリの語を自然に含める。` };
  } catch { return null; }
}

async function indexNowSubmit(urls) {
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: 'www.fineme.me', key: INDEXNOW_KEY, keyLocation: `https://www.fineme.me/${INDEXNOW_KEY}.txt`, urlList: urls }),
    });
  } catch {}
}

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const BASE_URL = 'https://www.fineme.me';

const THEMES = [
  { axis: '眉毛',           prompt: '男性の眉毛を整えることについて。初心者向けのサロン体験・費用・手順・失敗しない方法' },
  { axis: '清潔感',         prompt: '清潔感とは何か。外見改善初心者が最初に取り組むべき3つの習慣と具体的なアクション' },
  { axis: 'ヘア',           prompt: '男性の髪型選び。自分の顔型に合った髪型の見つけ方と美容師への正しい伝え方' },
  { axis: 'ファッション',   prompt: '男性ファッション入門。サイズ感・骨格・色の基本3原則と最初に買うべき服' },
  { axis: 'Mirror活用',     prompt: 'AI写真分析（Fineme Mirror）を活用した外見改善。写真1枚でわかる自分の外見課題と改善ポイント' },
  { axis: '体型',           prompt: '男性の体型改善ロードマップ。ジム前にやるべきことと7軸Tier分類による投資対効果の高い順番' },
  { axis: 'マッチングアプリ', prompt: 'マッチングアプリでマッチしない男性がプロフィール写真を改善する具体的な方法' },
  { axis: '肌',             prompt: '男性のスキンケア入門。洗顔・保湿・日焼け止めだけで清潔感が激変する科学的な理由' },
  { axis: '垢抜け',         prompt: '垢抜けた男性の特徴と最短で垢抜けるための具体的な順番・実践ステップ' },
  { axis: '歯',             prompt: '男性の歯の白さ・口元ケア。ホワイトニングを始めるタイミングと費用対効果・笑顔の変化' },
  { axis: '7軸優先順位',   prompt: '外見改善の正しい優先順位。Finemeの7軸Tier分類（眉毛・髪・体型・服・肌・歯・爪）の全解説と判断基準' },
  { axis: '自己肯定感',     prompt: '外見改善と自己肯定感の関係。鏡の前で自信が持てるようになるまでの心理的変化' },
  { axis: '骨格診断',       prompt: '男性向け骨格診断入門。自分のタイプを知ることで服選びが劇的に楽になる理由と診断方法' },
  { axis: '清潔感チェック', prompt: '清潔感チェックリスト完全版。眉毛・髪・肌・服・歯・爪の6軸で自己診断する方法' },
  { axis: '爪',             prompt: '男性の爪ケア。清潔感を仕上げる最後の1軸・正しい爪の整え方と道具の選び方' },
  { axis: 'でお変容',       prompt: '元・非モテから現役モデルへ。でおが外見改善で変えた7つの習慣と変容の正しい順番' },
  { axis: '恋愛と外見',     prompt: '外見改善で恋愛は変わるのか。マッチング率・出会いの質・自信の変化を体験談で解説' },
  { axis: 'ヘアサロン',     prompt: '男性が「なりたい髪型」を美容師に伝える方法。参考画像の選び方とオーダーのコツ' },
  { axis: 'マッチングアプリ写真', prompt: 'マッチングアプリのプロフィール写真で「いいね」が増える撮り方・選び方の完全ガイド' },
  { axis: '眉毛サロン選び', prompt: '男性が眉毛サロンを選ぶ際のポイント。失敗しない初回体験と料金相場・継続のコツ' },
];

function mdToHtml(md) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#c9a84c;text-decoration:underline">$1</a>');

  const blocks = md.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
  return blocks.map(block => {
    const lines = block.split('\n');
    const first = lines[0];

    if (first.startsWith('# '))   return `<h1 style="font-size:26px;font-weight:800;color:#111;line-height:1.4;margin:0 0 24px">${inline(first.slice(2))}</h1>`;
    if (first.startsWith('## '))  return `<h2 style="font-size:22px;font-weight:700;color:#111;margin:40px 0 12px;padding-bottom:8px;border-bottom:2px solid #f0ede6">${inline(first.slice(3))}</h2>`;
    if (first.startsWith('### ')) return `<h3 style="font-size:18px;font-weight:700;color:#1a1a1a;margin:28px 0 8px">${inline(first.slice(4))}</h3>`;

    if (lines.every(l => /^[-*] /.test(l))) {
      const items = lines.map(l => `<li style="margin:4px 0;line-height:1.8">${inline(l.slice(2))}</li>`).join('');
      return `<ul style="margin:0 0 18px;padding-left:24px;color:#222">${items}</ul>`;
    }

    const text = lines.map(l => inline(l)).join('<br>');
    return `<p style="margin:0 0 18px;line-height:1.95;color:#222;font-size:15px">${text}</p>`;
  }).join('\n');
}

function parseArticle(raw) {
  const lines = raw.split('\n');
  const meta = {};
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '---') { bodyStart = i + 1; break; }
    const colonIdx = line.indexOf(': ');
    if (colonIdx > 0) {
      meta[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 2).trim();
    }
  }

  return {
    slug:        meta.slug        || '',
    title:       meta.title       || '',
    category:    meta.category    || '',
    description: meta.description || '',
    body:        lines.slice(bodyStart).join('\n').trim(),
  };
}

async function generateArticle(theme, existingTitles, linkPool = []) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const existingList = existingTitles.length > 0
    ? `\n\n【カバー済みテーマ（重複禁止）】\n以下と同じ切り口・タイトルの記事は書かないこと：\n${existingTitles.map(t => `・${t}`).join('\n')}`
    : '';

  const linkList = linkPool.length > 0
    ? `\n\n【内部リンク（本文中に自然に2〜3本入れる・関連するものだけ）】\n形式：[アンカーテキスト](${BASE_URL}/feature/スラッグ)\n候補：\n${linkPool.slice(0, 30).map(a => `・/feature/${a.slug} : ${a.title}`).join('\n')}`
    : '';

  const system = `あなたはFineme（外見を起点に自信を再設計する男性向けプラットフォーム）のSEOコンテンツライター。でおの視点・体験談を引用しながら、恋愛・外見改善に悩む20〜30代男性向けの実用的な情報記事を書く。

【記事の目的】
Google検索で上位表示し、読者がFineme Mirror（${BASE_URL}/lp/mirror）またはMe Scan（${BASE_URL}/diagnosis）に進む導線を自然に作る。

【文体】
- 情報提供スタイル（専門知識を持つ仲間が教える感じ）
- 断定的・具体的・数字を使う（「〜な傾向があります」ではなく「〜です」）
- でおの体験談を1〜2箇所引用（「でおも最初は〜だった」「実際に試してみると〜だった」）
- H2/H3見出しを使ってSEOスキャン構造を作る
- 見出しにキーワードを含める

【Mirror CTAの埋め込み（必須・1回）】
記事の中盤の関連するH2セクション末尾に、以下の形式で自然に1回挿入する：
**→ [Fineme Mirror で今すぐ外見を分析する（¥500）](${BASE_URL}/lp/mirror)**

【出力フォーマット（最初の4行は必ずこの形式。---の前は絶対にこれだけ）】
slug: kebab-case-english-slug
title: 日本語タイトル（30〜40字）
category: カテゴリ（清潔感・眉毛・ヘア・ファッション・肌・体型・歯・爪・マッチングアプリ・外見改善・変容の思想 のいずれか）
description: SEO用説明文（100〜120字、記事の要点と検索意図を含める）
---
## 最初のH2見出し
本文...

【構成】
1. 導入（読者の悩みへの共感 + この記事で得られる価値）
2. H2 × 3〜5個（具体的な情報・ステップ・判断軸）
3. まとめ（Me Scan または Mirror への自然な誘導で締める）

【長さ】2000〜3000字。${existingList}${linkList}

${BRAND_PHILOSOPHY}
※思想は記事の温度として効かせる。フォーマットと禁止ルールは引き続き厳守。`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    temperature: 0.8,
    system,
    messages: [{
      role: 'user',
      content: `今週のテーマ軸：「${theme.axis}」\nテーマ詳細：${theme.prompt}\n\nこのテーマで、Googleで上位表示できる実用的なSEO記事を1本書いてください。`,
    }],
  });

  return msg.content?.[0]?.text?.trim() || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const supabase = getSupabase();

  // テーマ選択：まずGSCの「勝てそうなクエリ」を狙う（土台強化）。無ければ固定テーマを日替わりで
  const day = Math.floor(Date.now() / 86400000);
  const theme = (await pickOpportunityTheme()) || THEMES[day % THEMES.length];

  // 既存公開記事（重複回避＋内部リンク候補）
  const { data: existing } = await supabase
    .from('features')
    .select('slug,title')
    .eq('status', 'published');
  const existingTitles = (existing || []).map(a => a.title);
  const linkPool = (existing || []).filter(a => a.slug);

  try {
    const raw = await generateArticle(theme, existingTitles, linkPool);
    if (!raw) return Response.json({ error: 'no article generated' }, { status: 500 });

    const { slug, title, category, description, body } = parseArticle(raw);
    if (!title || !body) return Response.json({ error: 'parse failed' }, { status: 500 });

    const dateStr = new Date().toISOString().slice(0, 10);
    const finalSlug = `${slug || 'feature'}-${dateStr}`;
    const bodyHtml = mdToHtml(body);
    const now = new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from('features')
      .insert({
        slug:        finalSlug,
        title,
        category:    category    || '',
        description: description || '',
        summary:     description || '',
        body:        bodyHtml,
        reading_time: 8,
        status:      'published',
        published_at: now,
      })
      .select()
      .single();

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

    revalidatePath('/feature');
    revalidatePath(`/feature/${finalSlug}`);
    await indexNowSubmit([`${BASE_URL}/feature/${finalSlug}`]); // 即インデックス申請

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Fineme 記事 <noreply@fineme.me>',
        to: OWNER_EMAIL,
        subject: `【Fineme 記事公開】${title}`,
        html: `
          <div style="font-family:sans-serif;max-width:680px;margin:0 auto">
            <h2 style="color:#111;font-size:20px;margin:0 0 16px">📝 今週の /feature 記事が自動公開されました</h2>
            <p style="color:#555;font-size:13px;margin:0 0 4px">テーマ軸：${theme.axis} ／ カテゴリ：${category}</p>
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px 20px;margin:16px 0 24px">
              <p style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 8px">${title.replace(/</g, '&lt;')}</p>
              <p style="font-size:13px;color:#555;margin:0">${(description || '').replace(/</g, '&lt;')}</p>
            </div>
            <a href="${BASE_URL}/feature/${finalSlug}" style="display:inline-block;background:#c9a84c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">記事を確認する →</a>
            <p style="font-size:12px;color:#999;margin:24px 0 0">内容を修正・非公開にする場合は管理画面から：<a href="${BASE_URL}/admin/features" style="color:#c9a84c">${BASE_URL}/admin/features</a></p>
          </div>
        `,
      });
    }

    console.log(`[feature-article] Published. slug="${finalSlug}" title="${title}"`);
    return Response.json({ success: true, slug: finalSlug, title, theme: theme.axis });
  } catch (e) {
    console.error('[feature-article] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
