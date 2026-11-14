// 営業用のデモ店舗を作る・毎晩元に戻す（2026-11-14）。
// 中身はすべて架空（実在の人・店舗ではない）。日付は「今日」から数えて作るので、いつ見ても半年分の流れと今日・来週の予約がある。
// お客様は demo.fineme.me のアカウント（受信できないアドレス）。作り直しでもアカウントは消さず、店舗のデータだけ入れ直す。
import crypto from 'crypto';
import { DEMO_STORE_EMAIL, DEMO_SLUG, DEMO_DOMAIN } from './demo';
import { FEATURE_DEFS } from './feature-flags';

const DAY = 86400000;
const CUSTOMER_COUNT = 32;

const NAMES = [
  ['青木', '颯太'], ['石川', '真由'], ['上田', '大輝'], ['遠藤', '彩花'], ['大野', '拓海'], ['小川', '美咲'], ['加藤', '陽菜'], ['木村', '蓮'],
  ['工藤', '結衣'], ['小林', '悠真'], ['斉藤', '七海'], ['坂本', '湊'], ['清水', '葵'], ['杉山', '樹'], ['田村', '芽依'], ['千葉', '陸'],
  ['土屋', '莉子'], ['中島', '翔'], ['西田', '花音'], ['野口', '健太'], ['橋本', '凛'], ['林', '大和'], ['原田', '紗希'], ['平野', '航'],
  ['藤井', '玲奈'], ['松本', '直樹'], ['宮崎', '優花'], ['村上', '駿'], ['森', '友香'], ['山口', '亮'], ['横山', '千尋'], ['渡部', '海斗'],
];
const STAFF = [
  { name: '佐藤 美咲', role: 'ヘッドトレーナー', bio: '姿勢改善と食事の見直しが得意です（デモ用の架空のスタッフ）', off: [3, 4], start: '10:00', end: '19:00' },
  { name: '高橋 健太', role: 'トレーナー', bio: '筋力アップ・ボディメイク担当（デモ用の架空のスタッフ）', off: [3, 0], start: '12:00', end: '21:00' },
  { name: '中村 葵', role: 'ストレッチ担当', bio: '肩こり・腰の張りをほぐすストレッチ担当（デモ用の架空のスタッフ）', off: [3, 1], start: '10:00', end: '18:00' },
];
const SERVICES = [
  { name: '体験パーソナル（60分）', price: 3000, minutes: 60, trial: true, desc: 'カウンセリング・姿勢チェック・軽いトレーニング' },
  { name: 'パーソナルトレーニング（60分）', price: 8800, minutes: 60 },
  { name: 'パーソナルトレーニング（90分）', price: 12000, minutes: 90 },
  { name: 'ストレッチ（30分）', price: 4400, minutes: 30 },
  { name: '姿勢チェック＆改善プラン', price: 5500, minutes: 45 },
];
const KARTE = [
  '肩の可動域が前回より広がった。次回は背中のトレーニングを中心に',
  '仕事が忙しく睡眠不足とのこと。強度は控えめにした',
  '体重 -1.2kg。食事の記録を続けられている',
  'スクワットのフォームが安定してきた。重量を一段上げる',
  '腰の張りあり。ストレッチを多めに。次回も確認',
  '結婚式まであと2か月。腕と背中を重点的に',
  '初回。運動は久しぶり。まずは週1回から',
  'ご家族の予定で来月は少し空くかもとのこと',
];
const TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
const PAY = ['現金', 'クレジットカード', 'クレジットカード', 'PayPay'];

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const jstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const addDays = (ymd, n) => new Date(new Date(`${ymd}T00:00:00Z`).getTime() + n * DAY).toISOString().slice(0, 10);
const dow = ymd => new Date(`${ymd}T00:00:00Z`).getUTCDay();
const endTime = (t, min) => { const [h, m] = t.split(':').map(Number); const x = h * 60 + m + min; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const jstIso = (ymd, t = '12:00') => new Date(`${ymd}T${t}:00+09:00`).toISOString();
const randomPassword = () => crypto.randomBytes(24).toString('base64url');

async function must(p) { const { data, error } = await p; if (error) throw new Error(error.message); return data; }

const BUSINESS_HOURS = Object.fromEntries(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(d => [d, d === 'wed' ? { open: null, close: null, closed: true } : { open: '10:00', close: '21:00', closed: false }]));

function providerSettings() {
  return {
    name: 'Fineme デモジム',
    catchphrase: '続けられるパーソナルジム（デモ用の架空の店舗です）',
    description: 'Finemeの管理画面を体験していただくための、架空のパーソナルジムです。お客様・スタッフ・予約・売上はすべて架空のデータです。',
    main_category: 'gym',
    area: '東京都',
    prefecture: '東京都',
    city: '品川区',
    price_from: 3000,
    plan: 'special',
    billing_status: 'active',
    published: false,
    admin_hidden: true,
    is_demo: true,
    enabled_features: Object.fromEntries(Object.keys(FEATURE_DEFS).map(k => [k, !['line_channel'].includes(k)])),
    business_hours: BUSINESS_HOURS,
    slot_duration_minutes: 60,
    booking_interval_minutes: 30,
    store_capacity: 3,
    booking_horizon_days: 60,
    notify_emails: [],
    dashboard_prefs: null,
  };
}

// デモ店舗のアカウントと店舗の行を用意する（無ければ作る）。戻り値は店舗の行
export async function ensureDemoStore(db) {
  const { data: found } = await db.from('providers').select('id, email').eq('is_demo', true).maybeSingle();
  if (found) return found;
  const { data: created, error } = await db.auth.admin.createUser({ email: DEMO_STORE_EMAIL, password: randomPassword(), email_confirm: true, user_metadata: { display_name: 'デモ店舗' } });
  if (error && !/already/i.test(error.message)) throw new Error(error.message);
  void created;
  return must(db.from('providers').insert({ slug: DEMO_SLUG, email: DEMO_STORE_EMAIL, ...providerSettings() }).select('id, email').single());
}

// デモのお客様のアカウント（足りない分だけ作る）。戻り値 [{ id, email, last, first }]
async function ensureDemoCustomers(db) {
  const have = await must(db.rpc('demo_customer_ids'));
  const byEmail = Object.fromEntries((have || []).map(r => [r.email, r.id]));
  const out = [];
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const email = `c${String(i + 1).padStart(2, '0')}@${DEMO_DOMAIN}`;
    const [last, first] = NAMES[i];
    let id = byEmail[email];
    if (!id) {
      const { data, error } = await db.auth.admin.createUser({ email, password: randomPassword(), email_confirm: true, user_metadata: { display_name: `${last} ${first}` } });
      if (error) throw new Error(error.message);
      id = data.user.id;
    }
    out.push({ id, email, last, first });
  }
  await must(db.from('profiles').upsert(out.map((c, i) => ({ id: c.id, display_name: `${c.last} ${c.first}`, last_name: c.last, first_name: c.first, phone: `090-0000-${String(1000 + i)}` })), { onConflict: 'id' }));
  return out;
}

// デモ店舗を元の状態に戻す（毎晩の cron・初回の作成で呼ぶ）
export async function resetDemo(db) {
  const store = await ensureDemoStore(db);
  const pid = store.id;
  const customers = await ensureDemoCustomers(db);
  const wiped = await must(db.rpc('demo_wipe'));
  await must(db.from('providers').update(providerSettings()).eq('id', pid));

  const today = jstToday();
  const rand = rng(20261114);
  const pick = arr => arr[Math.floor(rand() * arr.length)];

  const staff = await must(db.from('provider_staff').insert(STAFF.map((s, i) => ({ provider_id: pid, name: s.name, role: s.role, bio: s.bio, sort_order: i, bookable: true, is_public: true }))).select('id, name'));
  const services = await must(db.from('provider_services').insert(SERVICES.map((s, i) => ({ provider_id: pid, name: s.name, price: s.price, duration: `${s.minutes}分`, duration_minutes: s.minutes, is_trial: !!s.trial, description: s.desc || null, sort_order: i, allow_ticket: !s.trial }))).select('id, name, price, duration_minutes, is_trial'));
  const [trial, p60, p90, stretch, posture] = services;
  const packages = await must(db.from('service_packages').insert([
    { provider_id: pid, name: 'パーソナル8回券', total_sessions: 8, price: 64000, validity_days: 120, active: true, package_type: 'fixed_count' },
    { provider_id: pid, name: 'パーソナル4回券', total_sessions: 4, price: 33600, validity_days: 60, active: true, package_type: 'fixed_count' },
  ]).select('id, name, total_sessions'));
  await must(db.from('provider_membership_plans').insert([
    { provider_id: pid, name: '月4回プラン', monthly_price: 32000, description: 'パーソナル60分を月4回', active: true, sort_order: 0, online_enabled: false },
    { provider_id: pid, name: '月8回プラン', monthly_price: 58000, description: 'パーソナル60分を月8回', active: true, sort_order: 1, online_enabled: false },
  ]));
  await must(db.from('provider_dormant_settings').insert({ provider_id: pid, no_visit_days: 60 }));

  // お客様ごとの通い方（常連・離れかけ・新しい方・体験だけ・リクエスト待ち）
  const kinds = [...Array(10).fill('regular'), ...Array(8).fill('lapsed'), ...Array(6).fill('new'), ...Array(5).fill('trial'), ...Array(3).fill('pending')];
  const taken = new Set();
  const slot = (date, staffIdx) => {
    for (let k = 0; k < 12; k++) { const t = pick(TIMES); const key = `${date}|${t}|${staffIdx}`; if (!taken.has(key)) { taken.add(key); return t; } }
    return null;
  };
  const resRows = [];
  const add = (c, date, svc, status, staffIdx, extra = {}) => {
    if (dow(date) === 3) date = addDays(date, 1); // 定休日（水）を避ける
    const time = extra.time || slot(date, staffIdx);
    if (!time) return;
    taken.add(`${date}|${time}|${staffIdx}`);
    const createdDay = extra.createdDay || addDays(date, -(2 + Math.floor(rand() * 8)));
    resRows.push({
      provider_id: pid, user_id: c.id, user_name: `${c.last} ${c.first}`, user_contact: `${c.email} / 090-0000-${1000 + customers.indexOf(c)}`,
      service_id: svc.id, service_name: svc.name, price: svc.price, reserved_date: date, start_time: time, end_time: endTime(time, svc.duration_minutes || 60),
      confirmed_date: status === 'pending' ? null : date, confirmed_time: status === 'pending' ? null : time,
      status, origin: 'direct', booking_mode: extra.mode || 'instant', staff_id: staff[staffIdx].id,
      created_at: jstIso(createdDay < date ? createdDay : addDays(date, -1), '20:00'),
      approved_at: status === 'pending' ? null : jstIso(createdDay < date ? createdDay : addDays(date, -1), '21:00'),
      visited_at: status === 'visited' ? jstIso(date, endTime(time, svc.duration_minutes || 60)) : null,
      no_show_at: status === 'no_show' ? jstIso(date, time) : null,
      user_cancelled_at: status === 'cancelled' ? jstIso(addDays(date, -1), '10:00') : null,
    });
  };
  const pastStatus = () => { const x = rand(); return x < 0.88 ? 'visited' : x < 0.96 ? 'cancelled' : 'no_show'; };

  customers.forEach((c, i) => {
    const kind = kinds[i];
    const st = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;
    if (kind === 'regular') {
      let d = addDays(today, -(150 + Math.floor(rand() * 25)));
      add(c, d, trial, 'visited', st);
      const gap = 10 + Math.floor(rand() * 10);
      for (d = addDays(d, gap); d < today; d = addDays(d, gap + Math.floor(rand() * 5) - 2)) add(c, d, rand() < 0.75 ? p60 : rand() < 0.5 ? p90 : stretch, pastStatus(), st, { createdDay: addDays(d, -gap) });
      const next = addDays(today, 1 + Math.floor(rand() * 13));
      add(c, next, p60, 'approved', st);
    } else if (kind === 'lapsed') {
      let d = addDays(today, -(160 + Math.floor(rand() * 15)));
      add(c, d, trial, 'visited', st);
      const n = 1 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) { d = addDays(d, 18 + Math.floor(rand() * 10)); add(c, d, p60, 'visited', st); }
    } else if (kind === 'new') {
      const d = addDays(today, -(3 + Math.floor(rand() * 25)));
      add(c, d, trial, 'visited', st);
      if (rand() < 0.5) add(c, addDays(today, 2 + Math.floor(rand() * 10)), p60, 'approved', st, { createdDay: d });
    } else if (kind === 'trial') {
      add(c, addDays(today, -(95 + Math.floor(rand() * 60))), trial, 'visited', st);
    } else if (kind === 'pending') {
      add(c, addDays(today, 2 + i % 5), trial, 'pending', st, { mode: 'request', createdDay: addDays(today, -1) });
    }
  });
  // 今日の予約（来店確認を試せるように、まだ来店にしていない）
  const todayIfOpen = dow(today) === 3 ? addDays(today, 1) : today;
  ['11:00', '14:00', '17:00', '19:00'].forEach((t, k) => {
    const c = customers[k];
    add(c, todayIfOpen, k === 2 ? stretch : p60, 'approved', k % 3, { time: t });
  });

  const inserted = [];
  for (let k = 0; k < resRows.length; k += 200) inserted.push(...await must(db.from('reservations').insert(resRows.slice(k, k + 200)).select('id, user_id, staff_id, service_name, price, reserved_date, status')));

  // 売上（来店した予約）とカルテ
  const visited = inserted.filter(r => r.status === 'visited');
  const sales = visited.map(r => ({ provider_id: pid, reservation_id: r.id, entry_date: r.reserved_date, amount: r.price, menu_name: r.service_name, staff_id: r.staff_id, payment_method: pick(PAY), source: 'reservation', created_at: jstIso(r.reserved_date, '20:30') }));
  for (let k = 0; k < sales.length; k += 300) await must(db.from('provider_sales_entries').insert(sales.slice(k, k + 300)));
  const kartes = visited.filter(() => rand() < 0.4).map(r => ({ provider_id: pid, user_id: r.user_id, staff_id: r.staff_id, menu_name: r.service_name, note: pick(KARTE), created_at: jstIso(r.reserved_date, '21:00') }));
  for (let k = 0; k < kartes.length; k += 300) await must(db.from('provider_karte_entries').insert(kartes.slice(k, k + 300)));

  // 回数券（常連の4人が8回券を購入済み）
  await must(db.from('customer_packages').insert(customers.slice(0, 4).map(c => ({
    provider_id: pid, package_id: packages[0].id, user_id: c.id, package_name: packages[0].name, total_sessions: 8, package_type: 'fixed_count',
    purchased_at: jstIso(addDays(today, -30)), expires_at: jstIso(addDays(today, 90)), source: 'manual',
  }))));

  // シフト（2週間前〜30日先）
  const shifts = [];
  for (let n = -14; n <= 30; n++) {
    const d = addDays(today, n);
    STAFF.forEach((s, i) => { if (!s.off.includes(dow(d))) shifts.push({ provider_id: pid, staff_id: staff[i].id, date: d, start_time: s.start, end_time: s.end, source: 'manual' }); });
  }
  await must(db.from('provider_shift_entries').insert(shifts));

  // AIコンサルの初めの質問は済ませた状態（もう一度答え直すこともできる）
  await must(db.from('provider_consultant_settings').insert({
    provider_id: pid, interview_done_at: jstIso(addDays(today, -20)), goals: ['second_visit', 'revive'], goals_set_at: jstIso(addDays(today, -20)),
    goal_note: '体験から2回目につながらない方が多い。離れてしまった方にも戻ってきてほしい',
  }));

  let signedOut = 0;
  try { signedOut = await must(db.rpc('demo_signout')); } catch {}
  return { provider_id: pid, wiped, reservations: inserted.length, visited: visited.length, kartes: kartes.length, shifts: shifts.length, customers: customers.length, signedOut };
}
