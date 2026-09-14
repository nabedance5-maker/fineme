// GET /api/cron/generate-slots
// Vercel Cron Job: 毎日、即時予約ONの全店舗に対して向こう14日分の空き枠を自動補充する
// （でお要望2026-09-14：手動登録の手間を無くす。営業時間・刻み幅の設定から生成）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { generateForProvider } from '@/lib/slot-generator';
import { hasFeature } from '@/lib/feature-flags';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  const { data: providers, error } = await db.from('providers').select('id, enabled_features');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const targets = (providers || []).filter(p => hasFeature(p, 'instant_booking'));
  let totalCreated = 0;
  const results = [];
  for (const p of targets) {
    try {
      const { createdCount } = await generateForProvider(p.id, 14);
      totalCreated += createdCount;
      results.push({ providerId: p.id, createdCount });
    } catch (e) {
      console.error('[cron/generate-slots]', p.id, e);
      results.push({ providerId: p.id, error: e.message });
    }
  }

  return Response.json({ ok: true, providerCount: targets.length, totalCreated, results });
}
