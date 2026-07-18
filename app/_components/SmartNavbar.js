'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from './Navbar';
import BelleNavbar from '../belle/_components/BelleNavbar';

export default function SmartNavbar() {
  const pathname = usePathname();
  const [belleMode, setBelleMode] = useState(false);

  useEffect(() => {
    try { setBelleMode(!!localStorage.getItem('fineme:diagnosis:belle')); } catch {}
  }, []);

  if (pathname?.startsWith('/belle')) return null;
  if (belleMode && pathname?.startsWith('/mypage')) return <BelleNavbar />;
  return <Navbar />;
}
