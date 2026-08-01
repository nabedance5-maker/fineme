'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TRACKS, getKnownTrackId, setTrackOnce, syncTrackWithServer } from '@/lib/track';

// 男女どちらのトラックか本当に分からない時だけ経由する中継ページ。
// /diagnosis 等の通常入口は「入口では選ばせない」方針（URL自体がトラックを表明する）だが、
// New Me Log のように診断・Mirrorのどちらも経由せずに使える入口からは、
// トラックの手がかりが本当に無いことがある。その残余ケースの受け皿。
//
// ?dest= は TRACKS[id] の文字列プロパティ名をそのまま使う。
const DEST_KEYS = ['diagnosis', 'mirror', 'home', 'lpMirror', 'diagnosisResult', 'articles'];

function destUrl(trackId, dest) {
  const key = DEST_KEYS.includes(dest) ? dest : 'home';
  return TRACKS[trackId][key];
}

function ChooseTrackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dest = searchParams.get('dest');
  // 既に分かっているかどうかで質問を出すか即転送するかが変わるため、
  // 判定が済むまで（マウント直後の一瞬）は何も描画しない
  const [knownChecked, setKnownChecked] = useState(false);

  useEffect(() => {
    const known = getKnownTrackId();
    if (known) {
      router.replace(destUrl(known, dest));
      return; // 転送するのでカードは出さない（knownCheckedはfalseのまま＝転送中表示を継続）
    }
    setKnownChecked(true);
  }, [router, dest]);

  function choose(trackId) {
    setTrackOnce(trackId);
    syncTrackWithServer().catch(() => {});
    router.replace(destUrl(trackId, dest));
  }

  if (!knownChecked) {
    return (
      <main style={{ maxWidth: '420px', margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.4)' }}>転送中...</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '440px', margin: '80px auto', padding: '0 20px' }}>
      <div style={{
        background: 'rgba(10,15,30,0.6)', border: '1px solid rgba(232,228,220,0.12)',
        borderRadius: '16px', padding: '32px 26px', textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-serif-ja)', fontSize: '18px', fontWeight: 700,
          color: 'rgba(232,228,220,0.94)', margin: '0 0 10px',
        }}>続ける前に</h1>
        <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.55)', lineHeight: 1.8, margin: '0 0 26px' }}>
          Fineme は男性向け、Fineme Belle は女性向けのページです。<br />
          ご案内する内容がどちらか教えてください。
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {['fineme', 'belle'].map((id) => {
            const t = TRACKS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => choose(id)}
                style={{
                  flex: '1 1 160px', textAlign: 'left', cursor: 'pointer',
                  padding: '16px 16px', borderRadius: '12px', fontFamily: 'inherit',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1.5px solid rgba(${t.accentRgb},0.3)`,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid rgba(${t.accentRgb},0.7)`,
                  }} />
                  <span style={{ fontSize: '14px', fontWeight: 800, color: 'rgba(232,228,220,0.92)' }}>{t.label}</span>
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: 'rgba(232,228,220,0.5)', paddingLeft: '22px' }}>{t.subLabel}</span>
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: '11px', color: 'rgba(232,228,220,0.3)', margin: '20px 0 0' }}>
          あとからマイページでいつでも変更できます。
        </p>
      </div>
    </main>
  );
}

// 内部の中継ページのため index させる必要は無いが、'use client' からは
// metadata を export できない（Next.jsのビルドエラーになる）ため、
// SEO対応が要るページ数ではないと判断し省略した。

export default function ChooseTrackPage() {
  return (
    <Suspense fallback={<main style={{ maxWidth: '420px', margin: '80px auto', padding: '0 20px', textAlign: 'center' }}><p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.4)' }}>読み込み中...</p></main>}>
      <ChooseTrackInner />
    </Suspense>
  );
}
