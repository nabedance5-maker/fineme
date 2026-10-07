'use client';
import { createContext, useContext } from 'react';

// クライアント描画の前（初期HTML）にも本文を出すための初期データ。
// 「読み込み中…」だけの初期HTMLはGoogleにソフト404と判定される（GSC 2026-10-07）。
const Ctx = createContext(null);

export function SeoInitialProvider({ value, children }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function SeoSummary({ fallbackText = '読み込み中…', color = '#6b7280' }) {
  const d = useContext(Ctx);
  if (!d) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color }}>{fallbackText}</p>
      </div>
    );
  }
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 20px', minHeight: '60vh' }}>
      <p style={{ fontSize: '12px', color: 'rgba(201,168,76,0.8)', fontWeight: 700, margin: '0 0 8px' }}>{d.categoryLabel}</p>
      <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#e8e4dc', margin: '0 0 12px' }}>{d.name}</h1>
      {d.catchphrase && <p style={{ fontSize: '16px', color: '#e8e4dc', margin: '0 0 12px', lineHeight: 1.7 }}>{d.catchphrase}</p>}
      {d.description && <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.7)', margin: 0, lineHeight: 1.8 }}>{d.description}</p>}
    </div>
  );
}
