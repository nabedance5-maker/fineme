// GET  /api/me/profile - 自分のプロフィールを取得
// PUT  /api/me/profile - 自分のプロフィールを保存
import { getSupabase } from '@/lib/supabase';
import { normalizeUserArea } from '@/lib/user-area';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
const CHECKIN_STATUS = new Set(['todo', 'done']);
function cleanCheckins(v) {
  if (!v || typeof v !== 'object') return null;
  const c = v.current && typeof v.current === 'object' ? v.current : null;
  const current = c && WEEK_RE.test(String(c.weekStart || '')) ? {
    weekStart: c.weekStart,
    axisId: String(c.axisId || '').slice(0, 32),
    stepText: String(c.stepText || '').slice(0, 200),
    status: CHECKIN_STATUS.has(c.status) ? c.status : 'todo',
    continuityAsked: !!c.continuityAsked,
  } : null;
  const history = (Array.isArray(v.history) ? v.history : [])
    .filter(h => h && WEEK_RE.test(String(h.weekStart || '')))
    .map(h => ({ weekStart: h.weekStart, status: CHECKIN_STATUS.has(h.status) ? h.status : 'todo' }))
    .slice(-8);
  return { current, history };
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('profiles')
    .select('display_name, share_diagnosis, share_roadmap, line_user_id, last_name, first_name, phone, axis_progress, step_done, area, city, body_data, navi_steps, birthday, mirror_privacy_consent_at, navi_checkins')
    .eq('id', user.id)
    .maybeSingle();

  return Response.json({
    id: user.id,
    display_name: data?.display_name || '',
    share_diagnosis: !!data?.share_diagnosis,
    share_roadmap: !!data?.share_roadmap,
    line_user_id: data?.line_user_id || null,
    last_name: data?.last_name || '',
    first_name: data?.first_name || '',
    phone: data?.phone || '',
    email: user.email || '',
    axis_progress: data?.axis_progress || {},
    step_done: data?.step_done || {},
    area: data?.area || '',
    city: data?.city || '',
    body_data: data?.body_data || {},
    navi_steps: data?.navi_steps || null,
    birthday: data?.birthday || '',
    mirror_privacy_consent_at: data?.mirror_privacy_consent_at || null,
    navi_checkins: data?.navi_checkins || null,
  });
}

export async function PUT(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { display_name, share_diagnosis, share_roadmap, last_name, first_name, phone, axis_progress, step_done, area, city, body_data, birthday, mirror_privacy_consent, navi_checkins } = body;

  // 予約者情報（氏名・電話番号）は必須（でお要望 2026-10-29）。送られてきた時だけ確かめる（他の画面からの部分的な保存は通す）
  for (const [k, label] of [['last_name', '姓'], ['first_name', '名'], ['phone', '電話番号']]) {
    if (body[k] !== undefined && !String(body[k] ?? '').trim()) return Response.json({ error: `${label}を入力してください` }, { status: 400 });
  }
  if (phone !== undefined && String(phone).replace(/\D/g, '').length < 10) return Response.json({ error: '電話番号は10桁以上の数字で入力してください' }, { status: 400 });

  // auth.users の display_name を更新
  if (display_name !== undefined) {
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { display_name: String(display_name).trim() },
    });
  }

  // profiles を upsert（service role なので RLS 不問）
  const upsertData = {
    id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (display_name !== undefined) upsertData.display_name = String(display_name).trim();
  if (share_diagnosis !== undefined) upsertData.share_diagnosis = share_diagnosis;
  if (share_roadmap !== undefined) upsertData.share_roadmap = share_roadmap;
  if (last_name !== undefined) upsertData.last_name = String(last_name).trim();
  if (first_name !== undefined) upsertData.first_name = String(first_name).trim();
  if (phone !== undefined) upsertData.phone = String(phone).trim();
  if (axis_progress !== undefined) upsertData.axis_progress = axis_progress;
  if (step_done !== undefined) upsertData.step_done = step_done;
  // 羅針盤のチェックイン（今週分＋直近8週）。決まった形・長さだけ受け取る
  if (navi_checkins !== undefined) upsertData.navi_checkins = cleanCheckins(navi_checkins);
  // お住まいの地域：空（消す）か、一覧にある都道府県＋40文字までの市区町村だけ受ける（lib/user-area.js）
  if (area !== undefined || city !== undefined) {
    const a = String(area ?? '').trim();
    const c = String(city ?? '').trim();
    if (a && c) {
      const loc = normalizeUserArea(a, c);
      if (!loc) return Response.json({ error: 'お住まいの地域が正しくありません' }, { status: 400 });
      upsertData.area = loc.area;
      upsertData.city = loc.city;
    } else if (a) {
      const loc = normalizeUserArea(a, '-');
      if (!loc) return Response.json({ error: 'お住まいの地域が正しくありません' }, { status: 400 });
      upsertData.area = loc.area;
      if (city !== undefined) upsertData.city = '';
    } else {
      if (area !== undefined) upsertData.area = '';
      if (city !== undefined) upsertData.city = '';
    }
  }
  if (body_data !== undefined) upsertData.body_data = body_data;
  if (birthday !== undefined) upsertData.birthday = birthday || null;
  if (mirror_privacy_consent) upsertData.mirror_privacy_consent_at = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .upsert(upsertData, { onConflict: 'id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
