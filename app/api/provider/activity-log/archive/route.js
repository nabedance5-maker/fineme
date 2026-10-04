// GET /api/provider/activity-log/archive → 30日より前の操作ログ(テキストファイル)の一覧
// GET /api/provider/activity-log/archive?file=2026-09/2026-09-01.jsonl → 1ファイルのダウンロード用URL（5分有効）
export const dynamic = 'force-dynamic';
import { authProvider, supabase } from '../../consultant/_lib';
import { planLockedResponse } from '@/lib/plan-features';

const BUCKET = 'activity-log-archive';

export async function GET(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'activity_log'); if (locked) return locked; }
  const store = supabase.storage.from(BUCKET);

  const file = new URL(request.url).searchParams.get('file');
  if (file) {
    if (!/^\d{4}-\d{2}\/\d{4}-\d{2}-\d{2}\.jsonl$/.test(file)) return Response.json({ error: '不正なファイル名です' }, { status: 400 });
    const { data, error } = await store.createSignedUrl(`${provider.id}/${file}`, 300, { download: file.split('/')[1] });
    if (error || !data) return Response.json({ error: 'ファイルが見つかりません' }, { status: 404 });
    return Response.json({ url: data.signedUrl });
  }

  const months = await store.list(provider.id, { limit: 100, sortBy: { column: 'name', order: 'desc' } });
  const files = [];
  for (const m of (months.data || []).filter(x => /^\d{4}-\d{2}$/.test(x.name)).slice(0, 14)) {
    const { data } = await store.list(`${provider.id}/${m.name}`, { limit: 100, sortBy: { column: 'name', order: 'desc' } });
    (data || []).filter(f => f.name.endsWith('.jsonl')).forEach(f => files.push({ month: m.name, name: f.name, path: `${m.name}/${f.name}` }));
  }
  return Response.json({ files });
}
