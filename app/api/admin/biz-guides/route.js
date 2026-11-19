// 運営管理画面：店舗運営ガイド・営業パートナーガイドの記事の一覧と編集。
// GET  /api/admin/biz-guides            一覧（固定記事 lib/biz-guide.js ＋ biz_guides テーブル。編集済みの固定記事は DB 側を返す）
// PUT  /api/admin/biz-guides            1本を保存（slug で上書き・無ければ作る）。固定記事を保存すると DB に同じ slug の行ができ、以後そちらが表示される
// 管理APIキー（x-admin-key）必須。書き込みは service role。
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { SHOP_GUIDES, PARTNER_GUIDES, SHOP_GUIDE_BASE, PARTNER_GUIDE_BASE } from '@/lib/biz-guide';
import { checkGuide } from '@/lib/biz-guide-check';

const BASE = { shop: SHOP_GUIDE_BASE, partner: PARTNER_GUIDE_BASE };
const STATIC = { shop: SHOP_GUIDES, partner: PARTNER_GUIDES };

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key');
  return Boolean(key && process.env.ADMIN_API_KEY && key === process.env.ADMIN_API_KEY);
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v, max) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean) : []);

// 受け取った記事を、保存してよい形・長さだけに絞る
function clean(b) {
  return {
    slug: str(b.slug, 80),
    audience: b.audience === 'partner' ? 'partner' : 'shop',
    title: str(b.title, 80),
    description: str(b.description, 400),
    lead: str(b.lead, 1500),
    sections: (Array.isArray(b.sections) ? b.sections : []).slice(0, 20).map((s) => ({
      h: str(s?.h, 120),
      p: strList(s?.p, 3000).slice(0, 20),
      list: strList(s?.list, 500).slice(0, 30),
      ...(s?.listFirst ? { listFirst: true } : {}),
      ...(typeof s?.img === 'string' && /^https:\/\/images\.unsplash\.com\/[^\s"']+$/.test(s.img.trim()) ? { img: s.img.trim().slice(0, 300) } : {}),
    })),
    fineme: str(b.fineme, 1500),
    faq: (Array.isArray(b.faq) ? b.faq : []).slice(0, 15).map((f) => [str(f?.[0], 300), str(f?.[1], 1500)]),
    related: strList(b.related, 80).slice(0, 6),
    status: b.status === 'draft' ? 'draft' : 'published',
  };
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await db()
    .from('biz_guides')
    .select('slug, audience, topic_key, title, description, lead, sections, fineme, faq, related, status, created_at, updated_at')
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const rows = data || [];
  const inDb = new Set(rows.map((r) => `${r.audience}:${r.slug}`));
  const fixed = Object.entries(STATIC).flatMap(([audience, list]) =>
    list.filter((a) => !inDb.has(`${audience}:${a.slug}`)).map((a) => ({ ...a, audience, status: 'published', source: 'static' })));
  return Response.json({
    guides: [...rows.map((r) => ({ ...r, source: 'db' })), ...fixed],
    base: BASE,
  });
}

export async function PUT(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: '内容が読めませんでした' }, { status: 400 });
  const a = clean(body);
  const { errs, warns, len } = checkGuide(a);
  if (errs.length) return Response.json({ error: errs.join(' / ') }, { status: 400 });
  if (warns.length && !body.force) return Response.json({ warns, len }, { status: 422 });

  const supa = db();
  const { data: existing } = await supa.from('biz_guides').select('id, audience').eq('slug', a.slug).maybeSingle();
  if (existing && existing.audience !== a.audience) return Response.json({ error: 'このURLは別の対象の記事で使われています' }, { status: 409 });
  if (body.isNew && (existing || STATIC[a.audience].some((x) => x.slug === a.slug))) {
    return Response.json({ error: 'このURLの記事はもうあります' }, { status: 409 });
  }

  const row = { ...a, sections: a.sections, faq: a.faq, related: a.related, updated_at: new Date().toISOString() };
  const res = existing
    ? await supa.from('biz_guides').update(row).eq('id', existing.id)
    : await supa.from('biz_guides').insert({ ...row, topic_key: a.slug });
  if (res.error) return Response.json({ error: res.error.message }, { status: 500 });

  const base = BASE[a.audience];
  revalidatePath(base);
  revalidatePath(`${base}/${a.slug}`);
  return Response.json({ ok: true, url: `${base}/${a.slug}`, len });
}

