'use client';
import { useEffect, useRef } from 'react';

export default function ProviderInquiryPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .section{ padding:40px 0 }
      .page-title{ font-size:28px; margin-bottom:6px }
      .lead{ color:#6b7280 }
    `;
    document.head.appendChild(style);

    function saveInquiry(data) {
      const k = 'fineme:provider:inquiries';
      const arr = JSON.parse(localStorage.getItem(k) || '[]');
      arr.push({ ...data, createdAt: new Date().toISOString() });
      localStorage.setItem(k, JSON.stringify(arr));
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
        try {
          saveInquiry(data);
          statusEl.textContent = '送信を受け付けました。担当よりご連絡します。';
          statusEl.style.color = '#111827';
          form.reset();
        } catch (err) {
          statusEl.textContent = '保存に失敗しました。再度お試しください。';
          statusEl.style.color = '#b91c1c';
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
          statusEl.style.color = '#111827';
        }).catch(() => {
          statusEl.textContent = 'コピーに失敗しました。';
          statusEl.style.color = '#b91c1c';
        });
      });
    }

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <main className="section">
      <div className="container stack">
        <h1 className="page-title">資料請求・掲載についてのご相談</h1>
        <p className="lead">最短で相談したい方向けの簡易フォームです。2分で完了。</p>

        <form id="provider-inquiry-form" className="stack" style={{ gap: '12px' }} noValidate>
          <div className="grid-2">
            <div className="stack">
              <label htmlFor="bizName">会社名・屋号<span style={{ color: '#b91c1c' }}> *</span></label>
              <input type="text" id="bizName" name="bizName" required placeholder="例: 株式会社〇〇 / サロン△△" />
            </div>
            <div className="stack">
              <label htmlFor="contactName">ご担当者名<span style={{ color: '#b91c1c' }}> *</span></label>
              <input type="text" id="contactName" name="contactName" required placeholder="例: 山田 太郎" />
            </div>
          </div>
          <div className="grid-2">
            <div className="stack">
              <label htmlFor="email">メールアドレス<span style={{ color: '#b91c1c' }}> *</span></label>
              <input type="email" id="email" name="email" required placeholder="例: you@example.com" />
            </div>
            <div className="stack">
              <label htmlFor="phone">電話番号（任意）</label>
              <input type="tel" id="phone" name="phone" placeholder="例: 090-1234-5678" />
            </div>
          </div>
          <div className="grid-2">
            <div className="stack">
              <label htmlFor="category">掲載カテゴリ（目安）</label>
              <select id="category" name="category">
                <option value="">未選択</option>
                <option value="hair">美容室・ヘアサロン</option>
                <option value="esthetic">エステ・痩身</option>
                <option value="nails">ネイル</option>
                <option value="makeup">メイク・顔分析</option>
                <option value="eyelash">まつ毛・アイブロウ</option>
                <option value="cosmetic">美容外科・美容クリニック</option>
              </select>
            </div>
            <div className="stack">
              <label htmlFor="contactPref">希望連絡方法</label>
              <select id="contactPref" name="contactPref">
                <option value="email">メールでの返信希望</option>
                <option value="phone">電話での連絡希望</option>
                <option value="either">どちらでも</option>
              </select>
            </div>
          </div>
          <div className="stack">
            <label htmlFor="message">ご相談内容（自由記入）</label>
            <textarea id="message" name="message" rows={5} placeholder="例: 掲載プランの詳細を知りたい / 資料を送付してほしい など"></textarea>
          </div>
          <div className="cluster" style={{ alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" id="consent" required />
            <label htmlFor="consent" className="muted">プライバシーポリシーに同意します（個人情報は問い合わせ対応の目的でのみ使用）</label>
          </div>
          <div className="cta">
            <button type="submit" className="btn btn-primary">問い合わせを送信</button>
            <button type="button" id="copyInquiry" className="btn btn-ghost">内容をコピー</button>
          </div>
          <p className="muted" id="inquiryStatus" aria-live="polite"></p>
        </form>

        <div className="cluster" style={{ marginTop: '12px' }}>
          <a className="btn btn-ghost" href="/provider/join">掲載者募集LPに戻る</a>
        </div>
      </div>
    </main>
  );
}
