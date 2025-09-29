'use client';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function ConditionalSidebar() {
  const pathname = usePathname();
  
  // Only show sidebar on chat pages
  const showSidebar = pathname === '/chat' || pathname.startsWith('/chat/');
  
  if (!showSidebar) return null;
  
  return <Sidebar />;
}