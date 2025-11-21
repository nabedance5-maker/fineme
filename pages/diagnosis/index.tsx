import React from 'react';
import DiagnosisChat from '../../components/DiagnosisChat';
import Header from '../../components/Header';
import '../../styles/diagnosis.css';

const DiagnosisPage: React.FC = () => {
  return (
    <>
      <Header />
      <main className="diagnosis-page">
        <div className="container">
          <h1 className="diagnosis-title">見た目診断AIチャット</h1>
          <p className="diagnosis-lead">チャットに答えて、あなたの見た目タイプを判定しましょう。診断は約5〜7問です。</p>
          <DiagnosisChat />
        </div>
      </main>
    </>
  );
};

export default DiagnosisPage;
