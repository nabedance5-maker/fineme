import services from '../../../data/services.json';

export default function ServiceDetail({ params }) {
  const svc = services.find(s => s.slug === params.slug);
  if (!svc) {
    return <div className="container" style={{ padding: '32px 0' }}><p>サービスが見つかりませんでした。</p></div>;
  }
  return (
    <div id="detail" className="container stack" style={{ padding: '32px 0' }}>
      <h1 style={{ margin: 0 }}>{svc.name}</h1>
  <img className="service-thumb" src={(svc.image && svc.image.trim()) ? svc.image : (categoryPhotoFor(svc.category) || placeholderFor(svc.category))} alt={svc.name} />
  <p className="card-meta">地域: {svc.region} / カテゴリ: {svc.category} / 価格: ¥{svc.priceFrom.toLocaleString()}</p>
  <a className="btn btn--primary btn--inverted" href={`/booking/${svc.slug}?origin=detail`}>予約へ進む</a>
    </div>
  );
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
    marriage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400&auto=format&fit=crop'
  };
  return map[category] || '';
}
