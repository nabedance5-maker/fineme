import React, { useEffect, useState } from 'react';
import ResultCard from '../../components/ResultCard';
import Link from 'next/link';
import Header from '../../components/Header';

const DiagnosisResultPage: React.FC = () => {
  const [payload, setPayload] = useState<any>(null);
  const [hintAxes, setHintAxes] = useState<string[]>([]);

  useEffect(()=>{
    try{
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('fineme:lastDiagnosis') : null;
      if(raw){
        setPayload(JSON.parse(raw));
      }
      const hintRaw = typeof window !== 'undefined' ? sessionStorage.getItem('fineme:diagnosis:hintAxes') : null;
      if(hintRaw){
        const axes = JSON.parse(hintRaw);
        if(Array.isArray(axes)) setHintAxes(axes);
      }
    }catch(e){
      console.warn('failed to read diagnosis result', e);
    }
  }, []);

  if(!payload){
    return (
      <>
        <Header />
        <main className="diagnosis-page container">
          <h1>診断結果</h1>
          <p className="muted">診断結果が見つかりませんでした。診断を実行してからこちらに遷移してください。</p>
          <p><Link href="/diagnosis"><a className="btn">診断に戻る</a></Link></p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="diagnosis-page container">
        <h1>診断結果</h1>
        <div className="diag-steps" aria-label="診断ステップ">
          <div className="step">STEP 1 回答</div>
          <div className="step active">STEP 2 診断</div>
          <div className="step">STEP 3 提案</div>
        </div>
        <div style={{marginTop:16}}>
          <ResultCard result={payload.result} hintAxes={hintAxes} />
        </div>
        <p style={{marginTop:12}}><Link href="/diagnosis"><a className="btn">もう一度診断する</a></Link></p>
      </main>
    </>
  );
};

export default DiagnosisResultPage;
