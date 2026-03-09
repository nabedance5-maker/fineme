// Fineme 掲載プラン定義
// price_id は Stripe テストモードの値（本番移行時に差し替え）
export const PLANS = {
  A: {
    name: 'Fineme掲載プランA',
    price_id: 'price_1T8sHV6s13itCGa3PtWrvios',
    amount: 5000,
    commission_rate: 0.083,
  },
  B: {
    name: 'Fineme掲載プランB',
    price_id: 'price_1T8sI06s13itCGa3AeSpTO0r',
    amount: 7000,
    commission_rate: 0.07,
  },
  C: {
    name: 'Fineme掲載プランC',
    price_id: 'price_1T8sIY6s13itCGa3siEBR0jR',
    amount: 10000,
    commission_rate: 0.055,
  },
};

export function getPlanByPriceId(priceId) {
  return Object.values(PLANS).find(p => p.price_id === priceId) || null;
}
