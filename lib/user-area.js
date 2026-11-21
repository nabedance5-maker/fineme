// 一般ユーザーの「お住まいの地域」（都道府県＋市区町村）を扱う共通処理。
// 2026-11-21：アカウント作成時に市区町村まで入力してもらう（渡邉指示・営業パートナー候補の提案）。
// 保存先は本人の profiles.area / profiles.city だけ。店舗・他のユーザーには個人の地域を返さない
// （営業や紹介に使うときは市区町村ごとの人数にまとめてから使う）。
import { PREFECTURES } from '@/app/_data/japan-cities';

// 端末に置くキーは LocationPrompt・マイページと同じものを使う
export const LS_AREA = 'fineme:user:area';
export const LS_CITY = 'fineme:user:city';

const CITY_MAX = 40;

// 都道府県は一覧にあるものだけ、市区町村は一覧にない町村もあるので文字で受ける
// （長さ・記号を制限し、制御文字や < > を入れさせない）。不正なら null。
export function normalizeUserArea(area, city) {
  const raw = String(area ?? '').trim();
  const c = String(city ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>"'`\\]/g, '').trim();
  // 一覧は「東京」「大阪」「北海道」の形。「東京都」や、現在地から取った「北海」（末尾の道を落とした形）も受ける
  const a = [raw, raw.replace(/[都府県]$/, ''), raw + '道'].find(x => PREFECTURES.includes(x));
  if (!a) return null;
  if (!c || c.length > CITY_MAX) return null;
  return { area: a, city: c };
}

export function getLocalUserArea() {
  if (typeof window === 'undefined') return null;
  try {
    return normalizeUserArea(localStorage.getItem(LS_AREA), localStorage.getItem(LS_CITY));
  } catch { return null; }
}

export function saveLocalUserArea(area, city) {
  if (typeof window === 'undefined') return;
  const v = normalizeUserArea(area, city);
  if (!v) return;
  try {
    localStorage.setItem(LS_AREA, v.area);
    localStorage.setItem(LS_CITY, v.city);
    localStorage.removeItem('fineme:user:area:skip');
  } catch {}
}
