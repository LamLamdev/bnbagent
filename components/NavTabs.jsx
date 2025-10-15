'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/chat', label: 'Chat' },
  { href: '/intel', label: 'Intel' },
  { href: '/analyzer', label: 'Analyzer' },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <>
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <ul className="flex gap-2 rounded-2xl bg-white/5 border border-white/10 p-1 backdrop-blur">
          {tabs.map(t => {
            const active = pathname === t.href;
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={`px-3 py-1.5 rounded-xl text-sm transition
                    ${active
                      ? 'bg-white text-black'
                      : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* X Logo in top right */}
      <a 
        href="https://x.com/trytutorai" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed top-6 right-6 z-50 hover:opacity-80 transition-opacity"
      >
        <Image 
          src="/X.png" 
          alt="Follow us on X" 
          width={24} 
          height={24}
          className="w-6 h-6"
        />
      </a>
    </>
  );
}