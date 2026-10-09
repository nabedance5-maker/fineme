// 営業パートナー報酬のルール（lib/referral-summary.js・app/api/stripe/webhook と同じ条件）。
// サーバー側ページとクライアント部品の両方から読むため、'use client' を付けない共通モジュールに置く。
// 初月：紹介した店舗の初月の月額利用料の90% ／ 継続：契約が続く限り1店舗につき月500円
export const PLANS = [
  { key: 'A', name: 'ライト', price: 5000 },
  { key: 'B', name: 'スタンダード', price: 7000 },
  { key: 'C', name: 'プレミアム', price: 10000 },
];
export const FIRST_RATE = 0.9;
export const STOCK_PER_STORE = 500;
