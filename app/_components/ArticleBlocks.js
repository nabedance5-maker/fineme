// Server Component — no 'use client' needed

export function ArticleBlocks({ blocks }) {
  if (!blocks?.length) return null;
  return (
    <div>
      {blocks.map((block, i) => <Block key={i} block={block} />)}
    </div>
  );
}

function Block({ block }) {
  switch (block.type) {
    case 'lead':      return <LeadBlock {...block} />;
    case 'h2':        return <H2Block {...block} />;
    case 'h3':        return <H3Block {...block} />;
    case 'text':      return <TextBlock {...block} />;
    case 'tip':       return <TipBlock {...block} />;
    case 'callout':   return <CalloutBlock {...block} />;
    case 'quote':     return <QuoteBlock {...block} />;
    case 'checklist': return <ChecklistBlock {...block} />;
    case 'steps':     return <StepsBlock {...block} />;
    case 'cta':       return <CtaBlock {...block} />;
    case 'image':     return <ImageBlock {...block} />;
    default:          return null;
  }
}

/* ── Lead ─────────────────────────────────── */
function LeadBlock({ text }) {
  return (
    <p style={{
      fontSize: 'clamp(16px, 2.5vw, 18px)',
      lineHeight: 2.05,
      color: '#1a1410',
      fontFamily: 'var(--font-serif-ja)',
      marginBottom: '44px',
      paddingBottom: '28px',
      borderBottom: '1px solid rgba(201,168,76,0.2)',
      letterSpacing: '0.02em',
    }}>
      {text}
    </p>
  );
}

/* ── Headings ─────────────────────────────── */
function H2Block({ text }) {
  return (
    <h2 style={{
      fontSize: 'clamp(19px, 3.5vw, 23px)',
      fontWeight: 800,
      fontFamily: 'var(--font-serif)',
      color: '#0a0f1e',
      marginTop: '56px',
      marginBottom: '16px',
      paddingLeft: '16px',
      borderLeft: '4px solid #c9a84c',
      lineHeight: 1.55,
    }}>
      {text}
    </h2>
  );
}

function H3Block({ text }) {
  return (
    <h3 style={{
      fontSize: '16px',
      fontWeight: 700,
      color: '#0a0f1e',
      marginTop: '36px',
      marginBottom: '10px',
      lineHeight: 1.6,
    }}>
      {text}
    </h3>
  );
}

/* ── Text ─────────────────────────────────── */
function TextBlock({ text }) {
  return (
    <p style={{
      fontSize: '16px',
      lineHeight: 2,
      color: '#1a1410',
      marginBottom: '22px',
    }}>
      {text}
    </p>
  );
}

/* ── Tip ──────────────────────────────────── */
function TipBlock({ label = 'POINT', text }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(201,168,76,0.04) 100%)',
      border: '1.5px solid rgba(201,168,76,0.35)',
      borderRadius: '14px',
      padding: '22px 24px',
      margin: '32px 0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* アクセントライン */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#c9a84c', borderRadius: '14px 0 0 14px' }} />
      <div style={{ paddingLeft: '4px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '10px', fontWeight: 800, letterSpacing: '0.14em',
          color: '#c9a84c', fontFamily: 'var(--font-sans)', textTransform: 'uppercase',
          marginBottom: '10px',
          background: 'rgba(201,168,76,0.12)', padding: '3px 10px', borderRadius: '99px',
        }}>
          ✦ {label}
        </div>
        <p style={{ fontSize: '15px', lineHeight: 1.9, color: '#1a1410', margin: 0, fontWeight: 500 }}>
          {text}
        </p>
      </div>
    </div>
  );
}

/* ── Callout ──────────────────────────────── */
function CalloutBlock({ text }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0f1e 0%, #141c38 100%)',
      borderRadius: '14px',
      padding: '24px 28px',
      margin: '32px 0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 装飾円 */}
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(201,168,76,0.06)', borderRadius: '50%' }} />
      <p style={{ fontSize: '15px', lineHeight: 1.9, color: 'rgba(255,255,255,0.88)', margin: 0, position: 'relative', fontFamily: 'var(--font-serif-ja)' }}>
        {text}
      </p>
    </div>
  );
}

/* ── Quote ────────────────────────────────── */
function QuoteBlock({ text }) {
  return (
    <blockquote style={{
      margin: '40px 0',
      padding: '0',
      position: 'relative',
    }}>
      {/* 上下の線 */}
      <div style={{ height: '2px', background: 'linear-gradient(to right, #c9a84c, rgba(201,168,76,0.1))', marginBottom: '20px' }} />
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '0 8px' }}>
        <span style={{ fontSize: '52px', color: 'rgba(201,168,76,0.5)', fontFamily: 'Georgia, serif', lineHeight: 0.75, flexShrink: 0, marginTop: '8px' }}>"</span>
        <p style={{ fontSize: 'clamp(16px, 2.5vw, 19px)', lineHeight: 1.85, fontFamily: 'var(--font-serif-ja)', color: '#0a0f1e', margin: 0, fontWeight: 500 }}>
          {text}
        </p>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(to right, rgba(201,168,76,0.1), #c9a84c)', marginTop: '20px' }} />
    </blockquote>
  );
}

/* ── Checklist ────────────────────────────── */
function ChecklistBlock({ title, items }) {
  return (
    <div style={{
      border: '1.5px solid rgba(201,168,76,0.25)',
      borderRadius: '16px',
      padding: '24px 28px',
      margin: '32px 0',
      background: '#fdfcf9',
    }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <span style={{ fontSize: '16px' }}>☑️</span>
          <p style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', color: '#0a0f1e', margin: 0, fontFamily: 'var(--font-sans)' }}>
            {title}
          </p>
        </div>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            padding: '10px 0',
            borderBottom: i < items.length - 1 ? '1px solid rgba(201,168,76,0.1)' : 'none',
            fontSize: '15px', lineHeight: 1.75, color: '#1a1410',
          }}>
            <span style={{
              width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
              background: 'rgba(201,168,76,0.12)', border: '1.5px solid rgba(201,168,76,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: '2px', color: '#c9a84c', fontSize: '12px', fontWeight: 800,
            }}>✓</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Steps ────────────────────────────────── */
function StepsBlock({ items }) {
  return (
    <div style={{ margin: '32px 0 40px' }}>
      {items.map((item, i) => {
        const title = typeof item === 'string' ? item : item.title;
        const text  = typeof item === 'object' ? item.text : null;
        return (
          <div key={i} style={{ display: 'flex', gap: '0', marginBottom: i < items.length - 1 ? '0' : 0 }}>
            {/* 左カラム: 数字 + コネクター */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '52px', flexShrink: 0 }}>
              <div style={{
                width: '40px', height: '40px', background: '#0a0f1e', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 800, color: '#c9a84c', fontFamily: 'var(--font-sans)',
                border: '2px solid rgba(201,168,76,0.4)', flexShrink: 0,
              }}>
                {i + 1}
              </div>
              {i < items.length - 1 && (
                <div style={{ width: '2px', flex: 1, minHeight: '24px', marginTop: '4px',
                  background: 'repeating-linear-gradient(to bottom, rgba(201,168,76,0.45) 0, rgba(201,168,76,0.45) 5px, transparent 5px, transparent 10px)'
                }} />
              )}
            </div>
            {/* 右カラム: テキスト */}
            <div style={{
              flex: 1, paddingLeft: '14px',
              paddingBottom: i < items.length - 1 ? '28px' : 0,
              paddingTop: '8px',
            }}>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#0a0f1e', margin: text ? '0 0 8px' : 0, lineHeight: 1.5 }}>
                {title}
              </p>
              {text && (
                <p style={{ fontSize: '14px', lineHeight: 1.85, color: '#4b4038', margin: 0 }}>
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

/* ── CTA ──────────────────────────────────── */
function CtaBlock({ text, buttonLabel, buttonHref }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0f1e 0%, #141c38 100%)',
      borderRadius: '20px',
      padding: 'clamp(28px, 4vw, 40px) clamp(24px, 4vw, 36px)',
      margin: '52px 0 36px',
      textAlign: 'center',
      border: '1px solid rgba(201,168,76,0.3)',
      boxShadow: '0 12px 40px rgba(10,15,30,0.18)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 背景装飾 */}
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', borderRadius: '50%' }} />
      <p style={{
        fontSize: 'clamp(14px, 2vw, 16px)', lineHeight: 1.9,
        color: 'rgba(240,236,228,0.88)', marginBottom: '24px',
        fontFamily: 'var(--font-serif-ja)', position: 'relative',
      }}>
        {text}
      </p>
      <a href={buttonHref} style={{
        display: 'inline-block', background: '#c9a84c', color: '#0a0f1e',
        fontWeight: 800, fontSize: '15px', padding: '13px 36px',
        borderRadius: '10px', textDecoration: 'none', letterSpacing: '0.04em',
        fontFamily: 'var(--font-sans)', boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
        transition: 'opacity 0.15s', position: 'relative',
      }}>
        {buttonLabel}
      </a>
    </div>
  );
}

/* ── Image ────────────────────────────────── */
function ImageBlock({ src, alt, caption }) {
  if (!src) return null;
  return (
    <figure style={{ margin: '36px 0' }}>
      <img src={src} alt={alt || ''} style={{
        width: '100%', borderRadius: '14px', display: 'block',
        boxShadow: '0 4px 24px rgba(10,15,30,0.1)',
      }} />
      {caption && (
        <figcaption style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '10px', lineHeight: 1.6 }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
