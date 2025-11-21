import services from '../../data/services.json';

export default function SearchPage({ searchParams }) {
  const { keyword = '', region = '', category = '' } = searchParams || {};

  const filtered = services.filter(svc => {
    const matchKw = keyword ? (svc.name.includes(keyword) || svc.tags?.some(t => t.includes(keyword))) : true;
    const matchRegion = region ? svc.region === region : true;
    const matchCat = category ? svc.category === category : true;
    return matchKw && matchRegion && matchCat;
  });

  return (
    <div className="container stack" style={{ padding: '32px 0' }}>
      <h1 style={{ margin: 0 }}>検索結果</h1>
      <p className="card-meta">キーワード: {keyword || '指定なし'} / 地域: {region || '指定なし'} / カテゴリ: {category || '指定なし'}</p>

      <div className="grid" style={{ marginTop: 24 }}>
        {filtered.length === 0 && (
          <p className="card-meta">該当するサービスが見つかりませんでした。</p>
        )}
        {filtered.map((svc) => (
          <article className="card col-4" key={svc.id}>
            <img className="service-thumb" src={(svc.image && svc.image.trim()) ? svc.image : (categoryPhotoFor(svc.category) || placeholderFor(svc.category))} alt={svc.name} />
            <div className="card-body">
              <h3 className="card-title">{svc.name}</h3>
              <p className="card-meta">{svc.region === 'tokyo' ? '東京' : svc.region === 'osaka' ? '大阪' : '全国'} | {labelFromCategory(svc.category)} | ¥{svc.priceFrom.toLocaleString()}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
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
    nail: 'ネイル'
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
