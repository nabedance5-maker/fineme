export const metadata = {
  title: 'Mirrorのスコアはどう決まる？ | Fineme',
  description: 'Fineme Mirrorのビジュアルスコアの算出方法を説明します。',
  robots: 'index,follow',
};

export default function MirrorScoringPage() {
  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: 780 }}>
        <h1 className="section-title">Mirrorの診断はどう決まる？</h1>
        <p className="muted">
          Fineme Mirrorの「VISUAL TYPE」と「変容ステージ」がどう算出されているか、考え方を説明します。
        </p>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>1. 何を見ているか</h2>
          <p>
            写真に写っている範囲だけを対象に、顔全体のバランス・パーツ配置・目元・眉・鼻・口元・フェイスライン・左右バランス・
            髪型・肌の清潔感・体型の見せ方・姿勢・服装・色合わせ・全体の統一感・写真映え、全16カテゴリでAIが観察します。
            写っていない部分（例：顔写真なら体型）は評価対象にしません。
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
            この重み付き平均を、888点満点のスケールに変換したものが総合スコアです。ここは決まった計算式で機械的に算出しており、
            表示されているカテゴリごとのスコアと矛盾しない数字になっています。
          </p>
        </section>

        <section className="card stack" style={{ padding: 20, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>3. VISUAL TYPEと変容ステージが主役</h2>
          <p>
            888点という数字そのものを前面に出す設計は、学校のテストのような優劣判定に見えてしまうため採用していません。
            レポートの主役は「VISUAL TYPE」（あなたの雰囲気を表すタイプ診断）と「変容ステージ」（種火・芽吹き・息吹・手応え・兆し・開花前夜・開花・満開の8段階）です。
          </p>
          <p>
            888点満点のスコアは、この8段階のどこに位置するかを機械的に決めるための裏付け数値として使っています（888を8等分した目安）。
            低い段階は「劣っている」のではなく「これから変わる伸びしろが一番大きい段階」という位置づけです。継続して利用すると、
            前回より段階が上がったタイミングでお知らせします。
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
          <h2 style={{ margin: 0, fontSize: 18 }}>4-2. なぜ言葉が厳しいのか（STOIC MIRROR）</h2>
          <p>
            Fineme Mirrorは、あえて優しいだけの言葉を選びません。伸びしろは遠慮なくはっきり指摘します。
            誰にでも平等に厳しい鏡だからこそ、「自分だけが悪く言われた」という受け取り方にならないようにしています。
          </p>
          <p>
            ただし、指摘して終わりにはしません。厳しく伝えたあとは必ず、変わった先の姿を具体的に見せ、
            隣で並んで進む言葉で背中を押し、最後は温かい言葉で締めくくります。外見磨きに終わりはなく、
            誰にでも常に次の段階がある——という前提のもとでの厳しさです。
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
