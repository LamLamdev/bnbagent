'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/chat', label: 'Chat' },
  { href: '/intel', label: 'Intel' },
 
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
  <nav style={{
  background: '#0a0a0a',
  borderBottom: '1px solid #E32E30',
  padding: '15px 20px',
  display: 'flex',
  gap: '20px',
  alignItems: 'center',
  justifyContent: 'center',  // ADD THIS LINE
  fontFamily: "'Courier New', monospace"
}}>
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              background: active ? '#E32E30' : 'transparent',
              color: active ? '#000' : '#E32E30',
              border: '1px solid #E32E30',
              padding: '8px 16px',
              fontFamily: "'Courier New', monospace",
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '13px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              fontWeight: 'normal'
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.target.style.background = '#E32E30';
                e.target.style.color = '#000';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.target.style.background = 'transparent';
                e.target.style.color = '#E32E30';
              }
            }}
          >
            {t.label.toUpperCase()}
          </Link>
        );
      })}

      {/* X logo in top right */}
      <a
        href="https://x.com/tutoraibnb"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          top: '16px',
          right: '20px',
          zIndex: 50,
          opacity: 0.8,
          transition: 'opacity 0.3s'
        }}
        onMouseEnter={(e) => e.target.style.opacity = '1'}
        onMouseLeave={(e) => e.target.style.opacity = '0.8'}
      >
       <Image
  src="/X.png"
  alt="Follow us on X"
  width={24}
  height={24}
  style={{ width: '28px', height: '28px' }}
/>
      </a>
    </nav>
  );
}