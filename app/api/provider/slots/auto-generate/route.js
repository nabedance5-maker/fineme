// POST /api/provider/slots/auto-generate → 営業時間からの自動枠生成
// body: { days?: number }（省略時14日）。
// でお要望2026-09-14：「空き枠を手動で1つずつ登録させるのは非効率。営業時間さえ
// 分かれば自動で生成すべき」。即時予約をONにした直後の即時反映、および
// cron/generate-slots による日次補充の両方から lib/slot-generator.js の
// generateForProvider を共有して呼ぶ。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { generateForProvider } from '@/lib/slot-generator';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  try {
    const result = await generateForProvider(provider.id, body.days);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
