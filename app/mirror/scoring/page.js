export const metadata = {
  title: 'Mirrorのスコアはどう決まる？ | Fineme',
  description: 'Fineme Mirrorのビジュアルスコアの算出方法を説明します。',
  robots: 'index,follow',
};

export default function MirrorScoringPage() {
  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 780 }}>
        <h1 className="section-title">Mirrorのスコアはどう決まる？</h1>
        <p className="muted">
          Fineme Mirrorの「VISUAL SCORE」がどう算出されているか、考え方を説明します。
        </p>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>1. 何を見ているか</h2>
          <p>
            写真に写っている範囲だけを対象に、顔全体のバランス・パーツ配置・髪型・肌・体型の見せ方・姿勢・服装・色合わせ・
            全体の統一感・写真映え、といったカテゴリごとにAIが観察します。写っていない部分（例：顔写真なら体型）は評価対象にしません。
          </p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>2. 総合スコアの出し方</h2>
          <p>
            各カテゴリの点数をそのまま平均するのではなく、「その写真の第一印象をどれだけ左右しているか」という重みを掛け合わせて計算します。
          </p>
          <ul className="stack" style={{ gap: 6 }}>
            <li>顔がアップの写真なら、顔のバランス・肌・髪型の重みが大きくなります</li>
            <li>全身写真なら、体型の見せ方・服装・姿勢の重みが大きくなります</li>
          </ul>
          <p>
            この重み付き平均を、888点満点のスケールに変換したものが「VISUAL SCORE」です。ここは決まった計算式で機械的に算出しており、
            表示されているカテゴリごとのスコアと矛盾しない数字になっています。
          </p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>3. なぜ888点満点なのか</h2>
          <p>
            100点満点にすると、学校のテストの点数のように無意識に比較してしまいがちです。Fineme独自の指標だと分かるように、
            末広がりの888点満点にしています。
          </p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>4. スコアの誠実さについて（最も大事にしていること）</h2>
          <p>
            「傷つけないために甘くする」「厳しく見せるために辛くする」といった作為的な調整は一切していません。本当に整っていれば高いスコアを、
            本当に伸びしろが大きければ低いスコアを、そのまま出します。
          </p>
          <p>
            数字を歪めて優しく見せることは、かえってサービスの信頼を損ないます。だからこそ数字は誠実に、寄り添う言葉は分析コメントの側で伝える、
            という役割分担にしています。
          </p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>5. 注意点</h2>
          <p>
            この分析はAIによる視覚的な観察に基づくものであり、医学的診断や絶対的な評価ではありません。撮影時の角度・光・距離によって見え方が変わることがあります。
          </p>
        </section>

        <p className="muted" style={{ textAlign: 'center' }}>
          <a href="/mirror" style={{ color: 'inherit', textDecoration: 'underline' }}>Mirrorで自分の写真を分析してみる →</a>
        </p>
      </div>
    </main>
  );
}
