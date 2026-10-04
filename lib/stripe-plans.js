// Fineme 掲載プラン定義
// price_id は Stripe 本番モードの値
export const PLANS = {
  A: {
    name: 'Fineme掲載プランA',
    price_id: 'price_1T929L83gDt71t3rmA0bSscP',
    amount: 5000,
  },
  B: {
    name: 'Fineme掲載プランB',
    price_id: 'price_1T929Y83gDt71t3rJn1DWoEB',
    amount: 7000,
  },
  C: {
    name: 'Fineme掲載プランC',
    price_id: 'price_1T929m83gDt71t3rMijJ7Rgq',
    amount: 10000,
  },
};

export function getPlanByPriceId(priceId) {
  return Object.values(PLANS).find(p => p.price_id === priceId) || null;
}

export function getPlanKeyByPriceId(priceId) {
  return Object.entries(PLANS).find(([, p]) => p.price_id === priceId)?.[0] || 'A';
}
