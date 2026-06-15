import Image from 'next/image'
import { AnimatedSection, HeroTitle } from './_components/ArticleClient'

export const metadata = {
  title: '「変われない」と思っていた元ガリガリ男が、今日も誰かの体を変えている。| Fineme',
  description: 'JR高円寺駅徒歩7分のパーソナルジム「GYM NXT DOOR」トレーナー・後藤かいへのインタビュー。',
  robots: { index: false, follow: false },
}

export default function NxtdoorArticlePage() {
  return (
    <>
      <style>{`
        /* ─── Base ─── */
        .art {
          background: #0a0f1e;
          color: #e8e4dc;
          font-family: 'Noto Sans JP', ui-sans-serif, system-ui, sans-serif;
          line-height: 1.9;
          overflow-x: hidden;
        }

        /* ─── Hero ─── */
        .art-hero {
          position: relative;
          height: clamp(380px, 60vw, 620px);
          overflow: hidden;
        }
        .art-hero__img {
          object-fit: cover;
          width: 100%;
          height: 100%;
        }
        .art-hero__overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(10,15,30,0.25) 0%, rgba(10,15,30,0.85) 100%);
        }
        .art-hero__content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: clamp(32px, 5vw, 64px);
        }
        .art-hero__tag {
          display: inline-block;
          font-size: 11px;
          letter-spacing: 0.2em;
          color: #c9a84c;
          text-transform: uppercase;
          border: 1px solid rgba(201,168,76,0.4);
          border-radius: 4px;
          padding: 4px 12px;
          margin-bottom: 20px;
        }
        .art-hero__title {
          font-family: 'Playfair Display', 'Noto Serif JP', Georgia, serif;
          font-size: clamp(22px, 4.5vw, 44px);
          line-height: 1.3;
          color: #faf8f3;
          margin: 0 0 16px;
          max-width: 800px;
        }
        .art-hero__sub {
          font-size: clamp(13px, 1.8vw, 15px);
          color: rgba(232,228,220,0.65);
          margin: 0;
        }

        /* ─── Body layout ─── */
        .art-body {
          max-width: 760px;
          margin: 0 auto;
          padding: clamp(40px, 8vw, 80px) clamp(20px, 5vw, 40px);
        }

        /* ─── Lead ─── */
        .art-lead {
          font-size: clamp(15px, 2vw, 17px);
          color: rgba(232,228,220,0.85);
          border-left: 3px solid #c9a84c;
          padding-left: 20px;
          margin-bottom: 64px;
        }

        /* ─── Section ─── */
        .art-section {
          margin-bottom: 72px;
        }
        .art-section__num {
          font-size: 11px;
          letter-spacing: 0.2em;
          color: #c9a84c;
          display: block;
          margin-bottom: 12px;
        }
        .art-section__heading {
          font-family: 'Playfair Display', 'Noto Serif JP', Georgia, serif;
          font-size: clamp(20px, 3.5vw, 28px);
          color: #faf8f3;
          margin: 0 0 28px;
          line-height: 1.4;
        }
        .art-p {
          font-size: clamp(14px, 1.8vw, 16px);
          color: rgba(232,228,220,0.82);
          margin-bottom: 20px;
        }
        .art-p:last-child { margin-bottom: 0; }

        /* ─── Divider ─── */
        .art-divider {
          display: flex;
          align-items: center;
          gap: 20px;
          margin: 64px 0;
        }
        .art-divider__line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(201,168,76,0.4), transparent);
        }
        .art-divider__diamond {
          width: 8px;
          height: 8px;
          background: #c9a84c;
          transform: rotate(45deg);
          flex-shrink: 0;
        }

        /* ─── Pull quote ─── */
        .art-quote {
          position: relative;
          background: rgba(201,168,76,0.06);
          border-left: 3px solid #c9a84c;
          border-radius: 0 12px 12px 0;
          padding: 28px 32px;
          margin: 40px 0;
        }
        .art-quote::before {
          content: '"';
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 72px;
          color: rgba(201,168,76,0.2);
          position: absolute;
          top: -8px;
          left: 16px;
          line-height: 1;
        }
        .art-quote__text {
          font-family: 'Playfair Display', 'Noto Serif JP', Georgia, serif;
          font-size: clamp(16px, 2.5vw, 20px);
          color: #faf8f3;
          line-height: 1.7;
          margin: 0;
          padding-left: 8px;
        }

        /* ─── Images ─── */
        .art-img-full {
          width: 100%;
          border-radius: 12px;
          overflow: hidden;
          margin: 40px 0;
          position: relative;
          aspect-ratio: 16/10;
        }
        .art-img-full img {
          transition: transform 0.6s ease;
        }
        .art-img-full:hover img {
          transform: scale(1.03);
        }

        .art-img-right {
          float: right;
          width: clamp(200px, 40%, 320px);
          margin: 8px 0 24px 32px;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          aspect-ratio: 3/4;
        }
        .art-img-right img {
          transition: transform 0.6s ease;
        }
        .art-img-right:hover img {
          transform: scale(1.03);
        }

        .art-img-left {
          float: left;
          width: clamp(200px, 40%, 320px);
          margin: 8px 32px 24px 0;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          aspect-ratio: 3/4;
        }
        .art-img-left img {
          transition: transform 0.6s ease;
        }
        .art-img-left:hover img {
          transform: scale(1.03);
        }

        .art-img-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 40px 0;
        }
        .art-img-grid__item {
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          aspect-ratio: 4/5;
        }
        .art-img-grid__item img {
          transition: transform 0.6s ease;
        }
        .art-img-grid__item:hover img {
          transform: scale(1.04);
        }

        .art-img-caption {
          clear: both;
          font-size: 12px;
          color: rgba(232,228,220,0.4);
          text-align: center;
          margin-top: -28px;
          margin-bottom: 32px;
        }

        /* ─── Clearfix ─── */
        .art-clearfix::after {
          content: '';
          display: table;
          clear: both;
        }

        /* ─── Highlight band ─── */
        .art-highlight {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 12px;
          padding: 32px;
          margin: 40px 0;
        }
        .art-highlight__label {
          font-size: 11px;
          letter-spacing: 0.15em;
          color: #c9a84c;
          text-transform: uppercase;
          display: block;
          margin-bottom: 12px;
        }
        .art-highlight__text {
          font-size: clamp(14px, 1.8vw, 16px);
          color: rgba(232,228,220,0.85);
          margin: 0;
        }

        /* ─── Closing card ─── */
        .art-card {
          background: rgba(201,168,76,0.07);
          border: 1px solid rgba(201,168,76,0.3);
          border-radius: 16px;
          padding: clamp(28px, 5vw, 48px);
          margin-top: 80px;
          text-align: center;
        }
        .art-card__title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(20px, 3vw, 26px);
          color: #faf8f3;
          margin: 0 0 8px;
        }
        .art-card__sub {
          font-size: 13px;
          color: rgba(232,228,220,0.5);
          margin: 0 0 28px;
        }
        .art-card__items {
          list-style: none;
          padding: 0;
          margin: 0 0 28px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
        }
        .art-card__item {
          font-size: 14px;
          color: rgba(232,228,220,0.75);
        }
        .art-card__item span {
          color: #c9a84c;
          margin-right: 8px;
        }
        .art-card__link {
          display: inline-block;
          padding: 14px 36px;
          background: #c9a84c;
          color: #0a0f1e;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          letter-spacing: 0.05em;
          transition: opacity 0.2s;
        }
        .art-card__link:hover { opacity: 0.85; }

        @media (max-width: 600px) {
          .art-img-right, .art-img-left {
            float: none;
            width: 100%;
            margin: 0 0 24px;
            aspect-ratio: 4/3;
          }
          .art-img-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <article className="art">
        {/* Hero */}
        <div className="art-hero">
          <Image
            src="/articles/nxtdoor/IMG_6402.PNG"
            alt="GYM NXT DOOR トレーナー後藤かい"
            fill
            className="art-hero__img"
            priority
            sizes="100vw"
          />
          <div className="art-hero__overlay" />
          <div className="art-hero__content">
            <HeroTitle>
              <span className="art-hero__tag">Interview</span>
              <h1 className="art-hero__title">
                「変われない」と思っていた<br />
                元ガリガリ男が、今日も誰かの体を変えている。
              </h1>
              <p className="art-hero__sub">
                パーソナルトレーナー・後藤かい ／ GYM NXT DOOR（高円寺）
              </p>
            </HeroTitle>
          </div>
        </div>

        <div className="art-body">

          {/* Lead */}
          <AnimatedSection direction="up" delay={0}>
            <p className="art-lead">
              JR高円寺駅から歩いて7分。住宅街に溶け込むようにして、「GYM NXT DOOR（ジムネクストドア）」はある。看板は控えめで、通りすぎてしまいそうなほど静かなたたずまい。でも、ドアを開けると、確かな変化の積み重ねが待っている。
            </p>
          </AnimatedSection>

          {/* Section 1 */}
          <div className="art-section">
            <AnimatedSection direction="up">
              <span className="art-section__num">01</span>
              <h2 className="art-section__heading">身長178センチ、体重55キロ。<br />「自分には無理だ」という思い込み</h2>
            </AnimatedSection>

            <div className="art-clearfix">
              <AnimatedSection direction="right" className="art-img-right">
                <div className="art-img-right">
                  <Image
                    src="/articles/nxtdoor/IMG_6404.PNG"
                    alt="後藤かい トレーナー"
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width:600px) 100vw, 320px"
                  />
                </div>
              </AnimatedSection>

              <AnimatedSection direction="left" delay={100}>
                <p className="art-p">
                  「もともとめちゃくちゃ細い人間だったんですよ」
                </p>
                <p className="art-p">
                  後藤さんは、昔の自分をそう振り返る。身長178センチで体重55キロ。いわゆる"ガリガリ"な体型だった。
                </p>
                <p className="art-p">
                  「太い体が好きで、大きい体への憧れはずっとあったんです。でも、自分はどう頑張っても太れない体質だって、勝手に思い込んでいました」
                </p>
                <p className="art-p">
                  転機が訪れたのは、トレーニングを日課にしているある人と出会ったことだった。食事のコントロールや正しい筋トレの方法を教わるうちに、少しずつ体が変わっていくのを実感し始めた。
                </p>
                <p className="art-p">
                  「10年ぐらいかけて、だんだん変わっていったんです。そうしたらトレーニングそのものに興味が出てきて、自分で勉強して、資格も取るようになって」
                </p>
              </AnimatedSection>
            </div>

            <AnimatedSection direction="up" delay={100}>
              <div className="art-quote">
                <p className="art-quote__text">
                  「変われない」と思い込んでいた自分が、確かに変わった。その経験が、後藤さんの人生を大きく動かした。
                </p>
              </div>
            </AnimatedSection>
          </div>

          <div className="art-divider">
            <div className="art-divider__line" />
            <div className="art-divider__diamond" />
            <div className="art-divider__line" />
          </div>

          {/* Section 2 */}
          <div className="art-section">
            <AnimatedSection direction="up">
              <span className="art-section__num">02</span>
              <h2 className="art-section__heading">トレーナーを目指したのは、<br />「同じ悩みを持つ人に、同じ経験をしてほしい」から</h2>
            </AnimatedSection>

            <AnimatedSection direction="left" delay={100}>
              <p className="art-p">
                トレーナーを志したきっかけを尋ねると、後藤さんは迷わず答えた。
              </p>
              <p className="art-p">
                「自分みたいに痩せ型で悩んでいる人や、逆に体重を落としたいのに落とせないって悩んでいる人に、自分が経験したことを伝えたいと思ったんです」
              </p>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={150}>
              <div className="art-quote">
                <p className="art-quote__text">
                  「正しい知識を持って、正しく行動すれば、体はちゃんとついてくる」
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="left" delay={100}>
              <p className="art-p">
                その確信が、トレーナーとしての原点にある。実際、後藤さん自身がそれを体で証明してきた。だからこそ、お客様への言葉には説得力がある。
              </p>
            </AnimatedSection>

            <AnimatedSection direction="up">
              <div className="art-img-full">
                <Image
                  src="/articles/nxtdoor/IMG_6403.PNG"
                  alt="GYM NXT DOOR ジム内観"
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width:760px) 100vw, 760px"
                />
              </div>
            </AnimatedSection>
          </div>

          <div className="art-divider">
            <div className="art-divider__line" />
            <div className="art-divider__diamond" />
            <div className="art-divider__line" />
          </div>

          {/* Section 3 */}
          <div className="art-section">
            <AnimatedSection direction="up">
              <span className="art-section__num">03</span>
              <h2 className="art-section__heading">「一本やり」では戦えない。<br />それがこの仕事の難しさであり、面白さ</h2>
            </AnimatedSection>

            <AnimatedSection direction="left" delay={100}>
              <p className="art-p">
                トレーナーとして向き合う中での難しさを聞くと、後藤さんはこう話してくれた。
              </p>
              <p className="art-p">
                「お客様がトレーニングに求めているものって、本当に人それぞれなんです。知識を増やしたい人、楽しく運動を続けたい人、食事の管理をしたい人、姿勢を改善したい人、体の不調を治したい人……目的が多岐にわたる」
              </p>
              <p className="art-p">
                「トレーナーって、体型が伴ってないと説得力がないじゃないですか。だから自分の体型も維持しなきゃいけない。でも、自分のトレーニング経験だけでは全然戦えないな、って感じる瞬間も多くて。そこが難しいんですけど、逆に面白さでもあるんですよね」
              </p>
            </AnimatedSection>

            <AnimatedSection direction="up">
              <div className="art-img-grid">
                <div className="art-img-grid__item">
                  <Image
                    src="/articles/nxtdoor/IMG_6405.PNG"
                    alt="トレーニング指導の様子"
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width:600px) 100vw, 380px"
                  />
                </div>
                <div className="art-img-grid__item">
                  <Image
                    src="/articles/nxtdoor/IMG_6406.PNG"
                    alt="パーソナルトレーニング"
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width:600px) 100vw, 380px"
                  />
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="left" delay={100}>
              <p className="art-p">
                その難しさへの対処法は、引き出しを増やし続けることだ。
              </p>
              <p className="art-p">
                「姿勢改善なら正しい知識が必要だから勉強を続けるし、運動が苦手な初心者の方に対しては、知識を詰め込むことがすべてではない。むしろ楽しい要素を多く伝えることが大事だと思っています。目標がはっきりしている人には、体組成のデータをもとに『今この段階にいるから大丈夫ですよ』とモチベーションを維持してもらう。手数をたくさん増やして、その人に合ったアプローチをつくっていく感じです」
              </p>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={100}>
              <div className="art-highlight">
                <span className="art-highlight__label">Trainer's Method</span>
                <p className="art-highlight__text">
                  毎回のセッションでは体脂肪率・筋肉量を測定できる体組成計を活用。数値で変化を"見える化"することで、お客様自身が変化を実感しやすい環境をつくっている。
                </p>
              </div>
            </AnimatedSection>
          </div>

          <div className="art-divider">
            <div className="art-divider__line" />
            <div className="art-divider__diamond" />
            <div className="art-divider__line" />
          </div>

          {/* Section 4 */}
          <div className="art-section">
            <AnimatedSection direction="up">
              <span className="art-section__num">04</span>
              <h2 className="art-section__heading">フランチャイズの終焉が、<br />独立の始まりだった</h2>
            </AnimatedSection>

            <AnimatedSection direction="left" delay={100}>
              <p className="art-p">
                GYM NXT DOORは、現在の名前になってから約1年半。その前は、大手パーソナルジムのフランチャイズ店として運営されていた。
              </p>
              <p className="art-p">
                転機が訪れたのは、加盟元の本部がパーソナルトレーニング事業から撤退することになったときだ。
              </p>
              <p className="art-p">
                「通ってくれているお客様もいるし、今まで積み上げてきた経験もある。それを活かして、自分でこのまま店舗を続けようと思ったんです」
              </p>
              <p className="art-p">
                ただ、もともと独立願望があったわけではないという。
              </p>
              <p className="art-p">
                「不安もありましたし、最初から独立したいっていう気持ちは正直なかったです。その場面に立って、初めて選択肢として浮かび上がってきた感じで」
              </p>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={100}>
              <div className="art-quote">
                <p className="art-quote__text">
                  「立場が変わって初めて、自分がいかにそれをやりたかったかが分かりましたね」
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="left" delay={100}>
              <p className="art-p">
                「フランチャイズのときは、システムも料金プランも雰囲気づくりも、基本は本部の決めたことに従う形でした。独立したら、自分がやりたいことをスピード感を持って実現できる。もっと通いやすいジムにしたい、もっと楽しいジムにしたいって思ったことを素直に形にできる。それが一番嬉しいですね」
              </p>
            </AnimatedSection>
          </div>

          <div className="art-divider">
            <div className="art-divider__line" />
            <div className="art-divider__diamond" />
            <div className="art-divider__line" />
          </div>

          {/* Section 5 */}
          <div className="art-section">
            <AnimatedSection direction="up">
              <span className="art-section__num">05</span>
              <h2 className="art-section__heading">「NXT DOOR」──<br />Eが消えた理由</h2>
            </AnimatedSection>

            <div className="art-clearfix">
              <AnimatedSection direction="left" className="art-img-left">
                <div className="art-img-left">
                  <Image
                    src="/articles/nxtdoor/IMG_6407.PNG"
                    alt="GYM NXT DOOR 外観・看板"
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width:600px) 100vw, 320px"
                  />
                </div>
              </AnimatedSection>

              <AnimatedSection direction="right" delay={100}>
                <p className="art-p">
                  ジムの名前にある「NXT」という綴りが気になった。通常の「NEXT」ではなく、Eが一文字抜けている。
                </p>
                <p className="art-p">
                  「近所のジムっていうイメージを大切にしたくて、『NEXT DOOR（ネクストドア）』にしようと決めたんです。でもお母さんに名前を報告したら、画数がよくないって言われてしまって（笑）」
                </p>
                <p className="art-p">
                  名前は変えたくなかった。でも、母の言葉も気になった。そこで考えたのが、Eを抜く案だった。
                </p>
                <p className="art-p">
                  「Eを取って『NXT』にしたら、ちょうどいい画数になったんです。それで『NEXT』から『NXT』にしました」
                </p>
              </AnimatedSection>
            </div>
          </div>

          <div className="art-divider">
            <div className="art-divider__line" />
            <div className="art-divider__diamond" />
            <div className="art-divider__line" />
          </div>

          {/* Section 6 */}
          <div className="art-section">
            <AnimatedSection direction="up">
              <span className="art-section__num">06</span>
              <h2 className="art-section__heading">どんな人が通っているのか</h2>
            </AnimatedSection>

            <div className="art-clearfix">
              <AnimatedSection direction="right" className="art-img-right">
                <div className="art-img-right">
                  <Image
                    src="/articles/nxtdoor/IMG_6408.PNG"
                    alt="トレーニングの様子"
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width:600px) 100vw, 320px"
                  />
                </div>
              </AnimatedSection>

              <AnimatedSection direction="left" delay={100}>
                <p className="art-p">
                  GYM NXT DOORには、さまざまな目的を持ったお客様が集まっている。
                </p>
                <p className="art-p">
                  「結婚式が近いから体を絞りたいという方もいれば、長い時間をかけて運動習慣をつけたいという方もいる。将来もずっと元気に歩き続けられるようにって健康維持が目的の方、体重管理が必要な方……本当にいろいろです」
                </p>
                <p className="art-p">
                  男性のお客様に多い悩みとして、後藤さんが挙げるのは「痩せ型体質の悩み」だ。
                </p>
                <p className="art-p">
                  「筋肉がつきにくいとか、この細い体をどうにかしたいっていう方は、やっぱり男性に多いかなって印象があります。自分も昔そうだったので、気持ちがよくわかるんですよね」
                </p>
                <p className="art-p">
                  継続率も高く、半数以上のお客様が1年以上通い続けているという。週1回ペースで来ながら、2〜3年かけてじっくり体をつくっていく人も少なくない。
                </p>
              </AnimatedSection>
            </div>

            <AnimatedSection direction="up" delay={100}>
              <div className="art-highlight">
                <span className="art-highlight__label">Trainer's Voice</span>
                <p className="art-highlight__text">
                  「一人でトレーニングしていると、自分がやっていることが正しいのかどうか分からないまま続けなきゃいけない。『これをやっていれば変わる』って分かった上でやるのと、分からないままやるのとでは、同じトレーニングでも全然違う。そういった意味でもパーソナルトレーニングは意味があると思っています」
                </p>
              </div>
            </AnimatedSection>
          </div>

          <div className="art-divider">
            <div className="art-divider__line" />
            <div className="art-divider__diamond" />
            <div className="art-divider__line" />
          </div>

          {/* Section 7 */}
          <div className="art-section">
            <AnimatedSection direction="up">
              <span className="art-section__num">07</span>
              <h2 className="art-section__heading">自信のない男性へ、<br />後藤かいが伝えたいこと</h2>
            </AnimatedSection>

            <AnimatedSection direction="left" delay={100}>
              <p className="art-p">
                インタビューの最後に、見た目に自信が持てない男性へのメッセージを聞いた。
              </p>
              <p className="art-p">
                「難しいですね」と後藤さんはしばらく考えてから、こう続けた。
              </p>
              <p className="art-p">
                「自分も今、めちゃくちゃ自信があるかっていうとそうでもなくて。でも、トレーニングに出会う前の自分より、今の方が自信を持てているとは思う」
              </p>
            </AnimatedSection>

            <AnimatedSection direction="up">
              <div className="art-img-grid">
                <div className="art-img-grid__item">
                  <Image
                    src="/articles/nxtdoor/IMG_6409.PNG"
                    alt="後藤かい インタビュー"
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width:600px) 100vw, 380px"
                  />
                </div>
                <div className="art-img-grid__item" style={{ background: 'rgba(201,168,76,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                  <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(16px,2.5vw,22px)', color: '#faf8f3', lineHeight: 1.7, margin: 0, textAlign: 'center' }}>
                    「習慣が変わって、<br />環境が変わって、<br />人生が変わっていく。<br /><br />その先に、じわじわと<br />自信がついてくる」
                  </p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={100}>
              <div className="art-quote">
                <p className="art-quote__text">
                  「まずは変えやすい習慣から変えていくことが大事なんじゃないかと思います。何か一つでも習慣を変えてみる。その一歩が、全部の始まりだと思います」
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="up" delay={150}>
              <p className="art-p" style={{ textAlign: 'center', color: 'rgba(232,228,220,0.6)', fontStyle: 'italic' }}>
                細くて、変われないと思っていた男が、変わった。<br />
                そして今、変わりたいと思っている誰かの隣に立っている。<br />
                GYM NXT DOORは、そういうジムだ。
              </p>
            </AnimatedSection>
          </div>

          {/* Closing card */}
          <AnimatedSection direction="up">
            <div className="art-card">
              <h3 className="art-card__title">GYM NXT DOOR（ジムネクストドア）</h3>
              <p className="art-card__sub">パーソナルジム</p>
              <ul className="art-card__items">
                <li className="art-card__item">
                  <span>📍</span>東京都杉並区｜JR高円寺駅 徒歩7分
                </li>
                <li className="art-card__item">
                  <span>👤</span>トレーナー：後藤かい（GOTO KAI）
                </li>
              </ul>
              <a
                href="https://gym-nxtdoor.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="art-card__link"
              >
                公式サイトを見る
              </a>
            </div>
          </AnimatedSection>

        </div>
      </article>
    </>
  )
}
