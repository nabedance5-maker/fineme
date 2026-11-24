// 「最初の一手」（Fineme Compass の第1候補）の読み方を1か所に揃える（Muse第2弾 2026-11-22 §2）。
//
// 以前は画面ごとに決め方が違った：結果ページは診断の推奨（compass_first）、Map は端末に残った
// 選び直しの値（fineme:compass:override）→ 別の計算式（ギャップ×未完了率）、マイページは
// 端末の compass_first。同じ受検でも「服／体型」と画面で答えが割れていた。さらに、前の受検で
// 選び直した値が端末に残り、新しい受検にも「あなたが選んだ方角」として効いていた。
//
// 正は診断プロフィールの compass_first ひとつ。
//   - 受検時：Me Scan が計算した推奨が入る
//   - 選び直した時：元の推奨を compass_first_original に退避し、compass_first を選んだ軸にする
//   - 推奨に戻す：compass_first を元に戻し、compass_first_original を消す
// 選び直しはその受検のプロフィールに入るので、受け直せば自然に推奨へ戻る。

export const LEGACY_OVERRIDE_KEY = 'fineme:compass:override';

/** 全画面が表示する「最初の一手」 */
export function firstStepOf(p) {
  return p?.compass_first || p?.priority_order?.[0] || 'body';
}

/** 診断の推奨（選び直していればその前の値） */
export function recommendedFirstOf(p) {
  return p?.compass_first_original || p?.compass_first || p?.priority_order?.[0] || 'body';
}

/** 本人が実際に選び直したか（推奨のままなら false） */
export function isFirstChosenByUser(p) {
  return !!(p?.compass_first_original && p.compass_first && p.compass_first !== p.compass_first_original);
}

/** 選び直し・推奨に戻すを反映したプロフィールを返す（元は変えない） */
export function withFirstStep(p, axis) {
  const recommended = recommendedFirstOf(p);
  const next = { ...p, compass_first: axis };
  if (axis === recommended) delete next.compass_first_original;
  else next.compass_first_original = recommended;
  return next;
}

/** 旧方式の端末の上書き値を消す（受検をまたいで効いてしまうため使わない） */
export function clearLegacyOverride() {
  try { localStorage.removeItem(LEGACY_OVERRIDE_KEY); } catch {}
}
