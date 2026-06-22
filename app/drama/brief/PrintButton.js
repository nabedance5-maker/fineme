'use client';

export default function PrintButton() {
  return (
    <button
      className="no-print"
      onClick={() => window.print()}
      style={{
        background: '#c9a84c',
        color: '#0a0f1e',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 32px',
        fontSize: '15px',
        fontWeight: '700',
        cursor: 'pointer',
        letterSpacing: '0.04em',
      }}
    >
      PDFで保存する
    </button>
  );
}
