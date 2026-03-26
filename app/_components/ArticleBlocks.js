// Server Component — no 'use client' needed
// Design language: dark navy base + gold accent + white text hierarchy

export function ArticleBlocks({ blocks }) {
  if (!blocks?.length) return null;
  return (
    <div>
      {blocks.map((block, i) => <Block key={i} block={block} index={i} />)}
    </div>
  );
}

function Block({ block, index }) {
  switch (block.type) {
    case 'lead':      return <LeadBlock {...block} />;
    case 'h2':        return <H2Block {...block} index={index} />;
    case 'h3':        return <H3Block {...block} />;
    case 'text':      return <TextBlock {...block} />;
    case 'tip':       return <TipBlock {...block} />;
    case 'callout':   return <CalloutBlock {...block} />;
    case 'quote':     return <QuoteBlock {...block} />;
    case 'checklist': return <ChecklistBlock {...block} />;
    case 'steps':     return <StepsBlock {...block} />;
    case 'cta':       return <CtaBlock {...block} />;
    case 'image':     return <ImageBlock {...block} />;
    case 'stat':      return <StatBlock {...block} />;
    default:          return null;
  }
}

/* ─────────────────────────────────────────────
   Lead
───────────────────────────────────────────── */
function LeadBlock({ text }) {
  return (
    <div style={{ marginBottom: '48px', paddingBottom: '32px', borderBottom: '1px solid rgba(201,168,76,0.2)', position: 'relative' }}>
      {/* 左アクセントライン */}
      <div style={{ position: 'absolute', left: 0, top: '4px', bottom: '32px', width: '3px', background: 'linear-gradient(to bottom, #c9a84c, rgba(201,168,76,0))', borderRadius: '2px' }} />
      <p style={{
        fontSize: 'clamp(16px, 2.5vw, 18px)',
        lineHeight: 2.1,
        color: 'rgba(240,236,228,0.92)',
        fontFamily: 'var(--font-serif-ja)',
        paddingLeft: '20px',
        margin: 0,
        letterSpacing: '0.02em',
      }}>
        {text}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   H2 — sec-label スタイル + 大見出し
───────────────────────────────────────────── */
function H2Block({ text }) {
  return (
    <div style={{ marginTop: '60px', marginBottom: '20px' }}>
      {/* sec-label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '20px', height: '1.5px', background: '#c9a84c', flexShrink: 0 }} />
        <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.65)', fontFamily: 'var(--font-sans)' }}>
          Section
        </span>
        <div style={{ flex: 1, height: '1px', background: 'repeating-linear-gradient(90deg,rgba(201,168,76,0.25) 0,rgba(201,168,76,0.25) 4px,transparent 4px,transparent 9px)' }} />
      </div>
      <h2 style={{
        fontSize: 'clamp(19px, 3.5vw, 24px)',
        fontWeight: 800,
        fontFamily: 'var(--font-serif)',
        color: '#fff',
        margin: 0,
        lineHeight: 1.5,
        paddingLeft: '16px',
        borderLeft: '4px solid #c9a84c',
      }}>
        {text}
      </h2>
    </div>
  );
}

/* ─────────────────────────────────────────────
   H3
───────────────────────────────────────────── */
function H3Block({ text }) {
  return (
    <h3 style={{
      fontSize: '16px',
      fontWeight: 700,
      color: 'rgba(255,255,255,0.9)',
      marginTop: '36px',
      marginBottom: '10px',
      lineHeight: 1.6,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: '14px' }}>▸</span>
      {text}
    </h3>
  );
}

/* ─────────────────────────────────────────────
   Text
───────────────────────────────────────────── */
function TextBlock({ text }) {
  return (
    <p style={{
      fontSize: '16px',
      lineHeight: 2.05,
      color: 'rgba(240,236,228,0.85)',
      marginBottom: '22px',
    }}>
      {text}
    </p>
  );
}

/* ─────────────────────────────────────────────
   Tip — アイコン + バッジ + ゴールドアクセント
───────────────────────────────────────────── */
function TipBlock({ label = 'POINT', text }) {
  return (
    <div style={{
      position: 'relative',
      margin: '36px 0',
      padding: '22px 24px 22px 20px',
      background: 'rgba(201,168,76,0.06)',
      border: '1px solid rgba(201,168,76,0.3)',
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      {/* 左アクセントライン */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'linear-gradient(to bottom, #c9a84c 0%, rgba(201,168,76,0.3) 100%)', borderRadius: '14px 0 0 14px' }} />
      {/* 右上装飾 */}
      <div style={{ position: 'absolute', top: '-16px', right: '-16px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
      {/* バッジ */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em', color: '#c9a84c', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', background: 'rgba(201,168,76,0.12)', padding: '3px 10px', borderRadius: '99px', marginBottom: '12px', border: '1px solid rgba(201,168,76,0.25)' }}>
        ✦ {label}
      </div>
      <p style={{ fontSize: '15px', lineHeight: 1.9, color: 'rgba(240,236,228,0.9)', margin: 0, fontWeight: 500 }}>
        {text}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Callout — 濃いネイビー + 装飾 + 引用符
───────────────────────────────────────────── */
function CalloutBlock({ text }) {
  return (
    <div style={{
      position: 'relative',
      margin: '36px 0',
      padding: '28px 32px',
      background: 'rgba(10,15,30,0.6)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* 装飾円 */}
      <div style={{ position: 'absolute', top: '-24px', right: '-24px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-16px', left: '-16px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 70%)', borderRadius: '50%' }} />
      {/* アイコン */}
      <div style={{ fontSize: '20px', marginBottom: '10px', opacity: 0.7 }}>💡</div>
      <p style={{ fontSize: '15px', lineHeight: 1.9, color: 'rgba(240,236,228,0.88)', margin: 0, position: 'relative', fontFamily: 'var(--font-serif-ja)' }}>
        {text}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Quote — 大きな引用符 + ゴールドライン
───────────────────────────────────────────── */
function QuoteBlock({ text }) {
  return (
    <blockquote style={{
      margin: '44px 0',
      padding: '32px 32px 28px',
      position: 'relative',
      background: 'transparent',
    }}>
      {/* 上ゴールドライン */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: '30%', height: '2px', background: 'linear-gradient(to right, #c9a84c, rgba(201,168,76,0))' }} />
      {/* 大きな引用符 */}
      <span style={{
        position: 'absolute', top: '8px', left: '16px',
        fontSize: '72px', color: 'rgba(201,168,76,0.3)',
        fontFamily: 'Georgia, "Times New Roman", serif',
        lineHeight: 1, userSelect: 'none',
      }}>
        "
      </span>
      <p style={{
        fontSize: 'clamp(16px, 2.5vw, 19px)',
        lineHeight: 1.9,
        fontFamily: 'var(--font-serif-ja)',
        color: 'rgba(255,255,255,0.95)',
        margin: 0,
        fontWeight: 500,
        paddingTop: '28px',
        paddingLeft: '8px',
        fontStyle: 'italic',
      }}>
        {text}
      </p>
      {/* 下ゴールドライン */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, left: '30%', height: '1px', background: 'linear-gradient(to left, rgba(201,168,76,0.5), rgba(201,168,76,0))' }} />
    </blockquote>
  );
}

/* ─────────────────────────────────────────────
   Checklist — チェックボックス風 + ゴールド枠
───────────────────────────────────────────── */
function ChecklistBlock({ title, items }) {
  return (
    <div style={{
      border: '1px solid rgba(201,168,76,0.25)',
      borderRadius: '16px',
      padding: '24px 28px',
      margin: '36px 0',
      background: 'rgba(201,168,76,0.03)',
    }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(201,168,76,0.12)' }}>
          <span style={{ fontSize: '18px' }}>☑️</span>
          <p style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.9)', margin: 0, fontFamily: 'var(--font-sans)' }}>
            {title}
          </p>
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{
            display: 'flex', gap: '14px', alignItems: 'flex-start',
            padding: '10px 0',
            borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            fontSize: '14px', lineHeight: 1.75, color: 'rgba(240,236,228,0.85)',
          }}>
            <span style={{
              width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
              border: '1.5px solid rgba(201,168,76,0.45)',
              background: 'rgba(201,168,76,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: '2px', color: '#c9a84c', fontSize: '11px', fontWeight: 800,
            }}>✓</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Steps — Journey Timeline スタイル
───────────────────────────────────────────── */
function StepsBlock({ items }) {
  return (
    <div style={{ margin: '36px 0 44px' }}>
      {items.map((item, i) => {
        const title = typeof item === 'string' ? item : item.title;
        const text  = typeof item === 'object' ? item.text : null;
        const isLast = i === items.length - 1;
        return (
          <div key={i} style={{ display: 'flex', gap: '0' }}>
            {/* 左カラム: 番号 + コネクター */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '52px', flexShrink: 0 }}>
              <div style={{
                width: '40px', height: '40px',
                background: i === 0 ? '#c9a84c' : 'rgba(201,168,76,0.12)',
                borderRadius: '50%',
                border: `2px solid ${i === 0 ? '#c9a84c' : 'rgba(201,168,76,0.35)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 800,
                color: i === 0 ? '#0a0f1e' : '#c9a84c',
                fontFamily: 'var(--font-sans)',
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              {!isLast && (
                <div style={{ width: '2px', flex: 1, minHeight: '28px', marginTop: '4px',
                  background: 'repeating-linear-gradient(to bottom, rgba(201,168,76,0.4) 0, rgba(201,168,76,0.4) 5px, transparent 5px, transparent 10px)'
                }} />
              )}
            </div>
            {/* 右カラム: テキスト */}
            <div style={{
              flex: 1, paddingLeft: '16px',
              paddingBottom: isLast ? 0 : '28px',
              paddingTop: '7px',
            }}>
              <p style={{ fontWeight: 800, fontSize: '15px', color: i === 0 ? '#c9a84c' : 'rgba(255,255,255,0.95)', margin: text ? '0 0 8px' : 0, lineHeight: 1.5 }}>
                {title}
              </p>
              {text && (
                <p style={{ fontSize: '14px', lineHeight: 1.85, color: 'rgba(240,236,228,0.65)', margin: 0 }}>
                  {text}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CTA — 装飾背景 + 強いCTA
───────────────────────────────────────────── */
function CtaBlock({ text, buttonLabel, buttonHref }) {
  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, rgba(10,15,30,0.9) 0%, rgba(20,28,56,0.9) 100%)',
      borderRadius: '20px',
      padding: 'clamp(28px, 4vw, 44px) clamp(24px, 4vw, 40px)',
      margin: '56px 0 40px',
      textAlign: 'center',
      border: '1px solid rgba(201,168,76,0.3)',
      boxShadow: '0 12px 48px rgba(10,15,30,0.4), inset 0 1px 0 rgba(201,168,76,0.1)',
      overflow: 'hidden',
    }}>
      {/* 背景光 */}
      <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />
      {/* 上部アクセントライン */}
      <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5), transparent)' }} />
      <p style={{
        fontSize: 'clamp(14px, 2vw, 16px)', lineHeight: 1.9,
        color: 'rgba(240,236,228,0.88)', marginBottom: '28px',
        fontFamily: 'var(--font-serif-ja)', position: 'relative',
      }}>
        {text}
      </p>
      <a href={buttonHref} style={{
        display: 'inline-block', background: '#c9a84c', color: '#0a0f1e',
        fontWeight: 800, fontSize: '15px', padding: '14px 40px',
        borderRadius: '10px', textDecoration: 'none', letterSpacing: '0.05em',
        fontFamily: 'var(--font-sans)', boxShadow: '0 4px 24px rgba(201,168,76,0.4)',
        position: 'relative',
      }}>
        {buttonLabel} →
      </a>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Image
───────────────────────────────────────────── */
function ImageBlock({ src, alt, caption }) {
  if (!src) return null;
  return (
    <figure style={{ margin: '40px 0' }}>
      <img src={src} alt={alt || ''} style={{
        width: '100%', borderRadius: '14px', display: 'block',
        boxShadow: '0 8px 32px rgba(10,15,30,0.3)',
      }} />
      {caption && (
        <figcaption style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '10px', lineHeight: 1.6 }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* ─────────────────────────────────────────────
   Stat — KPIカードスタイルの数字強調
───────────────────────────────────────────── */
function StatBlock({ items }) {
  if (!Array.isArray(items)) return null;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`,
      gap: '14px',
      margin: '36px 0',
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          background: 'rgba(201,168,76,0.05)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: '14px',
          padding: '20px 16px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 900, color: '#c9a84c', fontFamily: 'var(--font-sans)', lineHeight: 1, marginBottom: '8px' }}>
            {item.value}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
