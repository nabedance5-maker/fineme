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
          <h1 className="diagnosis-title">印象アップ診断AIチャット</h1>
          <p className="diagnosis-lead">チャットに答えて、目指す印象と進め方を一緒に見つけましょう。診断は約3分です。</p>
          <DiagnosisChat />
        </div>
      </main>
    </>
  );
};

export default DiagnosisPage;
