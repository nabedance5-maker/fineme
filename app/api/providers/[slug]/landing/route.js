// GET /api/providers/[slug]/landing?axis=xxx → 公開情報。診断起点LP用のメニュー・事例・スタッフ
//
// コピー生成（headline/intro/menu_hooks/closing_line）について:
// 店舗が自分で書いた実テキスト(unique_strengths/philosophy/guide_message/best_fit_desc/
// catchphrase・各メニューのdescription)だけを事実としてClaude Haiku 4.5に渡し、軸ごとの
// 見出し・導入文・メニューごとの一言フック・締めの一言を生成する。価格・所要時間・写真・
// Before/Afterの実数値はAIに一切渡さず触らせない（provider_axis_intronsテーブル参照）。
// 元テキストが全部空、またはAI生成に失敗した場合はcopy:nullを返し、フロント側で
// 軸ラベルだけを使った固定テンプレートにフォールバックする。
export const dynamic = 'force-dynamic';
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { PROVIDER_AXIS_LABELS } from '@/lib/provider-axes';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

function sourceFacts(provider, axisLabel, menus) {
  const parts = [
    provider.catchphrase, provider.unique_strengths, provider.philosophy,
    provider.guide_message, provider.best_fit_desc,
    ...(menus || []).map(m => `${m.name}:${m.description || ''}`),
  ].filter(Boolean);
  return { parts, hash: createHash('sha256').update(axisLabel + '|' + parts.join('|')).digest('hex') };
}

async function getOrGenerateCopy(provider, axis, axisLabel, menus) {
  const { parts, hash } = sourceFacts(provider, axisLabel, menus);
  if (parts.length === 0) return null; // 事実が何も無いのにAIに作らせない

  const { data: cached } = await supabase
    .from('provider_axis_intros')
    .select('*')
    .eq('provider_id', provider.id)
    .eq('axis', axis)
    .single();
  if (cached && cached.source_hash === hash) {
    return { headline: cached.headline, intro: cached.intro, closingLine: cached.closing_line, menuHooks: cached.menu_hooks || {} };
  }

  if (!process.env.ANTHROPIC_API_KEY) return cached ? { headline: cached.headline, intro: cached.intro, closingLine: cached.closing_line, menuHooks: cached.menu_hooks || {} } : null;

  const factsText = parts.map((p, i) => `${i + 1}. ${p}`).join('\n');
  const menuList = (menus || []).slice(0, 6).map(m => `- id:${m.id} 名前:${m.name}`).join('\n') || '（メニュー未登録）';
  const prompt = `あなたは実在する店舗の紹介文を書くコピーライターです。
「${axisLabel}」に悩んでいる診断結果直後のユーザーが見る、この店舗専用の紹介ページに載せる文章を書いてください。

【厳守】
- 以下に列挙する店舗の実テキストに書かれている内容だけを事実として使うこと
- 実績・資格・数字・「業界No.1」等、事実に書かれていない主張は一切書かないこと
- 誇張・断定的な効果保証をしないこと
- 「叱咤しない、煽らない」トーンで、寄り添いながら背中を押す文章にすること

【店舗の実テキスト（この内容だけが事実）】
${factsText}

【この店舗のメニュー一覧（id付き）】
${menuList}

以下のJSON形式のみで出力してください（他のテキスト不要）:
{
  "headline": "見出し。25文字以内。店舗の実テキストの内容を反映した、他店と被らない具体的な一文",
  "intro": "導入文。80文字以内。なぜこの店舗が${axisLabel}に悩む人に合うか、実テキストの内容から",
  "closing_line": "予約ボタン直前に置く後押しの一言。20文字以内",
  "menu_hooks": { "メニューid": "そのメニューが${axisLabel}に悩む人になぜ合うかの一言。25文字以内。メニュー説明に書かれた内容のみから" }
}`;

  let parsed = null;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    parsed = null;
  }
  if (!parsed?.headline || !parsed?.intro) {
    return cached ? { headline: cached.headline, intro: cached.intro, closingLine: cached.closing_line, menuHooks: cached.menu_hooks || {} } : null;
  }

  const result = {
    headline: String(parsed.headline).slice(0, 60),
    intro: String(parsed.intro).slice(0, 200),
    closingLine: parsed.closing_line ? String(parsed.closing_line).slice(0, 40) : null,
    menuHooks: (parsed.menu_hooks && typeof parsed.menu_hooks === 'object') ? parsed.menu_hooks : {},
  };

  await supabase.from('provider_axis_intros').upsert({
    provider_id: provider.id, axis,
    headline: result.headline, intro: result.intro, closing_line: result.closingLine,
    menu_hooks: result.menuHooks, source_hash: hash, generated_at: new Date().toISOString(),
  }, { onConflict: 'provider_id,axis' });

  return result;
}

export async function GET(request, { params }) {
  const { slug } = params;
  const { searchParams } = new URL(request.url);
  const axis = searchParams.get('axis');

  const { data: provider } = await supabase
    .from('providers')
    .select('id, slug, name, catchphrase, photo_url, cover_image_url, facility_photos, area, price_from, main_category, unique_strengths, philosophy, guide_message, best_fit_desc')
    .eq('slug', slug)
    .eq('published', true)
    .single();
  if (!provider) return Response.json({ error: 'not-found' }, { status: 404 });

  const [{ data: menus }, { data: cases }, { data: staff }, { data: lineChannel }] = await Promise.all([
    supabase.from('provider_experience_menus').select('*').eq('provider_id', provider.id).eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('provider_cases').select('id, user_type, axis, before_score, after_score, image_url, published_at').eq('provider_id', provider.id).eq('approved_by_user', true).order('published_at', { ascending: false }),
    supabase.from('provider_staff').select('id, name, role, bio, photo_url, is_featured').eq('provider_id', provider.id),
    supabase.from('provider_line_channels').select('liff_id, verified_at').eq('provider_id', provider.id).single(),
  ]);

  const filteredMenus = axis ? (menus || []).filter(m => (m.axes || []).includes(axis)) : (menus || []);
  const finalMenus = filteredMenus.length ? filteredMenus : (menus || []); // 該当軸のメニューが無ければ全メニューを見せる（空表示より良い）
  const axisLabel = PROVIDER_AXIS_LABELS[axis] || axis || '';

  let copy = null;
  try {
    copy = await getOrGenerateCopy(provider, axis || 'other', axisLabel, finalMenus);
  } catch {
    copy = null; // AI生成に何が起きても本体データは返す
  }

  return Response.json({
    provider,
    hasContent: (menus || []).length > 0,
    axis,
    menus: finalMenus,
    cases: axis ? (cases || []).filter(c => c.axis === axis) : (cases || []),
    staff: (staff || []).sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)),
    copy, // { headline, intro, closingLine, menuHooks } | null
    // 店舗紹介QR経由の着地時、その場で店舗の公式LINE連携まで導くために使う（liff_id無しなら連携不可）
    lineLiffId: (lineChannel?.verified_at && lineChannel?.liff_id) ? lineChannel.liff_id : null,
  });
}
