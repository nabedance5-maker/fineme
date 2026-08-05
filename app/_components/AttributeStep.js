'use client';
import { useState } from 'react';
import { AGE_BANDS, saveAttribute, syncAttributesWithServer } from '@/lib/attributes';

// 属性（年代）の登録・確認カード。AuthGate.js のカードUIを流用。
// mode='register'：初回登録。5択、選ぶと即 onDone
// mode='confirm'：2回目以降の確認。「この内容で進む」／「変更する」（押すと register 表示に切替）
//
// でお指摘 2026-08-01：同じ男女でも年代で肌ケア・体づくりへのアプローチは変わるべきなのに、
// これまで年代を扱う仕組みが無かった。Me Scan・Mirror開始時に必須で聞く。
export default function AttributeStep({ mode = 'register', currentAgeBand = null, onDone }) {
  const [editing, setEditing] = useState(mode === 'register');

  async function choose(ageBand) {
    saveAttribute({ age_band: ageBand });
    syncAttributesWithServer().catch(() => {});
    onDone?.(ageBand);
  }

  return (
    <>
      <style>{`
        .attr-step-wrap { min-height: 40vh; display: flex; align-items: center; justify-content: center; padding: 32px 20px; }
        .attr-step-card { max-width: 440px; width: 100%; background: #fff; border: 1px solid rgba(201,168,76,0.25); border-radius: 18px; padding: 36px 28px; text-align: center; box-shadow: 0 4px 32px rgba(0,0,0,0.06); color: #1a1410; }
        .attr-step-title { font-family: 'Noto Serif JP', Georgia, serif; font-size: 17px; font-weight: 700; color: #0a0f1e; margin: 0 0 10px; line-height: 1.6; }
        .attr-step-desc { font-size: 13px; color: #6b7280; line-height: 1.85; margin: 0 0 22px; }
        .attr-step-value { color: #6366f1; }
        .attr-step-opts { display: flex; flex-direction: column; gap: 8px; }
        .attr-step-opt { padding: 13px 18px; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; font-weight: 700; color: #374151; cursor: pointer; transition: all .12s; }
        .attr-step-opt:hover { border-color: #c9a84c; background: #fffdf5; }
        .attr-step-primary { display: block; width: 100%; padding: 14px 20px; background: #c9a84c; color: #0a0f1e; font-size: 14px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 10px; }
        .attr-step-edit { font-size: 12px; color: #9ca3af; background: none; border: none; text-decoration: underline; cursor: pointer; }
      `}</style>
      <div className="attr-step-wrap">
        <div className="attr-step-card">
          {editing ? (
            <>
              <p className="attr-step-title">年代を教えてください</p>
              <p className="attr-step-desc">同じ肌・体型の悩みでも、年代によって効くアプローチは変わります。あとからマイページで変更できます。</p>
              <div className="attr-step-opts">
                {Object.values(AGE_BANDS).map(b => (
                  <button key={b.id} type="button" className="attr-step-opt" onClick={() => choose(b.id)}>{b.label}</button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="attr-step-title">あなたの年代：<span className="attr-step-value">{AGE_BANDS[currentAgeBand]?.label}</span></p>
              <p className="attr-step-desc">前回登録した内容です。違っていればその場で変更できます。</p>
              <button type="button" className="attr-step-primary" onClick={() => onDone?.(currentAgeBand)}>この内容で進む →</button>
              <button type="button" className="attr-step-edit" onClick={() => setEditing(true)}>変更する</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
