// GET  /api/provider/setup-guide → 初期設定ガイドの手順と、それぞれ終わっているか（お店の実データから判定）
// POST /api/provider/setup-guide { action: 'skip' | 'unskip', key } → その手順を「あとでやる」にする・戻す
// POST /api/provider/setup-guide { action: 'hide' | 'show' } → ガイドを閉じる・もう一度出す
// 2026-11-26 渡邉要望。手順の定義は lib/setup-guide.js。
// ログインしたお店の分だけを数える（店舗はログインの印から決める。URLやbodyの店舗IDは受け取らない）。
// 返すのは件数の有無と手順の文言だけで、お客様の名前などの個人情報は返さない。スタッフのログインにはガイドを出さない。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { memberAuth } from '@/lib/provider-members';
import { hasFeature } from '@/lib/feature-flags';
import { normalizeAnswers } from '@/lib/onboarding';
import { buildSetupSteps, SETUP_STEP_KEYS } from '@/lib/setup-guide';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const head = { count: 'exact', head: true };
const n = r => r?.count || 0;

async function auth(request) {
  const a = await memberAuth(request);
  if (!a) return { res: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (a.user.fineme_member?.role === 'staff') return { staff: true };
  return { pid: a.provider.id };
}

export async function GET(request) {
  const a = await auth(request);
  if (a.res) return a.res;
  if (a.staff) return Response.json({ hidden: true, steps: [] });
  const pid = a.pid;
  const [{ data: p }, { data: ob }, services, staff, manual, profiles, packages, { data: line }] = await Promise.all([
    supabase.from('providers').select('plan, enabled_features, photo_url, catchphrase, business_hours, booking_unit, stripe_connect_status, published').eq('id', pid).single(),
    supabase.from('provider_onboarding').select('answers, completed_at, setup_skipped, setup_hidden_at').eq('provider_id', pid).maybeSingle(),
    supabase.from('provider_services').select('id', head).eq('provider_id', pid),
    supabase.from('provider_staff').select('id', head).eq('provider_id', pid),
    supabase.from('provider_manual_customers').select('id', head).eq('provider_id', pid),
    supabase.from('provider_customer_profiles').select('id', head).eq('provider_id', pid),
    supabase.from('service_packages').select('id', head).eq('provider_id', pid),
    supabase.from('provider_line_channels').select('verified_at').eq('provider_id', pid).maybeSingle(),
  ]);
  if (!p) return Response.json({ error: 'お店が見つかりません' }, { status: 404 });
  const status = {
    photo: !!p.photo_url,
    catchphrase: !!String(p.catchphrase || '').trim(),
    businessHours: !!p.business_hours && Object.keys(p.business_hours).length > 0,
    bookingSet: !!p.booking_unit,
    services: n(services),
    staff: n(staff),
    customers: n(manual) + n(profiles),
    packages: n(packages),
    payments: p.stripe_connect_status === 'active',
    line: !!line?.verified_at,
    published: !!p.published,
  };
  const answers = ob?.answers && Object.keys(ob.answers).length ? normalizeAnswers(ob.answers) : null;
  const steps = buildSetupSteps(status, answers, { skipped: ob?.setup_skipped || [], canUse: key => hasFeature(p, key) });
  return Response.json({
    steps,
    hidden: !!ob?.setup_hidden_at,
    onboarded: !!ob?.completed_at,
    done: steps.filter(s => s.status === 'done').length,
    total: steps.length,
  });
}

export async function POST(request) {
  const a = await auth(request);
  if (a.res) return a.res;
  if (a.staff) return Response.json({ error: '初期設定は、オーナーか店長のログインで行ってください' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const { data: ob } = await supabase.from('provider_onboarding').select('setup_skipped').eq('provider_id', a.pid).maybeSingle();
  const now = new Date().toISOString();
  let patch;
  if (body.action === 'skip' || body.action === 'unskip') {
    if (!SETUP_STEP_KEYS.includes(body.key)) return Response.json({ error: '手順が見つかりません' }, { status: 400 });
    const cur = new Set(ob?.setup_skipped || []);
    if (body.action === 'skip') cur.add(body.key); else cur.delete(body.key);
    patch = { setup_skipped: [...cur].filter(k => SETUP_STEP_KEYS.includes(k)) };
  } else if (body.action === 'hide') patch = { setup_hidden_at: now };
  else if (body.action === 'show') patch = { setup_hidden_at: null };
  else return Response.json({ error: '操作が分かりません' }, { status: 400 });
  // 行が無いお店（はじめの質問に答えていない）でも保存できるよう upsert。completed_at は触らない（はじめの質問が出なくならないように）
  const { error } = await supabase.from('provider_onboarding').upsert({ provider_id: a.pid, ...patch, updated_at: now }, { onConflict: 'provider_id' });
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  return Response.json({ ok: true });
}
