'use client';
// 店頭POP「AI姿勢チェック」の印刷用ページ（2026-11-24 渡邉承認の指示書 §7）。A4・1枚。
// お店の名前はログイン中の店舗から自動で入る。料金はお店が入力（空のままなら、手書き用の空欄で印刷される）。
// 文面に効果の断定・医療的な言い方は入れない（分析結果の文面と同じ方針）。
import { useEffect, useState } from 'react';
import { getAccessToken } from '@/lib/log-store';
import { isPostureEligiblePlan } from '@/lib/posture-plan';
import './pop.css';

export default function PosturePopPage() {
  const [store, setStore] = useState(null); // { name, plan }
  const [state, setState] = useState('loading'); // loading | ready | login | error
  const [price, setPrice] = useState('');
  const [minutes, setMinutes] = useState('10');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setState('login'); return; }
    fetch('/api/provider/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        if (r.status === 401 || r.status === 404) { setState('login'); return; }
        if (!r.ok) { setState('error'); return; }
        const d = await r.json();
        setStore({ name: d.name || '', plan: d.plan });
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  if (state === 'loading') return <main className="pop-wrap"><p className="pop-msg">読み込んでいます…</p></main>;
  if (state === 'login') return <main className="pop-wrap"><p className="pop-msg">お店の管理画面にログインしてから開いてください。<a href="/login?next=/provider/posture-pop">ログインする</a></p></main>;
  if (state === 'error') return <main className="pop-wrap"><p className="pop-msg">読み込めませんでした。時間をおいてもう一度お試しください。</p></main>;

  const eligible = isPostureEligiblePlan(store.plan);
  return (
    <main className="pop-wrap">
      <div className="pop-tools">
        <p className="pop-tools-h">店頭POP（A4・1枚）</p>
        {!eligible && <p className="pop-warn">AI姿勢分析はプレミアムプラン限定の機能です。いまのプランではカルテから使えないため、プランを変更してから掲示してください。</p>}
        <div className="pop-fields">
          <label>料金（空欄なら手書き用の線で印刷されます）
            <input type="text" value={price} onChange={e => setPrice(e.target.value.slice(0, 30))} placeholder="例：初回無料／1回 1,000円" />
          </label>
          <label>所要時間の目安（分）
            <input type="text" inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value.replace(/[^0-9〜~-]/g, '').slice(0, 6))} />
          </label>
        </div>
        <button type="button" className="pop-print" onClick={() => window.print()}>印刷する</button>
        <p className="pop-tools-note">印刷の設定で「用紙：A4」「余白：なし（または最小）」「背景のグラフィック：オン」にすると、見本どおりに出ます。</p>
      </div>

      <article className="pop-sheet" aria-label="店頭POPの見本">
        <p className="pop-store">{store.name}</p>
        <p className="pop-kicker">来店のたびに、姿勢の変化を記録します</p>
        <h1 className="pop-title">AI姿勢チェック</h1>
        <p className="pop-lead">正面と横から写真を2枚撮るだけ。AIが写真から姿勢の特徴を読み取り、前回の写真と並べて、変化をスタッフと一緒に確認します。</p>

        <ol className="pop-steps">
          <li><b>写真を撮る</b><span>正面と真横の2枚。毎回同じ場所・同じ距離で撮ります</span></li>
          <li><b>一緒に見る</b><span>気になる部位と、次回までにできることをお伝えします</span></li>
          <li><b>次回、比べる</b><span>同じ条件でもう一度撮り、前回と並べて変化を確認します</span></li>
        </ol>

        <dl className="pop-info">
          <div><dt>所要時間</dt><dd>{minutes ? `${minutes}分ほど（目安）` : '　'}</dd></div>
          <div><dt>料金</dt><dd className={price ? '' : 'pop-blank'}>{price || '　'}</dd></div>
        </dl>

        <p className="pop-note">結果は、ご希望に応じてLINEなどでお渡しします。AIの結果は写真の見た目からの目安で、医療的な診断ではありません。</p>
        <p className="pop-ask">お気軽にスタッフへお声がけください</p>
      </article>
    </main>
  );
}
