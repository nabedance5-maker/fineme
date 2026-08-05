// POST /api/mirror/claim-sessions
// 未ログインで決済したMirrorセッション（mirror_sessions.user_id は null）を、
// ログイン直後にクライアントのlocalStorage session_id一覧を使って自分のアカウントに紐付ける。
import { getSupabase } from '@/lib/supabase';

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await getSupabase().auth.getUser(token);
  return user || null;
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { session_ids } = await request.json().catch(() => ({}));
  if (!Array.isArray(session_ids) || !session_ids.length) {
    return Response.json({ ok: true, claimed: 0 });
  }

  const ids = session_ids.filter(Boolean).slice(0, 10);

  // 紐付け前に、ゲスト時代の無料お試し使用状況を確認しておく
  // （紐付け後は user_id が付くため trial_month での逆引きができなくなる）
  let guestTrialMonth = null;
  try {
    const { data: trialRows } = await getSupabase()
      .from('mirror_sessions')
      .select('trial_month')
      .in('id', ids)
      .is('user_id', null)
      .not('trial_month', 'is', null);
    guestTrialMonth = trialRows?.map(r => r.trial_month).sort().pop() || null;
  } catch {}

  const { data, error } = await getSupabase()
    .from('mirror_sessions')
    .update({ user_id: user.id })
    .in('id', ids)
    .is('user_id', null)
    .select('id');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ゲスト時に月1無料お試しを使っていた場合、登録直後の同月内二重取得を防ぐため
  // profiles.mirror_trial_month に引き継ぐ（既存の値より新しい月のみ上書き）
  if (guestTrialMonth) {
    try {
      const { data: profile } = await getSupabase()
        .from('profiles')
        .select('mirror_trial_month')
        .eq('id', user.id)
        .single();
      if (!profile?.mirror_trial_month || profile.mirror_trial_month < guestTrialMonth) {
        await getSupabase()
          .from('profiles')
          .update({ mirror_trial_month: guestTrialMonth })
          .eq('id', user.id);
      }
    } catch {}
  }

  return Response.json({ ok: true, claimed: data?.length || 0 });
}
