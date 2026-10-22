// マイページのメニュー（2026-10-22 UI刷新）。16項目を平らに並べていたのを、目的ごとの3つのまとまりにした。
// ホームのメニュー一覧・PCの左メニュー・スマホの「メニュー」で同じ定義を使う。
export function mypageMenu(track) {
  return [
    {
      label: '予約・お店',
      items: [
        { href: '/my-reservations', label: '予約', match: p => p.startsWith('/my-reservations') },
        { href: '/mypage/packages', label: '回数券・チケット', match: p => p.startsWith('/mypage/packages') },
        { href: '/mypage/memberships', label: '月額プラン', match: p => p.startsWith('/mypage/memberships') },
        { href: '/mypage/notices', label: 'お店からのお知らせ', match: p => p.startsWith('/mypage/notices') },
        { href: '/mypage/checkin', label: 'チェックインQR', match: p => p.startsWith('/mypage/checkin') },
        { href: '/mypage/contracts', label: '契約書', match: p => p.startsWith('/mypage/contracts') },
        { href: '/mypage/favorites', label: 'お気に入りのお店', match: p => p.startsWith('/mypage/favorites') },
        { href: '/mypage/history', label: '最近見たお店', match: p => p.startsWith('/mypage/history') },
      ],
    },
    {
      label: 'あなたの変化',
      items: [
        { href: track.diagnosisResult, label: '診断結果', match: p => p === track.diagnosisResult || p.startsWith('/mypage/diagnosis') },
        { href: '/mypage/navi', label: 'New Me Map', match: p => p.startsWith('/mypage/navi') },
        { href: '/mypage/log', label: 'New Me Log', match: p => p.startsWith('/mypage/log') },
        { href: '/mypage/mirror', label: 'Mirror履歴', match: p => p.startsWith('/mypage/mirror') },
        { href: '/mypage/story-submit', label: '体験談を書く', match: p => p.startsWith('/mypage/story-submit') },
      ],
    },
    {
      label: 'アカウント',
      items: [
        { href: '/mypage/profile', label: 'プロフィール', match: p => p.startsWith('/mypage/profile') },
        { href: '/mypage/subscription', label: 'Mirrorのサブスク', match: p => p.startsWith('/mypage/subscription') },
      ],
    },
  ];
}
