// POST /api/admin/affiliates/[id]/extract-areas
// アフィリエイトのサービス情報からエリア候補をAIで自動抽出
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

// 都道府県正規化（「都」「道」「府」「県」なしでも対応）
const PREFS = ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];

function normalizePref(s) {
  if (!s) return '';
  const found = PREFS.find(p => p.startsWith(s.replace(/[都道府県]$/,'')) || p === s);
  return found || s;
}

export async function POST(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const { data: affiliate } = await supabase
    .from('providers')
    .select('name, catchphrase, description, affiliate_url, main_category')
    .eq('id', id)
    .eq('entity_type', 'affiliate')
    .single();

  if (!affiliate) return Response.json({ error: 'Not found' }, { status: 404 });

  // サービスURLからページ内容を取得（任意）
  let pageContent = '';
  if (affiliate.affiliate_url) {
    try {
      const res = await fetch(affiliate.affiliate_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Fineme/1.0)' },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const html = await res.text();
        pageContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000);
      }
    } catch { /* スキップ */ }
  }

  const context = [
    `サービス名: ${affiliate.name}`,
    affiliate.catchphrase ? `キャッチコピー: ${affiliate.catchphrase}` : '',
    affiliate.description ? `説明: ${affiliate.description}` : '',
    pageContent ? `サイト内容（抜粋）:\n${pageContent}` : '',
  ].filter(Boolean).join('\n\n');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: `あなたは日本の地理情報の専門家です。
与えられたサービス情報から、そのサービスが展開している（または近い将来展開する可能性がある）都市・エリアを抽出してください。

以下のJSON配列のみを出力してください（コードブロックなし）:
[
  {"prefecture": "東京都", "city": "渋谷区"},
  {"prefecture": "大阪府", "city": "梅田"}
]

ルール：
- 都道府県名は正式名称（東京都/大阪府/京都府/北海道/○○県）
- cityは主要な市区町村名または地区名（駅名・ブランド名ではなく行政区域）
- 全国展開のサービスは主要都市（東京・大阪・名古屋・福岡・札幌・仙台・横浜・京都・神戸・広島）を返す
- 情報が不十分な場合は推測で主要都市を返す（空配列は返さない）
- 最大15件まで`,
    messages: [{ role: 'user', content: context }],
  });

  let areas = [];
  try {
    const raw = message.content[0]?.text?.trim() || '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    areas = JSON.parse(match ? match[0] : raw);
    // 都道府県名を正規化
    areas = areas.map(a => ({ ...a, prefecture: normalizePref(a.prefecture) }));
  } catch {
    areas = [];
  }

  return Response.json({ areas });
}
