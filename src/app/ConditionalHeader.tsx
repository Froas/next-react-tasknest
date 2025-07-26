'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/ui/header';

const ConditionalHeader = () => {
  const pathname = usePathname();
  
  // Pages where we don't want to show the header
  const noHeaderPages = ['/login', '/signup', '/logout'];
  
  // Check if current page should show header
  const shouldShowHeader = pathname && !noHeaderPages.includes(pathname);
  
  return shouldShowHeader ? <Header /> : null;
};

export default ConditionalHeader;