'use client';

// この端末に保存したメニュー（localStorage・この端末だけ）。お店のアカウントでの保存・共有は次の段階。
import { useEffect, useState } from 'react';
import Link from 'next/link';
import s from '../encompass.module.css';
import { decodeMenu, loadSaved, removeSaved, totalMinutes } from '@/lib/encompass/menu';

const linkBtn = { display: 'inline-flex', alignItems: 'center', textDecoration: 'none' };

export default function Saved() {
  const [list, setList] = useState(null);
  const [asking, setAsking] = useState(null); // 「本当に消しますか？」を出しているメニュー
  useEffect(() => { setList(loadSaved()); }, []);

  return (
    <main className={s.main}>
      <h1 className={s.h1}>保存したメニュー</h1>
      <p className={s.lead}>このタブレットに保存したメニューです。</p>
      {list && list.length === 0 && <p className={s.note}>まだ保存したメニューはありません。</p>}
      {list && list.length > 0 && (
        <ul className={s.list}>
          {list.map(x => {
            const m = decodeMenu(x.m);
            if (!m) return null;
            return (
              <li key={x.m} className={s.listItem} style={{ gridTemplateColumns: '1fr' }}>
                <div className={s.cardName}>{m.title || '名前なし'}</div>
                <div className={s.cardMeta}>{m.items.length}種目・約{totalMinutes(m.items)}分</div>
                <div className={s.row}>
                  <Link href={`/encompass/play?m=${x.m}`} className={`${s.btnPrimary} ${s.small}`} style={linkBtn}>はじめる</Link>
                  <Link href={`/encompass/builder?from=saved&m=${x.m}`} className={`${s.btn} ${s.small}`} style={linkBtn}>直す</Link>
                  <button type="button" className={`${s.btnGhost} ${s.small}`} onClick={() => setAsking(x.m)}>消す</button>
                </div>
                {asking === x.m && (
                  <div className={s.confirmBox} role="alertdialog" aria-label="消す確認">
                    <div style={{ fontWeight: 700 }}>「{m.title || '名前なし'}」を本当に消しますか？消すと元に戻せません。</div>
                    <div className={s.row} style={{ marginTop: 8 }}>
                      <button type="button" className={`${s.btnPrimary} ${s.btnDanger} ${s.small}`} onClick={() => { removeSaved(x.m); setAsking(null); setList(loadSaved()); }}>消す</button>
                      <button type="button" className={`${s.btn} ${s.small}`} onClick={() => setAsking(null)}>やめる</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
