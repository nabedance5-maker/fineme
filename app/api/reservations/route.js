// POST /api/reservations  - 予約リクエスト作成
// GET  /api/reservations  - 一覧取得（providerId or userId で絞り込み）
import { getSupabase } from '@/lib/supabase';
import { sendReservationCreatedEmails } from '@/lib/email';
import { sendLinePush } from '@/lib/line-push';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// スパム対策: 同一IPから1分間に5件まで
const _postRateMap = new Map();
function checkPostRateLimit(ip) {
  const now = Date.now();
  const entry = _postRateMap.get(ip) || { count: 0, reset: now + 60000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + 60000; }
  entry.count++;
  _postRateMap.set(ip, entry);
  return entry.count <= 5;
}

async function verifyAuth(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await getSupabase().auth.getUser(token);
  return user || null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('providerId');
  const userId = searchParams.get('userId');

  if (!providerId && !userId) {
    return Response.json({ error: 'providerId または userId が必要です' }, { status: 400 });
  }

  const user = await verifyAuth(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // userIdクエリ: 本人確認
  if (userId && user.id !== userId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // providerIdクエリ: 掲載者本人確認
  if (providerId) {
    const { data: prov } = await getSupabase()
      .from('providers').select('id').eq('email', user.email).single();
    if (!prov || prov.id !== providerId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let query = supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (providerId) query = query.eq('provider_id', providerId);
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkPostRateLimit(ip)) {
    return Response.json({ error: 'しばらく時間をおいてから再送信してください' }, { status: 429 });
  }
  const body = await request.json();
  // preferred_date/preferred_time/message はフロントからの名前。DB上は reserved_date/start_time/note
  const { provider_id, user_name, user_contact, preferred_date, preferred_time, message, user_id } = body;

  if (!provider_id || !user_name || !user_contact || !preferred_date || !preferred_time) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  }

  // 予約をSupabaseに保存（v2スキーマのカラム名に合わせる）
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      provider_id,
      user_id: user_id || null,
      user_name,
      user_contact,
      reserved_date: preferred_date,
      start_time: preferred_time,
      note: message || '',
      status: 'pending',
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // 掲載者情報を取得（通知用）
  const { data: provider } = await supabase
    .from('providers')
    .select('name, email, line_user_id, billing_started, id')
    .eq('id', provider_id)
    .single();

  // 通知（失敗しても予約は成功扱い）
  try {
    await sendReservationCreatedEmails({
      reservation: { ...data, preferred_date, preferred_time, message },
      providerEmail: provider?.email,
      providerName: provider?.name,
    });
  } catch (e) { console.error('[reservation email]', e); }

  // LINE通知（掲載者にline_user_idがある場合）
  if (provider?.line_user_id) {
    const lineMsg = [
      '【Fineme】新規予約リクエスト',
      `お客様: ${user_name}`,
      `希望日: ${preferred_date} ${preferred_time}`,
      `連絡先: ${user_contact}`,
      message ? `メッセージ: ${message}` : '',
      '管理画面から対応してください。',
    ].filter(Boolean).join('\n');

    try { await sendLinePush(provider.line_user_id, lineMsg); }
    catch (e) { console.error('[reservation line]', e); }
  }

  // 初回予約なら課金開始（無料プランは除く）
  if (provider && !provider.billing_started && provider.plan !== 'free') {
    try {
      await supabase
        .from('providers')
        .update({ billing_started: true })
        .eq('id', provider_id);
    } catch (e) { console.error('[billing activate]', e); }
  }

  return Response.json(data, { status: 201 });
}
