'use client';
// 提案資料ページの動き（2026-11-21）。
// - スクロールで要素を出す（JSが動くまでは全部見えている＝SSR時に隠さない。印刷・PDFでも全部見える）
// - GA4（app/_components/GoogleAnalytics.js が読み込む gtag）に、どのボタンを押したか（proposal_cta）と、
//   どこまで読んだか（proposal_section）を送る。URL は全員共通で、送るのはボタン名・セクション名だけ。個人情報は送らない。
// - 画面イメージの小さなデモ（気づく・声をかける・AI）と、費用の試算。どれも作り物の画面で、本物のデータには触らない。
import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// PDF の書き出し（?print=1）では動かさず、最後の状態のまま止めておく
const printing = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('print') === '1';

export default function ProposalFx() {
  useEffect(() => {
    const send = (name, params) => {
      try { if (typeof window.gtag === 'function') window.gtag('event', name, params); } catch {}
    };
    const onClick = (e) => {
      const el = e.target?.closest?.('[data-cta]');
      if (el) send('proposal_cta', { cta: el.dataset.cta });
    };
    document.addEventListener('click', onClick);

    const root = document.querySelector('.pp');
    const ios = [];
    if ('IntersectionObserver' in window) {
      // どこまで読んだか
      const seen = new Set();
      const track = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const id = en.target.dataset.trackSection;
          if (en.isIntersecting && id && !seen.has(id)) {
            seen.add(id);
            send('proposal_section', { section: id });
            track.unobserve(en.target);
          }
        });
      }, { threshold: 0.3 });
      document.querySelectorAll('[data-track-section]').forEach(el => track.observe(el));
      ios.push(track);

      // スクロールで出す
      if (root && !reduced() && !printing()) {
        root.classList.add('pp-js');
        const rv = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); }
          });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
        root.querySelectorAll('[data-reveal]').forEach(el => rv.observe(el));
        ios.push(rv);
      } else if (root) {
        root.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
      }
    }
    return () => { document.removeEventListener('click', onClick); ios.forEach(io => io.disconnect()); };
  }, []);
  return null;
}

// 画面に入っている間だけ、0 → total-1 を繰り返す。最初（SSR・印刷・動きを減らす設定）は最後の状態
function useLoop(total, ms) {
  const ref = useRef(null);
  const [step, setStep] = useState(total + 1);
  useEffect(() => {
    if (reduced() || printing() || !('IntersectionObserver' in window)) return;
    const el = ref.current;
    if (!el) return;
    let id = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !id) {
        setStep(0);
        id = setInterval(() => setStep(v => (v + 1) % (total + 3)), ms);
      } else if (!e.isIntersecting && id) {
        clearInterval(id); id = null; setStep(total + 1);
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); if (id) clearInterval(id); };
  }, [total, ms]);
  return [ref, (n) => step >= n];
}

// 実物の管理画面と同じ見た目・同じ流れにそろえる（2026-11-21 渡邉指摘「資料と実物が違ったら終わり」）。
// 文言・ボタン名は app/provider/dashboard/page.js（来店の目安を過ぎたお客様の欄・まとめて声かけ・新しい予約の知らせ）と
// lib/log-rebook.js（LINEの予約ボタン「前回と同じで予約」と「前回：〇〇」）、ConsultantWidget.js（AI専属コンサル）に合わせている。
// 実物を変えたら、ここも合わせて直す。

// 仕組み1「気づく」：顧客管理タブの上に「来店の目安を過ぎたお客様」が並び、まとめて声かけのボタン
const CUSTOMERS = [
  { n: '田中 様', last: 96, over: 54, m: '眉スタイリング' },
  { n: '山本 様', last: 61, over: 19, m: '眉スタイリング' },
  { n: '佐藤 様', last: 52, over: 10, m: 'まつげパーマ' },
];
export function NoticeDemo() {
  const [ref, at] = useLoop(4, 1300);
  return (
    <div className="pp-mock pp-mock-list" ref={ref} aria-label="顧客管理の画面で、来店の目安を過ぎたお客様が並ぶ画面イメージ">
      <div className="pp-mock-bar"><i /><i /><i /><span>顧客管理</span></div>
      <div className="pp-od">
        <div className="pp-od-head"><b>来店の目安を過ぎたお客様 3名</b><small>目安を大きく過ぎた順。声かけはLINEで届きます</small></div>
        <ul className="pp-rows">
          {CUSTOMERS.map((c, i) => (
            <li key={c.n} className={at(i) ? 'in' : 'pre'}>
              <span className="pp-av">{c.n[0]}</span>
              <span className="pp-row-main"><b>{c.n}</b><small>最終来店 {c.last}日前・{c.m}</small></span>
              <span className="pp-row-right"><em className="pp-over">目安を{c.over}日超過</em><span className="pp-pill">声かけ</span></span>
            </li>
          ))}
        </ul>
        <div className={`pp-mock-act ${at(3) ? 'on' : ''}`}><b>3名にまとめて声をかける</b><span>文案はAIが下書き・予約ボタン付きでLINEに届きます</span></div>
      </div>
      <div className="pp-mock-tag">画面イメージ</div>
    </div>
  );
}

// 仕組み2「声をかける」：お客様のLINEに声かけ＋「前回と同じで予約」ボタン → 予約画面 → お店の管理画面にお知らせ
export function ReachDemo() {
  const [ref, at] = useLoop(5, 1500);
  return (
    <div className="pp-reach" ref={ref} aria-label="お客様のLINEに届く声かけから予約、お店へのお知らせまでの画面イメージ">
      <div className="pp-phone">
        <div className="pp-phone-notch" />
        <div className="pp-phone-head"><span className="pp-av pp-av-gold">店</span><b>お店の公式アカウント</b></div>
        <div className="pp-chat">
          <div className={`pp-msg ${at(0) ? 'on' : ''}`}>
            <p>佐藤様、前回のご来店から少し間が空きましたね。眉の形がくずれはじめる頃です。ご都合のよい日時を、下のボタンからお選びいただけます。</p>
          </div>
          <div className={`pp-msg pp-msg-card ${at(0) ? 'on' : ''}`}>
            <p className="pp-msg-cap">前回：眉スタイリング・担当 中村</p>
            <span className={`pp-msg-btn ${at(1) && !at(2) ? 'tap' : ''} ${at(2) ? 'done' : ''}`}>前回と同じで予約</span>
          </div>
          <div className={`pp-msg pp-msg-sys ${at(2) ? 'on' : ''}`}>予約画面が開き、前回のメニューと担当が選ばれた状態から日時を選んで予約</div>
          <div className={`pp-msg pp-msg-sys ${at(3) ? 'on' : ''}`}>前日18時にLINEでリマインドが届きます</div>
        </div>
      </div>
      <div className={`pp-toast ${at(3) ? 'on' : ''}`}>
        <span className="pp-toast-dot" />
        <div><b>予約が入りました</b><small>佐藤様・12/3 19:00・眉スタイリング</small><em>声かけから戻ってきたお客様です</em></div>
      </div>
      <div className="pp-mock-tag pp-mock-tag-dark">画面イメージ（下の白いカードは、お店の管理画面に出るお知らせ）</div>
    </div>
  );
}

// AI専属コンサル：上にいつも「指標 今→目標（期限）」、今日やることをチェック、相談には文章で返事
export function AiDemo() {
  const [ref, at] = useLoop(6, 1300);
  const tasks = ['来店の目安を過ぎた3名に声かけ（文案あり）', '明日の予約5件へリマインド（自動）', '回数券の残りが1回の2名へご案内'];
  const done = [3, 4, 5].filter(n => at(n)).length;
  return (
    <div className="pp-ai" ref={ref} aria-label="AI専属コンサルの画面イメージ">
      <div className="pp-ai-head"><b>AI専属コンサル</b><span>今日やること {done}/3</span></div>
      <div className="pp-ai-body">
        <div className="pp-ai-kpi">
          <div className="pp-ai-kpi-h">いま追いかけている指標</div>
          <div className="pp-ai-kpi-name">2回目の来店率</div>
          <div className="pp-ai-kpi-nums"><span>今 <b>38%</b></span><i /><span>目標 <b>50%</b></span><span className="pp-ai-kpi-due">2月末まで</span></div>
        </div>
        <div className="pp-ai-prog"><span style={{ width: `${(done / 3) * 100}%` }} /></div>
        <ul className="pp-ai-tasks">
          {tasks.map((t, i) => <li key={t} className={at(3 + i) ? 'checked' : ''}><i />{t}</li>)}
        </ul>
        <div className={`pp-ai-q ${at(0) ? 'on' : ''}`}>今月は、何から手をつければいい？</div>
        <div className={`pp-ai-typing ${at(1) && !at(2) ? 'on' : ''}`}><i /><i /><i /></div>
        <div className={`pp-ai-a ${at(2) ? 'on' : ''}`}>見えている範囲では、1回来たきりで間隔を過ぎた方が3名います。まずこの3名への声かけからです。文案は用意してあります。</div>
      </div>
      <div className="pp-mock-tag">画面イメージ・数値は例</div>
    </div>
  );
}

const yen = (n) => `¥${Math.round(n).toLocaleString('ja-JP')}`;
// 費用：戻ってきたお客様の売上と、月額を比べる試算
export function RoiCalc({ planPrice, planLabel }) {
  const [price, setPrice] = useState(8000);
  const [count, setCount] = useState(1);
  const revenue = price * count;
  const max = Math.max(revenue, planPrice, 1);
  const ratio = revenue / planPrice;
  return (
    <div className="pp-roi">
      <div className="pp-roi-h">試してみてください</div>
      <label className="pp-roi-field">
        <span>お客様1回あたりの単価</span><b>{yen(price)}</b>
        <input type="range" min="3000" max="30000" step="1000" value={price} onChange={e => setPrice(Number(e.target.value))} aria-label="お客様1回あたりの単価" />
      </label>
      <label className="pp-roi-field">
        <span>声かけで戻ってきたお客様（月）</span><b>{count}人</b>
        <input type="range" min="0" max="10" step="1" value={count} onChange={e => setCount(Number(e.target.value))} aria-label="声かけで戻ってきたお客様の人数" />
      </label>
      <div className="pp-roi-bars">
        <div className="pp-roi-bar"><span>戻ってきた売上</span><div><i className="gold" style={{ width: `${(revenue / max) * 100}%` }} /></div><b>{yen(revenue)}</b></div>
        <div className="pp-roi-bar"><span>{planLabel}の月額</span><div><i style={{ width: `${(planPrice / max) * 100}%` }} /></div><b>{yen(planPrice)}</b></div>
      </div>
      <p className="pp-roi-verdict">
        {count === 0
          ? 'お一人戻るだけで、景色が変わります。'
          : ratio >= 1
            ? <>月額の <em>{ratio.toFixed(1)}倍</em> の売上が戻ります</>
            : <>あと {Math.ceil((planPrice - revenue) / price)}人 で月額を上回ります</>}
      </p>
      <p className="pp-roi-note">入力した値での試算です。効果を約束するものではありません。</p>
    </div>
  );
}
