import ProviderConsultantMount from './ProviderConsultantMount';

export default function ProviderLayout({ children }) {
  return (
    <>
      {children}
      <ProviderConsultantMount />
    </>
  );
}
