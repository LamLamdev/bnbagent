import './globals.css';
import NavTabs from '@/components/NavTabs';
import Sidebar from '@/components/Sidebar';
import ConditionalSidebar from '@/components/ConditionalSidebar';

export const metadata = {
  title: 'BNB Agent AI Terminal',
  description: 'BNB-only intelligence terminal',
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