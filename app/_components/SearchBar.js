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
        <option value="">全国</option>
        <optgroup label="北海道・東北">
          <option value="北海道">北海道</option>
          <option value="青森">青森県</option>
          <option value="岩手">岩手県</option>
          <option value="宮城">宮城県</option>
          <option value="秋田">秋田県</option>
          <option value="山形">山形県</option>
          <option value="福島">福島県</option>
        </optgroup>
        <optgroup label="関東">
          <option value="茨城">茨城県</option>
          <option value="栃木">栃木県</option>
          <option value="群馬">群馬県</option>
          <option value="埼玉">埼玉県</option>
          <option value="千葉">千葉県</option>
          <option value="東京">東京都</option>
          <option value="神奈川">神奈川県</option>
        </optgroup>
        <optgroup label="中部">
          <option value="新潟">新潟県</option>
          <option value="富山">富山県</option>
          <option value="石川">石川県</option>
          <option value="福井">福井県</option>
          <option value="山梨">山梨県</option>
          <option value="長野">長野県</option>
          <option value="岐阜">岐阜県</option>
          <option value="静岡">静岡県</option>
          <option value="愛知">愛知県</option>
        </optgroup>
        <optgroup label="近畿">
          <option value="三重">三重県</option>
          <option value="滋賀">滋賀県</option>
          <option value="京都">京都府</option>
          <option value="大阪">大阪府</option>
          <option value="兵庫">兵庫県</option>
          <option value="奈良">奈良県</option>
          <option value="和歌山">和歌山県</option>
        </optgroup>
        <optgroup label="中国・四国">
          <option value="鳥取">鳥取県</option>
          <option value="島根">島根県</option>
          <option value="岡山">岡山県</option>
          <option value="広島">広島県</option>
          <option value="山口">山口県</option>
          <option value="徳島">徳島県</option>
          <option value="香川">香川県</option>
          <option value="愛媛">愛媛県</option>
          <option value="高知">高知県</option>
        </optgroup>
        <optgroup label="九州・沖縄">
          <option value="福岡">福岡県</option>
          <option value="佐賀">佐賀県</option>
          <option value="長崎">長崎県</option>
          <option value="熊本">熊本県</option>
          <option value="大分">大分県</option>
          <option value="宮崎">宮崎県</option>
          <option value="鹿児島">鹿児島県</option>
          <option value="沖縄">沖縄県</option>
        </optgroup>
      </select>
      <select name="category" defaultValue={ct}>
        <option value="">すべてのカテゴリ</option>
  <option value="consulting">外見トータルサポート</option>
        <option value="gym">パーソナルジム</option>
        <option value="makeup">メイクアップ</option>
  <option value="hair">ヘア</option>
        <option value="colordiagnosis">パーソナルカラー診断</option>
        <option value="bonediagnosis">骨格診断</option>
        <option value="diagnosis">診断（総合）</option>
        <option value="fashion">コーディネート</option>
  <option value="photo">写真撮影（アプリ等）</option>
        <option value="marriage">結婚関連サービス</option>
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
