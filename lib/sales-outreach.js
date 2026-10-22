// 店舗SaaSの営業メール（新規開拓）の文面と送信者表示。
// 特定電子メール法の表示義務（送信者の氏名・住所・問い合わせ先・配信停止の方法）を必ず本文に含める。
// SENDER_ADDRESS が空のあいだは送信APIが本送信を拒否する（住所なしで送らないためのガード）。
export const SENDER = {
  name: 'Fineme（ファインミ）',
  person: '渡邉 英雄',
  email: 'contact@fineme.me',
  address: '',
  from: 'Fineme 渡邉 <contact@fineme.me>',
};

const SITE = 'https://www.fineme.me';

const COPY = {
  gym: {
    subject: (shop) => `${shop}様へ：会員・回数券・月会費の管理をひとつにまとめるご提案（Fineme）`,
    voices: [
      '体験に来た方が、その後入会したか追いきれない',
      '回数券の残りや月会費の未払いを、手作業で確認している',
      '卒業された方が、そのまま戻ってこない',
    ],
    points: [
      '体験→入会の割合と、まだ入会していない方の一覧',
      '回数券と月額会員を「チケット」で管理（予約した時点で自動で消化）',
      '月会費の支払いエラーの検知と再請求',
      '来店の目安を過ぎた方への、予約ボタン付きの声かけ',
      'トレーナーのシフト作成と、タブレットでの打刻',
    ],
    type: 'gym',
  },
  brow: {
    subject: (shop) => `${shop}様へ：次回のご予約を取りこぼさない仕組みのご提案（Fineme）`,
    voices: [
      '次の来店時期が来ても、声をかけられないまま過ぎてしまう',
      '前回のデザインや気をつけることが、担当者の記憶頼みになっている',
      '予約サイトから来た初めてのお客様が、2回目につながらない',
    ],
    points: [
      '来店の目安（例：5週間）を過ぎた方への、予約ボタン付きの声かけ',
      '前回の形・色・注意点をカルテに残し、来店前に確認',
      '会計時の「次回の一言」と次のご予約',
      '来店後のクチコミのお願いを自動で',
      '2回目以降は、お店のページ・自社サイト・LINEから直接予約',
    ],
    type: 'brow',
  },
};

export function buildOutreachEmail(lead) {
  const c = COPY[lead.category] || COPY.gym;
  const shop = lead.shop_name;
  const lp = `${SITE}/provider/join?type=${c.type}&utm_source=email&utm_medium=outreach&utm_campaign=2026-10#industry`;
  const unsub = `${SITE}/sales-unsubscribe?t=${lead.unsubscribe_token}`;
  const industry = lead.category === 'brow' ? '眉毛サロン' : 'パーソナルジム';

  const text = [
    `${shop} ご担当者様`,
    '',
    '突然のご連絡失礼いたします。',
    `店舗運営システム「Fineme（ファインミ）」の${SENDER.person.split(' ')[0]}と申します。公式サイトを拝見し、ご連絡しました。`,
    '',
    `${industry}を運営されている方から、`,
    ...c.voices.map((v) => `「${v}」`),
    'というお話をよく伺います。',
    '',
    'Finemeは、こうした「今いるお客様に通い続けてもらう」ための管理をひとつにまとめた店舗向けのシステムです。',
    ...c.points.map((p) => `・${p}`),
    '',
    '月額5,000円から、予約の手数料はかかりません。登録料も当面無料です。',
    `${industry}向けの使い方は、こちらにまとめています。`,
    lp,
    '',
    'ご興味があれば、このメールにご返信いただくだけで構いません。お店の今の状況を伺い、合わない場合は正直にそうお伝えします。',
    '',
    '――――――――――',
    SENDER.name,
    `運営責任者　${SENDER.person}`,
    `所在地　${SENDER.address}`,
    `メール　${SENDER.email}`,
    SITE,
    '',
    '今後このようなご案内が不要な場合は、お手数ですが下記から配信停止をお願いいたします。',
    unsub,
  ].join('\n');

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = `<div style="font-family:'Hiragino Sans','Noto Sans JP',sans-serif;font-size:15px;line-height:1.85;color:#1a1d24;max-width:600px">
${text.split('\n').map((line) => {
    if (line === lp) return `<p style="margin:0"><a href="${lp}" style="color:#8a6a17">${industry}向けの使い方を見る</a></p>`;
    if (line === unsub) return `<p style="margin:0;font-size:12px;color:#666"><a href="${unsub}" style="color:#666">配信停止はこちら</a></p>`;
    if (line === SITE) return `<p style="margin:0;font-size:12px;color:#666"><a href="${SITE}" style="color:#666">${SITE}</a></p>`;
    if (line === '') return '<p style="margin:0">&nbsp;</p>';
    const small = line.startsWith('――') || line.startsWith(SENDER.name) || line.startsWith('運営責任者') || line.startsWith('所在地') || line.startsWith('メール　') || line.startsWith('今後このような');
    return `<p style="margin:0${small ? ';font-size:12px;color:#666' : ''}">${esc(line)}</p>`;
  }).join('\n')}
</div>`;

  return { subject: c.subject(shop), text, html };
}
