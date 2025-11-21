import React from 'react';

const ResultCard: React.FC<{ result: { type_name: string, type_description: string, recommendation: string } }> = ({ result }) => {
  if(!result) return null;
  const shareText = encodeURIComponent(`${result.type_name} - ${result.type_description}`);
  return (
    <div className="result-card">
      <div className="result-header">
        <h2 className="result-title">{result.type_name}</h2>
        <div className="result-sub">診断結果</div>
      </div>
      <p className="result-desc">{result.type_description}</p>
      <div className="result-reco">おすすめ: {result.recommendation}</div>
      <div className="result-actions">
        <a className="btn" href={`/pages/search.html?keyword=${encodeURIComponent(result.type_name)}`}>あなたにおすすめのサービスを探す</a>
        <div className="share-buttons">
          <a target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${shareText}`} className="btn btn-ghost">Xでシェア</a>
          <a target="_blank" rel="noreferrer" href={`https://www.instagram.com/`} className="btn btn-ghost">Instagram</a>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
