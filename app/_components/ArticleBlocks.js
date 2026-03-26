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
    default:          return null;
  }
}

/* ── Lead ─────────────────────────────────── */
function LeadBlock({ text }) {
  return (
    <p style={{
      fontSize: '18px',
      lineHeight: 2.05,
      color: '#3a3028',
      fontFamily: 'var(--font-serif-ja)',
      marginBottom: '40px',
      paddingBottom: '28px',
      borderBottom: '1px solid rgba(201,168,76,0.25)',
    }}>
      {text}
    </p>
  );
}

/* ── Headings ─────────────────────────────── */
function H2Block({ text }) {
  return (
    <h2 style={{
      fontSize: 'clamp(18px,3.5vw,22px)',
      fontWeight: 800,
      fontFamily: 'var(--font-serif)',
      color: 'var(--color-fg)',
      marginTop: '52px',
      marginBottom: '16px',
      paddingLeft: '14px',
      borderLeft: '4px solid var(--color-gold)',
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
      color: 'var(--color-fg)',
      marginTop: '32px',
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
      color: '#2a2420',
      marginBottom: '20px',
    }}>
      {text}
    </p>
  );
}

/* ── Tip ──────────────────────────────────── */
function TipBlock({ label = 'POINT', text }) {
  return (
    <div style={{
      background: 'rgba(201,168,76,0.07)',
      borderLeft: '4px solid #c9a84c',
      borderRadius: '0 12px 12px 0',
      padding: '18px 22px',
      margin: '28px 0',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 800,
        letterSpacing: '0.14em',
        color: '#c9a84c',
        fontFamily: 'var(--font-sans)',
        textTransform: 'uppercase',
        marginBottom: '9px',
      }}>
        {label}
      </div>
      <p style={{
        fontSize: '15px',
        lineHeight: 1.9,
        color: '#2a2420',
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  );
}

/* ── Callout ──────────────────────────────── */
function CalloutBlock({ text }) {
  return (
    <div style={{
      background: 'rgba(10,15,30,0.05)',
      border: '1px solid rgba(10,15,30,0.1)',
      borderRadius: '12px',
      padding: '16px 22px',
      margin: '24px 0',
    }}>
      <p style={{
        fontSize: '14px',
        lineHeight: 1.9,
        color: '#3a3028',
        margin: 0,
      }}>
        {text}
      </p>
    </div>
  );
}

/* ── Quote ────────────────────────────────── */
function QuoteBlock({ text }) {
  return (
    <blockquote style={{
      margin: '36px 0',
      padding: '28px 32px 24px',
      background: 'rgba(201,168,76,0.06)',
      border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: '16px',
      position: 'relative',
    }}>
      <div style={{
        fontSize: '56px',
        color: 'rgba(201,168,76,0.35)',
        fontFamily: 'Georgia, serif',
        lineHeight: 0.8,
        marginBottom: '12px',
        display: 'block',
      }}>
        "
      </div>
      <p style={{
        fontSize: '17px',
        lineHeight: 1.85,
        fontFamily: 'var(--font-serif-ja)',
        color: 'var(--color-fg)',
        margin: 0,
      }}>
        {text}
      </p>
    </blockquote>
  );
}

/* ── Checklist ────────────────────────────── */
function ChecklistBlock({ title, items }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.55)',
      border: '1px solid rgba(201,168,76,0.22)',
      borderRadius: '14px',
      padding: '22px 26px',
      margin: '28px 0',
    }}>
      {title && (
        <p style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.1em',
          color: '#c9a84c',
          marginBottom: '16px',
          fontFamily: 'var(--font-sans)',
          textTransform: 'uppercase',
        }}>
          {title}
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            padding: '9px 0',
            borderBottom: i < items.length - 1 ? '1px solid rgba(201,168,76,0.1)' : 'none',
            fontSize: '15px',
            lineHeight: 1.75,
            color: '#2a2420',
          }}>
            <span style={{
              color: '#c9a84c',
              fontWeight: 800,
              flexShrink: 0,
              marginTop: '2px',
              fontSize: '14px',
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
    <ol style={{ listStyle: 'none', padding: 0, margin: '28px 0 36px' }}>
      {items.map((item, i) => {
        const title = typeof item === 'string' ? item : item.title;
        const text  = typeof item === 'object' ? item.text : null;
        return (
          <li key={i} style={{
            display: 'flex',
            gap: '18px',
            marginBottom: i < items.length - 1 ? '20px' : 0,
            position: 'relative',
          }}>
            {/* Number + connector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <span style={{
                flexShrink: 0,
                width: '38px',
                height: '38px',
                background: '#c9a84c',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 800,
                color: '#0a0f1e',
                fontFamily: 'var(--font-sans)',
              }}>
                {i + 1}
              </span>
              {i < items.length - 1 && (
                <div style={{
                  width: '2px',
                  flexGrow: 1,
                  minHeight: '20px',
                  background: 'rgba(201,168,76,0.25)',
                  marginTop: '4px',
                }} />
              )}
            </div>
            {/* Content */}
            <div style={{ paddingTop: '7px', paddingBottom: i < items.length - 1 ? '20px' : 0 }}>
              <p style={{
                fontWeight: 700,
                fontSize: '16px',
                color: 'var(--color-fg)',
                margin: text ? '0 0 6px' : 0,
                lineHeight: 1.5,
              }}>
                {title}
              </p>
              {text && (
                <p style={{
                  fontSize: '14px',
                  lineHeight: 1.85,
                  color: '#5a4e44',
                  margin: 0,
                }}>
                  {text}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── CTA ──────────────────────────────────── */
function CtaBlock({ text, buttonLabel, buttonHref }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0f1e 0%, #141c38 100%)',
      borderRadius: '18px',
      padding: '36px 32px',
      margin: '48px 0 32px',
      textAlign: 'center',
      border: '1px solid rgba(201,168,76,0.25)',
      boxShadow: '0 8px 32px rgba(10,15,30,0.2)',
    }}>
      <p style={{
        fontSize: '16px',
        lineHeight: 1.9,
        color: 'rgba(240,236,228,0.88)',
        marginBottom: '24px',
        fontFamily: 'var(--font-serif-ja)',
      }}>
        {text}
      </p>
      <a
        href={buttonHref}
        style={{
          display: 'inline-block',
          background: '#c9a84c',
          color: '#0a0f1e',
          fontWeight: 800,
          fontSize: '15px',
          padding: '13px 32px',
          borderRadius: '10px',
          textDecoration: 'none',
          letterSpacing: '0.04em',
          fontFamily: 'var(--font-sans)',
          boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
        }}
      >
        {buttonLabel}
      </a>
    </div>
  );
}
