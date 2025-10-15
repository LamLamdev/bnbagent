import './globals.css';
import NavTabs from '@/components/NavTabs';
import Sidebar from '@/components/Sidebar';
import ConditionalSidebar from '@/components/ConditionalSidebar';

export const metadata = {
  title: 'TutorAI Translate The Meta',
  description: 'BNB-only intelligence terminal',
  icons: {
    icon: '/favmas.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-terminal-bg text-white">
        <NavTabs />
        <div className="flex">
          <ConditionalSidebar />
          <main className="flex-1 min-h-screen flex items-start justify-center p-4 md:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}