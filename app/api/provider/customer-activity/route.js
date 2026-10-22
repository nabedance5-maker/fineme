// GET /api/provider/customer-activity?user_id=... | ?manual_id=...
// 顧客情報ポップアップに出す「回数券・予約・グループレッスン・カード登録の有無」をまとめて返す
// （でお要望2026-10-16：顧客情報の中で回数券・グループレッスンの予約・通常の予約を見られるように、
//  チケットの編集もそこで、クレカは登録されているかどうかだけ見えるように）。
//
// 非会員（manual）は reservations に紐付け列が無いため、予約は「お名前の完全一致」または
// 「登録済み電話番号の一致」で拾う（どちらで一致したかを返し、画面にも明示する）。
// 回数券は customer_packages が会員(user_id)専用のため、非会員は空。
// カード登録の有無：Finemeに残るのはオンライン入会でカードを登録した会員プランのみ
// （回数券購入・デポジットは都度払いでカードを保存しない）。番号は扱わない。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { isStoreCustomer } from '@/lib/customer-accounts';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProvider(request) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

const RES_COLS = 'id, user_id, user_name, user_contact, service_name, price, reserved_date, start_time, confirmed_date, confirmed_time, status, class_id, slot_id, package_id, booking_mode, deposit_status, created_at';
const digits = s => String(s || '').replace(/\D/g, '');

function reservationView(r, classNameOf) {
  return {
    id: r.id,
    date: r.confirmed_date || r.reserved_date || null,
    time: (r.confirmed_time || r.start_time || '').slice(0, 5) || null,
    status: r.status,
    menu: r.service_name || null,
    price: r.price ?? null,
    class_name: r.class_id ? (classNameOf[r.class_id] || 'グループレッスン') : null,
    paid_by_package: !!r.package_id,
    deposit_status: r.deposit_status || null,
    booking_mode: r.booking_mode || null,
  };
}

export async function GET(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const sp = new URL(request.url).searchParams;
  const userId = sp.get('user_id');
  const manualId = sp.get('manual_id');

  let reservations = [];
  let matchedBy = null;
  let packages = [];
  let hasCard = false;
  let cardSource = null;

  if (userId) {
    const [resRes, pkgRes, memRes] = await Promise.all([
      supabase.from('reservations').select(RES_COLS).eq('provider_id', provider.id).eq('user_id', userId).order('reserved_date', { ascending: false }).limit(200),
      supabase.from('customer_packages').select('id, package_name, package_type, total_sessions, purchased_at, expires_at, subscription_status, next_grant_at').eq('provider_id', provider.id).eq('user_id', userId).order('purchased_at', { ascending: false }),
      supabase.from('provider_memberships').select('id, status, stripe_payment_method_id').eq('provider_id', provider.id).eq('user_id', userId).neq('status', 'draft'),
    ]);
    reservations = resRes.data || [];
    const pkgs = pkgRes.data || [];
    // この店舗とつながりの無い会員IDを指定された場合は何も返さない
    if (!reservations.length && !pkgs.length && !(memRes.data || []).length) {
      const { count } = provider.slug
        ? await supabase.from('user_service_logs').select('id', { count: 'exact', head: true }).eq('provider_slug', provider.slug).eq('user_id', userId)
        : { count: 0 };
      const { count: noteCount } = await supabase.from('provider_customer_notes').select('user_id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('user_id', userId);
      // お店がメールアドレスで追加しただけ（基本情報だけでつながっている）のお客様も含める（2026-10-22）
      if (!count && !noteCount && !(await isStoreCustomer(provider.id, userId))) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });
    }
    if (pkgs.length) {
      const { data: usages } = await supabase.from('package_usages').select('id, customer_package_id, used_at, undone_at').in('customer_package_id', pkgs.map(p => p.id));
      const byPkg = {};
      (usages || []).filter(u => !u.undone_at).forEach(u => { (byPkg[u.customer_package_id] = byPkg[u.customer_package_id] || []).push(u); });
      packages = pkgs.map(p => {
        const used = (byPkg[p.id] || []).sort((a, b) => new Date(b.used_at) - new Date(a.used_at));
        const unlimited = p.package_type === 'unlimited';
        const expired = p.expires_at ? new Date(p.expires_at) < new Date() : false;
        const remaining = unlimited ? null : p.total_sessions - used.length;
        return {
          ...p,
          used_sessions: used.length,
          remaining_sessions: remaining,
          last_usage_id: used[0]?.id || null,
          last_used_at: used[0]?.used_at || null,
          expired,
          used_up: !unlimited && remaining <= 0,
        };
      });
    }
    const withCard = (memRes.data || []).filter(m => m.stripe_payment_method_id);
    hasCard = withCard.length > 0;
    cardSource = hasCard ? 'オンライン入会で登録' : null;
  } else if (manualId) {
    const { data: manual } = await supabase.from('provider_manual_customers').select('id, display_name, linked_user_id').eq('id', manualId).eq('provider_id', provider.id).maybeSingle();
    if (!manual) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });
    const { data: prof } = await supabase.from('provider_customer_profiles').select('phone').eq('provider_id', provider.id).eq('manual_customer_id', manualId).maybeSingle();
    const phone = digits(prof?.phone);
    const { data: guestRows } = await supabase.from('reservations').select(RES_COLS).eq('provider_id', provider.id).is('user_id', null).order('reserved_date', { ascending: false }).limit(1000);
    const name = (manual.display_name || '').replace(/\s/g, '');
    reservations = (guestRows || []).filter(r => {
      const byName = name && (r.user_name || '').replace(/\s/g, '') === name;
      const byPhone = phone.length >= 10 && digits(r.user_contact).includes(phone);
      return byName || byPhone;
    });
    matchedBy = phone.length >= 10 ? 'お名前または電話番号が一致する予約' : 'お名前が一致する予約';
  } else {
    return Response.json({ error: 'user_id または manual_id が必要です' }, { status: 400 });
  }

  const classIds = [...new Set(reservations.map(r => r.class_id).filter(Boolean))];
  const { data: classes } = classIds.length ? await supabase.from('provider_classes').select('id, name').in('id', classIds) : { data: [] };
  const classNameOf = Object.fromEntries((classes || []).map(c => [c.id, c.name]));

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
  const views = reservations.map(r => reservationView(r, classNameOf));
  const isUpcoming = v => v.date && v.date >= today && ['pending', 'approved', 'counter_proposed'].includes(v.status);
  const sortAsc = (a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`);
  const sortDesc = (a, b) => -sortAsc(a, b);

  const normal = views.filter(v => !v.class_name);
  const lessons = views.filter(v => v.class_name);

  return Response.json({
    has_card: hasCard,
    card_source: cardSource,
    packages,
    reservations: {
      upcoming: normal.filter(isUpcoming).sort(sortAsc),
      past: normal.filter(v => !isUpcoming(v)).sort(sortDesc).slice(0, 30),
    },
    lessons: {
      upcoming: lessons.filter(isUpcoming).sort(sortAsc),
      past: lessons.filter(v => !isUpcoming(v)).sort(sortDesc).slice(0, 30),
    },
    matched_by: matchedBy,
  });
}
