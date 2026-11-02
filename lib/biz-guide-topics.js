// 週1の自動追加（/api/cron/biz-guide）で書くテーマの候補。上から順に、まだ書いていないものを1本ずつ使う。
// どれも「店舗運営者・営業副業を探す人が、AIにそのまま聞きそうな質問」を1つの記事にしたもの。
// 使い切ったら、AIが既存の記事と重ならない新しいテーマを自分で選ぶ。
export const SHOP_TOPICS = [
  ['hair-salon-repeat', '美容室のリピート率を上げる方法（指名・次回予約・来店周期）'],
  ['esthetic-salon-course', 'エステサロンでコース契約のお客様に最後まで通ってもらう方法'],
  ['nail-salon-repeat', 'ネイルサロンの付け替え周期に合わせたリピートの作り方'],
  ['no-show-cancel', '無断キャンセル・直前キャンセルを減らす方法（リマインド・事前決済・キャンセル規定）'],
  ['reminder-message', '予約前日のリマインドの送り方と文面の例'],
  ['review-request', 'お客様にクチコミを書いてもらう頼み方と、タイミング'],
  ['birthday-message', '誕生日メッセージで来店につなげる方法と文面の例'],
  ['price-increase', '小規模サロン・ジムの値上げの伝え方：お客様が離れない進め方'],
  ['trial-to-member-gym', 'パーソナルジムの体験レッスン後に入会してもらう伝え方'],
  ['monthly-fee-unpaid', '月会費の未払いを防ぐ方法と、未払いが起きたときの連絡'],
  ['solo-salon-time', '一人サロンの事務作業を減らす方法（予約・連絡・会計・記録）'],
  ['staff-share-customers', 'スタッフが増えたときの顧客情報の共有のしかた'],
  ['shift-management-small', '小規模店舗のシフト作成と勤怠管理を楽にする方法'],
  ['line-official-shop', '店舗の公式LINEの使い方：登録してもらう方法と送る内容'],
  ['line-message-frequency', '店舗のLINE配信の頻度と内容：ブロックされない送り方'],
  ['first-visit-experience', '初回来店の満足度を上げる接客の流れ（カウンセリング・説明・見送り）'],
  ['counseling-sheet', 'カウンセリングシートに入れるべき項目と、活かし方'],
  ['retail-sales-salon', 'サロンでの物販（ホームケア商品）の自然なすすめ方'],
  ['monthly-report-shop', '小規模店舗が毎月見るべき数字と、振り返りのしかた'],
  ['new-customer-cost', '新規のお客様1人を集めるのにかかる費用の考え方'],
  ['referral-program-shop', 'お客様からの紹介を増やす仕組み（紹介特典の作り方）'],
  ['survey-after-visit', '来店後アンケートの作り方と、改善への活かし方'],
  ['own-website-booking', '自店のホームページから予約を受ける方法（予約ボタン・ウィジェット）'],
  ['cashless-small-shop', '小規模店舗のキャッシュレス決済の導入と手数料の考え方'],
  ['spreadsheet-to-system', 'スプレッドシートの顧客管理から予約・顧客管理ツールへ移る手順'],
  ['eyebrow-salon-open', '眉毛サロンを開業したら最初に整えるべき集客とリピートの仕組み'],
  ['personal-gym-open', 'パーソナルジムを一人で開業したときの集客と会員管理'],
  ['seasonal-campaign', '季節のキャンペーンの作り方：割引に頼らない来店のきっかけ'],
  ['ticket-expiry', '回数券の有効期限の決め方と、期限前の案内'],
  ['dormant-reason', 'お客様が来なくなる理由と、離れる前に気づくサイン'],
];

export const PARTNER_TOPICS = [
  ['side-job-sales-remote', '在宅・完全リモートでできる営業の副業の探し方'],
  ['commission-tax', '業務委託の紹介報酬と確定申告の基本（副業の場合）'],
  ['referral-vs-affiliate', '紹介営業とアフィリエイトの違い：どちらが自分に向いているか'],
  ['approach-local-shops', '地域の店舗にサービスを紹介するときの声のかけ方'],
  ['mlm-difference', '紹介の副業とマルチ商法（連鎖販売取引）の違いと見分け方'],
  ['saas-sales-basics', '店舗向けの月額サービスを紹介するときに押さえる基本'],
  ['sales-side-job-hours', '本業と両立できる営業の副業：週に何時間から始められるか'],
  ['first-referral', '紹介営業で最初の1件を決めるまでの進め方'],
];

export const ALL_TOPIC_KEYS = new Set([...SHOP_TOPICS, ...PARTNER_TOPICS].map(([k]) => k));
