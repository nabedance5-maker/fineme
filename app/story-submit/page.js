'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

const QUESTIONS = [
  { id: 1, num: 'Q1 / 4', label: '外見を変える前、どんなことで悩んでいましたか？', hint: '「なんとなく自分に自信がなかった」でも「具体的なコンプレックス」でも。正直に書いてください。', placeholder: '例）清潔感がないと思われてそうで、職場でも恋愛でも一歩引いてしまっていた。鏡を見るのが億劫だった。', maxLength: 500 },
  { id: 2, num: 'Q2 / 4', label: 'どんな変化がありましたか？具体的に教えてください。', hint: '外見の変化だけでなく、気持ちや日常の変化も歓迎です。数字や具体エピソードがあると伝わりやすいです。', placeholder: '例）パーソナルトレーナーに週2回通い始めて2ヶ月。体重は5kg落ちたけど、それより「ちゃんと鏡を見られるようになった」のが大きかった。', maxLength: 600 },
  { id: 3, num: 'Q3 / 4', label: '恋愛や人間関係に、どんな影響がありましたか？', hint: '「変わらなかった」「まだわからない」も正直に書いてOKです。内面の変化だけでも。', placeholder: '例）マッチングアプリの返信率が上がった。でもそれより、デートの前日に不安で眠れなくなることが減った気がする。', maxLength: 500 },
  { id: 4, num: 'Q4 / 4', label: 'どんな人に「変わってみてほしい」と思いますか？', hint: 'あなたの経験が届いてほしい人へのメッセージ、または当てはまるタグを選んでください（複数可）。', placeholder: '例）「外見で損してる」って思われてそうで、本当の自分を出せていない人。変えようとする勇気より、まず一歩だけ踏み出せれば変わるから。', maxLength: 400, minHeight: '120px' },
];

const TAG_OPTIONS = [
  '清潔感', 'ダイエット・筋トレ', 'ヘアスタイル', '眉毛・顔まわり', 'ファッション',
  'パーソナルカラー', 'スキンケア・美容', '自己肯定感', 'マッチングアプリ', 'モテたい',
  '仕事・職場', '30代の変容', '20代の変容',
];

const AXIS_OPTIONS = [
  { id: 'body',    icon: '💪', label: '体型' },
  { id: 'eyebrow', icon: '✂️', label: '眉毛' },
  { id: 'fashion', icon: '👔', label: '服・コーデ' },
  { id: 'hair',    icon: '💇', label: '髪・ヘア' },
  { id: 'skin',    icon: '✨', label: '肌' },
  { id: 'teeth',   icon: '🦷', label: '歯・口元' },
  { id: 'nail',    icon: '💅', label: '爪' },
];

const PATH_OPTIONS = [
  { id: 'virgin', label: '🌱 初挑戦' },
  { id: 'quit',   label: '🔄 リスタート' },
  { id: 'blind',  label: '🤔 客観化' },
  { id: 'lapsed', label: '😴 再開' },
];

const MAX_STEP = 5;

export default function StorySubmitPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState({ 1: '', 2: '', 3: '', 4: '' });
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [tagError, setTagError] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [axisId, setAxisId] = useState('');
  const [pathType, setPathType] = useState('');
  const [milestoneReached, setMilestoneReached] = useState('');

  // URLパラメータ（来店後メールリンク経由）
  const reservationId = useRef('');
  const providerId = useRef('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    reservationId.current = params.get('reservationId') || '';
    providerId.current = params.get('providerId') || '';

    // Me Scanデータから変容軸・来た道を自動補完
    try {
      const raw = localStorage.getItem('fineme:diagnosis:latest');
      if (raw) {
        const profile = JSON.parse(raw);
        if (profile.compass_first) {
          setAxisId(profile.compass_first);
          if (profile.path_types && profile.path_types[profile.compass_first]) {
            setPathType(profile.path_types[profile.compass_first]);
          }
        }
      }
    } catch {}

    const s = document.createElement('style');
    s.textContent = storyCSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  function getUserId() {
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (!sbKey) return null;
      return JSON.parse(localStorage.getItem(sbKey))?.user?.id || null;
    } catch { return null; }
  }

  function handleAnswerChange(id, value) {
    setAnswers(prev => ({ ...prev, [id]: value }));
  }

  function toggleTag(tag) {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) { next.delete(tag); }
      else if (next.size < 5) { next.add(tag); }
      return next;
    });
  }

  function nextStep(from) {
    if (from < 5) {
      const ans = answers[from] || '';
      if (ans.trim().length < 10) {
        // テキストエリアにフォーカス（DOMアクセス）
        const ta = document.getElementById(`ans-${from}`);
        if (ta) { ta.style.borderColor = '#ef4444'; setTimeout(() => { ta.style.borderColor = ''; }, 1500); ta.focus(); }
        return;
      }
    }
    if (from === 4 && selectedTags.size === 0) { setTagError(true); return; }
    setTagError(false);
    setCurrentStep(from + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function prevStep(from) {
    setCurrentStep(from - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitStory() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: [1, 2, 3, 4].map(n => answers[n] || ''),
          tags: [...selectedTags],
          reservationId: reservationId.current || null,
          providerId: providerId.current || null,
          userId: getUserId(),
          axisId: axisId || null,
          pathType: pathType || null,
          milestoneReached: milestoneReached || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '送信エラー');
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      alert('送信に失敗しました。しばらくしてから再度お試しください。');
    }
    setSubmitting(false);
  }

  function shareStory() {
    const text = '外見を変えたら、少しずつ自信が戻ってきた。Finemeで体験談を読んでみて。';
    const url = window.location.origin + '/search';
    if (navigator.share) {
      navigator.share({ text, url });
    } else {
      navigator.clipboard.writeText(`${text} ${url}`).then(() => alert('コピーしました'));
    }
  }

  const progressPct = (currentStep / MAX_STEP) * 100;

  if (done) {
    return (
      <main className="section">
        <section className="story-hero">
          <div className="container stack" style={{ gap: '8px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', letterSpacing: '.08em' }}>STORY</p>
            <h1 style={{ fontSize: '28px', fontWeight: 800 }}>あなたの変容ストーリーを投稿する</h1>
          </div>
        </section>
        <div className="container story-form">
          <div className="done-screen card" style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>投稿ありがとうございます</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              あなたのストーリーは運営が確認後、Finemeのストーリーページに掲載されます。<br />
              変わりたいと思っている誰かの「一歩目」になります。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/search" className="btn">サービスを探す</Link>
              <button className="btn btn-ghost" onClick={shareStory}>体験談をシェアする</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* ヒーロー */}
      <section className="story-hero">
        <div className="container stack" style={{ gap: '8px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', letterSpacing: '.08em' }}>STORY</p>
          <h1 style={{ fontSize: '28px', fontWeight: 800 }}>あなたの変容ストーリーを投稿する</h1>
          <p style={{ fontSize: '15px', color: '#6b7280', maxWidth: '520px', margin: '0 auto' }}>
            外見を変えた先にあったもの。正直な体験談が、変わりたいと思っている誰かの「一歩目」になります。
          </p>
        </div>
      </section>

      <div className="section">
        <div className="container story-form">
          {/* 進捗バー */}
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          {/* ステップインジケーター */}
          <div className="step-indicator">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 5 ? undefined : 0 }}>
                <div className={`step-dot ${i < currentStep ? 'done' : i === currentStep ? 'current' : 'upcoming'}`}>
                  {i < currentStep ? '✓' : i === 5 ? '確認' : i}
                </div>
                {i < 5 && <div className={`step-line${i < currentStep ? ' done' : ''}`} />}
              </div>
            ))}
          </div>

          {/* Q1〜Q4 */}
          {QUESTIONS.map(q => (
            <div key={q.id} className={`question-block card${currentStep === q.id ? ' active' : ''}`} style={{ padding: '28px' }}>
              <div className="question-num">{q.num}</div>
              <div className="question-label">{q.label}</div>
              <div className="question-hint">{q.hint}</div>
              <textarea
                id={`ans-${q.id}`}
                className="story-area"
                placeholder={q.placeholder}
                maxLength={q.maxLength}
                style={{ minHeight: q.minHeight || '160px' }}
                value={answers[q.id]}
                onChange={e => handleAnswerChange(q.id, e.target.value)}
              />
              <div className={`char-count${answers[q.id].length > q.maxLength * 0.9 ? ' warn' : ''}`}>
                {answers[q.id].length} / {q.maxLength}
              </div>

              {/* Q4のタグ選択 */}
              {q.id === 4 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>テーマタグを選択（1〜5個）</div>
                  <div className="tags-grid">
                    {TAG_OPTIONS.map(tag => (
                      <div
                        key={tag}
                        className={`tag-chip${selectedTags.has(tag) ? ' selected' : ''}`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                  {tagError && (
                    <div className="muted" style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                      タグを1つ以上選んでください
                    </div>
                  )}
                  {/* 変容トラック（任意・New Me Map連動） */}
                  <div style={{ marginTop: '20px', padding: '14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', margin: '0 0 10px' }}>🗺 変容トラック（任意）— New Me Map 連動</p>
                    <div style={{ marginBottom: '10px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', margin: '0 0 6px' }}>この変容は主にどの軸でしたか？</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {AXIS_OPTIONS.map(a => (
                          <div
                            key={a.id}
                            onClick={() => setAxisId(prev => prev === a.id ? '' : a.id)}
                            style={{ padding: '5px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid', borderColor: axisId === a.id ? '#0ea5e9' : '#e5e7eb', background: axisId === a.id ? '#e0f2fe' : '#fff', color: axisId === a.id ? '#0c4a6e' : '#374151' }}
                          >{a.icon} {a.label}</div>
                        ))}
                      </div>
                    </div>
                    {axisId && (
                      <div style={{ marginBottom: '10px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', margin: '0 0 6px' }}>この軸に対する「来た道」は？</p>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {PATH_OPTIONS.map(p => (
                            <div
                              key={p.id}
                              onClick={() => setPathType(prev => prev === p.id ? '' : p.id)}
                              style={{ padding: '5px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid', borderColor: pathType === p.id ? '#6366f1' : '#e5e7eb', background: pathType === p.id ? '#eef2ff' : '#fff', color: pathType === p.id ? '#3730a3' : '#374151' }}
                            >{p.label}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', margin: '0 0 4px' }}>変化のターニングポイントは？（任意）</p>
                      <input
                        type="text"
                        value={milestoneReached}
                        onChange={e => setMilestoneReached(e.target.value)}
                        maxLength={200}
                        placeholder="例）3ヶ月で-5kg、初めて鏡を見て笑顔になれた"
                        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="nav-row">
                {q.id > 1 ? (
                  <button className="btn btn-ghost" onClick={() => prevStep(q.id)}>← 戻る</button>
                ) : <span />}
                <button className="btn" onClick={() => nextStep(q.id)}>
                  {q.id === 4 ? '確認画面へ →' : '次へ →'}
                </button>
              </div>
            </div>
          ))}

          {/* 確認画面 */}
          <div className={`question-block card${currentStep === 5 ? ' active' : ''}`} style={{ padding: '28px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>投稿内容を確認してください</h2>
            <div className="confirm-list">
              {QUESTIONS.map((q, i) => (
                <div key={q.id} className="confirm-item">
                  <div className="confirm-q">Q{i + 1}: {q.label}</div>
                  <div className="confirm-a">{answers[q.id]}</div>
                </div>
              ))}
              <div className="confirm-item">
                <div className="confirm-q">テーマタグ</div>
                <div className="confirm-tags">
                  {[...selectedTags].map(t => <span key={t} className="confirm-tag">{t}</span>)}
                </div>
              </div>
              {(axisId || milestoneReached) && (
                <div className="confirm-item">
                  <div className="confirm-q">変容トラック</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {axisId && <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '12px', background: '#dbeafe', color: '#1e40af', fontWeight: 700 }}>{AXIS_OPTIONS.find(a => a.id === axisId)?.icon} {AXIS_OPTIONS.find(a => a.id === axisId)?.label}</span>}
                    {pathType && <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '12px', background: '#f0fdf4', color: '#166534', fontWeight: 600 }}>{PATH_OPTIONS.find(p => p.id === pathType)?.label}</span>}
                  </div>
                  {milestoneReached && <div style={{ fontSize: '13px', marginTop: '6px', color: '#6366f1' }}>🏆 {milestoneReached}</div>}
                </div>
              )}
            </div>
            <div style={{ marginTop: '20px', padding: '14px', background: '#f9fafb', borderRadius: '10px', fontSize: '13px', color: '#6b7280' }}>
              ※ 投稿内容は運営が確認後、Finemeのストーリーページに掲載されます。個人を特定できる情報は自動的に編集される場合があります。
            </div>
            <div className="nav-row">
              <button className="btn btn-ghost" onClick={() => prevStep(5)}>← 修正する</button>
              <button className="btn" onClick={submitStory} disabled={submitting}>
                {submitting ? '送信中...' : '投稿する'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const storyCSS = `
  .story-hero { padding: 64px 0 40px; background: linear-gradient(135deg, rgba(14,165,233,.12), rgba(99,102,241,.12)); text-align: center; }
  .story-form { max-width: 680px; margin: 0 auto; }
  .step-indicator { display: flex; align-items: center; gap: 0; margin-bottom: 32px; }
  .step-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; transition: background .3s, color .3s; }
  .step-dot.done { background: #111; color: #fff; }
  .step-dot.current { background: var(--color-primary, #111); color: #fff; box-shadow: 0 0 0 4px rgba(17,24,39,.15); }
  .step-dot.upcoming { background: #e5e7eb; color: #9ca3af; }
  .step-line { flex: 1; height: 2px; background: #e5e7eb; transition: background .3s; min-width: 16px; }
  .step-line.done { background: #111; }
  .question-block { display: none; }
  .question-block.active { display: block; }
  .question-num { font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 4px; }
  .question-label { font-size: 20px; font-weight: 700; margin-bottom: 6px; }
  .question-hint { font-size: 13px; color: #6b7280; margin-bottom: 20px; }
  textarea.story-area { width: 100%; min-height: 160px; resize: vertical; border: 2px solid var(--color-border, #e5e7eb); border-radius: 12px; padding: 16px; font-size: 15px; line-height: 1.7; transition: border-color .15s; box-sizing: border-box; }
  textarea.story-area:focus { outline: none; border-color: #111; }
  .char-count { text-align: right; font-size: 12px; color: #9ca3af; margin-top: 4px; }
  .char-count.warn { color: #ef4444; }
  .tags-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
  .tag-chip { padding: 6px 14px; border: 2px solid var(--color-border, #e5e7eb); border-radius: 99px; font-size: 13px; cursor: pointer; user-select: none; transition: all .15s; background: #fff; }
  .tag-chip.selected { background: #111; color: #fff; border-color: #111; }
  .nav-row { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
  .progress-bar { height: 4px; background: #e5e7eb; border-radius: 99px; margin-bottom: 32px; overflow: hidden; }
  .progress-fill { height: 100%; background: #111; border-radius: 99px; transition: width .4s ease; }
  .confirm-list { display: flex; flex-direction: column; gap: 16px; }
  .confirm-item { padding: 16px; border: 1px solid var(--color-border, #e5e7eb); border-radius: 12px; background: #f9fafb; }
  .confirm-q { font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
  .confirm-a { font-size: 15px; line-height: 1.7; white-space: pre-wrap; }
  .confirm-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .confirm-tag { padding: 3px 10px; border-radius: 99px; font-size: 12px; background: #111; color: #fff; }
  @media(max-width:680px) { .question-label { font-size: 17px; } }
`;
