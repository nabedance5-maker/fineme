'use client';
// 掲載者ダッシュボードのビジュアルデザイン方向性サンプル（全20タブ反映版）。
// でお要望: 実際に採用する時は現状の機能を漏れなく含めたい。
// サイドバーの構成・グルーピングは実際のタブ構成そのもの
// （lib/dashboard-tutorial.js の TAB_TUTORIALS/TUTORIAL_GROUPS）をそのまま流用し、
// 名称・グルーピングが本番とズレないようにしている。
// 各タブの中身はハードコードのサンプルデータ。API・実データには一切繋がっておらず、
// 本番の /provider/dashboard はまだ一切変更していない。
import { useState } from 'react';
import { TAB_TUTORIALS, TUTORIAL_GROUPS } from '@/lib/dashboard-tutorial';
import { CUSTOMER_SCRIPT_AXES } from '@/lib/customer-scripts';

const GOLD = '#c9a84c';
const cardStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 16, padding: 20 };
const btnPrimary = { fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 10, border: 'none', background: GOLD, color: '#0a0f1e', cursor: 'pointer' };
const btnGhost = { fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 10, border: '1.5px solid rgba(201,168,76,0.4)', background: 'transparent', color: GOLD, cursor: 'pointer' };

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 16, margin: '0 0 4px', color: '#e8e4dc' }}>{children}</h2>
      {sub && <p style={{ margin: 0, fontSize: 12, color: 'rgba(232,228,220,0.5)' }}>{sub}</p>}
    </div>
  );
}

// ── ①店舗の中身を作る ──────────────────────────────
function ProfileView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="公開ページに出る基本情報">プロフィール</SectionTitle>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(201,168,76,0.15)' }} />
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700 }}>F.I.D（第一印象コンサル）</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(232,228,220,0.55)' }}>恋愛が止まる理由を、第一印象から設計し直す。</p>
        </div>
      </div>
      <button type="button" style={btnGhost}>編集する</button>
    </div>
  );
}

function ServiceView() {
  const menus = [{ name: 'カット＋カラー', price: 12000, dur: 90 }, { name: '眉デザイン体験', price: 5000, dur: 40 }];
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <SectionTitle sub="価格・所要時間を管理">サービス設定</SectionTitle>
        <button type="button" style={btnPrimary}>＋ 追加</button>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        {menus.map(m => (
          <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid rgba(232,228,220,0.08)' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</span>
            <span style={{ fontSize: 12, color: 'rgba(232,228,220,0.55)' }}>¥{m.price.toLocaleString()}／{m.dur}分</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackagesView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="まとめ買いできる回数券">回数券</SectionTitle>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[{ n: '5回券', p: 50000 }, { n: '10回券', p: 90000 }].map(pk => (
          <div key={pk.n} style={{ flex: '1 1 140px', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>{pk.n}</p>
            <p style={{ margin: 0, fontSize: 14, color: GOLD, fontWeight: 800 }}>¥{pk.p.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="信頼感につながるスタッフ紹介">スタッフ</SectionTitle>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {['店長・佐藤', 'スタイリスト・鈴木'].map(n => (
          <div key={n} style={{ textAlign: 'center', width: 100 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', margin: '0 auto 8px' }} />
            <p style={{ margin: 0, fontSize: 12 }}>{n}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoriesView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="承認したものだけが公開されます">体験談</SectionTitle>
      <div style={{ borderTop: '1px solid rgba(232,228,220,0.08)', paddingTop: 12 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(232,228,220,0.55)' }}>Before: 何を着てもパッとしなかった</p>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>「雰囲気変わった？とよく言われるように」</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={btnPrimary}>承認する</button>
          <button type="button" style={btnGhost}>却下する</button>
        </div>
      </div>
    </div>
  );
}

function LandingView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="診断結果に合わせた専用ページ用のメニュー・事例">LP設定</SectionTitle>
      <p style={{ fontSize: 13, color: 'rgba(232,228,220,0.7)', marginBottom: 12 }}>眉デザイン体験・肌質改善コースなど、軸ごとのメニューを登録</p>
      <button type="button" style={btnGhost}>見本を見る ↗</button>
    </div>
  );
}

function QrView() {
  return (
    <div style={{ ...cardStyle, textAlign: 'center' }}>
      <SectionTitle sub="店頭で使える紹介QR">紹介QR</SectionTitle>
      <div style={{ width: 120, height: 120, background: 'rgba(255,255,255,0.06)', borderRadius: 12, margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'rgba(232,228,220,0.4)' }}>QRコード</div>
      <button type="button" style={btnPrimary}>ダウンロード</button>
    </div>
  );
}

function PublishView() {
  const [on, setOn] = useState(true);
  return (
    <div style={cardStyle}>
      <SectionTitle sub="準備が整うまでは非公開でも可">公開設定</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" onClick={() => setOn(v => !v)} style={{ width: 44, height: 24, borderRadius: 99, border: 'none', background: on ? GOLD : 'rgba(232,228,220,0.2)', position: 'relative', cursor: 'pointer' }}>
          <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#0a0f1e', transition: 'left .15s' }} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{on ? '公開中' : '非公開'}</span>
      </div>
    </div>
  );
}

// ── ②毎日触るタブ ──────────────────────────────
const VISITS_TREND = [42, 48, 45, 52, 58, 55, 62, 68];
const SOON_CUSTOMERS = [
  { name: '山田 花子', days: 3 }, { name: '佐藤 太郎', days: 5 }, { name: '鈴木 美咲', days: 7 },
];
function sparklinePoints(values, w = 560, h = 140, pad = 16) {
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}
function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...cardStyle, flex: '1 1 180px', minWidth: 160, padding: '20px 22px' }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(232,228,220,0.55)', fontWeight: 600 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: accent ? GOLD : '#e8e4dc', fontFamily: 'var(--font-serif-ja)' }}>{value}</p>
    </div>
  );
}
function DashboardView() {
  return (
    <div className="dds-fade">
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard label="今月の来店数" value="128" />
        <StatCard label="今月の来店客数" value="356" />
        <StatCard label="見込み客" value="68%" />
        <StatCard label="売上（今月）" value="¥1,234,567" accent />
      </div>
      <div className="dds-grid-2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 }}>
        <div style={cardStyle}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>来店推移</p>
          <svg viewBox="0 0 560 140" style={{ width: '100%', height: 140, display: 'block' }}>
            <polyline points={sparklinePoints(VISITS_TREND)} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {VISITS_TREND.map((v, i) => {
              const pts = sparklinePoints(VISITS_TREND).split(' ')[i].split(',');
              return <circle key={i} cx={pts[0]} cy={pts[1]} r="3" fill="#0a0f1e" stroke={GOLD} strokeWidth="2" />;
            })}
          </svg>
        </div>
        <div style={cardStyle}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>そろそろ来店の顧客</p>
          <div className="stack" style={{ gap: 10 }}>
            {SOON_CUSTOMERS.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{c.name[0]}</div>
                <p style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 700 }}>{c.name} 様</p>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(201,168,76,0.12)', color: GOLD }}>あと{c.days}日</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestsView() {
  const reqs = [{ name: '田中 健一', date: '9/6 14:00', status: '未対応' }, { name: '高橋 陽子', date: '9/7 11:00', status: '承認済' }];
  return (
    <div style={cardStyle}>
      <SectionTitle sub="24時間以内の返信がおすすめ">予約リクエスト</SectionTitle>
      <div className="stack" style={{ gap: 10 }}>
        {reqs.map(r => (
          <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(232,228,220,0.08)' }}>
            <div><p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{r.name} 様</p><p style={{ margin: 0, fontSize: 11, color: 'rgba(232,228,220,0.5)' }}>{r.date}</p></div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: r.status === '未対応' ? 'rgba(248,113,113,0.15)' : 'rgba(201,168,76,0.12)', color: r.status === '未対応' ? '#f87171' : GOLD }}>{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomersView() {
  const list = [
    { name: '山田 花子', cycle: 35, visits: 12, next: 'そろそろです', axis: '髪・ヘア' },
    { name: '佐藤 太郎', cycle: 28, visits: 7, next: 'あと5日', axis: '肌・エステ' },
    { name: '田中 健一', cycle: 30, visits: 4, next: '休眠気味', axis: '体型・ボディ' },
  ];
  return (
    <div className="stack" style={{ gap: 12 }}>
      {list.map(c => (
        <div key={c.name} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '16px 20px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800 }}>{c.name[0]}</div>
          <div style={{ flex: '1 1 200px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700 }}>{c.name} 様</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(232,228,220,0.55)' }}>サイクル{c.cycle}日／来店{c.visits}回</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: 'rgba(201,168,76,0.12)', color: GOLD }}>{c.axis}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: c.next === '休眠気味' ? '#f87171' : '#e8e4dc' }}>{c.next}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={{ ...btnPrimary, background: '#06c755', color: '#fff' }}>LINEでご案内</button>
            <button type="button" style={btnGhost}>メモを追加</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function KarteView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="貴店だけが見られる自由記述メモ。非会員のお客様も記録できます">カルテ</SectionTitle>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>山田 花子 様</p>
      <textarea readOnly value="敏感肌気味。前回は低刺激シャンプーを使用。次回はカラーの相談あり。" style={{ width: '100%', minHeight: 60, fontSize: 13, padding: 10, borderRadius: 10, border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(255,255,255,0.04)', color: '#e8e4dc', boxSizing: 'border-box' }} />
      <div style={{ marginTop: 10 }}><button type="button" style={btnGhost}>＋ 非会員のお客様を追加</button></div>
    </div>
  );
}

function ReviewsView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="お客様からのクチコミ">クチコミ</SectionTitle>
      <p style={{ margin: '0 0 4px', fontSize: 13 }}>{'★★★★★'} <span style={{ color: 'rgba(232,228,220,0.5)', fontSize: 11 }}>山田様</span></p>
      <p style={{ margin: 0, fontSize: 13, color: 'rgba(232,228,220,0.75)' }}>「丁寧なカウンセリングで安心して任せられました」</p>
    </div>
  );
}

// ── ③伸ばすためのタブ ──────────────────────────────
function AreaDemandView() {
  const rows = [{ l: '肌・エステ', v: 72 }, { l: '髪・ヘア', v: 58 }, { l: '眉', v: 41 }];
  return (
    <div style={cardStyle}>
      <SectionTitle sub="周辺エリアの悩み・軸の需要">エリア需要</SectionTitle>
      <div className="stack" style={{ gap: 10 }}>
        {rows.map(r => (
          <div key={r.l}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}><span>{r.l}</span><span style={{ color: GOLD }}>{r.v}%</span></div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(232,228,220,0.1)' }}><div style={{ height: '100%', width: `${r.v}%`, borderRadius: 99, background: GOLD }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScriptsView() {
  const sample = CUSTOMER_SCRIPT_AXES.slice(0, 2);
  return (
    <div style={cardStyle}>
      <SectionTitle sub="悩みの軸別、接客で使える切り口">接客の引き出し</SectionTitle>
      <div className="stack" style={{ gap: 14 }}>
        {sample.map(a => (
          <div key={a.axis} style={{ borderTop: '1px solid rgba(232,228,220,0.08)', paddingTop: 10 }}>
            <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>{a.label}</p>
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(232,228,220,0.7)' }}>「{a.openers[0]}」</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LtvCacView() {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      <StatCard label="LTV（顧客生涯価値）" value="¥96,400" accent />
      <StatCard label="CAC（獲得コスト）" value="¥3,200" />
    </div>
  );
}

function ReferralView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="他店舗紹介の報酬状況">紹介報酬</SectionTitle>
      <div style={{ padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, textAlign: 'center', fontFamily: 'monospace', fontSize: 16, fontWeight: 800, letterSpacing: 2, marginBottom: 12 }}>FN001</div>
      <p style={{ margin: 0, fontSize: 13 }}>今月のストック収益：<strong style={{ color: GOLD }}>¥1,500</strong></p>
    </div>
  );
}

// ── ④アカウント周り ──────────────────────────────
function LineChannelView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="お客様への通知を貴店のLINEから届ける">LINE連携</SectionTitle>
      <p style={{ margin: '0 0 12px', fontSize: 13 }}>状態：<span style={{ color: '#4ade80', fontWeight: 700 }}>✅ 連携済み</span></p>
      <button type="button" style={btnGhost}>連携のやり方を見る ↗</button>
    </div>
  );
}

function BillingView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="現在のプラン・お支払い状況">課金・プラン</SectionTitle>
      <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 800, color: GOLD }}>プランB（スタンダード）</p>
      <p style={{ margin: 0, fontSize: 12, color: 'rgba(232,228,220,0.55)' }}>次回請求日：2026/10/1</p>
    </div>
  );
}

// ── 売上管理（新規提案タブ・でお要望 2026-09-04） ──────────
// 設計思想: 併用可能な入口（Fineme経由は自動集計・それ以外は手軽な手動入力）を
// 用意しつつ、最終的に他ツールをやめてFinemeに一本化したくなるレベルの深さ
// （メニュー別・スタッフ別・支払い方法別内訳、推移、CSV出力）を備える。
const SALES_TREND = [820000, 910000, 880000, 1020000, 1150000, 1234567];
const SALES_BY_MENU = [{ l: 'カット＋カラー', v: 420000 }, { l: '眉デザイン体験', v: 280000 }, { l: '肌質改善コース', v: 190000 }];
const SALES_BY_STAFF = [{ l: '店長・佐藤', v: 560000 }, { l: 'スタイリスト・鈴木', v: 340000 }];
const SALES_BY_PAYMENT = [{ l: '現金', v: 45 }, { l: 'クレジットカード', v: 38 }, { l: 'PayPay', v: 17 }];

function BreakdownBars({ rows, unit }) {
  const max = Math.max(...rows.map(r => r.v));
  return (
    <div className="stack" style={{ gap: 10 }}>
      {rows.map(r => (
        <div key={r.l}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span>{r.l}</span><span style={{ color: GOLD, fontWeight: 700 }}>{unit === '%' ? `${r.v}%` : `¥${r.v.toLocaleString()}`}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: 'rgba(232,228,220,0.1)' }}>
            <div style={{ height: '100%', width: `${(r.v / max) * 100}%`, borderRadius: 99, background: GOLD }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SalesView() {
  const [period, setPeriod] = useState('thisMonth');
  const financeSales = 968567;
  const manualSales = 266000;
  const total = financeSales + manualSales;
  return (
    <div className="dds-fade stack" style={{ gap: 20 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ k: 'thisMonth', l: '今月' }, { k: 'lastMonth', l: '先月' }].map(p => (
          <button key={p.k} type="button" onClick={() => setPeriod(p.k)} style={p.k === period ? btnPrimary : btnGhost}>{p.l}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard label="Fineme経由売上（自動集計）" value={`¥${financeSales.toLocaleString()}`} />
        <StatCard label="その他売上（手動入力）" value={`¥${manualSales.toLocaleString()}`} />
        <StatCard label="合計売上" value={`¥${total.toLocaleString()}`} accent />
      </div>

      <div className="dds-grid-2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 }}>
        <div style={cardStyle}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>売上推移（直近6ヶ月・合計）</p>
          <svg viewBox="0 0 560 140" style={{ width: '100%', height: 140, display: 'block' }}>
            <polyline points={sparklinePoints(SALES_TREND)} fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {SALES_TREND.map((v, i) => {
              const pts = sparklinePoints(SALES_TREND).split(' ')[i].split(',');
              return <circle key={i} cx={pts[0]} cy={pts[1]} r="3" fill="#0a0f1e" stroke={GOLD} strokeWidth="2" />;
            })}
          </svg>
        </div>
        <div style={cardStyle}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>その他売上を追加</p>
          <div className="stack" style={{ gap: 8 }}>
            <input readOnly placeholder="日付" value="2026/09/04" style={{ fontSize: 12, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(255,255,255,0.04)', color: '#e8e4dc' }} />
            <input readOnly placeholder="金額" value="¥18,000" style={{ fontSize: 12, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(255,255,255,0.04)', color: '#e8e4dc' }} />
            <input readOnly placeholder="メモ（任意）" value="店頭現金売上" style={{ fontSize: 12, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(232,228,220,0.15)', background: 'rgba(255,255,255,0.04)', color: '#e8e4dc' }} />
            <button type="button" style={btnPrimary}>追加する</button>
          </div>
        </div>
      </div>

      <div className="dds-grid-2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
        <div style={cardStyle}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>メニュー別内訳</p>
          <BreakdownBars rows={SALES_BY_MENU} />
        </div>
        <div style={cardStyle}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>スタッフ別内訳（歩合計算の参考に）</p>
          <BreakdownBars rows={SALES_BY_STAFF} />
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>支払い方法別内訳</p>
          <button type="button" style={btnGhost}>CSVエクスポート ↓</button>
        </div>
        <BreakdownBars rows={SALES_BY_PAYMENT} unit="%" />
      </div>
    </div>
  );
}

// ── チュートリアル（実データをそのまま流用） ──────────
function TutorialView() {
  return (
    <div style={cardStyle}>
      <SectionTitle sub="各タブの使い方まとめ">チュートリアル</SectionTitle>
      {TUTORIAL_GROUPS.map(g => (
        <div key={g.heading} style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(232,228,220,0.8)', margin: '0 0 8px' }}>{g.heading}</p>
          {g.keys.map(k => TAB_TUTORIALS[k] && (
            <p key={k} style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(232,228,220,0.6)' }}>・{TAB_TUTORIALS[k].title}：{TAB_TUTORIALS[k].tips[0]}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

const VIEW_MAP = {
  tutorial: TutorialView,
  profile: ProfileView, service: ServiceView, packages: PackagesView, staff: StaffView,
  stories: StoriesView, landing: LandingView, qr: QrView, publish: PublishView,
  stats: DashboardView, requests: RequestsView, customers: CustomersView, karte: KarteView, reviews: ReviewsView, sales: SalesView,
  'area-demand': AreaDemandView, scripts: ScriptsView, 'ltv-cac': LtvCacView, referral: ReferralView,
  'line-channel': LineChannelView, billing: BillingView,
};

// 「売上管理」は本番にまだ存在しない新規提案タブのため、共有ソース(TAB_TUTORIALS)
// には追加せず、このサンプルページ内だけでラベル・挿入位置を持つ（本番のチュートリアル
// タブ一覧に、まだ無い機能が紛れ込まないようにするため）。
const SALES_LABEL = '売上管理（新規提案）';
const NAV_GROUPS = [
  { heading: null, items: [{ key: 'tutorial', icon: '📘', label: 'チュートリアル' }] },
  ...TUTORIAL_GROUPS.map(g => {
    const items = g.keys.map(k => ({ key: k, icon: null, label: TAB_TUTORIALS[k]?.title || k }));
    if (g.heading.startsWith('②')) items.push({ key: 'sales', icon: '💰', label: SALES_LABEL });
    return { heading: g.heading, items };
  }),
];

export default function DashboardDesignSample() {
  const [active, setActive] = useState('stats');
  const [navOpen, setNavOpen] = useState(false);
  const ActiveView = VIEW_MAP[active] || (() => null);
  const activeLabel = active === 'sales' ? SALES_LABEL : (TAB_TUTORIALS[active]?.title || (active === 'tutorial' ? 'チュートリアル' : active));

  function selectNav(key) {
    setActive(key);
    setNavOpen(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', color: '#e8e4dc', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        .dds-fade { animation: dds-fade-in .3s ease; }
        @keyframes dds-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .dds-nav-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 16px; border-radius: 10px; border: none; background: transparent; color: rgba(232,228,220,0.65); font-size: 13px; font-weight: 600; cursor: pointer; text-align: left; transition: background .15s, color .15s; }
        .dds-nav-item:hover { background: rgba(255,255,255,0.05); color: #e8e4dc; }
        .dds-nav-item.active { background: rgba(201,168,76,0.14); color: ${GOLD}; }
        .dds-nav-heading { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: rgba(232,228,220,0.35); padding: 14px 16px 4px; text-transform: uppercase; }

        .dds-topbar { display: none; }
        .dds-sidebar { width: 236px; flex-shrink: 0; overflow-y: auto; }
        .dds-backdrop { display: none; }

        @media (max-width: 780px) {
          .dds-topbar { display: flex; }
          .dds-sidebar {
            position: fixed; top: 0; bottom: 0; left: 0; z-index: 60; width: 240px;
            transform: translateX(-100%); transition: transform .25s ease;
            background: #0a0f1e; box-shadow: 4px 0 24px rgba(0,0,0,0.4);
          }
          .dds-sidebar.dds-open { transform: translateX(0); }
          .dds-backdrop.dds-open { display: block; position: fixed; inset: 0; z-index: 55; background: rgba(0,0,0,0.5); }
          .dds-main { padding: 16px 16px 60px !important; margin-top: 58px; }
          .dds-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="dds-topbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0a0f1e', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
        <button type="button" onClick={() => setNavOpen(v => !v)} aria-label="メニューを開く" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(201,168,76,0.3)', background: 'transparent', color: GOLD, fontSize: 16, cursor: 'pointer' }}>☰</button>
        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 700, color: GOLD }}>fineme</p>
      </div>

      <div className={`dds-backdrop${navOpen ? ' dds-open' : ''}`} onClick={() => setNavOpen(false)} />

      <aside className={`dds-sidebar${navOpen ? ' dds-open' : ''}`} style={{ borderRight: '1px solid rgba(201,168,76,0.15)', padding: '24px 14px 40px' }}>
        <div style={{ padding: '0 10px', marginBottom: 18 }}>
          <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: GOLD, letterSpacing: 1 }}>fineme</p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(232,228,220,0.4)', letterSpacing: 1 }}>顧客管理システム</p>
        </div>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.heading && <p className="dds-nav-heading">{group.heading}</p>}
            {group.items.map(item => (
              <button key={item.key} type="button" className={`dds-nav-item${active === item.key ? ' active' : ''}`} onClick={() => selectNav(item.key)}>
                {item.icon && <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>}{item.label}
              </button>
            ))}
          </div>
        ))}
      </aside>

      <main className="dds-main" style={{ flex: 1, minWidth: 0, padding: '24px 32px 60px' }}>
        <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: GOLD, marginBottom: 20 }}>
          🎨 これはビジュアルデザインのサンプルです（全20タブ反映）。実データ・実機能とは連動していません。本番の掲載者ダッシュボードはまだ変更していません。
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif-ja)', fontSize: 22, margin: '0 0 20px', color: '#e8e4dc' }}>{activeLabel}</h1>
        <div className="dds-fade"><ActiveView /></div>
      </main>
    </div>
  );
}
