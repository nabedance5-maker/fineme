import BelleDiagnosisClient from './BelleDiagnosisClient';

export const metadata = {
  alternates: { canonical: 'https://www.fineme.me/belle/diagnosis' },
};

export default function Page() {
  return <BelleDiagnosisClient />;
}
