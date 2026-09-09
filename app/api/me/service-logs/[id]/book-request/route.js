// POST /api/me/service-logs/[id]/book-request — New Me LogのカードからFineme掲載店舗へ予約をリクエストする
// でお要望2026-09-09：「Log内のその店舗の項目に、予約リクエストをLog内のまま送れる
// 仕組みがないと使いづらい」。初版は日時を聞かずに送る設計だったが、続けてでお指摘
// 「日時をその場で希望を送れないと使えない」を受け、希望日（必須）・希望時間（任意）を
// 追加した。あくまで「希望」であり確定ではない＝pendingで作成し、店舗からの連絡を待つ
// （カレンダーの空き枠から選ぶapp/booking/scheduleの本格フローとは別の、もっと軽い経路）。
// LINEの「予約をリクエスト」ボタン（app/api/line/webhook/[providerId]/route.js の
// createLineBookingRequest）と設計思想は同じ。こちらはログイン中の本人確認ができるため、
// 連絡先には実際のメールアドレスを使える。
// 来店確認された時点でこのLogの last_visit/next_visit が自動更新される
// （app/api/reservations/[id]/route.js の来店確認同期。でお要望2026-09-09で追加）。
import { getSupabase } from '@/lib/supabase';
import { sendLineBookingRequestEmail } from '@/lib/email';
import { sendLinePush } from '@/lib/line-push';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function POST(request, { params }) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const message = (body.message || '').trim().slice(0, 500);
  const preferredDate = body.preferred_date || '';
  const preferredTime = body.preferred_time || '';
  if (!preferredDate || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    return Response.json({ error: '希望日を選んでください' }, { status: 400 });
  }

  const { data: log, error: findError } = await supabase
    .from('user_service_logs')
    .select('id, name, provider_slug, provider_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (findError || !log) return Response.json({ error: '記録が見つかりません' }, { status: 404 });
  if (!log.provider_slug || log.provider_type === 'affiliate') {
    return Response.json({ error: 'この記録はFineme経由の予約リクエストに対応していません' }, { status: 400 });
  }

  const { data: provider } = await supabase
    .from('providers')
    .select('id, name, email, line_user_id')
    .eq('slug', log.provider_slug)
    .single();
  if (!provider) return Response.json({ error: '店舗情報が見つかりませんでした' }, { status: 404 });

  // LINEの「予約をリクエスト」ボタンと合わせて、24時間以内の重複リクエストを防ぐ
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('reservations')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider_id', provider.id)
    .in('origin', ['line_log', 'newme_log'])
    .gte('created_at', since)
    .limit(1);
  if (recent?.length) {
    return Response.json({ error: `${provider.name}へは既に予約リクエストを送信済みです。店舗からのご連絡をお待ちください。` }, { status: 409 });
  }

  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
  const userName = profile?.display_name || user.email || 'Fineme会員';
  const whenText = `${preferredDate}${preferredTime ? ` ${preferredTime}` : ''}`;
  const note = `New Me Logから予約をリクエストしました（${log.name}）。希望日時: ${whenText}（確定ではありません）${message ? ` / メッセージ: ${message}` : ''}`;

  const { data: reservation, error: insertError } = await supabase
    .from('reservations')
    .insert({
      provider_id: provider.id,
      user_id: user.id,
      user_name: userName,
      user_contact: user.email || 'Fineme経由（New Me Log）',
      note,
      status: 'pending',
      origin: 'newme_log',
      reserved_date: preferredDate,
      start_time: preferredTime || null,
    })
    .select()
    .single();
  if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

  try {
    await sendLineBookingRequestEmail({
      providerEmail: provider.email, providerName: provider.name, userName, note,
      preferredDate, preferredTime,
    });
  } catch (e) { console.error('[book-request] email', e); }
  if (provider.line_user_id) {
    try {
      await sendLinePush(provider.line_user_id, `【Fineme】New Me Logから予約リクエストが届きました\nお客様: ${userName}\n${log.name}\n希望日時: ${whenText}（確定ではありません）\n${message ? `メッセージ: ${message}\n` : ''}管理画面からご確認ください。`);
    } catch (e) { console.error('[book-request] provider push', e); }
  }

  return Response.json({ ok: true, reservation, providerName: provider.name });
}
