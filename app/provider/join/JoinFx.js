'use client';

import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// スクロールで要素を表示する。JSが動くまでは全要素が見えている（SSR時に隠さない）
export function RevealScope() {
  useEffect(() => {
    const root = document.querySelector('.pj');
    if (!root) return;
    const targets = root.querySelectorAll('[data-reveal]');
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in'));
      return;
    }
    root.classList.add('pj-js');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}

const HERO_STEPS = 6;

export function HeroDemo() {
  const [step, setStep] = useState(HERO_STEPS - 1);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    setStep(0);
    const id = setInterval(() => setStep((s) => (s + 1) % (HERO_STEPS + 2)), 1700);
    return () => clearInterval(id);
  }, []);
  const at = (n) => step >= n;

  return (
    <div className="pj-demo" aria-label="Fineme管理画面とLINE通知の画面イメージ">
      <div className="pj-phone">
        <div className="pj-phone-notch" />
        <div className="pj-phone-bar">
          <span className="pj-phone-avatar">F</span>
          <div>
            <div className="pj-phone-name">Fineme 予約通知</div>
            <div className="pj-phone-sub">店舗オーナー様のLINE</div>
          </div>
        </div>
        <div className="pj-chat">
          <div className={`pj-msg pj-msg-card ${at(0) ? 'on' : ''}`}>
            <div className="pj-card-kicker">新しい予約リクエスト</div>
            <div className="pj-card-row"><span>お客様</span><b>田中 様</b></div>
            <div className="pj-card-row"><span>日時</span><b>10月14日（火）19:00</b></div>
            <div className="pj-card-row"><span>メニュー</span><b>パーソナル 60分</b></div>
            <div className="pj-card-btns">
              <span className={`pj-btn-ok ${at(1) && !at(2) ? 'tap' : ''} ${at(2) ? 'done' : ''}`}>承認する</span>
              <span className="pj-btn-alt">別の日時を提案</span>
            </div>
          </div>
          <div className={`pj-msg pj-msg-bot ${at(2) ? 'on' : ''}`}>
            承認しました。田中様へ確定のご連絡を送りました。前日にリマインドが自動で届きます。
          </div>
          <div className={`pj-msg pj-msg-bot ${at(4) ? 'on' : ''}`}>
            田中様が明日の来店を確認しました。
          </div>
        </div>
      </div>

      <div className={`pj-float pj-float-ai ${at(1) ? 'on' : ''}`}>
        <div className="pj-float-head">
          <span className="fm-seal pj-seal-sm">談</span>
          <b>AI専属コンサル｜今日やること</b>
        </div>
        <ul className="pj-todo">
          <li className={at(2) ? 'checked' : ''}><i />8週間来店のない3名に声かけ</li>
          <li className={at(3) ? 'checked' : ''}><i />明日の予約5件へリマインド（自動）</li>
          <li className={at(5) ? 'checked' : ''}><i />回数券の残りが少ない2名へご案内</li>
        </ul>
      </div>

      <div className={`pj-float pj-float-pay ${at(3) ? 'on' : ''}`}>
        <span className="pj-pay-dot" />
        <div>
          <div className="pj-pay-title">入金がありました</div>
          <div className="pj-pay-sub">回数券 10回 ¥55,000｜売上に記録済み</div>
        </div>
      </div>
      <div className="pj-demo-tag">画面イメージ</div>
    </div>
  );
}

export function CountUp({ to, decimals = 0, prefix = '', suffix = '' }) {
  const ref = useRef(null);
  const [val, setVal] = useState(to);
  useEffect(() => {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
    const el = ref.current;
    if (!el) return;
    setVal(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const dur = 1100;
      const tick = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(to * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  const text = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString('ja-JP');
  return <span ref={ref}>{prefix}{text}{suffix}</span>;
}

const yen = (n) => `¥${Math.round(n).toLocaleString('ja-JP')}`;

export function RoiCalculator() {
  const [price, setPrice] = useState(8000);
  const [count, setCount] = useState(2);
  const revenue = price * count;
  const plan = 7000;
  const max = Math.max(revenue, plan, 1);
  const ratio = revenue / plan;

  return (
    <div className="pj-roi" data-reveal>
      <div className="pj-roi-inputs">
        <label className="pj-roi-field">
          <span className="pj-roi-label">お客様1回あたりの単価</span>
          <span className="pj-roi-value">{yen(price)}</span>
          <input type="range" min="3000" max="30000" step="1000" value={price}
            onChange={(e) => setPrice(Number(e.target.value))} aria-label="お客様1回あたりの単価" />
        </label>
        <label className="pj-roi-field">
          <span className="pj-roi-label">声かけで戻ってきたお客様（月）</span>
          <span className="pj-roi-value">{count}人</span>
          <input type="range" min="0" max="10" step="1" value={count}
            onChange={(e) => setCount(Number(e.target.value))} aria-label="声かけで戻ってきたお客様の人数" />
        </label>
      </div>
      <div className="pj-roi-result">
        <div className="pj-roi-bars">
          <div className="pj-roi-bar">
            <span className="pj-roi-bar-label">戻ってきた売上</span>
            <div className="pj-roi-track"><div className="pj-roi-fill pj-roi-fill-gold" style={{ width: `${(revenue / max) * 100}%` }} /></div>
            <b>{yen(revenue)}</b>
          </div>
          <div className="pj-roi-bar">
            <span className="pj-roi-bar-label">月額（Plan B）</span>
            <div className="pj-roi-track"><div className="pj-roi-fill" style={{ width: `${(plan / max) * 100}%` }} /></div>
            <b>{yen(plan)}</b>
          </div>
        </div>
        <p className="pj-roi-verdict">
          {count === 0
            ? '1人戻るだけで、景色が変わります。'
            : ratio >= 1
              ? <>月額の <em>{ratio.toFixed(1)}倍</em> の売上が戻ってきます。</>
              : <>あと {Math.ceil((plan - revenue) / price)}人 で月額を回収できます。</>}
        </p>
        <p className="pj-roi-note">※ 入力値をもとにした試算です。効果を保証するものではありません。</p>
      </div>
    </div>
  );
}

export function StickyCta({ href, text = '月額¥5,000から｜予約の手数料0円', label = '掲載について相談する' }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const end = document.getElementById('pj-final');
      const nearEnd = end && end.getBoundingClientRect().top < window.innerHeight;
      setShow(window.scrollY > 640 && !nearEnd);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className={`pj-sticky ${show ? 'show' : ''}`} aria-hidden={!show}>
      <div className="pj-sticky-text">{text}</div>
      <a className="pj-btn pj-btn-gold" href={href} tabIndex={show ? 0 : -1}>{label}</a>
    </div>
  );
}
