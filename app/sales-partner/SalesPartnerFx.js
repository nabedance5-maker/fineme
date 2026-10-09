'use client';

import { useMemo, useState } from 'react';

import { PLANS, FIRST_RATE, STOCK_PER_STORE } from './reward';

const yen = (n) => `¥${Math.round(n).toLocaleString()}`;

// 毎月 perMonth 店舗を紹介し、解約がない場合の m ヶ月目（1始まり）の報酬
function monthReward(m, perMonth, price) {
  const first = perMonth * price * FIRST_RATE;
  const stock = perMonth * (m - 1) * STOCK_PER_STORE;
  return { first, stock, total: first + stock };
}

// ── ヒーロー：営業パートナー専用ページの画面イメージ（実画面 /partner/[token] と同じ項目） ──
export function PartnerPageMock() {
  return (
    <div className="sp-mock">
      <span className="pj-mock-tag">画面イメージ</span>
      <p className="sp-mock-kicker">Fineme 営業パートナー管理画面</p>
      <p className="sp-mock-name">あなた さん</p>
      <div className="sp-mock-card">
        <span className="sp-mock-label">あなたの紹介コード</span>
        <span className="sp-mock-code">FN031</span>
        <span className="sp-mock-label">紹介URL</span>
        <span className="sp-mock-url">fineme.me/provider/join?ref=FN031</span>
      </div>
      <div className="sp-mock-stats">
        <div><b>12</b><span>紹介人数（合計）</span></div>
        <div><b>11</b><span>課金中の紹介先</span></div>
        <div className="sp-mock-accent"><b>¥9,500</b><span>今月の見込み報酬</span></div>
        <div><b>¥76,000</b><span>累計報酬額</span></div>
      </div>
      <p className="sp-mock-foot">数字は表示例です</p>
    </div>
  );
}

// ── ⑤ 単発型と積み上げ型の比較（12ヶ月） ──
export function StackCompare() {
  const perMonth = 2;
  const price = PLANS[0].price;
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const rows = months.map((m) => monthReward(m, perMonth, price));
  const max = rows[rows.length - 1].total;
  const oneShot = perMonth * price * FIRST_RATE;

  return (
    <div className="sp-compare" data-reveal>
      <div className="sp-compare-legend">
        <span><i className="sp-sw sp-sw-one" />単発型（成約した月だけ）</span>
        <span><i className="sp-sw sp-sw-first" />初月報酬</span>
        <span><i className="sp-sw sp-sw-stock" />積み上がる継続報酬</span>
      </div>
      <div className="sp-bars" role="img" aria-label={`毎月2店舗紹介した場合、12ヶ月目の月間報酬は単発型${yen(oneShot)}、積み上げ型${yen(max)}`}>
        {rows.map((r, i) => (
          <div key={i} className="sp-bar-col">
            <div className="sp-bar-pair">
              <div className="sp-bar sp-bar-one" style={{ height: `${(oneShot / max) * 100}%` }} />
              <div className="sp-bar sp-bar-stack" style={{ height: `${(r.total / max) * 100}%`, '--i': i }}>
                <div className="sp-bar-stock" style={{ height: `${(r.stock / r.total) * 100}%` }} />
              </div>
            </div>
            <span className="sp-bar-x">{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="sp-compare-foot">
        <div><span>12ヶ月目の月間報酬・単発型</span><b>{yen(oneShot)}</b></div>
        <div className="sp-compare-hi"><span>12ヶ月目の月間報酬・積み上げ型</span><b>{yen(max)}</b></div>
      </div>
      <p className="sp-note">計算例：毎月2店舗を紹介、全店舗がライトプラン（月額¥5,000）、解約がない場合。横軸は活動開始からの月数。実際の報酬は紹介の実績によって変わります。</p>
    </div>
  );
}

// ── ⑦ 報酬シミュレーター ──
export function RewardSimulator() {
  const [perMonth, setPerMonth] = useState(2);
  const [planKey, setPlanKey] = useState('A');
  const [months, setMonths] = useState(12);
  const plan = PLANS.find((p) => p.key === planKey);

  const r = useMemo(() => {
    const last = monthReward(months, perMonth, plan.price);
    let cumulative = 0;
    for (let m = 1; m <= months; m++) cumulative += monthReward(m, perMonth, plan.price).total;
    return { last, cumulative, stores: perMonth * months };
  }, [perMonth, plan.price, months]);

  return (
    <div className="sp-sim" data-reveal>
      <div className="sp-sim-inputs">
        <label className="sp-field">
          <span className="sp-field-label">毎月の紹介数<b>{perMonth}店舗</b></span>
          <input type="range" min="1" max="10" step="1" value={perMonth} onChange={(e) => setPerMonth(Number(e.target.value))} />
        </label>
        <div className="sp-field">
          <span className="sp-field-label">紹介した店舗のプラン</span>
          <div className="sp-seg" role="radiogroup" aria-label="プラン">
            {PLANS.map((p) => (
              <button key={p.key} type="button" role="radio" aria-checked={planKey === p.key} className={planKey === p.key ? 'on' : ''} onClick={() => setPlanKey(p.key)}>
                {p.name}<small>月額{yen(p.price)}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="sp-field">
          <span className="sp-field-label">続けた期間</span>
          <div className="sp-seg" role="radiogroup" aria-label="期間">
            {[6, 12, 24].map((m) => (
              <button key={m} type="button" role="radio" aria-checked={months === m} className={months === m ? 'on' : ''} onClick={() => setMonths(m)}>
                {m}ヶ月
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="sp-sim-out">
        <div className="sp-sim-main">
          <span>{months}ヶ月目の月間報酬</span>
          <b>{yen(r.last.total)}</b>
          <small>うち継続報酬 {yen(r.last.stock)}（{r.stores - perMonth}店舗ぶん）</small>
        </div>
        <div className="sp-sim-sub">
          <div><span>紹介した店舗の累計</span><b>{r.stores}店舗</b></div>
          <div><span>{months}ヶ月間の報酬の合計</span><b>{yen(r.cumulative)}</b></div>
          <div><span>その後、何もしなくても続く継続報酬</span><b>{yen(r.stores * STOCK_PER_STORE)}<small>/月</small></b></div>
        </div>
        <p className="sp-note">紹介した店舗がすべて契約を続けた場合の計算例です。店舗が解約した月以降、その店舗の継続報酬は発生しません。</p>
      </div>
    </div>
  );
}

// ── ⑫ 応募フォーム（既存の /api/provider/inquiry に category=sales_partner で送る） ──
const EXPERIENCE = ['営業・紹介の経験はない', '副業で少しある', '本業で営業をしている／していた', '店舗の運営・経営の経験がある'];

export function ApplyForm() {
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [msg, setMsg] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    if (!name || !email) { setState('error'); setMsg('お名前とメールアドレスを入力してください。'); return; }
    if (!fd.get('consent')) { setState('error'); setMsg('プライバシーポリシーへの同意が必要です。'); return; }
    const message = [
      '【営業パートナー応募】',
      `営業・紹介の経験: ${fd.get('experience') || '未選択'}`,
      `紹介できそうな店舗・業種: ${String(fd.get('targets') || '').trim() || '未記入'}`,
      '',
      String(fd.get('note') || '').trim() || '（自由記入なし）',
    ].join('\n');
    setState('sending'); setMsg('');
    try {
      const res = await fetch('/api/provider/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bizName: name, contactName: name, email,
          phone: String(fd.get('phone') || '').trim(),
          category: 'sales_partner', contactPref: 'email', message,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '送信に失敗しました');
      }
      setState('done');
    } catch (err) {
      setState('error'); setMsg(`${err.message}。時間をおいて再度お試しください。`);
    }
  }

  if (state === 'done') {
    return (
      <div className="sp-form sp-form-done" role="status">
        <span className="fm-seal pj-seal pj-seal-lg">受</span>
        <h3>応募を受け付けました</h3>
        <p>ご入力のメールアドレスに受付の確認をお送りしました。内容を拝見し、オンライン面談の日程をご連絡します。</p>
      </div>
    );
  }

  return (
    <form className="sp-form" onSubmit={onSubmit} noValidate>
      <div className="sp-form-grid">
        <label className="sp-input"><span>お名前・屋号<em>必須</em></span><input name="name" autoComplete="name" required /></label>
        <label className="sp-input"><span>メールアドレス<em>必須</em></span><input name="email" type="email" autoComplete="email" required /></label>
        <label className="sp-input"><span>電話番号<i>任意</i></span><input name="phone" type="tel" autoComplete="tel" /></label>
        <label className="sp-input"><span>営業・紹介の経験</span>
          <select name="experience" defaultValue="">
            <option value="" disabled>選択してください</option>
            {EXPERIENCE.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <label className="sp-input sp-input-wide"><span>紹介できそうな店舗・業種<i>任意</i></span><input name="targets" placeholder="例：知人の美容室、地元のパーソナルジム" /></label>
        <label className="sp-input sp-input-wide"><span>自由記入<i>任意</i></span><textarea name="note" rows={4} placeholder="活動できる時間帯、聞いておきたいことなど" /></label>
      </div>
      <label className="sp-consent"><input type="checkbox" name="consent" /><span><a href="/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>に同意する</span></label>
      {msg && <p className="sp-form-msg" role="alert">{msg}</p>}
      <button className="pj-btn pj-btn-gold pj-btn-xl sp-submit" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? '送信しています…' : '応募する（無料）'}
      </button>
      <p className="sp-form-foot">応募後、オンライン面談で報酬条件と商品をご説明します。条件は書面（メール）でお渡しします。</p>
    </form>
  );
}
