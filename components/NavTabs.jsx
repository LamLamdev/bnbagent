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
  borderBottom: '1px solid #8c52ff',
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
              background: active ? '#8c52ff' : 'transparent',
              color: active ? '#000' : '#8c52ff',
              border: '1px solid #8c52ff',
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
                e.target.style.background = '#8c52ff';
                e.target.style.color = '#000';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.target.style.background = 'transparent';
                e.target.style.color = '#8c52ff';
              }
            }}
          >
            {t.label.toUpperCase()}
          </Link>
        );
      })}

      {/* X logo in top right */}
      <a
        href="https://x.com/trysolagent"
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