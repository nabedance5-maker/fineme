// GET /api/me/mirror-comparison
// 直近2ヶ月（JST）のpaid Mirror分析を比較して軸ごとの変化を返す
import { getSupabase } from '@/lib/supabase';

const LEVEL_ORDER = { '高': 2, '中': 1, '低': 0 };

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await getSupabase().auth.getUser(token);
  return user || null;
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await getSupabase()
    .from('mirror_sessions')
    .select('id, created_at, analysis')
    .eq('user_id', user.id)
    .eq('paid', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const toJST = d => new Date(new Date(d).getTime() + 9 * 3_600_000);
  const monthKey = d => {
    const j = toJST(d);
    return `${j.getFullYear()}-${String(j.getMonth() + 1).padStart(2, '0')}`;
  };

  // 月ごとに最新セッション1件（ORDER BY desc なので先着=最新）
  const byMonth = new Map();
  for (const s of data || []) {
    const m = monthKey(s.created_at);
    if (!byMonth.has(m)) byMonth.set(m, s);
  }

  // 新しい月順で最大2ヶ月
  const months = [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 2)
    .map(([ym, s]) => ({
      year_month: ym,
      label: `${parseInt(ym.split('-')[1])}月`,
      axes: (s.analysis?.axes || []).map(ax => ({
        id: ax.id,
        name: ax.name,
        icon: ax.icon || '',
        potential_level: ax.potential_level,
      })),
    }));

  if (months.length < 2) return Response.json({ has_comparison: false, months });

  const [newM, prevM] = months;
  const prevMap = Object.fromEntries(prevM.axes.map(ax => [ax.id, ax]));

  const changes = newM.axes
    .filter(ax => prevMap[ax.id])
    .map(newAx => {
      const from = prevMap[newAx.id].potential_level;
      const to   = newAx.potential_level;
      // worsened は stable に吸収（Mirror精度の揺れ・解約動機化を防ぐ）
      const dir  = LEVEL_ORDER[from] > LEVEL_ORDER[to] ? 'improved' : 'stable';
      return { id: newAx.id, name: newAx.name, icon: newAx.icon, from, to, direction: dir };
    });

  return Response.json({
    has_comparison: true,
    prev_month: prevM.label,
    new_month:  newM.label,
    changes,
    improved_count: changes.filter(c => c.direction === 'improved').length,
    stable_count:   changes.filter(c => c.direction === 'stable').length,
  });
}
