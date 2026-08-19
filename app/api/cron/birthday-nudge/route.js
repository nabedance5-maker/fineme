// GET /api/cron/birthday-nudge
// Vercel Cron: 毎日実行。誕生日（月日）が今日と一致するユーザーに、
// New Me Logで紐づけている店舗ごとにお祝いメッセージを送る（予約・再来店リマインドSaaS フェーズ3-F）。
// 店舗別LINEチャネル連携済みならそちらから、未連携ならFineme公式LINEから送る（resolveLineTarget）。
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { resolveLineTarget } from '@/lib/line-channel';

export const dynamic = 'force-dynamic';

function jstToday() {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  const today = jstToday();
  const mmdd = `${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;
  const year = today.getUTCFullYear();

  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, birthday, line_user_id')
    .not('birthday', 'is', null);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const targets = (profiles || []).filter(p => p.birthday && p.birthday.slice(5) === mmdd);
  if (!targets.length) return Response.json({ sent: 0, date: mmdd });

  const userIds = targets.map(p => p.id);
  const { data: logs } = await db
    .from('user_service_logs')
    .select('user_id, provider_slug')
    .in('user_id', userIds)
    .eq('active', true)
    .not('provider_slug', 'is', null);

  const slugsByUser = {};
  (logs || []).forEach(l => {
    (slugsByUser[l.user_id] = slugsByUser[l.user_id] || new Set()).add(l.provider_slug);
  });

  const allSlugs = [...new Set((logs || []).map(l => l.provider_slug))];
  let providerBySlug = {};
  if (allSlugs.length) {
    const { data: providers } = await db.from('providers').select('id, slug, name').in('slug', allSlugs);
    (providers || []).forEach(p => { providerBySlug[p.slug] = p; });
  }

  let sent = 0;
  for (const profile of targets) {
    const slugs = [...(slugsByUser[profile.id] || [])];
    for (const slug of slugs) {
      const provider = providerBySlug[slug];
      if (!provider) continue;

      const { data: already } = await db
        .from('provider_birthday_nudges')
        .select('provider_id')
        .eq('provider_id', provider.id)
        .eq('user_id', profile.id)
        .eq('year', year)
        .maybeSingle();
      if (already) continue;

      const target = await resolveLineTarget(db, {
        providerSlug: slug,
        userId: profile.id,
        fallbackLineUserId: profile.line_user_id,
      });
      if (!target.lineUserId) continue;

      const text = `お誕生日おめでとうございます🎂\n${provider.name}より、日頃のご利用に感謝を込めて。よろしければまたお越しください。`;
      const res = await sendLinePush(target.lineUserId, text, target.token);
      if (res.ok) {
        sent++;
        await db.from('provider_birthday_nudges').insert({ provider_id: provider.id, user_id: profile.id, year });
      }
    }
  }

  return Response.json({ sent, date: mmdd, candidates: targets.length });
}
