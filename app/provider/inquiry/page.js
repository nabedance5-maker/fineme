'use client';
import { useEffect, useRef } from 'react';
import { readRef } from '@/lib/referral-ref';
import { INQUIRY_SOURCES } from '@/lib/inquiry-source';
import { isMonitorOpen, MONITOR_CAMPAIGN } from '@/lib/monitor-campaign';

export default function ProviderInquiryPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      /* ─── Page wrapper ─── */
      .inq-page {
        min-height: 80vh;
        background: linear-gradient(rgba(6,12,26,0.75), rgba(6,12,26,0.82)),
                    url('/assets/images/hero-bg.webp') center / cover no-repeat;
        padding: 60px 20px 80px;
        font-family: 'Noto Sans JP', sans-serif;
      }
      .inq-container {
        max-width: 680px;
        margin: 0 auto;
      }

      /* ─── Header ─── */
      .inq-eyebrow {
        font-size: 10px; font-weight: 800; letter-spacing: .18em;
        color: rgba(201,168,76,0.7); text-transform: uppercase; margin: 0 0 12px;
      }
      .inq-title {
        font-family: 'Noto Serif JP', Georgia, serif;
        font-size: clamp(20px, 4vw, 28px); font-weight: 700;
        color: #fff; margin: 0 0 10px; line-height: 1.4;
      }
      .inq-lead {
        font-size: 13px; color: rgba(255,255,255,.65);
        margin: 0 0 32px; line-height: 1.75;
      }
      .inq-referral-note {
        font-size: 12.5px; color: #c9a84c; background: rgba(201,168,76,.08);
        border: 1px solid rgba(201,168,76,.25); border-radius: 8px;
        padding: 8px 14px; margin: -16px 0 24px;
      }

      /* ─── Form card ─── */
      .inq-card {
        background: rgba(255,255,255,0.96);
        border: 1px solid rgba(201,168,76,0.25);
        border-radius: 16px;
        padding: 32px 36px;
        box-shadow: 0 8px 40px rgba(0,0,0,.22);
      }
      @media (max-width: 600px) {
        .inq-card { padding: 24px 20px; }
      }

      /* ─── Form fields ─── */
      .inq-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 16px;
      }
      .inq-row-full {
        margin-bottom: 16px;
      }
      @media (max-width: 600px) {
        .inq-row { grid-template-columns: 1fr; }
      }
      .inq-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .inq-label {
        font-size: 12px; font-weight: 700; color: #374151; letter-spacing: .03em;
      }
      .inq-req {
        color: #b91c1c; margin-left: 2px;
      }
      .inq-input,
      .inq-select,
      .inq-textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        border: 1.5px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        font-family: 'Noto Sans JP', sans-serif;
        color: #111827;
        background: #fff;
        transition: border-color .15s;
        outline: none;
      }
      .inq-input:focus,
      .inq-select:focus,
      .inq-textarea:focus {
        border-color: #c9a84c;
        box-shadow: 0 0 0 3px rgba(201,168,76,.12);
      }
      .inq-textarea { resize: vertical; }

      /* ─── Consent ─── */
      .inq-consent {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin: 20px 0 24px;
      }
      .inq-consent input[type="checkbox"] {
        width: 16px; height: 16px; margin-top: 2px;
        accent-color: #c9a84c; flex-shrink: 0; cursor: pointer;
      }
      .inq-consent-label {
        font-size: 12px; color: #6b7280; line-height: 1.65;
      }

      /* ─── Buttons ─── */
      .inq-btn-row {
        display: flex; gap: 12px; flex-wrap: wrap;
      }
      .inq-btn-primary {
        flex: 1; min-width: 160px;
        background: #c9a84c; color: #0a0f1e;
        border: none; border-radius: 8px;
        font-size: 15px; font-weight: 800;
        padding: 13px 20px; cursor: pointer;
        font-family: 'Noto Sans JP', sans-serif;
        transition: background .15s, transform .1s;
      }
      .inq-btn-primary:hover { background: #b8952e; }
      .inq-btn-primary:active { transform: scale(.98); }
      .inq-btn-secondary {
        padding: 12px 18px; border: 1.5px solid #d1d5db;
        background: #fff; color: #6b7280;
        border-radius: 8px; font-size: 13px; font-weight: 600;
        cursor: pointer; font-family: 'Noto Sans JP', sans-serif;
        transition: border-color .15s, color .15s;
      }
      .inq-btn-secondary:hover { border-color: #c9a84c; color: #c9a84c; }

      /* ─── 送信後の完了画面（2026-11-18） ─── */
      .inq-done {
        background: rgba(255,255,255,0.96); border: 1px solid rgba(201,168,76,0.25); border-radius: 16px;
        padding: 36px 36px 32px; box-shadow: 0 8px 40px rgba(0,0,0,.22); color: #1a1d24; outline: none;
      }
      .inq-done[hidden] { display: none; }
      .inq-done-mark {
        width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; margin-bottom: 16px;
        background: rgba(201,168,76,.14); border: 1px solid rgba(201,168,76,.45);
      }
      .inq-done-kicker { font-size: 12px; font-weight: 800; letter-spacing: .08em; color: #9a7a22; margin: 0 0 6px; }
      .inq-done-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(20px, 4vw, 26px); font-weight: 700; line-height: 1.45; margin: 0 0 12px; }
      .inq-done-lead { font-size: 14px; line-height: 1.85; color: #374151; margin: 0 0 22px; }
      .inq-done-steps-h { font-size: 13px; font-weight: 800; color: #1a1d24; margin: 0 0 10px; }
      .inq-done-steps { list-style: none; padding: 0; margin: 0 0 22px; display: grid; gap: 0; border-top: 1px solid #ece7dc; }
      .inq-done-steps li { display: grid; grid-template-columns: 28px 1fr; gap: 10px; padding: 12px 0; border-bottom: 1px solid #ece7dc; font-size: 14px; line-height: 1.75; color: #1f2937; }
      .inq-done-steps li span:first-child {
        width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; margin-top: 1px;
        background: #1f2a44; color: #e8cf7e; font-size: 12px; font-weight: 800;
      }
      .inq-done-note { font-size: 12.5px; line-height: 1.75; color: #6b7280; margin: 0 0 22px; }
      .inq-done-actions { display: flex; flex-wrap: wrap; gap: 10px; }
      .inq-done-actions a { text-decoration: none; text-align: center; display: inline-flex; align-items: center; justify-content: center; min-height: 46px; }
      @media (max-width: 600px) {
        .inq-done { padding: 28px 20px 24px; }
        .inq-done-actions a { flex: 1 1 100%; }
      }

      /* ─── Status ─── */
      .inq-status {
        margin-top: 14px;
        font-size: 13px; font-weight: 600;
        min-height: 20px; line-height: 1.5;
      }

      /* ─── Back link ─── */
      .inq-back {
        display: inline-flex; align-items: center; gap: 6px;
        margin-top: 24px;
        font-size: 13px; color: rgba(255,255,255,.55);
        text-decoration: none; transition: color .15s;
      }
      .inq-back:hover { color: #c9a84c; }
    `;
    document.head.appendChild(style);

    // LPの「このプランで相談する」から来た時は、そのプランを選んでおく
    const planParam = new URLSearchParams(window.location.search).get('plan');
    // 「すぐに始めたい方」の登録ページへも、紹介コード・プランを引き継ぐ
    const signupLink = document.getElementById('inqSignupLink');
    if (signupLink) {
      const sp = new URLSearchParams();
      const r0 = readRef();
      if (r0) sp.set('ref', r0);
      if (['A', 'B', 'C'].includes(planParam)) sp.set('plan', planParam);
      if (sp.toString()) signupLink.href = `/provider/signup?${sp}`;
    }
    const planSel = document.getElementById('desiredPlan');
    if (planSel && ['A', 'B', 'C'].includes(planParam)) planSel.value = planParam;
    // 無料モニターの応募（/provider/join の「モニターに応募する」から。2026-11-16）
    // 紹介コードはこのフォームで受けるので、モニター後に有料になった時の紹介報酬も紐づく
    if (planSel && planParam === 'monitor' && planSel.querySelector('option[value="monitor"]')) {
      planSel.value = 'monitor';
      const t = document.getElementById('inqTitle');
      if (t) t.textContent = '無料モニターへの応募';
      const l = document.getElementById('inqLead');
      if (l) l.textContent = `${MONITOR_CAMPAIGN.planLabel}プランを${MONITOR_CAMPAIGN.months}か月間無料でお使いいただくモニターへの応募フォームです（${MONITOR_CAMPAIGN.slots}店限定）。応募のあと、オンライン（30分ほど）でお店のご様子を伺います。ご都合のよい日時をお知らせください。`;
      const m = document.getElementById('message');
      if (m) m.placeholder = '例: いまの予約・お客様の管理の方法（紙・表計算・予約サイトなど）／困っていること／導入事例として店舗名を出してよいか など';
      const b = document.querySelector('#provider-inquiry-form .inq-btn-primary');
      if (b) b.textContent = 'モニターに応募する';
    }

    const refCode = readRef();
    const refInput = document.getElementById('referralCode');
    if (refCode) {
      if (refInput) refInput.value = refCode;
      const noteEl = document.getElementById('inqReferralNote');
      if (noteEl) {
        noteEl.textContent = `紹介コード「${refCode}」が適用されます。`;
        noteEl.style.display = 'block';
      }
    }

    async function saveInquiry(data) {
      const res = await fetch('/api/provider/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error || 'サーバーエラー');
        e.field = err.field;
        throw e;
      }
    }

    function mapCategoryLabel(v) {
      const map = {
        gym: 'ジム・パーソナルトレーニング', makeup: 'メイク・コスメ', hair: 'ヘア・美容院',
        diagnosis: '骨格・パーソナルカラー診断', fashion: 'ファッション・スタイリング',
        photo: 'プロフィール写真・撮影', marriage: '婚活・マッチングサポート',
        eyebrow: '眉毛サロン', hairremoval: '脱毛', esthetic: 'エステ・フェイシャル',
        whitening: '歯のホワイトニング', orthodontics: '歯列矯正', nail: 'ネイル',
        aga: 'AGA・薄毛治療', consulting: 'コンサルティング', other: 'その他',
      };
      return map[v] || '未選択';
    }

    function summarize(data) {
      return [
        `【会社/屋号】${data.bizName}`,
        `【担当者】${data.contactName}`,
        `【メール】${data.email}`,
        data.phone ? `【電話】${data.phone}` : '',
        data.category ? `【カテゴリ】${mapCategoryLabel(data.category)}` : '',
        `【連絡希望】${data.contactPref}`,
        data.meetingWish ? `【オンライン相談の希望日時】${data.meetingWish}` : '',
        data.desiredPlan ? `【気になっているプラン】PLAN ${data.desiredPlan}` : '',
        data.referralCode ? `【紹介コード】${data.referralCode}` : '',
        `【内容】${(data.message || '').trim()}`
      ].filter(Boolean).join('\n');
    }

    // 送信できたら、フォームを閉じて完了画面に切り替える（2026-11-18 渡邉依頼）。入力された値は textContent でだけ入れる
    function showDone(data) {
      const isMonitor = data.desiredPlan === 'monitor';
      const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
      set('inqDoneKicker', isMonitor ? '応募が完了しました' : '送信が完了しました');
      set('inqDoneTitle', isMonitor ? '無料モニターへのご応募、ありがとうございます' : 'オンライン相談のお申し込みを受け付けました');
      set('inqDoneLead', `${data.contactName} 様、${data.bizName} のご${isMonitor ? '応募' : '相談'}を受け付けました。受付のメールを ${data.email} にお送りしています。`);
      const steps = isMonitor ? [
        '担当者が内容を拝見し、オンラインでお話を伺う日時とURLをメールでご連絡します。',
        'オンライン（30分ほど）で、お店のご様子と、いまお困りのことを伺います。',
        `モニターとしてご一緒できることになったら、${MONITOR_CAMPAIGN.planLabel}プランを${MONITOR_CAMPAIGN.months}か月間無料でお使いいただけます。初期設定はこちらでお手伝いします。`,
        'モニター期間が終わっても、自動で課金されることはありません。続けるかどうかは、そのときにお決めいただけます。',
      ] : [
        'ご希望の日時をもとに、担当者からオンライン相談の日時とURLをメールでご連絡します。',
        'オンライン（30分ほど）で、お店のご様子を伺い、Finemeの使い方をご説明します。',
        '導入するかどうかは、お話のあとでゆっくりお決めください。',
      ];
      const ol = document.getElementById('inqDoneSteps');
      if (ol) {
        ol.replaceChildren(...steps.map((t, i) => {
          const li = document.createElement('li');
          const n = document.createElement('span'); n.textContent = String(i + 1);
          const b = document.createElement('span'); b.textContent = t;
          li.append(n, b);
          return li;
        }));
      }
      ['inqTitle', 'inqLead', 'inqReferralNote', 'inqSignupNote', 'inqBack'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
      const card = document.querySelector('.inq-card');
      if (card) card.style.display = 'none';
      const done = document.getElementById('inqDone');
      if (done) {
        done.hidden = false;
        window.scrollTo({ top: 0, behavior: 'auto' });
        done.focus({ preventScroll: true });
      }
    }

    const form = document.getElementById('provider-inquiry-form');
    const statusEl = document.getElementById('inquiryStatus');
    const copyBtn = document.getElementById('copyInquiry');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const data = {
          bizName: fd.get('bizName')?.toString().trim(),
          contactName: fd.get('contactName')?.toString().trim(),
          email: fd.get('email')?.toString().trim(),
          phone: fd.get('phone')?.toString().trim(),
          category: fd.get('category')?.toString(),
          contactPref: fd.get('contactPref')?.toString(),
          desiredPlan: fd.get('desiredPlan')?.toString() || undefined,
          meetingWish: fd.get('meetingWish')?.toString().trim(),
          message: fd.get('message')?.toString(),
          source: fd.get('source')?.toString() || undefined,
          referralCode: fd.get('referralCode')?.toString().trim() || undefined
        };
        const consent = document.getElementById('consent')?.checked;
        if (!data.bizName || !data.contactName || !data.email || !consent) {
          statusEl.textContent = '必須項目が未入力です（会社名・担当者・メール・同意）';
          statusEl.style.color = '#b91c1c';
          return;
        }
        if (!data.meetingWish) {
          statusEl.textContent = 'オンライン相談のご希望日時を入れてください（「平日の夜」などでも大丈夫です）';
          statusEl.style.color = '#b91c1c';
          document.getElementById('meetingWish')?.focus();
          return;
        }
        if (!data.category) {
          statusEl.textContent = 'カテゴリを選択してください（当てはまらない場合は「その他」）';
          statusEl.style.color = '#b91c1c';
          document.getElementById('category')?.focus();
          return;
        }
        const submitBtn = form.querySelector('.inq-btn-primary');
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中…';
        try {
          await saveInquiry(data);
          form.reset();
          showDone(data);
        } catch (err) {
          if (err.field === 'referralCode') {
            statusEl.textContent = err.message;
            statusEl.style.color = '#b91c1c';
            document.getElementById('referralCode')?.focus();
            return;
          }
          statusEl.textContent = '送信に失敗しました。時間をおいて再度お試しください。';
          statusEl.style.color = '#b91c1c';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = data.desiredPlan === 'monitor' ? 'モニターに応募する' : '相談を申し込む';
        }
      });
    }

    if (copyBtn && form) {
      copyBtn.addEventListener('click', () => {
        const fd = new FormData(form);
        const data = {
          bizName: fd.get('bizName')?.toString().trim() || '',
          contactName: fd.get('contactName')?.toString().trim() || '',
          email: fd.get('email')?.toString().trim() || '',
          phone: fd.get('phone')?.toString().trim() || '',
          category: fd.get('category')?.toString() || '',
          contactPref: fd.get('contactPref')?.toString() || '',
          message: fd.get('message')?.toString() || '',
          referralCode: fd.get('referralCode')?.toString().trim() || ''
        };
        const text = summarize(data);
        navigator.clipboard.writeText(text).then(() => {
          statusEl.textContent = '内容をクリップボードにコピーしました。';
          statusEl.style.color = '#374151';
        }).catch(() => {
          statusEl.textContent = 'コピーに失敗しました。';
          statusEl.style.color = '#b91c1c';
        });
      });
    }

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <div className="inq-page">
      <div className="inq-container">
        <p className="inq-eyebrow">Provider Inquiry</p>
        <h1 className="inq-title" id="inqTitle">オンライン相談のお申し込み</h1>
        <p className="inq-lead" id="inqLead">まずはオンライン（30分ほど）で、お店のご様子を伺い、Finemeの使い方をご説明します。ご都合のよい日時をお知らせください。2分で完了します。</p>
        <p className="inq-referral-note" id="inqReferralNote" style={{ display: 'none' }}></p>

        <div className="inq-card">
          <form id="provider-inquiry-form" noValidate>
            <div className="inq-row">
              <div className="inq-field">
                <label className="inq-label" htmlFor="bizName">会社名・屋号<span className="inq-req">*</span></label>
                <input className="inq-input" type="text" id="bizName" name="bizName" required placeholder="例: 株式会社〇〇 / サロン△△" />
              </div>
              <div className="inq-field">
                <label className="inq-label" htmlFor="contactName">ご担当者名<span className="inq-req">*</span></label>
                <input className="inq-input" type="text" id="contactName" name="contactName" required placeholder="例: 山田 太郎" />
              </div>
            </div>

            <div className="inq-row">
              <div className="inq-field">
                <label className="inq-label" htmlFor="email">メールアドレス<span className="inq-req">*</span></label>
                <input className="inq-input" type="email" id="email" name="email" required placeholder="例: you@example.com" />
              </div>
              <div className="inq-field">
                <label className="inq-label" htmlFor="phone">電話番号（任意）</label>
                <input className="inq-input" type="tel" id="phone" name="phone" placeholder="例: 090-1234-5678" />
              </div>
            </div>

            <div className="inq-row">
              <div className="inq-field">
                <label className="inq-label" htmlFor="category">掲載カテゴリ（目安）<span style={{ color: '#ef4444' }}> *</span></label>
                <select className="inq-select" id="category" name="category" required defaultValue="">
                  <option value="" disabled>選択してください</option>
                  <option value="gym">ジム・パーソナルトレーニング</option>
                  <option value="makeup">メイク・コスメ</option>
                  <option value="hair">ヘア・美容院</option>
                  <option value="colordiagnosis">パーソナルカラー診断</option>
                  <option value="bonediagnosis">骨格診断</option>
                  <option value="diagnosis">診断（総合・イメコン）</option>
                  <option value="fashion">ファッション・スタイリング</option>
                  <option value="photo">プロフィール写真・撮影</option>
                  <option value="marriage">婚活・マッチングサポート</option>
                  <option value="eyebrow">眉毛サロン</option>
                  <option value="hairremoval">脱毛</option>
                  <option value="esthetic">エステ・フェイシャル</option>
                  <option value="whitening">歯のホワイトニング</option>
                  <option value="orthodontics">歯列矯正</option>
                  <option value="nail">ネイル</option>
                  <option value="aga">AGA・薄毛治療</option>
                  <option value="consulting">コンサルティング</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="inq-field">
                <label className="inq-label" htmlFor="contactPref">希望連絡方法</label>
                <select className="inq-select" id="contactPref" name="contactPref">
                  <option value="email">メールでの返信希望</option>
                  <option value="phone">電話での連絡希望</option>
                  <option value="either">どちらでも</option>
                </select>
              </div>
            </div>

            <div className="inq-row">
              <div className="inq-field">
                <label className="inq-label" htmlFor="desiredPlan">気になっているプラン（任意）</label>
                <select className="inq-select" id="desiredPlan" name="desiredPlan" defaultValue="">
                  <option value="">まだ決めていない</option>
                  <option value="A">PLAN A ライト（¥5,000/月）</option>
                  <option value="B">PLAN B スタンダード（¥7,000/月）</option>
                  <option value="C">PLAN C プレミアム（¥10,000/月）</option>
                  {isMonitorOpen() && <option value="monitor">無料モニターに応募（{MONITOR_CAMPAIGN.months}か月無料・{MONITOR_CAMPAIGN.slots}店限定）</option>}
                </select>
              </div>
              <div className="inq-field">
                <label className="inq-label" htmlFor="source">Finemeを知ったきっかけ（任意）</label>
                <select className="inq-select" id="source" name="source" defaultValue="">
                  <option value="">選択してください</option>
                  {INQUIRY_SOURCES.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </div>
            </div>

            <div className="inq-row-full inq-field">
              <label className="inq-label" htmlFor="referralCode">紹介コード（紹介を受けた方のみ・任意）</label>
              <input className="inq-input" id="referralCode" name="referralCode" autoComplete="off" maxLength={40} placeholder="例: FN001" />
            </div>

            <div className="inq-row-full inq-field">
              <label className="inq-label" htmlFor="meetingWish">オンライン相談のご希望日時<span className="inq-req">*</span></label>
              <textarea className="inq-textarea" id="meetingWish" name="meetingWish" rows={3} required placeholder="例: 11/5（水）14時〜、11/6（木）19時以降、平日の昼ならいつでも"></textarea>
            </div>

            <div className="inq-row-full inq-field">
              <label className="inq-label" htmlFor="message">ご相談内容（自由記入）</label>
              <textarea className="inq-textarea" id="message" name="message" rows={5} placeholder="例: 回数券と会員の管理をまとめたい / 今の予約サイトと併用できるか知りたい など"></textarea>
            </div>

            <div className="inq-consent">
              <input type="checkbox" id="consent" required />
              <label className="inq-consent-label" htmlFor="consent">
                プライバシーポリシーに同意します（個人情報は問い合わせ対応の目的でのみ使用）
              </label>
            </div>

            <div className="inq-btn-row">
              <button type="submit" className="inq-btn-primary">相談を申し込む</button>
              <button type="button" id="copyInquiry" className="inq-btn-secondary">内容をコピー</button>
            </div>

            <p className="inq-status" id="inquiryStatus" aria-live="polite"></p>
          </form>
        </div>

        <section className="inq-done" id="inqDone" hidden tabIndex={-1} aria-labelledby="inqDoneTitle">
          <div className="inq-done-mark" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#9a7a22" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <p className="inq-done-kicker" id="inqDoneKicker">送信が完了しました</p>
          <h2 className="inq-done-title" id="inqDoneTitle">お申し込みを受け付けました</h2>
          <p className="inq-done-lead" id="inqDoneLead"></p>
          <p className="inq-done-steps-h">このあとの流れ</p>
          <ol className="inq-done-steps" id="inqDoneSteps"></ol>
          <p className="inq-done-note">受付のメールが届かない場合は、迷惑メールのフォルダもご確認ください。それでも見当たらない時は、お手数ですが contact@fineme.me までご連絡ください。</p>
          <div className="inq-done-actions">
            <a className="inq-btn-primary" href="/provider/join">導入のご案内ページに戻る</a>
            <a className="inq-btn-secondary" href="/">Finemeのトップへ</a>
          </div>
        </section>

        <p className="inq-lead" id="inqSignupNote" style={{ marginTop: '20px', fontSize: '13px' }}>すでに導入を決めていて、すぐに始めたい方は<a id="inqSignupLink" href="/provider/signup" style={{ color: '#c9a84c', fontWeight: 700 }}>こちらから登録</a>できます。</p>
        <a className="inq-back" id="inqBack" href="/provider/join">← 導入のご案内ページに戻る</a>
      </div>
    </div>
  );
}
