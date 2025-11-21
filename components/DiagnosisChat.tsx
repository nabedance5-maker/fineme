import React, { useState } from 'react';
import { useRouter } from 'next/router';

const QUESTIONS = [
  { key: 'gender', q: '性別を教えてください（選択）', type: 'single', options: [
    { label: '男性', value: '男性' }, { label: '女性', value: '女性' }, { label: 'その他', value: 'その他' }
  ] },
  { key: 'age', q: '年齢（0〜100の中から選択）', type: 'single' },
  { key: 'height', q: '身長（cm）', type: 'single' },
  { key: 'personal_color', q: 'パーソナルカラーを教えてください', type: 'single', options: [
    { label: '春（スプリング）', value: '春' }, { label: '夏（サマー）', value: '夏' }, { label: '秋（オータム）', value: '秋' }, { label: '冬（ウィンター）', value: '冬' }, { label: 'わからない', value: 'わからない' }
  ] },
  { key: 'fashion', q: '髪型や服装はどちらかというと？（複数選択可）', type: 'multi', options: [
    { label: 'キレイめ', value: 'キレイめ' }, { label: 'カジュアル', value: 'カジュアル' }, { label: 'フェミニン', value: 'フェミニン' }, { label: 'ストリート', value: 'ストリート' }, { label: 'モード', value: 'モード' }, { label: '個性派', value: '個性派' }, { label: 'ナチュラル', value: 'ナチュラル' }, { label: '無頓着', value: '無頓着' }
  ] },
  { key: 'impression', q: '人にどんな印象を持たれやすい？（複数選択可）', type: 'multi', options: [
    { label: '優しそう', value: '優しそう' }, { label: 'クール', value: 'クール' }, { label: '大人っぽい', value: '大人っぽい' }, { label: '元気', value: '元気' }, { label: '知的', value: '知的' }, { label: '落ち着きがある', value: '落ち着きがある' }, { label: '華やか', value: '華やか' }, { label: 'シンプル', value: 'シンプル' }
  ] },
  { key: 'prep_time', q: '朝の支度時間は？', type: 'single', options: [
    { label: '5分以内', value: '5分以内' }, { label: '15分以内', value: '15分以内' }, { label: '30分以上', value: '30分以上' }
  ] },
  { key: 'want_impression', q: '初対面でどう見られたい？（複数選択可）', type: 'multi', options: [
    { label: '清潔感がある', value: '清潔感がある' }, { label: 'おしゃれ', value: 'おしゃれ' }, { label: '落ち着いている', value: '落ち着いている' }, { label: '強そう', value: '強そう' }, { label: '親しみやすい', value: '親しみやすい' }, { label: 'プロフェッショナル', value: 'プロフェッショナル' }, { label: 'トレンド感', value: 'トレンド感' }
  ] },
  { key: 'oneword', q: '自分の魅力を一言で言うと？（複数選択可）', type: 'multi', options: [
    { label: '自然', value: '自然' }, { label: '清潔感', value: '清潔感' }, { label: 'おしゃれ', value: 'おしゃれ' }, { label: '可愛い', value: '可愛い' }, { label: 'クール', value: 'クール' }, { label: '上品', value: '上品' }, { label: '個性的', value: '個性的' }, { label: '落ち着き', value: '落ち着き' }, { label: '若々しい', value: '若々しい' }, { label: '大人っぽい', value: '大人っぽい' }
  ] }
];

const DiagnosisChat: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [selected, setSelected] = useState<string | string[]>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string| null>(null);
  const router = useRouter();

  function submitAnswer(){
    const key = QUESTIONS[idx].key;
  const valueRaw = selected;
  // normalize to string for server: join arrays with comma
  const value = Array.isArray(valueRaw) ? valueRaw.join(',') : String(valueRaw || '').trim();
  if(!value){ setError('選択してください'); return; }
    // client-side validation for server compatibility
    if(key === 'age'){
      const n = Number(value);
      if(Number.isNaN(n) || n < 0 || n > 100){ setError('年齢が不正です'); return; }
    }
    if(key === 'height'){
      const n = Number(value);
      if(Number.isNaN(n) || n < 90 || n > 220){ setError('身長が不正です'); return; }
    }
  setAnswers(prev => ({ ...prev, [key]: value }));
  setSelected('');
    if(idx < QUESTIONS.length - 1) setIdx(idx + 1);
    else sendToServer({ ...answers, [key]: value });
  }

  async function sendToServer(finalAnswers: Record<string,string>){
    setLoading(true); setError(null);
    // final client-side validation before sending
    try{
      const allowedKeys = new Set(['gender','age','height','personal_color','fashion','impression','prep_time','want_impression','oneword','category']);
      const sanitized: Record<string,string> = {};
      for(const [k,v] of Object.entries(finalAnswers)){
        if(!allowedKeys.has(k)) continue;
        const s = String(v || '').trim();
        if(k === 'age'){
          const n = Number(s);
          if(Number.isNaN(n) || n < 0 || n > 100) throw new Error('年齢が不正です');
          sanitized[k] = String(Math.floor(n));
        }else if(k === 'height'){
          const n = Number(s);
          if(Number.isNaN(n) || n < 90 || n > 220) throw new Error('身長が不正です');
          sanitized[k] = String(Math.floor(n));
        }else{
          if(s.length > 300) throw new Error('回答が長すぎます');
          sanitized[k] = s;
        }
      }
      finalAnswers = sanitized;
    }catch(e:any){ setLoading(false); setError(e.message || '入力エラー'); return; }

    try{
      const res = await fetch('/api/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data?.error || '診断に失敗しました');
      // persist result to sessionStorage and navigate to result page
      try{ sessionStorage.setItem('fineme:lastDiagnosis', JSON.stringify({ answers: finalAnswers, result: data.result, at: Date.now() })); }catch{}
      router.push('/diagnosis/result');
    }catch(e:any){
      setError(e.message || String(e));
    }finally{ setLoading(false); }
  }

  // result is displayed on a separate page. keep rendering the chat while user goes through questions.

  const key = QUESTIONS[idx].key;
  const q = QUESTIONS[idx];
  return (
    <div className="diagnosis-chat">
      <div className="chat-window">
        <div className="chat-question">{QUESTIONS[idx].q}</div>
        <div className="chat-input-row">
          {q.type === 'single' ? (
            <select value={Array.isArray(selected)? String(selected[0]||'') : String(selected||'')} onChange={e=>{ setSelected(e.target.value); setError(null); }}>
              <option value="">選択してください</option>
              {q.key === 'age' ? (
                Array.from({length:101},(_,i)=>i).map(v=> <option key={v} value={String(v)}>{String(v)}</option>)
              ) : q.key === 'height' ? (
                Array.from({length:131},(_,i)=>90 + i).map(v=> <option key={v} value={String(v)}>{String(v)} cm</option>)
              ) : (
                q.options?.map((opt:any)=> <option key={opt.value} value={opt.value}>{opt.label}</option>)
              )}
            </select>
          ) : (
            // multi-select -> render checkbox list for better UX
            <div style={{display:'flex',flexDirection:'column',gap:6, maxHeight:200, overflow:'auto'}}>
              {(q.options || []).map((opt:any)=>{
                const isSelected = Array.isArray(selected) && selected.includes(opt.value);
                return (
                  <label key={opt.value} style={{display:'flex',alignItems:'center',gap:8}}>
                    <input type="checkbox" checked={isSelected} onChange={(e)=>{
                      setError(null);
                      if(e.target.checked){
                        const next = Array.isArray(selected) ? [...selected, opt.value] : [opt.value];
                        setSelected(next);
                      } else {
                        const next = Array.isArray(selected) ? selected.filter((s)=>s!==opt.value) : [];
                        setSelected(next);
                      }
                    }} />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}

          <button className="btn" onClick={submitAnswer} disabled={loading || (Array.isArray(selected) ? selected.length === 0 : !selected)}>{idx < QUESTIONS.length -1 ? '次へ' : '送信'}</button>
        </div>
        {loading && <div className="muted">診断中…少しお待ちください</div>}
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
};

export default DiagnosisChat;
