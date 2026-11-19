// GET    /api/encompass/board … タブレット用のリンクがあるか
// POST   /api/encompass/board … タブレット用のリンクを作り直す（前のリンクは使えなくなる）。鍵はこの時だけ返す
// DELETE /api/encompass/board … タブレット用のリンクを止める
export const dynamic = 'force-dynamic';
import { db, encompassAuth, fail, hashToken, newBoardToken, okJson } from '@/lib/encompass/server';

export async function GET(request) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  const { data, error } = await db().from('encompass_boards').select('created_at').eq('provider_id', a.store.id).maybeSingle();
  if (error) return fail('読み込めませんでした', 503);
  return okJson({ exists: !!data, created_at: data?.created_at || null, can: a.can.board });
}

export async function POST(request) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  if (!a.can.board) return fail('タブレット用のリンクを作る権限がありません（オーナー・店長が作れます）', 403, 'no_perm');
  const token = newBoardToken();
  const { error } = await db().from('encompass_boards')
    .upsert({ provider_id: a.store.id, token_hash: hashToken(token), created_by: a.user.id, created_at: new Date().toISOString() }, { onConflict: 'provider_id' });
  if (error) return fail('作れませんでした', 503);
  return okJson({ token });
}

export async function DELETE(request) {
  const a = await encompassAuth(request);
  if (a.res) return a.res;
  if (!a.can.board) return fail('タブレット用のリンクを止める権限がありません', 403, 'no_perm');
  const { error } = await db().from('encompass_boards').delete().eq('provider_id', a.store.id);
  if (error) return fail('止められませんでした', 503);
  return okJson({ ok: true });
}
