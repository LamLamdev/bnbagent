import './globals.css';
import NavTabs from '@/components/NavTabs';
import Sidebar from '@/components/Sidebar';
import ConditionalSidebar from '@/components/ConditionalSidebar';


export const metadata = {
  title: 'TutorAI - Translate the meta',
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
  <main className="flex-1" style={{ 
  background: '#000',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  minHeight: 'calc(100vh - 60px)',
  paddingTop: '120px'
}}>
  {children}
</main>
        </div>
      </body>
    </html>
  );
}