// 店頭の入会手続きで、お客様がStripeのカード登録を終えた後に戻ってくるページ（ログイン不要）。
export const metadata = { title: 'カード登録 | Fineme', robots: 'noindex,nofollow' };

export default async function CardRegisteredPage({ searchParams }) {
  const sp = await searchParams;
  const ok = sp?.status === 'success';
  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 520, textAlign: 'center', padding: '48px 0' }}>
        <h1 className="section-title">{ok ? 'カードの登録が完了しました' : 'カードの登録を中断しました'}</h1>
        <p className="muted" style={{ lineHeight: 1.8 }}>
          {ok
            ? 'ありがとうございます。この画面を閉じて、お店のスタッフにお知らせください。スタッフが内容を確認して入会を確定すると、月会費のお支払いが始まります。'
            : 'カードは登録されていません。もう一度登録する場合は、お店のスタッフにお声がけください。'}
        </p>
      </div>
    </main>
  );
}
