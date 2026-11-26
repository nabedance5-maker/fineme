import TrackChooser from '../_components/TrackChooser';

export const metadata = {
  title: 'Me Scan（外見磨きタイプ診断）を選ぶ | Fineme',
  description: '男性向け・女性向けから選んで、Me Scan（外見磨きタイプ診断）をはじめます。',
  robots: { index: false, follow: true },
};

export default function StartScanPage() {
  return (
    <TrackChooser
      label="Me Scan（外見磨きタイプ診断）"
      title="どちらのMe Scan（外見磨きタイプ診断）を受けますか？"
      lead="8つの領域から、あなたの外見磨きのタイプと最初の一歩がわかります。無料ではじめられます。"
      options={[
        { track: 'men', tag: '男性向け', name: '男性向け Me Scan（外見磨きタイプ診断）', desc: 'Fineme', href: '/diagnosis' },
        { track: 'women', tag: '女性向け', name: '女性向け Me Scan（外見磨きタイプ診断）', desc: 'Fineme Belle', href: '/belle/diagnosis' },
      ]}
      note="あとから、もう一方を受けることもできます。"
    />
  );
}
