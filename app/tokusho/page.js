export const metadata = {
  title: '特定商取引法に基づく表記 | Fineme',
  robots: 'index,follow',
};

export default function TokushoPage() {
  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 860 }}>
        <h1 className="section-title">特定商取引法に基づく表記</h1>
        <p className="muted">本表記は、Finemeが掲載者（事業者）に対して提供する有料掲載サービスに関するものです。</p>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, lineHeight: 1.8 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', width: 220, color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>販売事業者名</th>
                <td style={{ padding: '14px 20px' }}>Fineme（ファインミ）</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>運営責任者</th>
                <td style={{ padding: '14px 20px' }}>渡邉 英雄</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>所在地</th>
                <td style={{ padding: '14px 20px' }}>請求があり次第、遅滞なく開示いたします。</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>電話番号</th>
                <td style={{ padding: '14px 20px' }}>
                  請求があり次第、遅滞なく開示いたします。<br />
                  <span style={{ fontSize: 13, color: 'rgba(232,228,220,0.55)' }}>お問い合わせは下記メールアドレスにて承っております。</span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>メールアドレス</th>
                <td style={{ padding: '14px 20px' }}><a href="mailto:contact@fineme.me">contact@fineme.me</a></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>ウェブサイト</th>
                <td style={{ padding: '14px 20px' }}><a href="https://fineme.me">https://fineme.me</a></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>販売サービスの内容</th>
                <td style={{ padding: '14px 20px' }}>
                  外見磨きサービスの検索・掲載・予約仲介プラットフォーム「Fineme」への掲載権。<br />
                  掲載者のサービス情報をFinemeのサイト上に公開し、ユーザーからの問い合わせ・予約リクエストを受け取ることができます。
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>販売価格</th>
                <td style={{ padding: '14px 20px' }}>
                  <strong>掲載登録手数料（初回のみ）：</strong>¥1,100（税込）<br /><br />
                  <strong>月額掲載料（3プランから選択）：</strong>
                  <table style={{ marginTop: 8, borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: 'rgba(10,15,30,0.45)' }}>
                        <th style={{ padding: '6px 16px', border: '1px solid rgba(232,228,220,0.15)', textAlign: 'left' }}>プラン</th>
                        <th style={{ padding: '6px 16px', border: '1px solid rgba(232,228,220,0.15)', textAlign: 'right' }}>月額（税込）</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 16px', border: '1px solid rgba(232,228,220,0.15)' }}>ライト</td>
                        <td style={{ padding: '6px 16px', border: '1px solid rgba(232,228,220,0.15)', textAlign: 'right' }}>¥5,000</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 16px', border: '1px solid rgba(232,228,220,0.15)' }}>スタンダード</td>
                        <td style={{ padding: '6px 16px', border: '1px solid rgba(232,228,220,0.15)', textAlign: 'right' }}>¥7,000</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 16px', border: '1px solid rgba(232,228,220,0.15)' }}>プレミアム</td>
                        <td style={{ padding: '6px 16px', border: '1px solid rgba(232,228,220,0.15)', textAlign: 'right' }}>¥10,000</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>支払方法</th>
                <td style={{ padding: '14px 20px' }}>
                  クレジットカード（Visa・Mastercard・JCB・American Express）<br />
                  <span style={{ fontSize: 13, color: 'rgba(232,228,220,0.55)' }}>決済処理はStripe, Inc.が行います。カード情報はFinemeのサーバーには保存されません。</span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>支払時期</th>
                <td style={{ padding: '14px 20px' }}>
                  <strong>登録手数料：</strong>掲載登録申込時に即時決済<br />
                  <strong>月額掲載料：</strong>Fineme経由で初めて予約・問い合わせが発生した月から課金開始。以降は毎月同日に自動更新。
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>サービス提供時期</th>
                <td style={{ padding: '14px 20px' }}>掲載登録完了後、即時提供開始</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(232,228,220,0.15)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>解約・返金について</th>
                <td style={{ padding: '14px 20px' }}>
                  解約またはプラン変更をご希望の場合は、<a href="mailto:contact@fineme.me">contact@fineme.me</a> までメールにてご連絡ください。月末までにご連絡いただいた場合、翌月から課金が停止します。<br />
                  当月分の月額掲載料は原則返金いたしません。<br />
                  ただし、当社の都合によりサービス提供が不可能となった場合は、未提供期間に応じた返金対応を行います。<br />
                  登録手数料（初回）は返金対象外です。
                </td>
              </tr>
              <tr>
                <th style={{ textAlign: 'left', padding: '14px 20px', color: 'rgba(232,228,220,0.75)', fontWeight: 700, background: 'rgba(10,15,30,0.50)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>動作環境</th>
                <td style={{ padding: '14px 20px' }}>インターネットに接続された端末および最新のWebブラウザ</td>
              </tr>
            </tbody>
          </table>
        </section>

        <p className="muted" style={{ textAlign: 'right', fontSize: 13 }}>制定日: 2026-03-09</p>
      </div>
    </main>
  );
}
