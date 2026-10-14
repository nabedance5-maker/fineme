// POST /api/provider/customers/[user_id]/nudge → 店舗が自由記述メッセージを個別送信（認証済み）
// 店舗別LINEチャネルが連携済みならそちらから、未連携ならFineme公式LINEから送る（resolveLineTarget）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { sendLinePushWithAction } from '@/lib/line-push';
import { storeBookingAction, fetchLastMenu, lastMenuLine } from '@/lib/log-rebook';
import { resolveLineTarget } from '@/lib/line-channel';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug, plan, entity_type, booking_url, enabled_features').eq('email', user.email).single();
  return data || null;
}

async function __POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider?.slug) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'dormant_outreach'); if (locked) return locked; }

  const { message } = await request.json();
  if (!message?.trim()) return Response.json({ error: 'message は必須です' }, { status: 400 });

  const userId = params.user_id;

  // 対象ユーザーが実際にこの店舗にNew Me Logを紐づけているか確認（他店舗の顧客への送信を防ぐ）
  const { data: log } = await supabase
    .from('user_service_logs')
    .select('id')
    .eq('provider_slug', provider.slug)
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1)
    .single();
  if (!log) return Response.json({ error: '対象のお客様が見つかりません' }, { status: 404 });

  const { data: profile } = await supabase.from('profiles').select('line_user_id').eq('id', userId).single();
  const target = await resolveLineTarget(supabase, {
    providerSlug: provider.slug,
    userId,
    fallbackLineUserId: profile?.line_user_id,
  });
  if (!target.lineUserId) return Response.json({ error: 'このお客様はLINE通知の宛先が未設定です' }, { status: 400 });

  // 声かけは「戻ってきてもらう」ためのもの。文字だけだと読まれて終わるので、
  // 前回と同じメニュー・担当を選んだ予約画面へのボタンを添える（でお指摘2026-10-14）
  const lastMenu = await fetchLastMenu(supabase, provider.id, userId);
  const action = storeBookingAction(provider, lastMenu, 'store_nudge');
  const res = await sendLinePushWithAction(
    target.lineUserId,
    message.trim(),
    action && { ...action, caption: lastMenuLine(lastMenu) || 'ご予約はこちらから' },
    target.token,
  );
  if (!res.ok) return Response.json({ error: `送信に失敗しました（${res.reason || res.status || '不明'}）` }, { status: 502 });

  return Response.json({ ok: true, viaStore: target.viaStore, withBookingButton: !!action });
}

export const POST = withAudit(__POST);
