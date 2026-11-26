// 男性向け（Fineme）／女性向け（Belle）を選んでから各診断へ進む分岐ページの中身。
// LINE公式アカウントのリッチメニューから開かれる（LINEアプリ内ブラウザ・スマホ前提）。
// ログイン不要・画像やアニメーションなし・サーバーで描くだけの軽いページにしている（Muse指示書 2026-11-26）。
// 表記ルール：「Me Scan」「Fineme Mirror」は単独で使わず、必ず説明を併記する。

const css = `
  .tc-wrap { min-height: calc(100vh - 64px); background: #faf8f3; color: #0d1117; padding: 32px 16px 48px; box-sizing: border-box; }
  .tc-inner { max-width: 480px; margin: 0 auto; }
  .tc-label { font-size: 12px; font-weight: 700; letter-spacing: .12em; color: #8a7340; margin: 0 0 8px; }
  .tc-title { font-size: 22px; font-weight: 800; line-height: 1.45; margin: 0 0 8px; }
  .tc-lead { font-size: 14px; line-height: 1.8; color: #4a4f57; margin: 0 0 24px; }
  .tc-list { display: flex; flex-direction: column; gap: 16px; }
  .tc-card { display: block; min-height: 96px; padding: 20px 20px 18px; border-radius: 16px; text-decoration: none; box-sizing: border-box; -webkit-tap-highlight-color: transparent; transition: opacity .15s; }
  .tc-card:active { opacity: .85; }
  .tc-card:focus-visible { outline: 3px solid #c8a45a; outline-offset: 3px; }
  .tc-men { background: #0d1117; color: #e8e4dc; border: 1px solid rgba(200,164,90,.45); }
  .tc-women { background: #0c0810; color: rgba(240,216,224,.92); border: 1px solid rgba(200,100,140,.55); }
  .tc-tag { display: inline-block; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-bottom: 10px; }
  .tc-men .tc-tag { background: rgba(200,164,90,.16); color: #c8a45a; }
  .tc-women .tc-tag { background: rgba(200,100,140,.18); color: rgba(230,150,185,1); }
  .tc-name { display: block; font-size: 18px; font-weight: 800; line-height: 1.5; }
  .tc-desc { display: block; font-size: 13px; line-height: 1.7; margin-top: 6px; opacity: .75; }
  .tc-go { display: block; font-size: 14px; font-weight: 700; margin-top: 12px; }
  .tc-men .tc-go { color: #c8a45a; }
  .tc-women .tc-go { color: rgba(230,150,185,1); }
  .tc-note { font-size: 12px; line-height: 1.7; color: #6b7078; margin: 20px 0 0; text-align: center; }
  @media (min-width: 768px) { .tc-wrap { padding-top: 56px; } .tc-title { font-size: 26px; } }
`;

/**
 * @param {{ label: string, title: string, lead: string, options: Array<{ track: 'men'|'women', tag: string, name: string, desc: string, href: string }>, note?: string }} props
 */
export default function TrackChooser({ label, title, lead, options, note }) {
  return (
    <main className="tc-wrap">
      <style>{css}</style>
      <div className="tc-inner">
        <p className="tc-label">{label}</p>
        <h1 className="tc-title">{title}</h1>
        <p className="tc-lead">{lead}</p>
        <div className="tc-list">
          {options.map(o => (
            <a key={o.href} href={o.href} className={`tc-card tc-${o.track}`}>
              <span className="tc-tag">{o.tag}</span>
              <span className="tc-name">{o.name}</span>
              <span className="tc-desc">{o.desc}</span>
              <span className="tc-go">はじめる →</span>
            </a>
          ))}
        </div>
        {note ? <p className="tc-note">{note}</p> : null}
      </div>
    </main>
  );
}
