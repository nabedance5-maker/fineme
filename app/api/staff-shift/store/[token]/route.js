// お店に1本のシフト希望の提出リンク（でお要望 2026-10-27：スタッフ一人ひとりにリンクを送るのではなく、お店に1つ）。
// GET  → お店の名前とスタッフの一覧（番号・名前・入り方）
// POST { staff_id, password } → パスワードが合えば、そのスタッフの提出画面の鍵（shift_access_token）を返す
// POST（Authorization付き） → Finemeのスタッフアカウントでログインしている人は、パスワード無しでその人の提出画面へ
// パスワードは5回間違えると10分間入れない。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { verifyPin } from '@/lib/attendance';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const isUuid = s => /^[0-9a-f-]{36}$/i.test(String(s || ''));

async function storeOf(token) {
  if (!isUuid(token)) return null;
  const { data } = await supabase.from('providers').select('id, name').eq('shift_link_token', token).maybeSingle();
  return data || null;
}

export async function GET(request, { params }) {
  const { token } = await params;
  const store = await storeOf(token);
  if (!store) return Response.json({ error: 'リンクが無効です。お店に新しいリンクを確認してください' }, { status: 404 });
  const [{ data: staff }, { data: members }] = await Promise.all([
    supabase.from('provider_staff').select('id, name, shift_pin_hash').eq('provider_id', store.id).order('sort_order').order('created_at'),
    supabase.from('provider_members').select('staff_id').eq('provider_id', store.id).eq('status', 'active').not('staff_id', 'is', null),
  ]);
  const withLogin = new Set((members || []).map(m => m.staff_id));
  return Response.json({
    store_name: store.name,
    staff: (staff || []).map((s, i) => ({ id: s.id, number: i + 1, name: s.name, has_password: !!s.shift_pin_hash, has_login: withLogin.has(s.id) })),
  });
}

export async function POST(request, { params }) {
  const { token } = await params;
  const store = await storeOf(token);
  if (!store) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  // Finemeのスタッフアカウントでログインしている人
  const bearer = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (bearer) {
    const { data: { user } } = await supabase.auth.getUser(bearer);
    if (user) {
      const base = () => supabase.from('provider_members').select('staff_id').eq('provider_id', store.id).eq('status', 'active').not('staff_id', 'is', null).limit(1);
      const { data: byId } = await base().eq('user_id', user.id).maybeSingle();
      const { data: byMail } = byId ? { data: null } : await base().ilike('email', String(user.email || '')).maybeSingle();
      const m = byId || byMail;
      if (m?.staff_id) {
        const { data: st } = await supabase.from('provider_staff').select('shift_access_token').eq('id', m.staff_id).maybeSingle();
        if (st?.shift_access_token) return Response.json({ token: st.shift_access_token });
      }
    }
  }

  const body = await request.json().catch(() => ({}));
  const { data: staff } = await supabase.from('provider_staff')
    .select('id, shift_pin_hash, shift_pin_failures, shift_pin_locked_until, shift_access_token').eq('id', body.staff_id).eq('provider_id', store.id).maybeSingle();
  if (!staff) return Response.json({ error: 'スタッフを選んでください' }, { status: 400 });
  if (!staff.shift_pin_hash) return Response.json({ error: 'パスワードがまだ決まっていません。お店の方に決めてもらってください' }, { status: 400 });
  if (staff.shift_pin_locked_until && new Date(staff.shift_pin_locked_until) > new Date()) {
    return Response.json({ error: '何度か間違えたため、10分ほど入れません。少し待ってからもう一度お試しください' }, { status: 429 });
  }
  if (!verifyPin(String(body.password || ''), staff.shift_pin_hash)) {
    const failures = (staff.shift_pin_failures || 0) + 1;
    await supabase.from('provider_staff').update({
      shift_pin_failures: failures >= 5 ? 0 : failures,
      shift_pin_locked_until: failures >= 5 ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null,
    }).eq('id', staff.id);
    return Response.json({ error: 'パスワードが違います' }, { status: 401 });
  }
  if (staff.shift_pin_failures) await supabase.from('provider_staff').update({ shift_pin_failures: 0 }).eq('id', staff.id);
  let accessToken = staff.shift_access_token;
  if (!accessToken) {
    accessToken = crypto.randomUUID();
    await supabase.from('provider_staff').update({ shift_access_token: accessToken }).eq('id', staff.id);
  }
  return Response.json({ token: accessToken });
}
