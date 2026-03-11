'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const CATEGORY_LABELS = {
  consulting: '外見トータルサポート',
  gym: 'パーソナルジム',
  makeup: 'メイクアップ',
  hair: 'ヘア',
  diagnosis: 'カラー/骨格診断',
  fashion: 'コーデ提案',
  photo: '写真撮影（アプリ等）',
  marriage: '結婚相談所',
  eyebrow: '眉毛',
  hairremoval: '脱毛',
  esthetic: 'エステ',
  whitening: 'ホワイトニング',
  orthodontics: '歯科矯正',
  nail: 'ネイル',
  aga: 'AGA',
};

const CATEGORIES = Object.entries(CATEGORY_LABELS);

const AREAS = [
  { value: '', label: '全国' },
  { value: '東京', label: '東京都' },
  { value: '大阪', label: '大阪府' },
  { value: '神奈川', label: '神奈川県' },
  { value: '愛知', label: '愛知県' },
  { value: '福岡', label: '福岡県' },
  { value: '埼玉', label: '埼玉県' },
  { value: '千葉', label: '千葉県' },
  { value: '京都', label: '京都府' },
  { value: '兵庫', label: '兵庫県' },
  { value: '北海道', label: '北海道' },
];

function categoryPhoto(cat) {
  const map = {
    consulting: 'https://images.unsplash.com/photo-1529336953121-ad5a0d43d0d2?q=80&w=800&auto=format&fit=crop',
    gym: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop',
    makeup: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop',
    hair: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop',
    diagnosis: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=800&auto=format&fit=crop',
    fashion: 'https://images.unsplash.com/photo-1520975657288-4e3b66f3c54a?q=80&w=800&auto=format&fit=crop',
    photo: 'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?q=80&w=800&auto=format&fit=crop',
    marriage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
    eyebrow: 'https://images.unsplash.com/photo-1556228720-6d4d7f4b5a74?q=80&w=800&auto=format&fit=crop',
    hairremoval: 'https://images.unsplash.com/photo-1542317854-6e68f2d3d2c8?q=80&w=800&auto=format&fit=crop',
    esthetic: 'https://images.unsplash.com/photo-1502720705749-3c09d3b0d87f?q=80&w=800&auto=format&fit=crop',
    whitening: 'https://images.unsplash.com/photo-1535397032389-3d34e54d8cc9?q=80&w=800&auto=format&fit=crop',
    orthodontics: 'https://images.unsplash.com/photo-1588776814546-1f0b7f9c3a88?q=80&w=800&auto=format&fit=crop',
    nail: 'https://images.unsplash.com/photo-1503342452485-86a5f6d8e2b6?q=80&w=800&auto=format&fit=crop',
    aga: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=800&auto=format&fit=crop',
  };
  return map[cat] || 'https://images.unsplash.com/photo-1529336953121-ad5a0d43d0d2?q=80&w=800&auto=format&fit=crop';
}

function ProviderCard({ provider }) {
  const catLabel = CATEGORY_LABELS[provider.main_category] || provider.main_category || '';
  const img = provider.photo_url || categoryPhoto(provider.main_category);

  return (
    <Link href={`/provider/${provider.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article style={{
        border: '1.5px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden',
        background: '#fff', transition: 'box-shadow .15s', cursor: 'pointer',
        height: '100%', display: 'flex', flexDirection: 'column'
      }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.10)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
      >
        <div style={{ height: '200px', overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
          <img src={img} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {catLabel && (
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', background: '#111', color: '#fff', borderRadius: '99px' }}>
                {catLabel}
              </span>
            )}
            {provider.area && (
              <span style={{ fontSize: '11px', padding: '3px 10px', background: '#f3f4f6', color: '#374151', borderRadius: '99px' }}>
                📍 {provider.area}
              </span>
            )}
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px', lineHeight: '1.3' }}>{provider.name}</h3>
          {provider.catchphrase && (
            <p style={{
              fontSize: '13px', color: '#6b7280', margin: '0 0 12px', lineHeight: '1.6',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1
            }}>
              {provider.catchphrase}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
            {provider.price_from
              ? <span style={{ fontSize: '15px', fontWeight: '800', color: '#111' }}>¥{provider.price_from.toLocaleString()}〜</span>
              : <span style={{ fontSize: '13px', color: '#9ca3af' }}>要問合せ</span>
            }
            <span style={{
              fontSize: '12px', fontWeight: '700', color: '#2563eb',
              padding: '6px 14px', border: '1.5px solid #2563eb', borderRadius: '99px'
            }}>
              詳細を見る →
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div style={{ border: '1.5px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ height: '200px', background: '#f3f4f6' }} />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ height: '16px', background: '#f3f4f6', borderRadius: '8px', width: '40%' }} />
        <div style={{ height: '20px', background: '#f3f4f6', borderRadius: '8px', width: '80%' }} />
        <div style={{ height: '14px', background: '#f3f4f6', borderRadius: '8px', width: '90%' }} />
        <div style={{ height: '14px', background: '#f3f4f6', borderRadius: '8px', width: '60%' }} />
      </div>
    </div>
  );
}

function SearchContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(() => sp.get('keyword') || sp.get('q') || '');
  const [category, setCategory] = useState(() => sp.get('category') || '');
  const [area, setArea] = useState(() => {
    const a = sp.get('area');
    if (a) return a;
    // 旧 pages/search.html の region（英語コード）→ 日本語エリアに変換
    const regionMap = { tokyo: '東京', osaka: '大阪', kanagawa: '神奈川', aichi: '愛知', fukuoka: '福岡', saitama: '埼玉', chiba: '千葉', kyoto: '京都', hyogo: '兵庫', hokkaido: '北海道' };
    const r = sp.get('region') || '';
    return regionMap[r] || '';
  });

  const fetchProviders = useCallback(async (cat, ar) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cat) params.set('category', cat);
      if (ar) params.set('area', ar);
      const res = await fetch(`/api/providers?${params}`);
      const data = res.ok ? await res.json() : [];
      setProviders(Array.isArray(data) ? data : []);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders(category, area);
  }, [category, area, fetchProviders]);

  const filtered = providers.filter(p => {
    if (!keyword.trim()) return true;
    const kw = keyword.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(kw) ||
      (p.catchphrase || '').toLowerCase().includes(kw) ||
      (p.description || '').toLowerCase().includes(kw)
    );
  });

  function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const kw = String(fd.get('keyword') || '');
    const cat = String(fd.get('category') || '');
    const ar = String(fd.get('area') || '');
    setKeyword(kw);
    setCategory(cat);
    setArea(ar);
    const params = new URLSearchParams();
    if (kw) params.set('keyword', kw);
    if (cat) params.set('category', cat);
    if (ar) params.set('area', ar);
    router.replace(`/search?${params}`, { scroll: false });
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px 80px' }}>
      <h1 style={{ fontSize: 'clamp(22px,4vw,28px)', fontWeight: '800', margin: '0 0 8px' }}>サービスを探す</h1>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 28px' }}>外見磨きのプロフェッショナルを検索・比較できます</p>

      {/* 検索フォーム */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '32px',
          padding: '20px', background: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb'
        }}
      >
        <input
          name="keyword"
          defaultValue={keyword}
          placeholder="キーワード（例：メンズメイク、骨格診断）"
          style={{ flex: '1 1 200px', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
        />
        <select
          name="category"
          defaultValue={category}
          style={{ padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', background: '#fff', cursor: 'pointer' }}
        >
          <option value="">すべてのカテゴリ</option>
          {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select
          name="area"
          defaultValue={area}
          style={{ padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', background: '#fff', cursor: 'pointer' }}
        >
          {AREAS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <button
          type="submit"
          style={{ padding: '10px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
        >
          検索
        </button>
      </form>

      {/* 件数 */}
      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
        {loading ? '読み込み中…' : `${filtered.length}件のサービスが見つかりました`}
      </p>

      {/* 結果 */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '20px' }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#6b7280' }}>
          <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🔍</p>
          <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#374151' }}>見つかりませんでした</p>
          <p style={{ fontSize: '14px', marginBottom: '20px' }}>条件を変えて再度お試しください。</p>
          <button
            onClick={() => { setKeyword(''); setCategory(''); setArea(''); router.replace('/search'); }}
            style={{ padding: '10px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
          >
            条件をリセット
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '20px' }}>
          {filtered.map(p => <ProviderCard key={p.id} provider={p} />)}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>読み込み中…</div>}>
      <SearchContent />
    </Suspense>
  );
}
