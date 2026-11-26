// 初期設定ガイド（2026-11-26 渡邉要望：「導入してすぐの初期設定が一番面倒。パッパッパッとこれをやりましょうと案内して、
// いつでもスキップしてすぐ作業に入れるように」）。
// 終わったかどうかは、お店の実データ（メニューの件数・営業時間・顧客の件数など）から毎回判定する。チェックを手で付けさせない。
// どの手順を出すかは、はじめの質問（lib/onboarding.js）の答えで決める。答えていなければ、どのお店にも要る手順だけ。
// 画面は app/provider/dashboard/SetupGuide.js、判定に使う数字は /api/provider/setup-guide が集める。

export const SETUP_STEPS = [
  {
    key: 'profile', tab: 'profile', minutes: 3,
    title: 'お店の写真とキャッチコピーを入れる',
    why: '公開ページと予約ページの一番上に出ます。お客様が予約する前に見る場所です',
    how: ['「プロフィール写真」を1枚選ぶ（お店のロゴか、オーナーの写真がおすすめ）', '「キャッチコピー」に、どんなお客様にどんなことをするお店かを一言で書く', '下の「保存する」を押す'],
    done: s => !!(s.photo && s.catchphrase),
  },
  {
    key: 'menus', tab: 'service', minutes: 5,
    title: 'メニューと所要時間を登録する',
    why: 'お客様が予約できる時間の長さと、売上の記録に使われます',
    how: ['「＋ 個別メニュー」を押す（グループレッスンは「＋ グループレッスン」）', 'メニュー名・料金・所要時間を入れて保存する', 'よく出るメニューから2〜3個入れれば十分です（前のサービスのメニュー一覧のCSVがあれば「データ」からまとめて入れられます）'],
    done: s => s.services > 0,
  },
  {
    key: 'hours', tab: 'business-hours', minutes: 2,
    title: '営業時間と定休日を決める',
    why: '予約を受けられる時間と、公開ページの「営業中」の表示に使われます',
    how: ['曜日ごとに開店と閉店の時刻を入れる（同じなら「全曜日に反映」）', '定休日は休みにする', '「営業時間を保存」を押す'],
    done: s => s.businessHours,
  },
  {
    key: 'booking', tab: 'slots', minutes: 3,
    title: '予約の受け方を決める',
    why: 'スタッフ・部屋・人数のどれで予約を受けるかを決めると、予約できる時間が自動で計算されます',
    how: ['「受付の方法」で、スタッフで受ける・部屋や席で受ける・両方・人数で受けるのどれかを選ぶ', '迷ったら、パーソナルジムや美容室は「スタッフで受ける」', '「保存する」を押す'],
    show: a => !a || !a.booking || a.booking === 'instant',
    done: s => s.bookingSet,
  },
  {
    key: 'staff', tab: 'staff', minutes: 3,
    title: 'スタッフを登録する',
    why: '指名予約・シフト・担当ごとの売上やリピートの記録に使われます',
    how: ['「＋ 追加」を押す', '名前と役職を入れる（写真と紹介はあとからでも大丈夫です）', '指名を受けるスタッフは「予約時の指名候補に出す」にチェックを入れて保存する'],
    show: a => !!a && !!a.staffSize && a.staffSize !== 'solo',
    done: s => s.staff > 0,
  },
  {
    key: 'customers', tab: 'data', minutes: 5,
    title: '今のお客様の情報を移す',
    why: '前のサービスやエクセルのお客様の一覧を入れておくと、初日からカルテ・来店の記録・声かけが使えます',
    how: ['前のサービスやエクセルから、お客様の一覧をCSVで書き出す', '「他のサービスからの乗り換え」でそのファイルを選ぶ（中身がまとまっていても、AIが顧客・回数券・来店履歴などに振り分けます）', '確認画面を見て「取り込む」を押す（CSVが無ければ「顧客管理」から1人ずつでも入れられます）'],
    done: s => s.customers > 0,
  },
  {
    key: 'packages', tab: 'packages', minutes: 3,
    title: '回数券・コースの種類を作る',
    why: '今のお客様の残り回数を移しておくと、来店のたびに自動で減っていきます',
    how: ['まず「＋ チケットを作る」で、予約に使う券を作る', '次に「回数券」で、何回分をいくらで売るかを決めて「作成する」を押す', 'お客様の残り回数は、CSVの取り込みか「購入を記録する」で入れられます'],
    show: a => !!a && (a.operations || []).some(o => o === 'tickets' || o === 'monthly'),
    feature: 'customer_packages',
    done: s => s.packages > 0,
  },
  {
    key: 'payments', tab: 'packages', minutes: 5, stripe: true,
    title: 'カード決済の受け取りを設定する',
    why: '回数券・月額プラン・事前決済の代金を、お店の口座で受け取れるようになります',
    how: ['「カード決済の受け取りを設定する（Stripe）」を押す', '決済サービス（Stripe）の画面で、お店の情報と振込先の口座を入れる', '終わると管理画面に戻ってきます'],
    show: a => !!a && (a.operations || []).some(o => o === 'tickets' || o === 'monthly' || o === 'retail'),
    feature: 'payment_mediation',
    done: s => s.payments,
  },
  {
    key: 'line', tab: 'line-channel', minutes: 10,
    title: 'お店のLINEをつなぐ',
    why: '予約確認や次回のお知らせが、お店のLINEの名前でお客様に届くようになります',
    how: ['お店のLINE公式アカウントの管理画面を開いておく', 'この画面の手順どおりに、チャネルIDなどの値を貼り付ける', '「保存して確認する」を押し、「テスト送信する」で届くか確かめる'],
    show: a => !!a && (a.operations || []).includes('line'),
    feature: 'line_channel',
    done: s => s.line,
  },
  {
    key: 'publish', tab: 'publish', minutes: 1,
    title: '公開ページを確かめて公開する',
    why: '公開すると、お客様が予約ページから予約できるようになります',
    how: ['「公開ページを確認」で、お客様から見える画面を開いて確かめる', '問題なければ「公開設定」のスイッチをオンにする（ご契約の手続きが済んでいると公開できます）'],
    done: s => s.published,
  },
];

// 手順の一覧（表示順）。プランで使えない手順・オフにした機能の手順は出さない
export function buildSetupSteps(status, answers, { skipped = [], canUse = () => true } = {}) {
  return SETUP_STEPS
    .filter(st => (st.show ? st.show(answers) : true) && (!st.feature || canUse(st.feature)))
    .map(st => {
      const done = !!st.done(status || {});
      return {
        key: st.key, tab: st.tab, title: st.title, why: st.why, how: st.how, minutes: st.minutes, stripe: !!st.stripe,
        status: done ? 'done' : skipped.includes(st.key) ? 'skipped' : 'todo',
      };
    });
}

export const SETUP_STEP_KEYS = SETUP_STEPS.map(s => s.key);
