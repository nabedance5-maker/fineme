'use client';
import { useEffect, useRef } from 'react';

export default function TypesPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .types-wrap { max-width: 720px; margin: 0 auto; padding: 32px 16px 80px; }
      .types-title { font-size: clamp(22px,6vw,32px); font-weight: 900; color: #fff; margin: 0 0 6px; }
      .types-subtitle { font-size: 13px; color: rgba(232,228,220,0.5); margin: 0 0 28px; }
      .code-legend { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 18px 20px; margin-bottom: 28px; }
      .code-legend-title { font-size: 11px; font-weight: 800; letter-spacing: .12em; color: rgba(232,228,220,0.4); margin: 0 0 14px; text-transform: uppercase; }
      .code-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
      .code-row:last-child { margin-bottom: 0; }
      .code-pos { width: 22px; height: 22px; border-radius: 6px; background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.4); color: #c9a84c; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
      .code-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .code-chip { padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; border: 1px solid; }
      .code-dim-label { font-size: 11px; color: rgba(232,228,220,0.5); }
      .axis-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 24px; scrollbar-width: none; -ms-overflow-style: none; }
      .axis-tabs::-webkit-scrollbar { display: none; }
      .axis-tab { padding: 8px 18px; border-radius: 99px; border: 1.5px solid; font-size: 13px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: all .15s; flex-shrink: 0; background: transparent; }
      .type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
      .type-card { background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 14px; overflow: hidden; cursor: pointer; transition: border-color .15s, transform .1s; }
      .type-card:hover { transform: translateY(-2px); }
      .type-card.my-type { box-shadow: 0 0 0 2px #c9a84c; border-color: #c9a84c; }
      .type-card-img { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; background: rgba(255,255,255,0.04); }
      .type-card-body { padding: 10px 10px 12px; }
      .type-card-code { font-size: 18px; font-weight: 900; letter-spacing: .08em; line-height: 1; margin-bottom: 5px; }
      .type-card-name { font-size: 11px; color: rgba(232,228,220,0.7); line-height: 1.4; margin-bottom: 6px; }
      .type-card-badge { font-size: 9px; font-weight: 800; background: rgba(201,168,76,0.2); color: #c9a84c; border: 1px solid rgba(201,168,76,0.4); border-radius: 99px; padding: 2px 7px; display: inline-block; }
      .type-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
      @media(min-width:600px){ .type-modal-overlay { align-items: center; padding: 24px; } }
      .type-modal { background: #0e1422; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px 20px 0 0; width: 100%; max-width: 480px; max-height: 85vh; overflow-y: auto; padding: 28px 24px 40px; }
      @media(min-width:600px){ .type-modal { border-radius: 20px; } }
      .type-modal-close { float: right; background: rgba(255,255,255,0.08); border: none; color: rgba(232,228,220,0.6); font-size: 18px; width: 32px; height: 32px; border-radius: 99px; cursor: pointer; line-height: 1; }
      .type-modal-code { font-size: 36px; font-weight: 900; letter-spacing: .1em; margin: 8px 0 4px; }
      .type-modal-name { font-size: 20px; font-weight: 900; color: #fff; margin: 0 0 16px; }
      .type-modal-img { width: 160px; height: 213px; object-fit: cover; border-radius: 14px; margin: 0 auto 20px; display: block; }
      .type-modal-desc { font-size: 14px; color: rgba(232,228,220,0.65); line-height: 1.9; }
      .type-modal-cta { display: block; margin: 24px auto 0; padding: 13px 28px; background: #c9a84c; color: #0a0f1e; font-size: 14px; font-weight: 800; border-radius: 8px; text-align: center; text-decoration: none; }
      .my-type-banner { background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.3); border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: rgba(201,168,76,0.9); line-height: 1.6; }
    `;
    document.head.appendChild(style);

    const AXES = [
      { code:'B', label:'体型', color:'#ef4444', word:'鋼の' },
      { code:'E', label:'眉',   color:'#8b5cf6', word:'眉弧の' },
      { code:'F', label:'服装', color:'#10b981', word:'纏いの' },
      { code:'H', label:'髪',   color:'#3b82f6', word:'黒髪の' },
      { code:'S', label:'肌',   color:'#f59e0b', word:'光肌の' },
      { code:'R', label:'脱毛', color:'#06b6d4', word:'素肌の' },
      { code:'T', label:'歯',   color:'#eab308', word:'白砂の' },
      { code:'W', label:'手元', color:'#14b8a6', word:'翡翠の' },
    ];

    const CARE_LABELS = {
      N:['無関心','気にしたことがない'],
      C:['気になる','意識はあるが動けていない'],
      A:['自己流','自分なりに取り組んでいる'],
      P:['プロ活用','専門家・サロンを活用している'],
    };
    const PATH_LABELS = {
      V:['未経験','まだ一度も試したことがない'],
      Q:['挫折','始めたが続かなかった'],
      K:['我流継続','自分流で続けているが客観視なし'],
      L:['放置→再開','以前やっていたが今は止まっている'],
      D:['実践中','今まさに取り組んでいる'],
    };

    const TYPE_CREATURE = {
      NV:'フェンリル', NK:'レヴィアタン', ND:'伏竜',
      CV:'蟠龍', CQ:'鵺', CK:'マンティコア', CL:'ヒュドラ', CD:'鳳凰',
      AV:'グリフィン', AQ:'玄武', AK:'ガルーダ', AL:'天馬', AD:'朱雀',
      PQ:'白虎', PK:'飛龍', PL:'スフィンクス', PD:'麒麟',
    };
    const TYPE_MODIFIER = {
      NV:'眠れる', NK:'知らぬ', ND:'臥す',
      CV:'潜む',   CQ:'折れた', CK:'暴れる', CL:'眠れる', CD:'蘇る',
      AV:'構えの', AQ:'迷い',   AK:'本能の', AL:'羽休めの', AD:'燃える',
      PQ:'引きの', PK:'無自覚の', PL:'休みの', PD:'聖なる',
    };
    const VALID_CP = ['NV','NK','ND','CV','CQ','CK','CL','CD','AV','AQ','AK','AL','AD','PQ','PK','PL','PD'];

    const AXIS_TYPE_CODE = { body:'B', eyebrow:'E', fashion:'F', hair:'H', skin:'S', hairremoval:'R', teeth:'T', nail:'W' };
    // self_regular が抜けていたバグを修正（自己流・定期継続の人の「あなたのタイプ」ハイライトが
    // 効いていなかった。/diagnosis/result 側は元々 self_regular:'A' を含んでいた）
    const CARE_CODE_MAP  = { none:'N', concerned:'C', self:'A', self_regular:'A', pro:'P' };
    const PATH_CODE_MAP  = { virgin:'V', quit:'Q', blind:'K', lapsed:'L', doing:'D' };
    // 表示用タイプコード（でお指摘 2026-08-07）。内部の typeCode（3文字アルファベット）は
    // 画像ファイル名・説明文のキー・onclick識別子として使い続けるため変更しない。
    // 見せる文字列だけ toDisplayCode() で変換する
    const CARE_DIGIT_MAP = { N:'0', C:'1', A:'2', P:'3' };
    const PATH_DIGIT_MAP = { V:'0', Q:'1', K:'2', L:'3', D:'4' };
    const TRACK_CODE_LETTER = 'M';
    function toDisplayCode(typeCode) {
      if (!typeCode || typeCode.length < 3) return typeCode;
      return typeCode[0] + (CARE_DIGIT_MAP[typeCode[1]] || '0') + (PATH_DIGIT_MAP[typeCode[2]] || '0') + TRACK_CODE_LETTER;
    }

    const TYPE_DESCRIPTION = {
      BNV:'体型をこれまで意識してこなかった。それはある意味、一番フラットな出発点だ。変えるべき習慣がまだ根付いていない分、正しい方向へ動けば誰より早く変わる可能性がある。まず自分の現在地を数値で知ることから始めよう。体重や体組成の計測が、最初の地図になる。体型は外見の中で最も「土台」になる軸だ。ここが変わると、服の見え方も印象も連動して変わっていく。',
      BNK:'体型について自分なりに動いてはいるが、客観的なフィードバックを受けたことがない。自己流の積み重ねには、気づきにくい盲点が潜んでいる。間違った方向の努力ほど、時間とエネルギーを無駄にするものはない。一度だけプロに体組成を計測してもらい、今の取り組みが正しい方向かを確認しよう。方向が合っていれば加速する。合っていなければ、今すぐ修正できる。',
      BND:'体型を特別気にするわけでもなく、淡々と体を動かしている。実はこれが最も長続きするパターンだ。「変わらなければ」という強迫観念がない分、習慣として定着しやすい。今の取り組みに一つだけ意識を足してみよう。食事のタンパク質を少し増やすか、有酸素と筋トレを組み合わせるか。小さな調整が、今の習慣を大きな変化に変える。',
      BCV:'体型が気になっているのに、なかなか動けない。その焦りと後ろめたさを、毎朝感じている人は多い。でも一気に変えようとするから動けないのだ。食事・運動・睡眠のうち、今週一つだけ変えると決める。歩数を1000歩増やすだけでもいい。最初の一点を変えると、不思議なことに残りも動き始める。',
      BCQ:'以前トレーニングや食事制限を始めたが、続かなかった経験がある。続かなかったのは意志が弱かったからではない。仕組みが自分に合っていなかっただけだ。次は「何をやるか」より「どう続けるか」を先に設計する。週に何回、どこで、何分やるかを具体的に決める。続けやすい環境を作ることが、結果への最短ルートだ。',
      BCK:'体型が気になって自分なりに取り組んでいる。その意欲は本物で、それ自体が大きな強みだ。ただ、自己流の努力は方向がズレていると、頑張るほど遠回りになる。一度プロに現状を見てもらい、今の取り組みに修正が必要かを確認しよう。努力を正しい場所に向けるだけで、結果が変わる。',
      BCL:'以前は体づくりに取り組んでいた。今は何かのきっかけで止まっている。でも一度動けた体は、また動ける記憶を持っている。ゼロから始めるのとは違う。まず今週、以前より少しだけ動いてみる。かつての自分を取り戻す必要はない。今の自分のペースで再起動するだけでいい。',
      BCD:'体型改善に向けて今まさに動いている。これは外見の変化の中でも、最も時間と努力を要する軸だ。だからこそ、今動いているあなたには大きなアドバンテージがある。焦らず、でも止まらず続けること。変化は線形ではなく、ある日突然「あれ、変わってる」と気づく形でやってくる。',
      BAV:'自分でトレーニングや食事管理をしている。その自立心は強みだ。でもパーソナルトレーナーやプロの栄養士に頼ったことがない。独学には限界があり、特に「自分に合ったやり方」を見つけるのが難しい。一度だけプロに相談してみよう。今の取り組みの何が正しくて、何が足りないかが明確になる。',
      BAQ:'自分でトレーニングしていたが、一度やめた。やめた理由が何かあるはずだ。それを一つだけ特定する。時間なのか、モチベーションなのか、結果が見えなかったのか。原因がわかれば対策が立つ。再開するのに以前と同じレベルまで戻す必要はない。まず週1回、10分だけ動くことから始めよう。',
      BAK:'自分流で体を鍛えている。継続できているのは本当の強みだ。でも独学には必ず盲点がある。フォームの問題は自分では気づきにくく、積み重なると故障につながる。一度プロに今やっていることを見せるだけで、効果が劇的に変わることがある。',
      BAL:'以前は自分でしっかり体を管理していた。今は生活の変化などで一時停止している。でも体の記憶は消えない。再開すれば、以前より速く取り戻せる。まず今の自分にできる最小の一歩を一つ決めよう。フルスペックで再開しなくていい。',
      BAD:'自分でトレーニングや食事管理をしながら、今まさに動いている。この状態は最も伸びやすい時期だ。変化を数値と写真で記録しよう。記録は続ける理由になり、停滞した時の指針にもなる。',
      BPQ:'パーソナルトレーナーやジムに通っていたが今は辞めた。その経験は確実に体と知識に残っている。辞めた理由が費用なのか時間なのか相性なのかで、次の一手が変わる。再開を考えるなら、以前より費用・時間を抑えた形も選択肢だ。',
      BPK:'トレーナーに頼りながら、その外でも自己流な部分がある。プロとの時間を最大限に活かしきれていない可能性がある。疑問はその場で全部聞く。プロへの投資は、対話の質で結果が変わる。',
      BPL:'プロのサポートで体づくりをしていたが、今は止まっている。その時に得た知識と体の変化は、確かに残っている。今の生活の中で再開できる形を探してみよう。大事なのは完全な再開より、何かしら続くことだ。',
      BPD:'プロのサポートを受けながら、今まさに体と向き合っている。これ以上ない状態だ。次のフェーズは、変わった体を外の世界で試すことだ。服を変え、写真を撮り、人と会う場に出ていこう。',
      ENV:'眉を整えたことがほとんどない。それはある意味、一番大きな変化の余白を持っているということだ。眉は顔の印象を最も短時間・低コストで変えられる部位で、整形なしで別人のように変わったという感覚を得やすい軸だ。1回のサロンで30分、数千円で別人のような変化を体感できる。',
      ENK:'眉について自分なりにケアしているが、客観的に評価されたことがない。眉は顔の中で最も他人の目に映る印象と本人の認識がズレやすい部位だ。一度だけプロに見てもらい、正しい形の基準を知ろう。その基準が手に入れば、その後のセルフケアが変わる。',
      END:'眉を気にせず、自分のペースで手入れしている。習慣化できているのは本当の強みだ。一度プロに基準の形を作ってもらうと、その後のセルフの精度が大きく上がる。眉はサロンで維持できる形を学ぶという視点で使うと、長期的に一番コスパが高い。',
      ECV:'眉が気になっている。でも眉サロンへのハードルを感じている。実は眉サロンは施術時間30分以下、費用も数千円からと、外見ケアの中で最も手軽に入れる施術の一つだ。一度だけ試してみよう。一回で正しい形の基準ができると、その後のセルフケアが劇的に変わる。',
      ECQ:'眉サロンか自己処理を一度したが、何かのきっかけで続かなくなった。眉は正しい形を一度作ってしまえば、あとは維持するだけという特徴がある。続かなかったというのは、合う形をまだ見つけていないサインかもしれない。',
      ECK:'眉が気になって自分で整えている。でもセルフ眉は、角度・太さ・左右差のズレが少しずつ積み重なりやすい。1回サロンで正しい形を作ってもらうと、明確な基準が生まれる。その基準に合わせてセルフケアをするだけで、精度が大きく上がる。',
      ECL:'以前は眉を整えていたが今は放置している。眉は顔の印象の中で最も整えるとすぐ変わる、放置するとすぐ崩れる部位だ。再開のハードルは低い。少しの手入れで、大きく印象が戻る。',
      ECD:'眉ケアに今まさに取り組んでいる。定期的なサロンと自己管理を組み合わせると、印象の安定感が増す。次のステップは、整った眉を写真や動画で記録することだ。変化を客観的に見ると、何が効いているかがわかる。',
      EAV:'自分で眉を整えているがサロンに行ったことがない。一度プロに形を作ってもらうと、その後が劇的に変わる。プロが作る眉と自分が作る眉の差を知ることで、正解の形が手に入る。1回の投資が、その後の全部を変える。',
      EAQ:'自分で眉を整えていたが一度やめた。眉は放置すると印象への影響が大きく出る部位だ。再開のハードルは低い。眉ペンシルを一本出してみるところから始めよう。まず一日だけやってみると、また動き始める。',
      EAK:'自分流で眉を整えている。毎日の手入れを続けているのは本物の強みだ。でも鏡では気づきにくい左右差や、骨格・顔型とのズレが生じやすい。1回サロンで正解の形を学ぶと、今の努力が正しい方向に向かう。',
      EAL:'以前はしっかり眉ケアをしていた。今は何かのきっかけで放置している。再開は難しくない。まず今日、眉を少しだけ整えるだけでいい。少しの手入れが、大きな印象の変化を生む。',
      EAD:'自分で眉を整えながら、今まさに力を入れている。次のステップは、プロの技術で完璧な土台を一度作ることだ。自己管理の上にプロの基準を乗せると、仕上がりの精度が一段上がる。',
      EPQ:'眉サロンに定期的に通っていたが今は辞めた。再開すれば、以前より短い時間でベストな状態に戻れる。辞めた理由が費用なら頻度を下げた形での再開も選択肢だ。',
      EPK:'眉サロンに通いながらも、仕上がりに完全に満足できていない感覚がある。次回は具体的な希望を写真とともに持参しよう。プロは希望を聞くために存在している。',
      EPL:'プロレベルの眉ケアの経験がある。今は何かの理由で止まっている。まず再開のタイミングを一つ決めよう。経験があるから、取り戻すのは早い。',
      EPD:'眉サロンに通いながら、今まさにケアを続けている。次に目を向けるべきは、整った眉を全体の印象設計の一部として活かすことだ。眉の形に合わせた髪型・肌・服装との調和を意識しよう。',
      FNV:'服装をほとんど気にしたことがない。でも実は、外見の変化の中で最も今日から変えられる軸だ。しかも体型より服の選び方の方が、印象に与える影響は大きい。まず一着だけ意識して選んでみよう。',
      FNK:'服装について自分なりには選んでいるが、客観的なフィードバックを受けたことがない。一度だけ信頼できる人やショップスタッフに率直に見てほしいと頼んでみよう。そのフィードバックが、今まで見えなかった自分の地図になる。',
      FND:'服を気にしすぎず、自分なりのスタイルで選んでいる。一度クローゼットを棚卸しして、本当に着ているものと着ていないものを分けてみよう。少ない枚数の服を着回せるようにした方が、印象の統一感と清潔感が上がる。',
      FCV:'服装が気になっている。まず今持っている服を全部出して並べることから始めよう。持っているものを知ることが、最初の地図になる。買い足す前に、捨てる。それだけでも印象は変わる。',
      FCQ:'服装を改善しようとして、一度は動いたが続かなかった。次は捨てることだけを先にする。クローゼットの中のノイズが減ると、残ったものが活きてくる。変化は引き算から始まる。',
      FCK:'服装が気になって自分なりに試行錯誤している。色・サイズ・素材の3つだけにルールを作ると、選びやすく着回しやすくなる。特にサイズ感は、高い服より安い服でも、ぴったり合う方が圧倒的に印象がよくなる。',
      FCL:'以前は服装に気を使っていた。今は惰性で着ている。まず一着だけ今の自分に合うものを意識して選んでみよう。その一着が、全体が動き出すきっかけになる。',
      FCD:'服装改善に今まさに取り組んでいる。この時期に大事なのは何を手放すかを先に決めることだ。整理してから足すと、全体の精度が一気に上がる。',
      FAV:'自分なりのコーデをしているがパーソナルスタイリストに頼ったことがない。一度だけパーソナルスタイリングを受けてみよう。自分に合う色・形・素材の型がわかる。その型さえ手に入れば、以降は自分で判断する精度が大きく上がる。',
      FAQ:'自分でコーデを工夫していたが一度やめた。まず一着だけ、今の自分の気分や生活に合うものを選んでみよう。以前のセンスは消えていない。少し意識を向けるだけで戻れる。',
      FAK:'自分流のスタイルがある。それは本物の資産だ。率直なフィードバックを一度もらうと、何を守って何を調整すべきかが見える。個性を消すのではなく、磨くために外の視点を使う。',
      FAL:'以前はしっかりファッションを楽しんでいた。クローゼットを一度整理するだけで、また楽しめる状態に戻れる。少ない服でもっとよく見える状態を作ると、選ぶ楽しさが戻ってくる。',
      FAD:'自分でスタイリングしながら今まさに力を入れている。アイテムを増やすより、定番の核になるものを固めると、毎日の選択が速くなり、全体の統一感が上がる。',
      FPQ:'パーソナルスタイリストに頼ったり、本格的に服装を整えていた時期があった。今はその時より意識が下がっている。辞めた理由を振り返り、今の生活に合った形で再び始めてみよう。',
      FPK:'プロのサポートを受けながらも、日常のコーデに自己流な部分が残っている。次回のセッションで、実際の生活シーンに合わせた着回しを相談してみよう。プロへの投資は、日常で使い切れてはじめて回収できる。',
      FPL:'パーソナルスタイリングを受けた経験がある。今のクローゼットをその型に基づいて見直すだけで、投資の回収ができる。季節ごとに一度整えるだけで、印象は大きく変わる。',
      FPD:'プロのサポートを受けながら、今まさにファッションを磨いている。次のフェーズで意識すべきは、整ったスタイルが実際の場でどう機能しているかを確かめることだ。',
      HNV:'髪型をほとんど気にしたことがない。でも髪は第一印象の最大30%を占めるとも言われる部位だ。一度だけ美容師に似合う形にしてくださいと任せてみよう。その一回で、自分に合う形の基準ができる。',
      HNK:'髪について自分なりに整えているが、プロの目から見てもらったことがない。次の美容院で今の髪型についてどう思いますかと一言聞いてみよう。プロの率直な意見が、これまで気づかなかった地図になる。',
      HND:'髪を気にしすぎず、自分のペースで整えている。次はどの美容師に切ってもらうかを一度こだわってみよう。自分の骨格や好みを理解してくれる美容師を見つけると、毎回の仕上がりが変わる。',
      HCV:'髪が気になっている。まず一つだけ美容院を探して予約を入れてみよう。行けば必ず何かが変わる。その変化が、次の一手の地図になる。',
      HCQ:'以前カットやスタイリングを変えようとしたが、続かなかった経験がある。次の予約をその場で入れる習慣を作ることが大事だ。2〜3ヶ月に一度のペースを先にスケジューリングする。',
      HCK:'髪が気になって、スタイリング剤を試したり自分なりに工夫している。でも根本のカットの形が合っていないと、どんなにスタイリングしても補いきれない。もっとスタイリングしやすい形にと伝えるだけで、毎日の5分が楽になる。',
      HCL:'以前は髪型にこだわっていた。今は流れで近くの美容院に行っている。新しい美容師にイメージ写真を見せるだけで、同じ長さでも別人のように変わることがある。',
      HCD:'髪型改善に今まさに取り組んでいる。次のステップは形だけでなく質感を整えることだ。ホームケアのシャンプーやトリートメントを見直すと、美容院から帰った後の状態が長く続く。',
      HAV:'自分でスタイリングはしているが、美容師にあなたに似合う形をゼロから作ってもらったことがない。骨格や顔型に合った土台の形が手に入ると、自己スタイリングの精度が一段上がる。',
      HAQ:'自分で髪をケアしていたが一度やめた。まず次の美容院の予約だけ入れてみよう。一度行けば、また意識が戻ってくる。',
      HAK:'自分流のスタイリングを続けている。でも自分の好みのスタイルと、他人から見て印象がいいスタイルは違うことがある。自分では気づかなかった骨格との相性がわかる。',
      HAL:'以前はしっかり髪をケアしていた。今は少し放置している。まず次の美容院の予約を一つ入れるだけでいい。以前の経験があるから、一回行けばすぐに取り戻せる。',
      HAD:'自分でケアしながら、今まさに髪に力を入れている。次のステップは担当美容師を固定することだ。同じ美容師に継続して切ってもらうと、自分の髪の性質や好みを理解してくれる。',
      HPQ:'定期的にプロの美容師に通っていたが今は辞めた。辞めた理由によって次の選択が変わる。一回だけ再開してみると、以前の状態に戻るのは早い。',
      HPK:'美容師に通いながらも、希望通りの仕上がりになりきれていない感覚がある。次回はこうなりたいというイメージを写真で持参しよう。投資を結果に変えるのは、コミュニケーションの質だ。',
      HPL:'プロレベルの髪ケアを受けていた経験がある。今は止まっている。まず再開のタイミングを一つ決めよう。一回だけ行けば、状態はすぐに戻る。',
      HPD:'プロの美容師とともに、今まさに髪を磨いている。次のフェーズで意識すべきは持ちだ。ホームケアのシャンプー・トリートメント・スタイリング剤を整えよう。',
      SNV:'肌ケアをほとんどしたことがない。でも肌は近距離での印象を最も左右する軸だ。洗顔と保湿の2ステップだけ始めよう。この2つだけで、1〜2週間で肌の質感が変わり始める。',
      SNK:'肌について自分なりにはケアしているが、客観的に評価されたことがない。一度だけ皮膚科か化粧品カウンターで肌診断を受けてみよう。今の肌タイプと、合っているケアが明確になる。',
      SND:'肌を特別意識せず、自分なりにケアを続けている。継続できているのは最大の強みだ。今使っているアイテムの成分を一つ確認するだけで、同じ習慣がより高い結果を生む。',
      SCV:'肌が気になっている。まず洗顔を見直すことから始めよう。肌トラブルの多くは洗いすぎか洗えていないのどちらかが原因だ。商品を買い足す前に、今の洗顔を正すのが最速だ。',
      SCQ:'肌ケアを一度始めたが続かなかった。次は商品を2つだけに絞る。洗顔料と保湿クリームの2つ。それだけで十分だ。続けやすい仕組みにすることが、全ての前提になる。',
      SCK:'肌が気になって色々と試している。自己流で商品を重ねると、かえって肌荒れや迷走を引き起こしやすい。一度今のルーティンを整理して、本当に必要なものだけを残そう。',
      SCL:'以前は肌ケアをしていた。今は何かのきっかけで惰性になっている。まず今日、洗顔と保湿だけ丁寧にやってみよう。その小さな再開が、ルーティンを取り戻すきっかけになる。',
      SCD:'肌改善に今まさに取り組んでいる。3〜6ヶ月続けて初めて、本当の変化が見えてくる。途中で商品を変えたくなる衝動に負けないことが、この時期の最大の戦略だ。',
      SAV:'自分でスキンケアはしているがエステや皮膚科に頼ったことがない。一度だけプロに見てもらうと、今のケアの何が正解かが明確になる。プロの知見をセルフに取り込む使い方が最も効果的だ。',
      SAQ:'自分でスキンケアしていたが一度やめた。まず洗顔だけ再開しよう。それだけでいい。一番簡単なことから再起動すると、習慣は自然と戻ってくる。',
      SAK:'自分流のスキンケアルーティンがある。次の一歩は、今使っているアイテムの成分を確認することだ。成分を知ることが、独学の限界を突破する鍵だ。',
      SAL:'以前はスキンケアをしっかりやっていた。一番簡単なステップから戻ろう。一つの習慣が戻れば、他も引き連れて戻ってくる。',
      SAD:'自分でスキンケアしながら今まさに力を入れている。効果が出ているものを深め、不要なものを手放すことが近道だ。',
      SPQ:'エステや皮膚科に通っていたが辞めた。プロから学んだ知識は残っているはずだ。再開を考えるなら、月一回の頻度でも継続できる施術を選ぶと負担が少ない。',
      SPK:'プロのケアを受けながらも、期待していた変化を感じられていない部分がある。何が改善されていて、何が変わっていないかを言語化して、次回のセッションで共有しよう。',
      SPL:'プロレベルの肌ケアを受けていた経験がある。今のホームケアを丁寧に続けることが、その成果を維持する最善策だ。',
      SPD:'プロのサポートを受けながら肌を磨いている。次のフェーズで意識すべきは生活習慣との連動だ。睡眠・食事・ストレス管理が肌の状態に直結する。',
      TNV:'歯のケアをほとんど気にしたことがない。でも笑顔と口元は第一印象の核心だ。まず歯科検診に行くだけでいい。今の口元の現状を客観的に知ることから始まる。',
      TNK:'歯について自分では気になっていないが、客観的なフィードバックを受けたことがない。一度だけ歯科医に見てもらおう。問題がないという安心が自信につながる。',
      TND:'歯を気にしすぎず、自分なりにケアしている。次のステップとして、フロスかホワイトニングを一つ加えてみよう。小さな一手が、印象を静かに底上げする。',
      TCV:'歯や笑顔が気になっている。まず近くの歯科でクリーニングだけ予約してみよう。治療ではなく予防とケアから始めると、ハードルが下がる。',
      TCQ:'歯のケアや矯正を一度考えたが、踏み出せなかったか、始めかけて止まった。まず小さく、歯科クリーニングだけ予約しよう。最初の一歩が最も難しく、最も大事だ。',
      TCK:'歯が気になって自分なりにケアしている。プロのクリーニングを一度受けると、自己ケアで届く場所と届かない場所の違いがわかる。',
      TCL:'以前は歯のケアをしていた。今は惰性になっている。週一回のフロスから再開しよう。小さな再開が、習慣を取り戻すきっかけになる。',
      TCD:'歯・笑顔の改善に今まさに取り組んでいる。笑顔が変わると、人との距離感が変わる。整えた笑顔は、使うことで価値が出る。',
      TAV:'自分で歯磨きケアはしているがプロの施術を受けたことがない。一度だけ歯科クリーニングを受けてみよう。口元の清潔感が一段上がる。',
      TAQ:'自分でケアしていたが一度やめた。まず歯磨きの時間を30秒だけ延ばしてみよう。今日から始められる、最小の再開だ。',
      TAK:'自分流の口元ケアをしている。一度歯科衛生士に今の磨き方を見てほしいと頼んでみよう。正しい磨き方が手に入ると、同じ時間で結果が変わる。',
      TAL:'以前は歯のケアをしっかりやっていた。週一回のフロスから再開しよう。口元の清潔感は、印象に対する影響が意外に大きい。',
      TAD:'自分でケアしながら、今まさに歯・笑顔に力を入れている。3ヶ月に一度、歯科クリーニングの予約を先に入れてしまおう。自己ケアとプロの施術が合わさると、清潔感が安定して維持される。',
      TPQ:'歯科・ホワイトニング・矯正などのプロ施術を経験したが今は通っていない。維持のためのメンテナンスクリーニングだけに絞って通う形でもいい。',
      TPK:'プロのケアを受けながらも、期待していた変化が出にくい感覚がある。担当医にどの程度まで改善できますかと具体的に聞いてみよう。',
      TPL:'プロレベルの歯・口元ケアの経験がある。再開のタイミングを一つ決めよう。以前の担当医に連絡するだけでいい。',
      TPD:'プロのサポートを受けながら歯・笑顔を磨いている。整えた笑顔を積極的に使っていこう。笑顔が映える場面に自分を置こう。',
      WNV:'爪や手元を気にしたことがない。でも手元は、相手との距離が近い場面で確実に目に入る部位だ。まず爪を清潔に短く整えるだけでいい。それだけで、近距離での印象が静かに変わる。',
      WNK:'手元について自分なりにはしているが、客観的に気にしたことがない。一度だけネイルケアサロンでベースケアを受けてみよう。プロが整えた手元の印象の差を体感できる。',
      WND:'爪や手元を気にしすぎず、自分なりに整えている。甘皮処理かネイルオイルを一つ加えてみよう。小さな一手が、印象の質を一段引き上げる。',
      WCV:'爪や手元が気になっている。まずネイルファイルで爪の形を整えるだけでいい。最初の変化はそれだけで十分だ。',
      WCQ:'以前ネイルケアを始めたが続かなかった。洗面台かデスクの上に、爪やすり一本だけ置いてみよう。目に入る場所にあるだけで使う確率が変わる。',
      WCK:'爪が気になって自分なりにケアしている。一度ネイルケアサロンでベースを作ってもらうと、正しい形の基準が手に入る。',
      WCL:'以前は爪や手元を気にしていた。まず爪を短く切って形を整えるだけでいい。それだけで手元の印象がすぐに戻る。',
      WCD:'爪・手元の改善に今まさに取り組んでいる。月一回のネイルケアサロンのメンテナンスをスケジューリングしてしまおう。仕組みができれば、状態が安定して維持される。',
      WAV:'自分で爪を整えているがネイルサロンに行ったことがない。一度だけサロンでベースケアを受けてみよう。セルフケアの何を改善すればいいかが明確になる。',
      WAQ:'自分でケアしていたが一度やめた。爪切りとヤスリだけで今日から再起動できる。再開のハードルは外見ケアの中で最も低い。',
      WAK:'自分流で爪・手元を整えている。一度プロの仕上がりを体感してみよう。正解の手元の基準が手に入ると、セルフケアの目標が明確になる。',
      WAL:'以前はしっかり爪・手元を整えていた。今は少し放置している。まず一度だけ、丁寧に整えてみよう。その感覚が、また意識を引き上げる。',
      WAD:'自分でケアしながら、今まさに手元に力を入れている。次のステップはネイルオイルでの保湿を習慣化することだ。細部へのこだわりが、全体の質感を底上げする。',
      WPQ:'ネイルサロンに通っていたが辞めた。ベースケアとメンテナンスだけに絞った施術から始めてもいい。コストを下げて継続できる形を探してみよう。',
      WPK:'ネイルサロンに通いながらも、毎回の仕上がりに完全に満足できていない感覚がある。次回はもう少しここをこうしてほしいという一言だけ言ってみよう。',
      WPL:'プロレベルの手元ケアの経験がある。手元は再開のコストが最も低い。次の予約を一つ入れるだけで動き出せる。',
      WPD:'プロのサポートを受けながら手元を磨いている。次のフェーズで意識すべきは、整えた手元を見せることだ。整えたものを活かすことで、投資の価値が現実になる。',
      // ── R軸（脱毛） ──
      RNV:'脱毛を全く考えたことがない。でも毎日カミソリで処理するムダな時間と肌へのダメージは確実に積み重なっている。脱毛は「美容」ではなく「インフラ整備」だ。まず自分の気になる部位を一つ確認してみよう。現状把握が、最初の一手だ。',
      RNK:'自己処理を当たり前にこなしているが、このまま続けることへの疑問を持ったことがない。カミソリによる肌荒れや埋没毛、毎日の時間コスト。自己処理には見えないコストがある。一度だけ医療脱毛のカウンセリングに行ってみよう。',
      RND:'定期的に自己処理を続けている。習慣になっているのは強みだ。でも自己処理は永続的にコストがかかる。今の習慣をアップグレードする選択肢として、無料カウンセリングで一度比較してみよう。',
      RCV:'脱毛が気になっているが、まだ行動に移せていない。無料カウンセリングは予約するだけで、費用も痛みも全くない。情報だけを取りに行く感覚でいい。',
      RCQ:'脱毛を始めようとしたか、一度通い始めたが途中で止まった。今は医療脱毛の価格は以前より大幅に下がっている。一度止まったからといって、再開できないわけではない。',
      RCK:'気になって自己処理は続けているが、脱毛を受けるかどうか迷っている。一度だけクリニックのカウンセリングで専門家に聞いてみよう。曖昧な情報をネットで調べるより、プロに確認する方が判断が速くなる。',
      RCL:'以前は脱毛を受けていたが今は止まっている。止まった理由を振り返り、再開できる形を探してみよう。完了まで続けられていなかったなら、今からでも効果が出る部位は残っている。',
      RCD:'脱毛に関心を持ち、今まさに動き始めている。すべてを一度にやろうとすると費用と期間がかさむ。見えやすい部位から優先するとコスパよく進められる。',
      RAV:'自己処理は自分でしているがサロン・クリニックには行ったことがない。脱毛の費用は一見高く見えるが、長期的には自己処理コストと逆転する。一度だけ無料カウンセリングで試算してみよう。',
      RAQ:'自己処理をしていたが一度やめた。より根本的に解決したいなら、脱毛クリニックのカウンセリングで現状に合った方法が見つかる。',
      RAK:'自己処理は続けているが、今の方法が正しいか疑問を持っている。カミソリは肌を削り、毛抜きは毛穴を傷つける。電動シェーバーが最も肌に優しい。間違った処理を続けると、肌ダメージが蓄積する。',
      RAL:'以前は自己処理をきちんとやっていた。今は後回しになっている。脱毛に移行することを検討しているなら、今がちょうどいいタイミングだ。',
      RAD:'自己処理しながら今まさに清潔感を整えている。次のステップは、自己処理からの卒業を検討することだ。今の自己処理コストと脱毛の費用を一度比較するだけで、決断の材料が揃う。',
      RPQ:'脱毛サロンやクリニックに通っていたが今は止まっている。完了できていない部位があるなら、再開することを検討しよう。費用が理由なら、今は価格帯の選択肢が増えている。',
      RPK:'クリニックに通いながらも、施術の効果に満足できていない感覚がある。担当者に率直に伝えることが大事だ。投資を結果に変えるのは、対話の質だ。',
      RPL:'プロレベルの脱毛施術を経験した。今は止まっている。完了していない部位が残っているなら、再開の価値がある。経験があるから、再開のハードルは低い。',
      RPD:'クリニックで脱毛施術を受けながら、今まさに進めている。脱毛は毛周期に合わせて複数回施術することで効果が出る。完了まで継続することだけを意識しよう。',
    };

    function getUserTypeCode() {
      try {
        const raw = localStorage.getItem('fineme:diagnosis:latest');
        if (!raw) return null;
        const p = JSON.parse(raw);
        const compassFirst = p.compass_first || (p.priority_order || [])[0];
        if (!compassFirst) return null;
        const axisCode = AXIS_TYPE_CODE[compassFirst];
        if (!axisCode) return null;
        const v = (p.transform_vectors || {})[compassFirst] || {};
        const careCode = CARE_CODE_MAP[v.care_type] || 'N';
        const pathCode = PATH_CODE_MAP[v.path_type] || 'V';
        const cp = careCode + pathCode;
        if (!TYPE_CREATURE[cp]) return null;
        return axisCode + cp;
      } catch { return null; }
    }

    const myType = getUserTypeCode();
    const root = document.getElementById('types-root');
    if (!root) return;

    function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function careChip(code) {
      const colors = { N:'rgba(201,168,76,0.12)|#c9a84c66|#c9a84c', C:'rgba(239,68,68,0.1)|#ef444466|#ef4444', A:'rgba(59,130,246,0.1)|#3b82f666|#3b82f6', P:'rgba(16,185,129,0.1)|#10b98166|#10b981' };
      const [bg, border, color] = colors[code].split('|');
      const [lbl] = CARE_LABELS[code];
      return '<span class="code-chip" style="background:' + bg + ';border-color:' + border + ';color:' + color + '">' + code + ' ' + lbl + '</span>';
    }
    function pathChip(code) {
      const colors = { V:'rgba(201,168,76,0.08)|#c9a84c44|#c9a84caa', Q:'rgba(239,68,68,0.08)|#ef444444|#ef4444aa', K:'rgba(139,92,246,0.08)|#8b5cf644|#8b5cf6aa', L:'rgba(245,158,11,0.08)|#f59e0b44|#f59e0baa', D:'rgba(16,185,129,0.08)|#10b98144|#10b981aa' };
      const [bg, border, color] = colors[code].split('|');
      const [lbl] = PATH_LABELS[code];
      return '<span class="code-chip" style="background:' + bg + ';border-color:' + border + ';color:' + color + '">' + code + ' ' + lbl + '</span>';
    }

    function buildCard(axisCode, cp) {
      const ax = AXES.find(a => a.code === axisCode);
      const creature = TYPE_CREATURE[cp];
      if (!creature) return '';
      const modifier = TYPE_MODIFIER[cp] || '';
      const fullName = ax.word + modifier + creature;
      const typeCode = axisCode + cp;
      const isMyType = typeCode === myType;
      return '<div class="type-card' + (isMyType ? ' my-type' : '') + '" onclick="openTypeModal(\'' + typeCode + '\')">'
        + '<img class="type-card-img" src="/images/types/TYPE-' + typeCode + '.webp" alt="' + esc(fullName) + '" loading="lazy" />'
        + '<div class="type-card-body">'
        + '<div class="type-card-code" style="color:' + ax.color + '">' + toDisplayCode(typeCode) + '</div>'
        + '<div class="type-card-name">' + esc(fullName) + '</div>'
        + (isMyType ? '<span class="type-card-badge">あなたのタイプ</span>' : '')
        + '</div></div>';
    }

    function buildGrid(axisCode) {
      return VALID_CP.map(cp => buildCard(axisCode, cp)).join('');
    }

    const myAxisCode = myType ? myType[0] : null;
    const defaultAxis = myAxisCode || 'B';

    const tabsHtml = AXES.map((a, i) => {
      const isDefault = a.code === defaultAxis;
      return '<button class="axis-tab' + (isDefault ? ' active' : '') + '" data-axis="' + a.code + '"'
        + ' style="border-color:' + a.color + ';color:' + (isDefault ? '#0a0f1e' : a.color) + ';background:' + (isDefault ? a.color : 'transparent') + '"'
        + ' onclick="switchTypeAxis(\'' + a.code + '\', this)">'
        + a.label + '</button>';
    }).join('');

    const axisChips = AXES.map(a =>
      '<span class="code-chip" style="background:' + a.color + '22;border-color:' + a.color + '66;color:' + a.color + '">' + a.code + ' ' + a.label + '</span>'
    ).join('');

    const myAxisDef = myAxisCode ? AXES.find(a => a.code === myAxisCode) : null;
    const bannerHtml = (myType && myAxisDef)
      ? '<div class="my-type-banner">あなたの現在のタイプは <strong style="color:' + myAxisDef.color + '">' + toDisplayCode(myType) + '</strong>（' + myAxisDef.label + '軸）です。下のグリッドでハイライト表示されています。</div>'
      : '';

    root.innerHTML = '<div class="types-wrap">'
      + '<h1 class="types-title">外見変容タイプ 全136</h1>'
      + '<p class="types-subtitle">4文字のコードが、あなたの今の外見の地図を示す</p>'
      + bannerHtml
      + '<div class="code-legend">'
      + '<div class="code-legend-title">コードの読み方</div>'
      + '<div class="code-row"><div class="code-pos">1</div><div><div class="code-dim-label">軸（どの部位に着目するか）</div><div class="code-chips">' + axisChips + '</div></div></div>'
      + '<div class="code-row"><div class="code-pos">2</div><div><div class="code-dim-label">関心度（今どれくらい気にしているか）</div><div class="code-chips">' + ['N','C','A','P'].map(careChip).join('') + '</div></div></div>'
      + '<div class="code-row"><div class="code-pos">3</div><div><div class="code-dim-label">歩み（今どのフェーズにいるか）</div><div class="code-chips">' + ['V','Q','K','L','D'].map(pathChip).join('') + '</div></div></div>'
      + '</div>'
      + '<div class="axis-tabs">' + tabsHtml + '</div>'
      + '<div id="type-grid" class="type-grid">' + buildGrid(defaultAxis) + '</div>'
      + '<div style="text-align:center;margin-top:36px"><a href="/diagnosis" style="display:inline-block;padding:14px 32px;background:#c9a84c;color:#0a0f1e;font-size:14px;font-weight:800;border-radius:8px;text-decoration:none">自分のタイプを診断する →</a></div>'
      + '</div>'
      + '<div id="type-modal-overlay" class="type-modal-overlay" style="display:none" onclick="if(event.target===this)closeTypeModal()">'
      + '<div class="type-modal" id="type-modal-content"></div>'
      + '</div>';

    window.switchTypeAxis = function(axisCode, btn) {
      document.querySelectorAll('.axis-tab').forEach(t => {
        const ax = AXES.find(a => a.code === t.dataset.axis);
        if (!ax) return;
        t.classList.remove('active');
        t.style.color = ax.color;
        t.style.background = 'transparent';
      });
      btn.classList.add('active');
      const ax = AXES.find(a => a.code === axisCode);
      btn.style.color = '#0a0f1e';
      btn.style.background = ax.color;
      document.getElementById('type-grid').innerHTML = buildGrid(axisCode);
    };

    window.openTypeModal = function(typeCode) {
      const axisCode = typeCode[0];
      const cp = typeCode.slice(1);
      const ax = AXES.find(a => a.code === axisCode);
      const creature = TYPE_CREATURE[cp];
      if (!creature) return;
      const modifier = TYPE_MODIFIER[cp] || '';
      const fullName = ax.word + modifier + creature;
      const desc = TYPE_DESCRIPTION[typeCode] || '';
      const isMyType = typeCode === myType;
      const modal = document.getElementById('type-modal-content');
      modal.innerHTML = '<button class="type-modal-close" onclick="closeTypeModal()">✕</button>'
        + '<div style="clear:both"></div>'
        + '<div class="type-modal-code" style="color:' + ax.color + '">' + toDisplayCode(typeCode) + '</div>'
        + '<div class="type-modal-name">～ ' + esc(fullName) + ' ～</div>'
        + (isMyType ? '<div style="font-size:11px;font-weight:800;color:#c9a84c;margin-bottom:12px">★ あなたの現在のタイプ</div>' : '')
        + '<img class="type-modal-img" src="/images/types/TYPE-' + typeCode + '.webp" alt="' + esc(creature) + '" style="border:2px solid ' + ax.color + '44" />'
        + '<p class="type-modal-desc">' + esc(desc) + '</p>'
        + '<a href="/diagnosis" class="type-modal-cta">このタイプか確かめる →</a>';
      document.getElementById('type-modal-overlay').style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };

    window.closeTypeModal = function() {
      document.getElementById('type-modal-overlay').style.display = 'none';
      document.body.style.overflow = '';
    };
  }, []);

  return <div id="types-root" style={{minHeight:'100vh'}} />;
}
