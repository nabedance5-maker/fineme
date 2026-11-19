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
      <div style={{position:'absolute', top:12, right:12, background:'#fff', padding:'6px 8px', borderRadius:6, boxShadow:'0 6px 18px rgba(0,0,0,0.08)', fontWeight:700, color:'#1a1410', textShadow:'none'}}>{typeof priceFrom === 'number' ? `¥${priceFrom.toLocaleString()}` : '要問合せ'}</div>
      <div className="card-body">
        <h3 className="card-title">{name}</h3>
        <div className="cluster" style={{justifyContent:'space-between', alignItems:'center'}}>
          <p className="card-meta" style={{margin:0}}>{categoryLabel}</p>
          <div>
            <span className="badge">{typeof priceFrom === 'number' ? `¥${priceFrom.toLocaleString()}` : '要問合せ'}</span>
          </div>
        </div>
        {/* Optional provider tags (price tier, pace, expertise) if present */}
        <div className="cluster" style={{gap:6, flexWrap:'wrap', marginTop:8}}>
          {service._priceTier && (<span className="badge">{labelFromTier(service._priceTier)}</span>)}
          {typeof service._pace === 'number' && service._pace>=1 && service._pace<=3 && (
            <span className="badge">{labelFromPace(service._pace)}</span>
          )}
          {Array.isArray(service._expertise) && service._expertise.map((x,i)=>(
            <span key={i} className="chip">{labelFromExpertise(x)}</span>
          ))}
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
    fashion: 'コーディネート',
    photo: '写真撮影（アプリ等）',
    marriage: '結婚関連サービス',
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
    consulting: 'https://images.unsplash.com/photo-1765648496288-e1760f547711?q=80&w=1400&auto=format&fit=crop',
    gym: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1400&auto=format&fit=crop',
    makeup: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1400&auto=format&fit=crop',
    hair: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?q=80&w=1400&auto=format&fit=crop',
    diagnosis: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1400&auto=format&fit=crop',
    fashion: 'https://images.unsplash.com/photo-1669889848523-864c6b0e2020?q=80&w=1400&auto=format&fit=crop',
    photo: 'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?q=80&w=1400&auto=format&fit=crop',
    marriage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400&auto=format&fit=crop',
    eyebrow: 'https://images.unsplash.com/photo-1551187319-5bcfdebac5b9?q=80&w=1400&auto=format&fit=crop',
    hairremoval: 'https://images.unsplash.com/photo-1761718209794-e0588aafbcc4?q=80&w=1400&auto=format&fit=crop',
    esthetic: 'https://images.unsplash.com/photo-1552693673-1bf958298935?q=80&w=1400&auto=format&fit=crop',
    whitening: 'https://images.unsplash.com/photo-1569925444984-9e2e5fc3d1fb?q=80&w=1400&auto=format&fit=crop',
    orthodontics: 'https://images.unsplash.com/photo-1526080652727-5b77f74eacd2?q=80&w=1400&auto=format&fit=crop',
    nail: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=1400&auto=format&fit=crop'
  };
  return map[category] || '';
}

function labelFromTier(tier){
  const map = { low:'価格感：お手頃', mid:'価格感：バランス', high:'価格感：こだわり' };
  return map[String(tier)] || String(tier);
}
function labelFromPace(pace){
  const map = { 1:'提案ペース：ゆっくり', 2:'提案ペース：バランス', 3:'提案ペース：テンポ良く' };
  return map[Number(pace)] || '';
}
function labelFromExpertise(x){
  const map = {
    makeover:'メイク/ヘア等の印象改善',
    styling:'服・コーデの提案',
    photo:'写真/撮影サポート',
    training:'体づくり/姿勢トレーニング',
    color:'パーソナルカラー',
    skeleton:'骨格診断',
    skin:'肌/スキンケア',
    dental:'歯/ホワイトニング'
  };
  return map[String(x)] || String(x);
}
