import React from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Home, History, Send, Share2, User } from 'lucide-react';
import Footer from './Footer';
import { useLanguage } from '../context/LanguageContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const { t } = useLanguage();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const mobileTabs = React.useMemo(() => [
    { path: '/', label: t('menu_dashboard'), icon: Home },
    { path: '/transactions', label: t('menu_history'), icon: History },
    { path: '/transfer', label: t('menu_transfer'), icon: Send, featured: true },
    { path: '/referral', label: t('menu_referral'), icon: Share2 },
    { path: '/profile', label: t('menu_profile'), icon: User },
  ], [t]);

  const isActive = React.useCallback((path: string) => {
    if (path === '/transfer') {
      return location.pathname.startsWith('/transfer');
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  }, [location.pathname]);

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--bg-app)' }}>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main ref={scrollContainerRef} className="flex-1 overflow-auto pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-6">
          <div className={`container mx-auto px-4 pb-4 max-w-7xl ${location.pathname.startsWith('/transfer') ? 'pt-0' : 'pt-4'}`}>
            {children}
          </div>
        </main>
      </div>

      <Footer tabs={mobileTabs} isActive={isActive} />
    </div>
  );
};
