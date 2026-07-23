// GET /api/cron/belle-article
// 毎日4時JST（毎日）に /belle/journal SEO記事を1本生成してSupabaseに自動公開
// Schedule: "0 4 * * *"
import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { getSupabase } from '@/lib/supabase';
import { BELLE_PHOTOS, BELLE_DEFAULT_PHOTOS, EXTRA_PHOTOS, unsplashUrl as unsplashUrlBase, slugHash } from '@/lib/thumbnail-photos';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '4fbd52dc-784e-4ab8-97c4-f1f99e48b504';
const unsplashUrl = (id) => unsplashUrlBase(id, '&w=900&q=80');

// Belle軸 → category 対応（重複チェック用）
const BELLE_AXIS_CATEGORY_MAP = {
  '眉毛':        '眉毛',
  '眉サロン':    '眉毛',
  'スキンケア':  'スキンケア',
  '肌ケア':      'スキンケア',
  'ヘア':        'ヘア',
  'ヘアサロン':  'ヘア',
  'ファッション': 'ファッション',
  '骨格診断':    'ファッション',
  'パーソナルカラー': 'ファッション',
  'ネイル':      'ネイル',
  '脱毛':        '脱毛',
  '歯・笑顔':   '歯・笑顔',
  'ボディ':      'ボディ',
  '考え方':      '考え方',
  'Belle Mirror活用': '考え方',
  '垢抜け':      '垢抜け',
};

function extractKeywords(s) {
  return (s.match(/[一-龠々ぁ-んァ-ヴー]{2,}/g) || []);
}

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const BASE_URL = 'https://www.fineme.me';

const BELLE_THEMES = [
  { axis: '眉毛',        prompt: '女性の眉毛の整え方。自分の顔型に合った眉の形の見つけ方・初めての眉サロン体験・ホームケアの継続方法' },
  { axis: 'スキンケア',  prompt: 'スキンケアの正しい順番と最低限必要なもの。化粧水・乳液・日焼け止めだけで肌が変わる理由と継続のコツ' },
  { axis: 'ヘア',        prompt: '自分に似合う髪型の見つけ方。顔型別おすすめスタイル・美容師への正しい伝え方・セルフスタイリングの基本' },
  { axis: 'ファッション', prompt: '垢抜けファッションの3原則（骨格・カラー・サイズ感）。最初に揃えるべき服と選び方' },
  { axis: 'ネイル',      prompt: '清潔感ある爪のケア方法。セルフネイルの基本・ネイルサロン初体験ガイド・長持ちさせるコツ' },
  { axis: '脱毛',        prompt: '脱毛を始めるベストなタイミングと選び方。医療脱毛・光脱毛の違い・部位別優先順位と費用' },
  { axis: '歯・笑顔',    prompt: '歯のホワイトニングで笑顔に自信を取り戻す。セルフケアと歯科医院の使い分け・費用対効果' },
  { axis: 'ボディ',      prompt: '女性の体型ケアと姿勢改善の始め方。日常習慣でできるボディメイクと「痩せて見える」印象の作り方' },
  { axis: '考え方',      prompt: '外見を変えることの本当の意味。「誰かに選ばれるため」ではなく「自分が自分を大切にする」という視点の転換' },
  { axis: 'Belle Mirror活用', prompt: 'AI写真分析（Belle Mirror）を活用した客観的な外見把握。写真1枚でわかる印象と具体的な改善ポイント' },
  { axis: '垢抜け',      prompt: '垢抜けた女性の共通点と、最短で垢抜けるための優先順位。眉・肌・髪・ファッションの正しい順番' },
  { axis: '骨格診断',    prompt: '骨格診断入門。自分のタイプ（ストレート・ウェーブ・ナチュラル）を知ることで服選びが劇的に楽になる理由' },
  { axis: 'パーソナルカラー', prompt: 'パーソナルカラー診断の基本。春夏秋冬の4タイプと、似合う色を知ることで日常のメイク・服選びが変わる理由' },
  { axis: '眉サロン',    prompt: '眉サロンの正しい選び方と初回体験ガイド。料金相場・失敗しない頼み方・サロン後のセルフケア' },
  { axis: 'ヘアサロン',  prompt: '自分に合う美容師・美容室の見つけ方。理想の髪型を伝えるコツと長期的に信頼できる美容師と付き合う方法' },
  { axis: '肌ケア',      prompt: '20〜30代女性のニキビ・毛穴・乾燥を根本から改善するスキンケア見直しガイド' },
];

function mdToHtml(md) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#c8648c;text-decoration:underline">$1</a>');

  const blocks = md.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
  return blocks.map(block => {
    const lines = block.split('\n');
    const first = lines[0];

    if (first.startsWith('# '))   return `<h1>${inline(first.slice(2))}</h1>`;
    if (first.startsWith('## '))  return `<h2>${inline(first.slice(3))}</h2>`;
    if (first.startsWith('### ')) return `<h3>${inline(first.slice(4))}</h3>`;

    if (lines.every(l => l.startsWith('> '))) {
      const text = lines.map(l => inline(l.slice(2))).join('<br>');
      return `<div style="border-left:3px solid #c8648c;background:rgba(200,100,140,0.06);border-radius:0 10px 10px 0;padding:14px 20px;margin:24px 0;line-height:1.8">${text}</div>`;
    }

    if (lines.every(l => /^[-*] /.test(l))) {
      const items = lines.map(l => `<li>${inline(l.slice(2))}</li>`).join('');
      return `<ul>${items}</ul>`;
    }

    const text = lines.map(l => inline(l)).join('<br>');
    return `<p>${text}</p>`;
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

function injectImages(html, axis, seedStr = '', usedIds = new Set()) {
  const axisPool = [...new Set([...(BELLE_PHOTOS[axis] || []), ...BELLE_DEFAULT_PHOTOS, ...EXTRA_PHOTOS])]
    .filter(id => !/\s/.test(id));
  let pool = axisPool.filter(id => !usedIds.has(id));
  if (pool.length < 2) pool = axisPool;
  const seed = slugHash(seedStr);
  const i1 = seed % pool.length;
  const i2 = (seed + Math.max(1, Math.floor(pool.length / 2))) % pool.length;

  const imgHtml = (id) =>
    `<figure style="margin:28px 0"><img src="${unsplashUrl(id)}" alt="" loading="lazy" style="width:100%;border-radius:12px;display:block;box-shadow:0 8px 32px rgba(60,0,30,0.2)"/></figure>`;

  let h2s = [...html.matchAll(/<\/h2>/g)];
  if (h2s.length >= 2) {
    const pos = h2s[1].index + 5;
    html = html.slice(0, pos) + imgHtml(pool[i1]) + html.slice(pos);
  } else if (h2s.length === 1) {
    const pos = h2s[0].index + 5;
    html = html.slice(0, pos) + imgHtml(pool[i1]) + html.slice(pos);
  }

  h2s = [...html.matchAll(/<\/h2>/g)];
  const idx = Math.floor(h2s.length * 0.6);
  if (h2s[idx]) {
    const pos2 = h2s[idx].index + 5;
    html = html.slice(0, pos2) + imgHtml(pool[i2]) + html.slice(pos2);
  }
  return html;
}

async function generateBelleArticle(theme, existing = [], linkPool = []) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const existingList = existing.length > 0
    ? `\n\n【カバー済みテーマ（重複禁止）】\n以下と同じ切り口・タイトルの記事は書かないこと：\n${
        existing.slice(-40).map(a => `・${a.title}${a.description ? `（${a.description.slice(0, 50)}）` : ''}`).join('\n')
      }`
    : '';

  const linkList = linkPool.length > 0
    ? `\n\n【内部リンク（本文中に自然に2〜3本入れる・関連するものだけ）】\n形式：[アンカーテキスト](${BASE_URL}/belle/journal/スラッグ)\n候補：\n${linkPool.slice(0, 20).map(a => `・/belle/journal/${a.slug} : ${a.title}`).join('\n')}`
    : '';

  const HOOKS = [
    '数字で断定（例:「9割の女性が知らない〜」「3つのステップで〜」）',
    '問いかけ（例:「なぜ〜なのか？」「あなたは〜していますか？」）',
    '逆張り・common misconception（例:「〜は実は逆効果」「〜は必要ない」）',
    '比較（例:「垢抜けた女性とそうでない女性の〜の違い」）',
    'チェックリスト/診断（例:「当てはまったら今すぐ変えるべき〜」）',
    '体験談起点（例:「最初は〜だったけど、〜で変わった話」）',
  ];
  const hook = HOOKS[Math.floor(Date.now() / 86400000) % HOOKS.length];

  const system = `あなたはFineme Belle（外見を起点に自信を再設計する女性向けプラットフォーム）のSEOコンテンツライター。恋愛・外見に悩む20〜30代女性に向けた、実用的で共感しやすい情報記事を書く。

【Fineme Belleのブランド思想】
「誰かに選ばれるために磨くんじゃない。自分が自分を幸せにすると決めた日から、外見は変わる。」
外見改善は「他人に選ばれるため」ではなく「自分が自分を大切にするための最初の一歩」。この視点を記事のトーンの根底に置く。

【最重要・受け身をやめる】直近の自作記事と"似せない"。タイトルの骨格・切り口・語り口を毎回変える。今回のタイトルは必ず次のフック型で作る：**${hook}**。「〜する方法」「〜のコツ」など定型の連発は禁止。

【記事の目的】
Google検索で上位表示し、読者がBelle Me Scan（${BASE_URL}/belle/diagnosis）またはBelle Mirror（${BASE_URL}/belle/mirror）に進む導線を自然に作る。

【文体】
- 共感から入る（読者の気持ちを受け止めてから情報提供）
- 断定的・具体的・数字を使う
- 上から目線にならない・押しつけない（「〜してみてください」より「〜してみると変わった人が多い」）
- H2/H3見出しを使ってSEOスキャン構造を作る

【Belle Me Scan CTAの埋め込み（必須・1回）】
記事の中盤の関連するH2セクション末尾に、以下の形式で自然に1回挿入する：
**→ [Belle Me Scanで自分のコンパスを確認する（無料）](${BASE_URL}/belle/diagnosis)**

【出力フォーマット（最初の4行は必ずこの形式。---の前は絶対にこれだけ）】
slug: kebab-case-english-slug
title: 日本語タイトル（28〜40字）
category: カテゴリ（眉毛・スキンケア・ヘア・ファッション・ネイル・脱毛・歯・笑顔・ボディ・考え方・垢抜け のいずれか）
description: SEO用説明文（100〜120字、記事の要点と検索意図を含める）
---
## 最初のH2見出し
本文...

【視覚効果（必須）】
重要なポイントや共感フレーズは > から始まる引用形式で書く（1〜2行）。
記事全体で必ず2〜3か所使う。

【構成】
1. 導入（読者の悩みへの共感 + この記事で得られる価値）
2. H2 × 3〜5個（具体的な情報・ステップ・判断軸）
3. まとめ（Me Scan または Mirror への自然な誘導で締める）

【長さ】2000〜3000字。${existingList}${linkList}`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    temperature: 0.8,
    system,
    messages: [{
      role: 'user',
      content: `今回のテーマ軸：「${theme.axis}」\nテーマ詳細：${theme.prompt}\n\nこのテーマで、Googleで上位表示できる実用的なSEO記事を1本書いてください。`,
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

  // Belle既存記事を取得（テーマ重複チェック＋内部リンク候補）
  const { data: existing } = await supabase
    .from('features')
    .select('slug, title, category, description, published_at')
    .eq('status', 'published')
    .eq('track', 'belle');

  const thirtyDaysAgo = Date.now() - 30 * 60 * 60 * 24 * 1000;
  const recentPublished = (existing || [])
    .filter(a => a.published_at && new Date(a.published_at).getTime() > thirtyDaysAgo);
  const recentCategories = new Set(recentPublished.map(a => a.category).filter(Boolean));
  const recentTitles = recentPublished.map(a => a.title).filter(Boolean);

  // 未使用カテゴリのテーマにローテーション
  const day = Math.floor(Date.now() / 86400000);
  const availableThemes = BELLE_THEMES.filter(t => {
    const cat = BELLE_AXIS_CATEGORY_MAP[t.axis];
    return !cat || !recentCategories.has(cat);
  });
  const theme = (availableThemes.length > 0 ? availableThemes : BELLE_THEMES)[day % (availableThemes.length || BELLE_THEMES.length)];

  const linkPool = (existing || []).filter(a => a.slug);

  try {
    const raw = await generateBelleArticle(theme, existing || [], linkPool);
    if (!raw) return Response.json({ error: 'no article generated' }, { status: 500 });

    const { slug, title, category, description, body } = parseArticle(raw);
    if (!title || !body) return Response.json({ error: 'parse failed' }, { status: 500 });

    const dateStr = new Date().toISOString().slice(0, 10);
    const finalSlug = `${slug || 'belle'}-${dateStr}`;
    const bodyHtml = mdToHtml(body);

    // 直近12記事で使用済み画像IDを収集（金太郎飴防止）
    const usedIds = new Set();
    try {
      const { data: recent } = await supabase.from('features')
        .select('body').eq('status', 'published').eq('track', 'belle')
        .order('published_at', { ascending: false }).limit(12);
      (recent || []).forEach(r => [...(r.body || '').matchAll(/photo-([0-9a-z]+)\?/g)].forEach(m => usedIds.add(m[1])));
    } catch {}

    const bodyHtmlWithImages = injectImages(bodyHtml, theme.axis, finalSlug, usedIds);

    // Belle版OG画像（roseグラデーションをパラメータで要求）
    const thumbnailUrl = `${BASE_URL}/api/og/feature-cover?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category || theme.axis)}&track=belle`;
    const now = new Date().toISOString();

    const { error: insertError } = await supabase
      .from('features')
      .insert({
        slug:        finalSlug,
        title,
        category:    category || '',
        description: description || '',
        summary:     description || '',
        body:        bodyHtmlWithImages,
        thumbnail:   thumbnailUrl,
        reading_time: 8,
        status:      'published',
        published_at: now,
        track:       'belle',
      });

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

    revalidatePath('/belle/journal');
    revalidatePath(`/belle/journal/${finalSlug}`);

    // IndexNow
    try {
      await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: 'www.fineme.me', key: INDEXNOW_KEY, keyLocation: `https://www.fineme.me/${INDEXNOW_KEY}.txt`, urlList: [`${BASE_URL}/belle/journal/${finalSlug}`] }),
      });
    } catch {}

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Fineme Belle 記事 <noreply@fineme.me>',
        to: OWNER_EMAIL,
        subject: `【Belle Journal 記事公開】${title}`,
        html: `
          <div style="font-family:sans-serif;max-width:680px;margin:0 auto">
            <h2 style="color:#111">🌸 Belle Journal 記事が自動公開されました</h2>
            <p style="color:#555;font-size:13px">テーマ軸：${theme.axis} ／ カテゴリ：${category}</p>
            <div style="background:#fff0f5;border:1px solid #f9b8cf;border-radius:8px;padding:16px 20px;margin:16px 0 24px">
              <p style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 8px">${title.replace(/</g, '&lt;')}</p>
              <p style="font-size:13px;color:#555;margin:0">${(description || '').replace(/</g, '&lt;')}</p>
            </div>
            <a href="${BASE_URL}/belle/journal/${finalSlug}" style="display:inline-block;background:#c8648c;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">記事を確認する →</a>
            <p style="font-size:12px;color:#999;margin:24px 0 0">管理画面：<a href="${BASE_URL}/admin/features" style="color:#c8648c">${BASE_URL}/admin/features</a></p>
          </div>
        `,
      });
    }

    console.log(`[belle-article] Published. slug="${finalSlug}" title="${title}" theme="${theme.axis}"`);
    return Response.json({ success: true, slug: finalSlug, title, theme: theme.axis });
  } catch (e) {
    console.error('[belle-article] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
