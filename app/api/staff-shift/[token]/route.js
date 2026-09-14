// GET    /api/staff-shift/[token] → スタッフ本人向け：現在募集中の期間・自分の提出済み希望
// POST   /api/staff-shift/[token] → 希望を1件、選んだ瞬間に自動保存（type='work'|'off'）
// DELETE /api/staff-shift/[token] → 保存済みの希望を1件取り消す
//
// スタッフはFinemeの認証アカウントを持たないため、provider_staff.shift_access_token
// （推測不可能なUUID）を本人確認の代わりに使う認証不要の公開エンドポイント
// （予約確認Webhook等、既存の同種の設計と同じ方針）。
//
// でお指摘2026-09-14：「日付ごとに『提出する』ボタンを押すのがネック」→日付を選んだ
// 瞬間に自動保存する方式に変更（このPOSTは1日1回の自動保存として都度呼ばれる）。
// 「提出」ボタンは全体の完了を知らせる合図として別エンドポイント(submit/route.js)に分離。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getStaffByToken(token) {
  // provider_staff⇔providers間にprovider_shift_priorities経由の多対多関係も
  // 生まれたため、あいまいな"providers(name)"だとPGRST201（複数経路エラー）に
  // なる。外部キー名を明示して一意に指定する（でお報告2026-09-14：「リンクが
  // 無効です」と出る不具合の原因。シフト機能を追加した副作用）。
  const { data } = await supabase
    .from('provider_staff')
    .select('id, name, provider_id, providers!provider_staff_provider_id_fkey(name)')
    .eq('shift_access_token', token)
    .single();
  return data || null;
}

export async function GET(request, { params }) {
  const staff = await getStaffByToken(params.token);
  if (!staff) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  // 募集中（collecting）の期間のうち、直近のものを対象にする
  const { data: period } = await supabase
    .from('provider_shift_periods')
    .select('id, period_start, period_end, request_deadline, status')
    .eq('provider_id', staff.provider_id)
    .eq('status', 'collecting')
    .order('period_start', { ascending: true })
    .limit(1)
    .maybeSingle();

  let requests = [];
  let submitted = false;
  if (period) {
    const [{ data }, { data: sub }] = await Promise.all([
      supabase.from('provider_shift_requests').select('id, date, type, start_time, end_time, note').eq('period_id', period.id).eq('staff_id', staff.id),
      supabase.from('provider_shift_submissions').select('submitted_at').eq('period_id', period.id).eq('staff_id', staff.id).maybeSingle(),
    ]);
    requests = data || [];
    submitted = !!sub;
  }

  return Response.json({
    staff: { id: staff.id, name: staff.name },
    provider: { name: staff.providers?.name || '' },
    period: period || null,
    requests,
    submitted,
  });
}

export async function POST(request, { params }) {
  const staff = await getStaffByToken(params.token);
  if (!staff) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { period_id, date, type, start_time, end_time, note } = body;
  if (!period_id || !date || !['work', 'off'].includes(type)) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  }
  if (type === 'work' && (!start_time || !end_time)) {
    return Response.json({ error: '出勤希望には開始・終了時刻が必要です' }, { status: 400 });
  }

  // この期間が本当に自分の店舗のものか確認（他店舗の期間IDを渡された場合に書き込ませない）
  const { data: period } = await supabase.from('provider_shift_periods').select('id, provider_id, status').eq('id', period_id).single();
  if (!period || period.provider_id !== staff.provider_id) return Response.json({ error: '期間が見つかりません' }, { status: 404 });
  if (period.status !== 'collecting') return Response.json({ error: 'この期間は希望の募集を締め切っています' }, { status: 400 });

  // 同じ日にwork/off両方が残るのはおかしいため、逆typeの既存希望があれば消してから保存する
  // （カレンダーで日付をタップして出勤/休みを選び直す新UIでは、両方残ると混乱するため）
  const otherType = type === 'work' ? 'off' : 'work';
  await supabase.from('provider_shift_requests').delete().eq('period_id', period_id).eq('staff_id', staff.id).eq('date', date).eq('type', otherType);

  const { data, error } = await supabase
    .from('provider_shift_requests')
    .upsert({
      period_id, staff_id: staff.id, date, type,
      start_time: type === 'work' ? start_time : null,
      end_time: type === 'work' ? end_time : null,
      note: note || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'period_id,staff_id,date,type' })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const staff = await getStaffByToken(params.token);
  if (!staff) return Response.json({ error: 'リンクが無効です' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const period_id = searchParams.get('period_id');
  const date = searchParams.get('date');
  const type = searchParams.get('type');
  if (!period_id || !date || !type) return Response.json({ error: '必須項目が不足しています' }, { status: 400 });

  const { error } = await supabase
    .from('provider_shift_requests')
    .delete()
    .eq('period_id', period_id)
    .eq('staff_id', staff.id)
    .eq('date', date)
    .eq('type', type);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
