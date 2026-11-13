import BelleHomeClient from './BelleHomeClient';

export const metadata = {
  alternates: { canonical: 'https://www.fineme.me/belle' },
};

export default function Page() {
  return <BelleHomeClient />;
}
