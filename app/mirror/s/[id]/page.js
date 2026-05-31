import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const POTENTIAL = {
  '高': { bg: 'rgba(201,168,76,0.12)', border: 'rgba(201,168,76,0.5)', text: '#c9a84c', label: '変容余地 高' },
  '中': { bg: 'rgba(100,160,255,0.10)', border: 'rgba(100,160,255,0.4)', text: '#7aadff', label: '変容余地 中' },
  '低': { bg: 'rgba(80,200,140,0.10)', border: 'rgba(80,200,140,0.4)', text: '#50c88c', label: 'すでに整っている' },
};

async function getSession(id) {
  try {
    const { data } = await getSupabase()
      .from('mirror_sessions')
      .select('analysis, created_at')
      .eq('id', id)
      .single();
    return data?.analysis ? data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const session = await getSession(params.id);
  const fi = session?.analysis?.first_impression;
  const desc = fi
    ? `${String(fi).slice(0, 90)}… あなたも写真1枚で「変われる余白」を無料で見てみる。`
    : '写真1枚で、AIが7軸の「変われる余白」を地図にする。あなたも無料で試せます。';
  return {
    title: 'Fineme Mirror — わたしの変容余地マップ',
    description: desc,
    robots: { index: false, follow: true },
    openGraph: {
      title: 'Fineme Mirror — わたしの変容余地マップ',
      description: desc,
      type: 'website',
    },
  };
}

export default async function MirrorSharePage({ params }) {
  const session = await getSession(params.id);

  if (!session?.analysis) {
    return (
      <main style={{ minHeight: '100vh', background: 'rgba(10,15,30,0.97)', color: 'rgba(232,228,220,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🪞</div>
          <p style={{ marginBottom: '24px' }}>この分析結果は見つかりませんでした。</p>
          <Link href="/mirror" style={{ display: 'inline-block', padding: '14px 32px', background: 'linear-gradient(135deg,#c9a84c,#e8c97a)', borderRadius: '12px', color: '#0a0f1e', fontWeight: 800, textDecoration: 'none' }}>
            あなたも無料で試す →
          </Link>
        </div>
      </main>
    );
  }

  const { first_impression, axes = [] } = session.analysis;
  const visibleAxes = axes.filter(a => a.id !== 'overall');

  return (
    <main style={{ minHeight: '100vh', background: 'rgba(10,15,30,0.97)', color: 'rgba(232,228,220,0.88)', paddingBottom: '80px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '56px 20px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.18em', color: 'rgba(201,168,76,0.7)', textTransform: 'uppercase', marginBottom: '14px' }}>
          🪞 Fineme Mirror
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(24px,5vw,36px)', fontWeight: 900, color: '#fff', lineHeight: 1.25, margin: '0 0 24px' }}>
          わたしの<span style={{ color: '#c9a84c' }}>変容余地マップ</span>
        </h1>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px' }}>
        {first_impression && (
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '24px', marginBottom: '28px', fontSize: '15px', lineHeight: 1.85, color: 'rgba(232,228,220,0.85)' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(201,168,76,0.6)', letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>First Impression</p>
            {first_impression}
          </div>
        )}

        {visibleAxes.map((axis, i) => {
          const pot = POTENTIAL[axis.potential_level] || POTENTIAL['中'];
          return (
            <div key={axis.id || i} style={{ background: 'rgba(10,15,30,0.6)', border: `1px solid ${pot.border}`, borderRadius: '14px', padding: '18px 20px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <span style={{ fontSize: '22px' }}>{axis.icon}</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#e8e4dc', flex: 1 }}>{axis.name}</span>
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', background: pot.bg, border: `1px solid ${pot.border}`, color: pot.text, whiteSpace: 'nowrap' }}>
                  {pot.label}
                </span>
              </div>
              {axis.summary && <p style={{ fontSize: '14px', color: 'rgba(232,228,220,0.7)', lineHeight: 1.75, margin: 0 }}>{axis.summary}</p>}
            </div>
          );
        })}

        {/* CTA */}
        <div style={{ marginTop: '36px', textAlign: 'center', padding: '32px 24px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '18px' }}>
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            あなたの「変われる余白」は？
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(232,228,220,0.55)', lineHeight: 1.8, margin: '0 0 20px' }}>
            写真1枚・20〜40秒。AIが7軸の変容余地を地図にします。<br />無料で概要が見れて、写真は分析後に削除されます。
          </p>
          <Link href="/mirror" style={{ display: 'inline-block', padding: '15px 40px', background: 'linear-gradient(135deg,#c9a84c,#e8c97a)', borderRadius: '12px', color: '#0a0f1e', fontWeight: 900, fontSize: '16px', textDecoration: 'none', boxShadow: '0 8px 32px rgba(201,168,76,0.35)' }}>
            無料で試す →
          </Link>
        </div>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(232,228,220,0.25)', marginTop: '24px', lineHeight: 1.7 }}>
          これは無料プレビュー部分のみの共有ページです。<br />詳細分析・最初の一手は本人の画面でのみ表示されます。
        </p>
      </div>
    </main>
  );
}
