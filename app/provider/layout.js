import ProviderConsultantMount from './ProviderConsultantMount';
import DemoBanner from './DemoBanner';

export default function ProviderLayout({ children }) {
  return (
    <>
      <DemoBanner />
      {children}
      <ProviderConsultantMount />
    </>
  );
}
