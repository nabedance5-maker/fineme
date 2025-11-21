export default function BookingPage({ params }) {
  const { slug } = params;
  return (
    <div className="container stack" style={{ padding: '32px 0' }}>
      <h1>予約: {slug}</h1>
      <form className="stack" style={{ maxWidth: 520 }}>
        <label>
          日時
          <input type="datetime-local" name="datetime" />
        </label>
        <label>
          お名前
          <input type="text" name="name" placeholder="山田 太郎" />
        </label>
        <label>
          連絡先メール
          <input type="email" name="email" placeholder="you@example.com" />
        </label>
        <button className="btn" type="submit">確認へ</button>
      </form>
    </div>
  );
}
