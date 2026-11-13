import MirrorClient from './MirrorClient';

export const metadata = {
  alternates: { canonical: 'https://www.fineme.me/mirror' },
};

export default function Page() {
  return <MirrorClient />;
}
