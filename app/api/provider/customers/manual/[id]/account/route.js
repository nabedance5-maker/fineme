// POST /api/provider/customers/manual/[id]/account → 非会員のお客様にFinemeアカウントを用意して紐づける（でお要望 2026-10-22）
// body: { email }（無ければ店頭だけでご利用の方として、届かないアドレスでアカウントだけ作る）。
// アカウントがあると、月額プランの入会リンクを送ったり、お客様自身がログインして予約したりできる。非会員の記録はそのまま残る。
export const dynamic = 'force-dynamic';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { ensureManualLinked } from '@/lib/customer-accounts';

async function __POST(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'メールアドレスの形を確かめてください' }, { status: 400 });
  try {
    const r = await ensureManualLinked(a.provider.id, id, email);
    if (r.error) return Response.json({ error: r.error }, { status: 404 });
    return Response.json({ user_id: r.userId, existed: r.existed }, { status: 201 });
  } catch (e) {
    console.error('[customers/manual/account]', e);
    return Response.json({ error: 'アカウントを用意できませんでした' }, { status: 500 });
  }
}
export const POST = withAudit(__POST);
