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

  const mobileTabs = [
    { path: '/', label: t('menu_dashboard'), icon: Home },
    { path: '/transactions', label: t('menu_history'), icon: History },
    { path: '/transfer', label: t('menu_transfer'), icon: Send, featured: true },
    { path: '/referral', label: t('menu_referral'), icon: Share2 },
    { path: '/profile', label: t('menu_profile'), icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/transfer') {
      return location.pathname.startsWith('/transfer');
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-mesh">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 overflow-auto pb-28 lg:pb-6">
          <div className="container mx-auto p-4 max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      <Footer tabs={mobileTabs} isActive={isActive} />
    </div>
  );
};
