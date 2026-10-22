// 体験メニュー（LP・Mirrorのマッチング・エリア需要で使う）。
// 2026-10-22：LP設定の「体験メニュー」（provider_experience_menus）を廃止し、メニュー（provider_services）の
// 「体験」に統合した（メニューの決め事を1か所にまとめる）。読み出す側が今まで通り使えるよう、旧体験メニューと同じ形で返す。
// axes は「対応する悩み（複数）」＋メニューの対応軸。

export function toTrialMenu(s) {
  return {
    id: s.id,
    provider_id: s.provider_id,
    name: s.name,
    price: s.price,
    duration_min: s.duration_minutes,
    axes: [...new Set([...(s.axes || []), ...(s.target_axis ? [s.target_axis] : [])])],
    description: s.description || '',
    images: s.image_url ? [s.image_url] : [],
    sort_order: s.sort_order,
  };
}

export async function trialMenus(db, providerIds) {
  const ids = Array.isArray(providerIds) ? providerIds : [providerIds];
  if (!ids.length) return [];
  const { data } = await db.from('provider_services')
    .select('id, provider_id, name, price, duration_minutes, axes, target_axis, description, image_url, sort_order')
    .in('provider_id', ids).eq('is_trial', true)
    .order('sort_order', { ascending: true });
  return (data || []).map(toTrialMenu);
}
