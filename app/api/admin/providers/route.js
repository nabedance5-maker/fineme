// GET /api/admin/providers - 全掲載者一覧（運営用）
// POST /api/admin/providers - 掲載者新規登録（パスワード設定リンクのメールを自動送信。inquiry_id があれば、その問い合わせと結びつける）
import { monitorUntilFrom, specialUntilFromDate } from '@/lib/provider-contract';
import { MONITOR_CAMPAIGN } from '@/lib/monitor-campaign';
import { PREFECTURES } from '@/lib/customer-profile';
import { geocodeAddress } from '@/lib/geocode';
import { getSupabase } from '@/lib/supabase';
import { sendProviderLoginInvite } from '@/lib/provider-login-invite';
import { checkReferralCode } from '@/lib/referral-code';
import { sendProviderStartEmail } from '@/lib/email';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .or('entity_type.eq.provider,entity_type.is.null')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { slug, name, catchphrase, description, target_desc, philosophy,
            main_category, sub_categories, area, prefecture, city, price_from,
            photo_url, plan, referral_code, referred_by, email, line_user_id,
            suitable_triggers, handles_failure_patterns, provider_style, inquiry_id } = body;

    if (!name || !main_category) {
      return Response.json({ error: 'name, main_category は必須です' }, { status: 400 });
    }
    // slugが未入力なら空文字（トリガーで自動生成）
    const resolvedSlug = (slug || '').trim() || null;
    if (!email) {
      return Response.json({ error: 'メールアドレスは必須です（契約者ログインに使用します）' }, { status: 400 });
    }

    // 特例無料のお試し期限（2026-11-26）：特例無料の時だけ。空欄なら期限なし
    const specialUntil = plan === 'special' ? specialUntilFromDate(body.special_until) : null;
    if (specialUntil === undefined) return Response.json({ error: '特例無料の期限の日付が正しくありません' }, { status: 400 });
    if (specialUntil && specialUntil.getTime() <= Date.now()) return Response.json({ error: '特例無料の期限は今日以降の日付にしてください' }, { status: 400 });

    // 紹介者コードは登録済みの営業パートナーのものか確かめる（2026-11-06）
    const rc = await checkReferralCode(supabase, referred_by);
    if (rc.error) return Response.json({ error: rc.error }, { status: 400 });

    // エリア（2026-11-26）：都道府県は47都道府県のどれかだけ。都道府県と市区町村から、市区町村までの位置を入れておく
    // （番地までの位置は、お店が管理画面のプロフィールで住所を入れた時に lib/geocode.js で更新される）
    const pref = PREFECTURES.includes(prefecture) ? prefecture : null;
    const cityVal = pref && city ? String(city).trim().slice(0, 40) || null : null;
    const geo = pref ? await geocodeAddress([pref, cityVal]) : null;

    // providersテーブルに登録
    const { data, error } = await supabase
      .from('providers')
      .insert([{
        slug: resolvedSlug, name, catchphrase, description, target_desc, philosophy,
        main_category, sub_categories: sub_categories || [],
        area: pref ? [pref, cityVal].filter(Boolean).join('・') : (area ? String(area).slice(0, 60) : null),
        prefecture: pref, city: cityVal, ...(geo ? { lat: geo.lat, lon: geo.lon } : {}),
        price_from: price_from ? Number(price_from) : null,
        photo_url, email,
        line_user_id: line_user_id || null,
        // 特例無料以外は「お店が申し込むまで使えない」状態で作る（billing_status は Stripe が決める）
        // 無料モニター（2026-11-16）：MONITOR_CAMPAIGN.planKey のプラン（2026-11-26〜C）を3か月無料。期限が来たら cron が未契約に戻す
        plan: plan === 'special' ? 'special' : plan === 'monitor' ? MONITOR_CAMPAIGN.planKey : (['A', 'B', 'C'].includes(plan) ? plan : 'A'),
        billing_status: plan === 'special' ? 'active' : plan === 'monitor' ? 'monitor' : null,
        ...(plan === 'monitor' ? { monitor_started_at: new Date().toISOString(), monitor_until: monitorUntilFrom().toISOString() } : {}),
        ...(specialUntil ? { special_until: specialUntil.toISOString() } : {}),
        published: false,
        referral_code: referral_code || null, // nullならトリガーで自動生成
        referred_by: rc.code,
        suitable_triggers: suitable_triggers || [],
        handles_failure_patterns: handles_failure_patterns || [],
        provider_style: provider_style || null,
      }])
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    if (inquiry_id) {
      await supabase.from('provider_inquiries').update({ provider_id: data.id, status: 'done' }).eq('id', inquiry_id);
    }

    let inviteError = null;
    try {
      await sendProviderLoginInvite(supabase, { email, providerName: name });
    } catch (e) {
      inviteError = e.message || String(e);
      console.error('[provider invite]', inviteError);
    }

    // 無料モニターとして登録した時は、ログイン案内とは別にモニター開始の案内（期間・紹介制度）を送る（2026-11-19）
    if (data.billing_status === 'monitor') {
      try { await sendProviderStartEmail({ to: email, providerName: name, kind: 'monitor', monitorUntil: data.monitor_until }); }
      catch (e) { console.warn('[admin monitor start email]', e?.message); }
    }

    return Response.json({
      ...data,
      invite_sent: !inviteError,
      invite_error: inviteError,
    }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
