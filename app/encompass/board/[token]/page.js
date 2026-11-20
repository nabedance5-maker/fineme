'use client';

// ジムに置くタブレットの画面（ログインなし）。お店が「タブレットに出す」にしたメニューを大きく並べる。
// お客様の名前・記録は出さない。1分ごと・画面に戻った時に並びを読み直す（お店がメニューを足したり名前を変えたりしたら、すぐ出る）。
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import s from '../../encompass.module.css';
import { encodeMenu, totalMinutes } from '@/lib/encompass/menu';
import { BOARD_TOKEN } from '@/lib/encompass/client';

export default function Board() {
  const { token } = useParams();
  const [data, setData] = useState(undefined);

  useEffect(() => {
    if (!BOARD_TOKEN.test(String(token || ''))) { setData(null); return undefined; }
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/encompass/board/${token}`, { cache: 'no-store' });
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok) setData(j);
        else if (r.status === 404) setData(null);
      } catch {}
    };
    load();
    const id = setInterval(load, 60 * 1000);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [token]);

  if (data === undefined) return <main className={s.main}><p className={s.note}>読み込んでいます</p></main>;
  if (data === null) {
    return (
      <main className={s.main}>
        <h1 className={s.h1}>このリンクは使えません</h1>
        <p className={s.lead}>お店の方に、お店の画面から新しいタブレット用のリンクを作ってもらってください。</p>
      </main>
    );
  }

  return (
    <main className={s.main}>
      <p className={s.step}>{data.store.name}</p>
      <h1 className={s.h1}>今日のメニューを選んでください</h1>
      {!data.menus.length ? <p className={s.note}>まだメニューがありません。お店の画面で「タブレットに出す」を押すと、ここに並びます。</p> : (
        <div className={s.bigButtons}>
          {data.menus.map(m => (
            <Link key={m.id} href={`/encompass/play?board=${token}&m=${encodeMenu(m)}`} className={s.bigButton}>
              <strong>{m.title || 'メニュー'}</strong>
              <span>{m.items.length}種目・約{totalMinutes(m.items)}分</span>
            </Link>
          ))}
        </div>
      )}
      <p className={s.safety}>ENCOMPASS はトレーナーの指導のもとで使ってください。胸の痛み・めまい・息切れなどが出たら、すぐに止めてください。</p>
    </main>
  );
}
