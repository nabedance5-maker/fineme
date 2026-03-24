'use client';
import { useEffect, useRef } from 'react';

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

    async function saveInquiry(data) {
      const res = await fetch('/api/provider/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'サーバーエラー');
      }
    }

    function mapCategoryLabel(v) {
      const map = {
        hair: '美容室・ヘアサロン', esthetic: 'エステ・痩身', nails: 'ネイル',
        makeup: 'メイク・顔分析', eyelash: 'まつ毛・アイブロウ', cosmetic: '美容外科・美容クリニック'
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
        `【内容】${(data.message || '').trim()}`
      ].filter(Boolean).join('\n');
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
          message: fd.get('message')?.toString()
        };
        const consent = document.getElementById('consent')?.checked;
        if (!data.bizName || !data.contactName || !data.email || !consent) {
          statusEl.textContent = '必須項目が未入力です（会社名・担当者・メール・同意）';
          statusEl.style.color = '#b91c1c';
          return;
        }
        const submitBtn = form.querySelector('.inq-btn-primary');
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中…';
        try {
          await saveInquiry(data);
          statusEl.textContent = '✅ 送信を受け付けました。担当よりご連絡します。';
          statusEl.style.color = '#065f46';
          form.reset();
        } catch (err) {
          statusEl.textContent = '送信に失敗しました。時間をおいて再度お試しください。';
          statusEl.style.color = '#b91c1c';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '問い合わせを送信';
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
          message: fd.get('message')?.toString() || ''
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
        <h1 className="inq-title">資料請求・掲載についてのご相談</h1>
        <p className="inq-lead">最短で相談したい方向けの簡易フォームです。2分で完了。</p>

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
                <label className="inq-label" htmlFor="category">掲載カテゴリ（目安）</label>
                <select className="inq-select" id="category" name="category">
                  <option value="">未選択</option>
                  <option value="hair">美容室・ヘアサロン</option>
                  <option value="esthetic">エステ・痩身</option>
                  <option value="nails">ネイル</option>
                  <option value="makeup">メイク・顔分析</option>
                  <option value="eyelash">まつ毛・アイブロウ</option>
                  <option value="cosmetic">美容外科・美容クリニック</option>
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

            <div className="inq-row-full inq-field">
              <label className="inq-label" htmlFor="message">ご相談内容（自由記入）</label>
              <textarea className="inq-textarea" id="message" name="message" rows={5} placeholder="例: 掲載プランの詳細を知りたい / 資料を送付してほしい など"></textarea>
            </div>

            <div className="inq-consent">
              <input type="checkbox" id="consent" required />
              <label className="inq-consent-label" htmlFor="consent">
                プライバシーポリシーに同意します（個人情報は問い合わせ対応の目的でのみ使用）
              </label>
            </div>

            <div className="inq-btn-row">
              <button type="submit" className="inq-btn-primary">問い合わせを送信</button>
              <button type="button" id="copyInquiry" className="inq-btn-secondary">内容をコピー</button>
            </div>

            <p className="inq-status" id="inquiryStatus" aria-live="polite"></p>
          </form>
        </div>

        <a className="inq-back" href="/provider/join">← 掲載者募集ページに戻る</a>
      </div>
    </div>
  );
}
