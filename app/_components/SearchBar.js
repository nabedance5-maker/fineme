"use client";
import { useSearchParams } from 'next/navigation';
import { useMemo, useCallback } from 'react';

export default function SearchBar({ keyword = '', region = '', category = '', compact = false }) {
  const sp = useSearchParams();
  const getLast = () => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(sessionStorage.getItem('glowup:lastSearch') || 'null'); } catch { return null; }
  };
  const last = getLast();
  const kw = useMemo(() => (keyword ?? sp.get('keyword') ?? last?.keyword ?? ''), [keyword, sp, last?.keyword]);
  const rg = useMemo(() => (region ?? sp.get('region') ?? last?.region ?? ''), [region, sp, last?.region]);
  const ct = useMemo(() => (category ?? sp.get('category') ?? last?.category ?? ''), [category, sp, last?.category]);

  const onSubmit = useCallback((e) => {
    try {
      const fd = new FormData(e.currentTarget);
      const data = {
        keyword: (fd.get('keyword') || '').toString(),
        region: (fd.get('region') || '').toString(),
        category: (fd.get('category') || '').toString()
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('glowup:lastSearch', JSON.stringify(data));
      }
    } catch {}
  }, []);

  if (compact) {
    return (
  <form className="searchbar--compact" action="/search" method="get" onSubmit={onSubmit}>
        <input name="keyword" defaultValue={kw} placeholder="何を探しますか？（例：メンズメイク、第一印象、撮影）" />
        {/* keep params in sync via hidden fields */}
        <input type="hidden" name="region" value={rg} />
        <input type="hidden" name="category" value={ct} />
        <button className="btn" type="submit">検索</button>
      </form>
    );
  }

  return (
  <form className={'searchbar'} action="/search" method="get" onSubmit={onSubmit}>
      <input name="keyword" defaultValue={kw} placeholder="何を探しますか？（例：メンズメイク、第一印象、撮影）" />
      <select name="region" defaultValue={rg}>
        <option value="tokyo">東京</option>
        <option value="osaka">大阪</option>
        <option value="">全国</option>
      </select>
      <select name="category" defaultValue={ct}>
        <option value="">すべてのカテゴリ</option>
  <option value="consulting">外見トータルサポート</option>
        <option value="gym">パーソナルジム</option>
        <option value="makeup">メイクアップ</option>
  <option value="hair">ヘア</option>
        <option value="diagnosis">カラー/骨格診断</option>
        <option value="fashion">コーデ提案</option>
  <option value="photo">写真撮影（アプリ等）</option>
        <option value="marriage">結婚相談所</option>
        <option value="eyebrow">眉毛</option>
        <option value="hairremoval">脱毛</option>
        <option value="esthetic">エステ</option>
        <option value="whitening">ホワイトニング</option>
        <option value="orthodontics">歯科矯正</option>
        <option value="nail">ネイル</option>
      </select>
      <button className="btn" type="submit">検索</button>
    </form>
  );
}
