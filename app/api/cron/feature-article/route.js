// GET /api/cron/feature-article
// 毎日3時JST（毎日）に /feature SEO記事を1本生成してSupabaseに自動公開
// Schedule: "0 3 * * *"
import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { getSupabase } from '@/lib/supabase';
import { BRAND_PHILOSOPHY } from '@/lib/brand-philosophy';
import { getGoogleAccessToken, querySearchConsole, dateRange } from '@/lib/gsc';

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || '4fbd52dc-784e-4ab8-97c4-f1f99e48b504';

// theme.axis → Claudeが生成するcategoryの対応表（重複チェック用）
const AXIS_CATEGORY_MAP = {
  '眉毛': '眉毛',               '眉毛サロン選び': '眉毛',
  '清潔感': '清潔感',           '清潔感チェック': '清潔感',
  'ヘア': 'ヘア',               'ヘアサロン': 'ヘア',
  'ファッション': 'ファッション', '骨格診断': 'ファッション',
  'Mirror活用': '外見改善',     '垢抜け': '外見改善',     '7軸優先順位': '外見改善',
  '体型': '体型',
  'マッチングアプリ': 'マッチングアプリ', 'マッチングアプリ写真': 'マッチングアプリ',
  '肌': '肌',
  '歯': '歯',
  '爪': '爪',
  '自己肯定感': '変容の思想',   'でお変容': '変容の思想',  '恋愛と外見': '変容の思想',
};

const UNSPLASH_PHOTOS = {
  '眉毛':             ['1503951914875-452162b0f3f1', '1621605815971-a6e613a8e4af', '1500648767791-00dcc994a43e', '1544005139-4c2743543a26'],
  '清潔感':           ['1507003211169-0a1dd7228f2d', '1619895862022-09114b41f16f', '1472099645785-5658abf4ff4e', '1519085360753-af0119f7cbe7'],
  'ヘア':             ['1622286342621-4bd786c2447c', '1503951914875-452162b0f3f1', '1514866487916-cfe9d28d95ae', '1584308666744-5e3ff8b79f5c'],
  'ファッション':     ['1516914943479-89db7d9ae7f2', '1490578474895-399ad4ea0078', '1519085360753-af0119f7cbe7', '1544005139-4c2743543a26'],
  'Mirror活用':       ['1611532736597-de2d4265fba3', '1558618666-fcd25c85cd64', '1586297135537-94bc81ba3404', '1472099645785-5658abf4ff4e'],
  '体型':             ['1517836357463-d25dfeac3438', '1571019613454-1cb2f99b2d8b', '1493256338651-d82f7acb2b38', '1599058945845-196e7f66aa32'],
  'マッチングアプリ': ['1611532736597-de2d4265fba3', '1516914943479-89db7d9ae7f2', '1586297135537-94bc81ba3404', '1519085360753-af0119f7cbe7'],
  '肌':               ['1598300042247-d088f8ab3a91', '1559599076-9bfed934a7fb', '1559181567-c3190b7c2c3d', '1522338242992-e1d3aba00e05'],
  '垢抜け':           ['1507003211169-0a1dd7228f2d', '1622286342621-4bd786c2447c', '1519085360753-af0119f7cbe7', '1544005139-4c2743543a26'],
  '歯':               ['1607748862144-7a75854b0dee', '1581591524425-c7e0978865fc', '1500648767791-00dcc994a43e', '1472099645785-5658abf4ff4e'],
  '7軸優先順位':     ['1484480974693-6ca0a78fb36b', '1499750310107-5fef28a66643', '1454165205-1bf3cf398ef9', '1606857521015-7463de785e52'],
  '自己肯定感':       ['1605296867304-46d5465a13f1', '1507003211169-0a1dd7228f2d', '1544005139-4c2743543a26', '1519085360753-af0119f7cbe7'],
  '骨格診断':         ['1490578474895-399ad4ea0078', '1516914943479-89db7d9ae7f2', '1519085360753-af0119f7cbe7', '1544005139-4c2743543a26'],
  '清潔感チェック':   ['1507003211169-0a1dd7228f2d', '1619895862022-09114b41f16f', '1472099645785-5658abf4ff4e', '1500648767791-00dcc994a43e'],
  '爪':               ['1604654894610-df63bc536371', '1605296867304-46d5465a13f1', '1519085360753-af0119f7cbe7', '1544005139-4c2743543a26'],
  'でお変容':         ['1599566150163-29194dcaad36', '1507003211169-0a1dd7228f2d', '1544005139-4c2743543a26', '1472099645785-5658abf4ff4e'],
  '恋愛と外見':       ['1516914943479-89db7d9ae7f2', '1502323703110-88f8df51d9a2', '1519085360753-af0119f7cbe7', '1544005139-4c2743543a26'],
  'ヘアサロン':       ['1622286342621-4bd786c2447c', '1503951914875-452162b0f3f1', '1514866487916-cfe9d28d95ae', '1584308666744-5e3ff8b79f5c'],
  'マッチングアプリ写真': ['1611532736597-de2d4265fba3', '1516914943479-89db7d9ae7f2', '1586297135537-94bc81ba3404', '1472099645785-5658abf4ff4e'],
  '眉毛サロン選び':   ['1503951914875-452162b0f3f1', '1621605815971-a6e613a8e4af', '1500648767791-00dcc994a43e', '1514866487916-cfe9d28d95ae'],
};
const DEFAULT_PHOTOS = ['1507003211169-0a1dd7228f2d', '1516914943479-89db7d9ae7f2', '1472099645785-5658abf4ff4e', '1544005139-4c2743543a26'];

function unsplashUrl(id) {
  return `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;
}

function slugHash(s) {
  return Math.abs([...s].reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0));
}

// GSCで「勝てそうなクエリ」を探す。最近使用済みカテゴリに近いクエリはスキップ
async function pickOpportunityTheme(recentCategories = new Set()) {
  try {
    const token = await getGoogleAccessToken();
    const rows = await querySearchConsole(token, { ...dateRange(28), dimensions: ['query'], rowLimit: 100 });
    const opp = rows
      .map(r => ({ q: r.keys?.[0] || '', imp: r.impressions || 0, pos: r.position || 99, clicks: r.clicks || 0 }))
      .filter(r => r.q && r.imp >= 1 && r.pos >= 8 && r.pos <= 70 && r.q.length >= 6)
      .sort((a, b) => b.imp - a.imp)[0];
    if (!opp) return null;
    // 30日以内に同じカテゴリを書いていたらスキップ（カニバリゼーション防止）
    const dominated = [...recentCategories].some(cat =>
      opp.q.includes(cat) || cat.includes(opp.q.slice(0, 3))
    );
    if (dominated) return null;
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

    // 色はページ側 .article-html-body CSS に任せる（インラインで色を焼き込まない＝テーマ非依存）
    if (first.startsWith('# '))   return `<h1>${inline(first.slice(2))}</h1>`;
    if (first.startsWith('## '))  return `<h2>${inline(first.slice(3))}</h2>`;
    if (first.startsWith('### ')) return `<h3>${inline(first.slice(4))}</h3>`;

    if (lines.every(l => l.startsWith('> '))) {
      const text = lines.map(l => inline(l.slice(2))).join('<br>');
      return `<div style="border-left:3px solid #c9a84c;background:rgba(201,168,76,0.06);border-radius:0 10px 10px 0;padding:14px 20px;margin:24px 0;line-height:1.8">${text}</div>`;
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

// 画像の多様性を広げる共通プール（金太郎飴防止・直近使用は除外）
const EXTRA_PHOTOS = [
  '1488161628813-04466f872be2', '1519085360753-af0119f7cbe7', '1506794778202-cad84cf45f1d',
  '1500648767791-00dcc994a43e', '1508341591423-4347099e1f19', '1492562080023-ab3db95bfbde',
  '1521119989659-a83eee488004', '1534030347209-467a5b0ad3e6', '1463453091185-61582044d556',
  '1552374196-c4e7ffc6e126', '1531384441138-2736e62e0919', '1507591064344-4c6ce005b128',
  '1500648767791-00dcc994a43e', '1489980557514-251d61e3eeb6', '1618987333535-9f1f0f0e7a7f',
];

// slugHash をシードに写真を選ぶ。直近で使った画像は避けて毎回違う絵にする。
function injectImages(html, axis, seedStr = '', usedIds = new Set()) {
  const merged = [...new Set([...(UNSPLASH_PHOTOS[axis] || []), ...DEFAULT_PHOTOS, ...EXTRA_PHOTOS])]
    .filter(id => !/\s/.test(id)); // タイポ防止
  let pool = merged.filter(id => !usedIds.has(id));
  if (pool.length < 2) pool = merged; // 全部使い切っていたら全プールから
  const seed = slugHash(seedStr);
  const photos = pool;
  const i1 = seed % photos.length;
  const i2 = (seed + Math.max(1, Math.floor(photos.length / 2))) % photos.length;

  const imgHtml = (id) =>
    `<figure style="margin:28px 0"><img src="${unsplashUrl(id)}" alt="" loading="lazy" style="width:100%;border-radius:12px;display:block;box-shadow:0 8px 32px rgba(10,15,30,0.3)"/></figure>`;

  let h2s = [...html.matchAll(/<\/h2>/g)];
  if (h2s.length >= 2) {
    const pos = h2s[1].index + 5;
    html = html.slice(0, pos) + imgHtml(photos[i1]) + html.slice(pos);
  } else if (h2s.length === 1) {
    const pos = h2s[0].index + 5;
    html = html.slice(0, pos) + imgHtml(photos[i1]) + html.slice(pos);
  }

  h2s = [...html.matchAll(/<\/h2>/g)];
  const idx = Math.floor(h2s.length * 0.6);
  if (h2s[idx]) {
    const pos2 = h2s[idx].index + 5;
    html = html.slice(0, pos2) + imgHtml(photos[i2]) + html.slice(pos2);
  }
  return html;
}

async function generateArticle(theme, existing = [], linkPool = []) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const existingList = existing.length > 0
    ? `\n\n【カバー済みテーマ（重複禁止）】\n以下と同じ切り口・タイトルの記事は書かないこと：\n${
        existing.slice(-40).map(a => `・${a.title}${a.description ? `（${a.description.slice(0, 50)}）` : ''}`).join('\n')
      }`
    : '';

  const linkList = linkPool.length > 0
    ? `\n\n【内部リンク（本文中に自然に2〜3本入れる・関連するものだけ）】\n形式：[アンカーテキスト](${BASE_URL}/feature/スラッグ)\n候補：\n${linkPool.slice(0, 30).map(a => `・/feature/${a.slug} : ${a.title}`).join('\n')}`
    : '';

  // 直近タイトルと"かぶらないフック型"をローテ（金太郎飴防止）
  const HOOKS = [
    '数字で断定（例:「9割の男が間違える〜」「3ステップで〜」）',
    '問いかけ（例:「なぜ〜なのか？」）',
    '逆張り・common misconception（例:「〜は実は逆効果」）',
    '体験談起点（例:「元・非モテのでおが〜で変わった話」）',
    '比較（例:「モテる男とそうでない男の〜の違い」）',
    'チェックリスト/診断（例:「当てはまったら要注意な〜」）',
  ];
  const hook = HOOKS[Math.floor(Date.now() / 86400000) % HOOKS.length];

  const system = `あなたはFineme（外見を起点に自信を再設計する男性向けプラットフォーム）のSEOコンテンツライター。でおの視点・体験談を引用しながら、恋愛・外見改善に悩む20〜30代男性向けの実用的な情報記事を書く。

【最重要・受け身をやめる】直近の自作記事と"似せない"。タイトルの骨格・切り口・語り口を毎回変える。今回のタイトルは必ず次のフック型で作る：**${hook}**。「〜する方法」「〜のコツ」など直近と同じ定型の連発は禁止。中身も他の記事と差別化し、読者が具体的に得する角度を自分で選ぶ。

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

【視覚効果（必須）】
重要なポイント・でおの体験談の核心・読者への問いかけは > から始まる引用形式で書く（1〜3行）。
記事全体で必ず2〜3か所使う（例: > でおも最初はここで詰まった。〜だったからだ。）

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

  // 既存記事をまず取得（テーマ重複チェック＋内部リンク候補＋Claude重複回避リスト）
  const { data: existing } = await supabase
    .from('features')
    .select('slug, title, category, description, published_at')
    .eq('status', 'published');

  // 過去30日に使用済みカテゴリを抽出（カニバリゼーション防止）
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentCategories = new Set(
    (existing || [])
      .filter(a => a.published_at && new Date(a.published_at).getTime() > thirtyDaysAgo)
      .map(a => a.category)
      .filter(Boolean)
  );

  // 未使用カテゴリのテーマに絞ってローテーション
  const day = Math.floor(Date.now() / 86400000);
  const availableThemes = THEMES.filter(t => {
    const cat = AXIS_CATEGORY_MAP[t.axis];
    return !cat || !recentCategories.has(cat);
  });
  const fallbackTheme = (availableThemes.length > 0 ? availableThemes : THEMES)[day % (availableThemes.length || THEMES.length)];

  // テーマ選択：GSCの「勝てそうなクエリ」を優先。最近使用済みカテゴリと被るならスキップ
  const theme = (await pickOpportunityTheme(recentCategories)) || fallbackTheme;

  const linkPool = (existing || []).filter(a => a.slug);

  try {
    const raw = await generateArticle(theme, existing || [], linkPool);
    if (!raw) return Response.json({ error: 'no article generated' }, { status: 500 });

    const { slug, title, category, description, body } = parseArticle(raw);
    if (!title || !body) return Response.json({ error: 'parse failed' }, { status: 500 });

    const dateStr = new Date().toISOString().slice(0, 10);
    const finalSlug = `${slug || 'feature'}-${dateStr}`;
    const bodyHtml = mdToHtml(body);
    const thumbnailUrl = `${BASE_URL}/api/og/feature-cover?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category || theme.axis)}`;
    // 直近12記事で使った画像IDを集めて重複回避（金太郎飴防止）
    const usedIds = new Set();
    try {
      const { data: recent } = await supabase.from('features').select('body').eq('status', 'published').order('published_at', { ascending: false }).limit(12);
      (recent || []).forEach(r => [...(r.body || '').matchAll(/photo-([0-9a-z]+)\?/g)].forEach(m => usedIds.add(m[1])));
    } catch {}
    const bodyHtmlWithImages = injectImages(bodyHtml, theme.axis, finalSlug, usedIds);
    const now = new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from('features')
      .insert({
        slug:        finalSlug,
        title,
        category:    category    || '',
        description: description || '',
        summary:     description || '',
        body:        bodyHtmlWithImages,
        thumbnail:   thumbnailUrl,
        reading_time: 8,
        status:      'published',
        published_at: now,
      })
      .select()
      .single();

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

    revalidatePath('/feature');
    revalidatePath(`/feature/${finalSlug}`);
    await indexNowSubmit([`${BASE_URL}/feature/${finalSlug}`]);

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
            <p style="color:#555;font-size:13px;margin:0 0 4px">テーマ軸：${theme.axis} ／ カテゴリ：${category}（除外済みカテゴリ数：${recentCategories.size}）</p>
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

    console.log(`[feature-article] Published. slug="${finalSlug}" title="${title}" theme="${theme.axis}" recentCats=${[...recentCategories].join(',')}`);
    return Response.json({ success: true, slug: finalSlug, title, theme: theme.axis });
  } catch (e) {
    console.error('[feature-article] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
