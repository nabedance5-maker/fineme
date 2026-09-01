'use client';

// 掲載者ダッシュボード 使い方説明書。
// 画面内の「📘 チュートリアル」タブ・初回チュートリアルバナーと同じ内容を
// lib/dashboard-tutorial.js から共有し、内容がズレないようにしている。
// app/business/line-connect-guide/GuideContent.js と同じ window.print()パターン
// （ブラウザ閲覧＋「PDFを保存」で印刷ダイアログからPDF化）。
import { TAB_TUTORIALS, TUTORIAL_GROUPS } from '@/lib/dashboard-tutorial';

export default function ProviderGuideContent() {
  return (
    <main className="section">
      <style>{`
        @media print {
          .navbar, .footer, .no-print { display: none !important; }
          main.section { padding: 0 !important; }
        }
        .pg-item { border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; padding: 16px 18px; margin-bottom: 12px; }
        .pg-item h3 { margin: 0 0 6px; font-size: 15px; }
        .pg-item ul { margin: 0; padding-left: 18px; color: var(--color-muted); font-size: 13.5px; line-height: 1.8; }
      `}</style>

      <div className="container stack" style={{ maxWidth: 780, margin: '0 auto' }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h1 className="section-title" style={{ margin: 0 }}>掲載者ダッシュボード 使い方説明書</h1>
          <button className="btn" onClick={() => window.print()}>PDFを保存 / 印刷する</button>
        </div>
        <p className="muted">対象：Fineme掲載者様</p>
        <p>
          ダッシュボード（<a href="/provider/dashboard">/provider/dashboard</a>）には「📘 チュートリアル」タブがあり、
          この説明書と同じ内容をいつでも画面内で確認できます。各タブを初めて開いた時にも、同じ内容の要点が
          短く表示されます（一度読むと表示されなくなります）。
        </p>

        {TUTORIAL_GROUPS.map((group, gi) => (
          <section key={gi} className="stack" style={{ gap: 4, marginTop: 8 }}>
            <h2 style={{ fontSize: 18, margin: '16px 0 4px' }}>{group.heading}</h2>
            {group.keys.map(key => {
              const entry = TAB_TUTORIALS[key];
              if (!entry) return null;
              return (
                <div key={key} className="pg-item">
                  <h3>{entry.title}</h3>
                  <ul>
                    {entry.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                  </ul>
                </div>
              );
            })}
          </section>
        ))}

        <section className="stack" style={{ gap: 4, marginTop: 8 }}>
          <h2 style={{ fontSize: 18, margin: '8px 0' }}>お問い合わせ</h2>
          <p>使い方で分からないことがあれば、お気軽にご連絡ください。</p>
          <p>メール：<a href="mailto:contact@fineme.me">contact@fineme.me</a></p>
        </section>
      </div>
    </main>
  );
}
