// お店のメニューの入力を整える（API用）。種目は知っているものだけ・数は決めた範囲だけ（lib/encompass/menu.js の sanitizeMenu）
import { sanitizeMenu } from './menu';
import { cleanText, customerOfStore } from './server';

export const MAX_MENUS_PER_STORE = 500;

// 戻り値：{ row } または { error }
export async function menuRowFrom(body, a, { partial = false } = {}) {
  if (!body || typeof body !== 'object') return { error: '送られた内容を読めませんでした' };
  const row = {};
  if (!partial || 'title' in body) row.title = cleanText(body.title, 40);
  if (!partial || 'items' in body) {
    const m = sanitizeMenu({ title: '', items: Array.isArray(body.items) ? body.items : [] });
    if (!m.items.length) return { error: '種目を1つ以上入れてください' };
    row.items = m.items;
  }
  if (!partial || 'customer_ref' in body) {
    const ref = body.customer_ref || null;
    if (ref) {
      if (!a.can.customers) return { error: 'お客様の情報を扱う権限がありません', status: 403 };
      if (!(await customerOfStore(a.store.id, ref))) return { error: 'このお店のお客様ではありません' };
    }
    row.customer_ref = ref;
  }
  if (!partial || 'on_board' in body) row.on_board = body.on_board === true;
  // お客様用のメニューは、ログインなしのタブレットには出さない
  if (row.customer_ref) row.on_board = false;
  return { row };
}
