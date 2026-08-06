// og画像（Pinterest/X/note）用に目視確認済みのUnsplash写真ID。
// lib/thumbnail-photos.js の共有プールは男女混在・無関係画像の混入が確認されたため使わない
// （2026-08-06発見）。og画像は文字だけでなく画像そのものの質が問われるため、個別に厳選する。
export const CURATED_PHOTOS = {
  fineme: ['1503951914875-452162b0f3f1', '1507003211169-0a1dd7228f2d', '1519085360753-af0119f7cbe7', '1605296867304-46d5465a13f1'],
  belle:  ['1522337360788-8b13dee7a37e', '1515886657613-9f3515b0c78f', '1506794778202-cad84cf45f1d'],
};

export function pickCuratedPhotoId(track, seed) {
  const pool = track === 'belle' ? CURATED_PHOTOS.belle : CURATED_PHOTOS.fineme;
  return pool[seed % pool.length];
}
