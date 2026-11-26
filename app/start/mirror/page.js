import TrackChooser from '../_components/TrackChooser';

export const metadata = {
  title: 'Fineme Mirror（写真AI外見診断）を選ぶ | Fineme',
  description: '男性向け・女性向けから選んで、Fineme Mirror（写真AI外見診断）をはじめます。',
  robots: { index: false, follow: true },
};

export default function StartMirrorPage() {
  return (
    <TrackChooser
      label="Fineme Mirror（写真AI外見診断）"
      title="どちらのFineme Mirror（写真AI外見診断）を使いますか？"
      lead="写真から、今の外見の伸びしろをAIが分析します。"
      options={[
        { track: 'men', tag: '男性向け', name: '男性向け Fineme Mirror（写真AI外見診断）', desc: 'Fineme', href: '/mirror' },
        { track: 'women', tag: '女性向け', name: '女性向け Fineme Mirror（写真AI外見診断）', desc: 'Fineme Belle', href: '/belle/mirror' },
      ]}
    />
  );
}
