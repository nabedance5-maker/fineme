import HomeClient from './HomeClient';

export const metadata = {
  alternates: { canonical: 'https://www.fineme.me' },
};

export default function Page() {
  return <HomeClient />;
}
