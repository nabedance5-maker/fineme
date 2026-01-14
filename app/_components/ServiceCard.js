import Link from 'next/link';

export default function ServiceCard({ service }) {
  if (!service) return null;
  const { id, slug, name, image, region, category, priceFrom, providerName, storeName, access, providerId, storeId } = service;
  const regionLabel = region === 'tokyo' ? '東京' : region === 'osaka' ? '大阪' : '全国';
  const categoryLabel = labelFromCategory(category);
  const placeholder = placeholderFor(category);
  const catPhoto = categoryPhotoFor(category);
  const imgSrc = image && image.trim() ? image : (catPhoto || placeholder);
  const primaryStore = storeName && storeName.trim() ? storeName : (providerName || '');
  const serviceKey = id || slug || '';
  // compute a store page href that resolves correctly whether the current page
  // is served from `/pages/` (static pages folder) or from root.
  const storeBase = (typeof window !== 'undefined' && location && location.pathname && location.pathname.indexOf('/pages/') !== -1) ? './store.html' : './pages/store.html';
  const storeHref = `${storeBase}?providerId=${encodeURIComponent(providerId||'')}${storeId? `&storeId=${encodeURIComponent(storeId)}` : ''}&tab=menu&serviceId=${encodeURIComponent(serviceKey)}`;
  const scheduleBase = (typeof window !== 'undefined' && location && location.pathname && location.pathname.indexOf('/pages/') !== -1) ? './user/schedule.html' : './pages/user/schedule.html';
  const reserveHref = slug ? `/booking/${encodeURIComponent(slug)}?origin=detail` : (serviceKey ? `${scheduleBase}?serviceId=${encodeURIComponent(serviceKey)}&origin=detail` : '#');
  return (
    <article className="card col-4" style={{position:'relative'}}>
      <img className="service-thumb" src={imgSrc} alt={name} />
      <div style={{position:'absolute', top:12, right:12, background:'#fff', padding:'6px 8px', borderRadius:6, boxShadow:'0 6px 18px rgba(0,0,0,0.08)', fontWeight:700}}>{typeof priceFrom === 'number' ? `¥${priceFrom.toLocaleString()}` : '要問合せ'}</div>
      <div className="card-body">
        <h3 className="card-title">{name}</h3>
        <div className="cluster" style={{justifyContent:'space-between', alignItems:'center'}}>
          <p className="card-meta" style={{margin:0}}>{categoryLabel}</p>
          <div>
            <span className="badge">{typeof priceFrom === 'number' ? `¥${priceFrom.toLocaleString()}` : '要問合せ'}</span>
          </div>
        </div>
        {primaryStore ? <p className="card-meta" style={{marginTop:8}}><a href={storeHref}>{primaryStore}</a></p> : null}
        {access ? <p className="card-meta">アクセス：{access}</p> : null}
        <div className="cluster" style={{marginTop:12}}>
          <Link className="btn" href={storeHref}>詳細を見る</Link>
          <Link className="btn btn--primary" href={reserveHref}>予約へ進む</Link>
        </div>
      </div>
    </article>
  );
}

function labelFromCategory(key) {
  const map = {
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
    aga: 'AGA'
  };
  return map[key] || key;
}

function placeholderFor(category){
  const map = {
    consulting: '/assets/placeholders/placeholder-consulting.svg',
    gym: '/assets/placeholders/placeholder-gym.svg',
    makeup: '/assets/placeholders/placeholder-makeup.svg',
    hair: '/assets/placeholders/placeholder-hair.svg',
    diagnosis: '/assets/placeholders/placeholder-diagnosis.svg',
    fashion: '/assets/placeholders/placeholder-fashion.svg',
    photo: '/assets/placeholders/placeholder-photo.svg',
    marriage: '/assets/placeholders/placeholder-marriage.svg',
    eyebrow: '/assets/placeholders/placeholder-eyebrow.svg',
    hairremoval: '/assets/placeholders/placeholder-hairremoval.svg',
    esthetic: '/assets/placeholders/placeholder-esthetic.svg',
    whitening: '/assets/placeholders/placeholder-whitening.svg',
    orthodontics: '/assets/placeholders/placeholder-orthodontics.svg',
    nail: '/assets/placeholders/placeholder-nail.svg',
  };
  return map[category] || '/assets/placeholders/placeholder-default.svg';
}

function categoryPhotoFor(category){
  const map = {
    consulting: 'https://images.unsplash.com/photo-1529336953121-ad5a0d43d0d2?q=80&w=1400&auto=format&fit=crop',
    gym: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1400&auto=format&fit=crop',
    makeup: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1400&auto=format&fit=crop',
    hair: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1400&auto=format&fit=crop',
    diagnosis: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1400&auto=format&fit=crop',
    fashion: 'https://images.unsplash.com/photo-1520975657288-4e3b66f3c54a?q=80&w=1400&auto=format&fit=crop',
    photo: 'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?q=80&w=1400&auto=format&fit=crop',
    marriage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400&auto=format&fit=crop',
    eyebrow: 'https://images.unsplash.com/photo-1556228720-6d4d7f4b5a74?q=80&w=1400&auto=format&fit=crop',
    hairremoval: 'https://images.unsplash.com/photo-1542317854-6e68f2d3d2c8?q=80&w=1400&auto=format&fit=crop',
    esthetic: 'https://images.unsplash.com/photo-1502720705749-3c09d3b0d87f?q=80&w=1400&auto=format&fit=crop',
    whitening: 'https://images.unsplash.com/photo-1536305030011-7f7b7e4a3b8c?q=80&w=1400&auto=format&fit=crop',
    orthodontics: 'https://images.unsplash.com/photo-1588776814546-1f0b7f9c3a88?q=80&w=1400&auto=format&fit=crop',
    nail: 'https://images.unsplash.com/photo-1503342452485-86a5f6d8e2b6?q=80&w=1400&auto=format&fit=crop'
  };
  return map[category] || '';
}
