// POST /api/provider/posture-entries/[id]/share-link → その記録の閲覧リンクを作る（作り直すと前のリンクは使えなくなる）
// 2026-11-24 渡邉承認の指示書 §3。Finemeに登録していないお客様にも、LINE等で記録を渡せるようにする。
// リンクを作ると「お客様に表示する」もONになる。OFFにするとリンクは消える（lib/posture-share.js）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { isPostureEligiblePlan } from '@/lib/posture-analysis';
import { issuePostureShareLink } from '@/lib/posture-share';
import { withAudit } from '@/lib/activity-log';

async function __POST(request, ctx) {
  const { id } = await ctx.params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabase();
  const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: provider } = await db.from('providers').select('id, plan').eq('email', user.email).maybeSingle();
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isPostureEligiblePlan(provider.plan)) return Response.json({ error: 'この機能はプレミアムプラン（¥10,000/月）限定です' }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return Response.json({ error: '記録が見つかりません' }, { status: 404 });

  try {
    const link = await issuePostureShareLink(db, provider.id, id);
    if (!link) return Response.json({ error: '記録が見つかりません' }, { status: 404 });
    return Response.json(link);
  } catch {
    return Response.json({ error: 'リンクを作れませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
  }
}

export const POST = withAudit(__POST);
