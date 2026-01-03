import React from 'react';

const AX_LABEL: Record<string,string> = { A:'納得', B:'寄り添い', C:'最短', D:'進め方' };

const ResultCard: React.FC<{ result: { type_name: string, type_description: string, recommendation: string }, hintAxes?: string[] }> = ({ result, hintAxes = [] }) => {
  if(!result) return null;
  const shareText = encodeURIComponent(`${result.type_name} - ${result.type_description}`);

  function onCtaClick(){
    try{
      window.dispatchEvent(new CustomEvent('fineme:analytics', { detail: { event: 'cta_result_search_click', type: result.type_name } }));
    }catch{}
  }

  const hintBadges = (hintAxes||[]).map(ax=> AX_LABEL[ax] || ax);

  function extractHighlights(text: string){
    try{
      const parts = text.split(/[、。・\n]/).map(s=> s.trim()).filter(s=> s.length > 0 && s.length <= 30);
      const unique: string[] = [];
      for(const p of parts){ if(!unique.includes(p)) unique.push(p); }
      return unique.slice(0, 3);
    }catch{ return []; }
  }

  const highlights = extractHighlights(result.type_description);

  const baseSuggestions: Array<{ label: string, emoji: string, href: string }>= [
    { label: 'ヘアカット/カラー', emoji: '💇‍♀️', href: `/pages/search.html?keyword=ヘア ${encodeURIComponent(result.type_name)}` },
    { label: 'メイク相談', emoji: '💄', href: `/pages/search.html?keyword=メイク ${encodeURIComponent(result.type_name)}` },
    { label: 'ファッション相談', emoji: '👗', href: `/pages/search.html?keyword=ファッション ${encodeURIComponent(result.type_name)}` },
    { label: '写真撮影', emoji: '📸', href: `/pages/search.html?keyword=写真 ${encodeURIComponent(result.type_name)}` },
    { label: 'ボディメイク', emoji: '🏋️', href: `/pages/search.html?keyword=ジム ${encodeURIComponent(result.type_name)}` },
    { label: '婚活サポート', emoji: '💍', href: `/pages/search.html?keyword=婚活 ${encodeURIComponent(result.type_name)}` },
  ];

  function guessTypeId(typeName: string){
    const s = (typeName || '').toLowerCase();
    if(/慎重|納得|reason/.test(s)) return 't01';
    if(/寄り添い|安心|support/.test(s)) return 't02';
    if(/最短|効率|quick|fast/.test(s)) return 't03';
    if(/変化|アップデート|change|update/.test(s)) return 't04';
    if(/直感|世界観|intuit|style/.test(s)) return 't05';
    if(/伴走|共同|together|co-?decision/.test(s)) return 't06';
    return 't01';
  }

  function scoreSuggestions(typeId: string, hints: string[]){
    const list = [...baseSuggestions];
    const score: Record<string, number> = Object.fromEntries(list.map(s=> [s.label, 0]));
    const byType: Record<string, string[]> = {
      t01: ['メイク相談','ヘアカット/カラー','ファッション相談','写真撮影','ボディメイク','婚活サポート'],
      t02: ['メイク相談','ファッション相談','ヘアカット/カラー','写真撮影','婚活サポート','ボディメイク'],
      t03: ['写真撮影','ボディメイク','ヘアカット/カラー','メイク相談','ファッション相談','婚活サポート'],
      t04: ['ファッション相談','ヘアカット/カラー','写真撮影','メイク相談','ボディメイク','婚活サポート'],
      t05: ['写真撮影','ファッション相談','メイク相談','ヘアカット/カラー','婚活サポート','ボディメイク'],
      t06: ['メイク相談','ファッション相談','写真撮影','ヘアカット/カラー','婚活サポート','ボディメイク'],
    };
    (byType[typeId]||list.map(s=> s.label)).forEach((lab, i)=>{ score[lab] += (list.length - i); });
    // hint axes adjust: A 納得→ヘア/メイク, B 寄り添い→メイク/ファッション, C 最短→写真/ボディ, D 進め方→ファッション/ヘア
    (hints||[]).forEach(h=>{
      if(h==='A'){ score['ヘアカット/カラー'] += 2; score['メイク相談'] += 2; }
      else if(h==='B'){ score['メイク相談'] += 3; score['ファッション相談'] += 2; }
      else if(h==='C'){ score['写真撮影'] += 3; score['ボディメイク'] += 2; }
      else if(h==='D'){ score['ファッション相談'] += 2; score['ヘアカット/カラー'] += 2; }
    });
    return list.sort((a,b)=> (score[b.label]||0) - (score[a.label]||0));
  }

  const typeId = guessTypeId(result.type_name);
  const suggestions = scoreSuggestions(typeId, hintAxes);

  const trackSlideClick = (label: string)=>{
    try{ window.dispatchEvent(new CustomEvent('fineme:analytics', { detail: { event: 'result_slide_click', label, type: result.type_name } })); }catch{}
  };

  const onArrow = (dir: 'prev'|'next')=>{
    try{
      const el = document.querySelector('.slider-track') as HTMLElement | null;
      if(!el) return;
      const delta = dir === 'next' ? Math.floor(el.clientWidth * 0.8) : -Math.floor(el.clientWidth * 0.8);
      el.scrollBy({ left: delta, behavior: 'smooth' });
    }catch{}
  };

  const [showInfo, setShowInfo] = React.useState(false);

  return (
    <div className="result-card">
      <div className="result-grid">
        <div className="result-visual">
          <img src="/assets/placeholders/placeholder-diagnosis.svg" alt="診断イメージ" className="result-image" />
        </div>
        <div className="result-content">
          <div className="result-header">
            <h2 className="result-title">{result.type_name}</h2>
            <div className="result-sub">診断結果</div>
          </div>

          {hintBadges.length>0 && (
            <div className="axis-badges" aria-label="事前選択の軸">
              {hintBadges.map(b=> <span key={b} className="badge badge-soft">{b}</span>)}
            </div>
          )}

          <div className="result-blocks">
            <div className="block">
              <div className="block-title">タイプ概要</div>
              <p className="result-desc">{result.type_description}</p>
            </div>
            <div className="block">
              <div className="block-title">ハイライト</div>
              <div className="highlights">
                {highlights.length ? highlights.map(h=> <span key={h} className="chip">{h}</span>) : <span className="muted">要点を抽出しています</span>}
              </div>
            </div>
            <div className="block">
              <div className="block-title">次の一歩</div>
              <div className="result-reco">おすすめ: {result.recommendation}</div>
            </div>
          </div>

          <div className="slider">
            <div className="slider-controls">
              <button className="btn btn-ghost" aria-label="前へ" onClick={()=> onArrow('prev')}>‹</button>
              <button className="btn btn-ghost" aria-label="次へ" onClick={()=> onArrow('next')}>›</button>
              <button className="info-btn" aria-label="並びの理由" onClick={()=> setShowInfo(v=> !v)}>並びの理由</button>
            </div>
            <div className="slider-track" aria-label="提案カード">
              {suggestions.map(s=> (
                <a key={s.label} className="slide-card" href={s.href} onClick={()=> trackSlideClick(s.label)}>
                  <div className="slide-emoji">{s.emoji || '✨'}</div>
                  <div className="slide-label">{s.label}</div>
                </a>
              ))}
            </div>
            <div className={`popover ${showInfo? 'show': ''}`}>
              <div className="popover-title">この並びになっている理由</div>
              <p>タイプ：{result.type_name}</p>
              <p>重視した軸：{hintBadges.length? hintBadges.join('、') : '回答に基づく総合評価'}</p>
              <p>上ほど今のあなたに取り組みやすい選択肢です。必要に応じて並びは調整されます。</p>
            </div>
          </div>

          <div className="result-actions">
            <a className="btn result-cta" href={`/pages/search.html?keyword=${encodeURIComponent(result.type_name)}`} onClick={onCtaClick}>あなたにおすすめのサービスを探す</a>
            <div className="share-buttons">
              <a target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${shareText}`} className="btn btn-ghost">Xでシェア</a>
              <a target="_blank" rel="noreferrer" href={`https://www.instagram.com/`} className="btn btn-ghost">Instagram</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
