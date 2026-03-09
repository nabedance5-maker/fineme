'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const CATEGORY_LABELS = {
  gym:'パーソナルジム', eyebrow:'眉毛サロン', hair:'美容院・ヘア',
  skin:'肌・エステ', fashion:'ファッション', photo:'写真撮影',
  consulting:'外見トータルサポート', makeup:'メイク', nail:'ネイル',
  hairremoval:'脱毛', whitening:'ホワイトニング', orthodontics:'歯科矯正',
  aga:'AGA', marriage:'結婚相談所', diagnosis:'骨格診断',
};

const TRIGGER_LABELS = {
  matching_app:'マッチングアプリで結果を出したい', love:'好きな人ができた',
  career:'就職・転職前', word:'何かの一言が刺さった', vague:'ずっと気になっていた',
};
const FAILURE_LABELS = {
  lost_direction:'方向がわからなくなった経験がある方',
  no_continuation:'続かなかった経験がある方',
  cost:'コストで断念した経験がある方',
  awkward:'プロとの相性で悩んだ経験がある方',
  no_result:'変化が感じられなかった経験がある方',
  ongoing:'今も継続中でさらに深化させたい方',
};
const STYLE_LABELS = {
  explanation:'「なぜそうするのか」を丁寧に説明するスタイル',
  consultation:'一緒に相談しながら進めるスタイル',
  delegate:'任せてもらって結果を出すスタイル',
  cautious:'小さく始めて様子を見ながら進めるスタイル',
};
const LEVEL_TEXTS = ['全然','少し','そこそこ','かなり','すごく'];

export default function ProviderPage() {
  const params = useParams();
  const slug = params?.slug;
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState(null);
  const [matchScore, setMatchScore] = useState(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/providers/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setProvider(data); setLoading(false); })
      .catch(() => setLoading(false));

    try {
      const raw = localStorage.getItem('fineme:diagnosis:latest');
      if (raw) {
        const d = JSON.parse(raw);
        if (d.version === 'v4') setDiagnosis(d);
      }
    } catch {}
  }, [slug]);

  useEffect(() => {
    if (!provider || !diagnosis) return;
    setMatchScore(calcMatch(provider, diagnosis));
  }, [provider, diagnosis]);

  function calcMatch(p, d) {
    let score = 0;
    let total = 0;
    // トリガー一致
    if (d.trigger && p.suitable_triggers?.length) {
      total += 2;
      if (p.suitable_triggers.includes(d.trigger)) score += 2;
    }
    // 失敗パターン対応
    if (d.failure_pattern && p.handles_failure_patterns?.length) {
      total += 3;
      if (p.handles_failure_patterns.includes(d.failure_pattern)) score += 3;
    }
    // スタイル一致
    if (d.style && p.provider_style) {
      total += 2;
      if (p.provider_style === d.style) score += 2;
    }
    if (total === 0) return null;
    return Math.round((score / total) * 100);
  }

  if (loading) return (
    <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:'#9ca3af'}}>読み込み中…</p>
    </div>
  );

  if (!provider) return (
    <div style={{minHeight:'60vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px'}}>
      <p style={{color:'#374151',fontWeight:'700'}}>掲載者が見つかりませんでした。</p>
      <a href="/pages/search.html" style={{padding:'10px 20px',background:'#111',color:'#fff',borderRadius:'10px',textDecoration:'none'}}>サービスを探す</a>
    </div>
  );

  const catLabel = CATEGORY_LABELS[provider.main_category] || provider.main_category;
  const subCats = (provider.sub_categories || []).map(c => CATEGORY_LABELS[c] || c).filter(Boolean);

  return (
    <div style={{maxWidth:'780px',margin:'0 auto',padding:'32px 20px 80px'}}>

      {/* ① ヒーロー */}
      <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'24px',marginBottom:'24px'}}>
        {provider.photo_url && (
          <img src={provider.photo_url} alt={provider.name}
            style={{width:'100%',maxHeight:'360px',objectFit:'cover',borderRadius:'18px',border:'1px solid #e5e7eb'}} />
        )}
        <div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'12px'}}>
            <span style={{fontSize:'12px',fontWeight:'700',padding:'4px 12px',background:'#111',color:'#fff',borderRadius:'99px'}}>{catLabel}</span>
            {subCats.map(c => <span key={c} style={{fontSize:'12px',padding:'4px 12px',background:'#f3f4f6',color:'#374151',borderRadius:'99px'}}>{c}</span>)}
            {provider.area && <span style={{fontSize:'12px',padding:'4px 12px',background:'#f3f4f6',color:'#374151',borderRadius:'99px'}}>📍 {provider.area}</span>}
          </div>
          <h1 style={{fontSize:'clamp(22px,4vw,30px)',fontWeight:'800',margin:'0 0 10px',lineHeight:'1.3'}}>{provider.name}</h1>
          {provider.catchphrase && <p style={{fontSize:'17px',color:'#374151',margin:'0 0 20px',lineHeight:'1.6',fontWeight:'600'}}>{provider.catchphrase}</p>}
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            {provider.booking_url && (
              <a href={provider.booking_url} target="_blank" rel="noopener noreferrer"
                style={{padding:'14px 28px',background:'#111',color:'#fff',borderRadius:'12px',textDecoration:'none',fontWeight:'700',fontSize:'16px',display:'inline-block'}}>
                予約・相談する ↗
              </a>
            )}
            {provider.price_from && (
              <span style={{padding:'14px 20px',border:'1.5px solid #e5e7eb',borderRadius:'12px',fontSize:'15px',fontWeight:'700',color:'#374151'}}>
                ¥{provider.price_from.toLocaleString()}〜
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ② 診断との一致度（診断済みユーザーのみ） */}
      {diagnosis && (
        <div style={{padding:'20px',borderRadius:'16px',border:'1.5px solid #bfdbfe',background:'#eff6ff',marginBottom:'20px'}}>
          <div style={{fontSize:'11px',fontWeight:'700',color:'#2563eb',letterSpacing:'.05em',marginBottom:'6px'}}>🎯 あなたの診断との一致度</div>
          {matchScore !== null ? (
            <>
              <div style={{fontSize:'28px',fontWeight:'800',color:'#1d4ed8',marginBottom:'6px'}}>{matchScore}%</div>
              <div style={{height:'8px',background:'#dbeafe',borderRadius:'99px',overflow:'hidden',marginBottom:'8px'}}>
                <div style={{height:'100%',background:'#2563eb',borderRadius:'99px',width:`${matchScore}%`}}></div>
              </div>
              <p style={{fontSize:'13px',color:'#374151',margin:'0',lineHeight:'1.6'}}>
                {matchScore >= 80 ? 'あなたの変わり方・過去のパターンにとてもよく合っています。' :
                 matchScore >= 50 ? 'あなたの状況に合っている部分があります。' :
                 '一部の条件が合っています。詳細を確認してみてください。'}
              </p>
            </>
          ) : (
            <p style={{fontSize:'13px',color:'#374151',margin:'0'}}>
              このサービスを診断結果と照らし合わせています。
            </p>
          )}
        </div>
      )}
      {!diagnosis && (
        <div style={{padding:'20px',borderRadius:'16px',border:'1.5px solid #e5e7eb',background:'#f9fafb',marginBottom:'20px'}}>
          <p style={{fontSize:'14px',color:'#374151',margin:'0 0 12px',fontWeight:'700'}}>診断するとこのサービスとの相性がわかります</p>
          <a href="/pages/diagnosis.html" style={{padding:'10px 20px',background:'#111',color:'#fff',borderRadius:'10px',textDecoration:'none',fontSize:'14px',fontWeight:'700',display:'inline-block'}}>
            無料で診断する（5〜8分）
          </a>
        </div>
      )}

      {/* ③ こんな人に向いています */}
      {(provider.suitable_triggers?.length > 0 || provider.target_desc) && (
        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
          <h2 style={{fontSize:'17px',fontWeight:'800',margin:'0 0 14px'}}>こんな人に向いています</h2>
          {provider.target_desc && <p style={{fontSize:'14px',color:'#374151',lineHeight:'1.7',margin:'0 0 12px'}}>{provider.target_desc}</p>}
          {provider.suitable_triggers?.length > 0 && (
            <ul style={{margin:'0',paddingLeft:'20px',display:'flex',flexDirection:'column',gap:'6px'}}>
              {provider.suitable_triggers.map(t => (
                <li key={t} style={{fontSize:'14px',color:'#374151'}}>{TRIGGER_LABELS[t] || t}</li>
              ))}
            </ul>
          )}
          {provider.handles_failure_patterns?.length > 0 && (
            <div style={{marginTop:'12px',padding:'12px 14px',background:'#f0fdf4',borderRadius:'10px',border:'1px solid #bbf7d0'}}>
              <p style={{fontSize:'12px',fontWeight:'700',color:'#059669',margin:'0 0 6px'}}>こんな経験がある方に特に強みがあります</p>
              <ul style={{margin:'0',paddingLeft:'20px',display:'flex',flexDirection:'column',gap:'4px'}}>
                {provider.handles_failure_patterns.map(f => (
                  <li key={f} style={{fontSize:'13px',color:'#374151'}}>{FAILURE_LABELS[f] || f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ④ このサービスが大切にしていること */}
      {(provider.philosophy || provider.provider_style) && (
        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
          <h2 style={{fontSize:'17px',fontWeight:'800',margin:'0 0 14px'}}>このサービスが大切にしていること</h2>
          {provider.philosophy && <p style={{fontSize:'14px',color:'#374151',lineHeight:'1.8',margin:'0 0 12px'}}>{provider.philosophy}</p>}
          {provider.provider_style && (
            <div style={{padding:'12px 14px',background:'#f8faff',borderRadius:'10px',border:'1px solid #e0e7ff'}}>
              <p style={{fontSize:'12px',fontWeight:'700',color:'#6366f1',margin:'0 0 4px'}}>スタイル</p>
              <p style={{fontSize:'14px',color:'#374151',margin:'0'}}>{STYLE_LABELS[provider.provider_style] || provider.provider_style}</p>
            </div>
          )}
        </div>
      )}

      {/* ⑤ サービス・料金 */}
      {(provider.description || provider.price_from) && (
        <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
          <h2 style={{fontSize:'17px',fontWeight:'800',margin:'0 0 14px'}}>サービス・料金</h2>
          {provider.description && <p style={{fontSize:'14px',color:'#374151',lineHeight:'1.8',margin:'0 0 12px',whiteSpace:'pre-wrap'}}>{provider.description}</p>}
          {provider.price_from && (
            <div style={{padding:'12px 16px',background:'#f9fafb',borderRadius:'10px',border:'1px solid #e5e7eb'}}>
              <span style={{fontSize:'13px',color:'#6b7280'}}>料金</span>
              <span style={{fontSize:'20px',fontWeight:'800',color:'#111',marginLeft:'10px'}}>¥{provider.price_from.toLocaleString()}〜</span>
            </div>
          )}
        </div>
      )}

      {/* ⑥ 体験談（将来的に実装） */}
      <div style={{background:'#f9fafb',border:'1px dashed #d1d5db',borderRadius:'16px',padding:'24px',marginBottom:'16px',textAlign:'center'}}>
        <p style={{fontSize:'14px',color:'#9ca3af',margin:'0'}}>
          まだ体験談はありません。<br/>
          <span style={{fontSize:'13px'}}>このサービスを利用した方が最初の体験談を投稿できます。</span>
        </p>
      </div>

      {/* ⑦ CTA */}
      <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',textAlign:'center'}}>
        <p style={{fontSize:'15px',color:'#374151',margin:'0 0 16px',fontWeight:'600'}}>気になったら、まず相談してみましょう</p>
        <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
          {provider.booking_url ? (
            <a href={provider.booking_url} target="_blank" rel="noopener noreferrer"
              style={{padding:'14px 28px',background:'#111',color:'#fff',borderRadius:'12px',textDecoration:'none',fontWeight:'700',fontSize:'16px'}}>
              予約・相談する ↗
            </a>
          ) : (
            <p style={{fontSize:'13px',color:'#9ca3af',margin:'0'}}>予約ページは準備中です</p>
          )}
          <a href="/pages/search.html" style={{padding:'14px 20px',border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',borderRadius:'12px',textDecoration:'none',fontSize:'14px',fontWeight:'700'}}>
            他のサービスを見る
          </a>
        </div>
      </div>

    </div>
  );
}
