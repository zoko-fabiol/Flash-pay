import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Send, History, Lock, Share2, User, Settings, LogOut, X, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/', label: t('menu_dashboard'), icon: LayoutDashboard },
    { path: '/transfer', label: t('menu_transfer'), icon: Send },
    { path: '/transactions', label: t('menu_history'), icon: History },
    { path: '/kyc', label: t('menu_profile_kyc'), icon: Lock },
    { path: '/referral', label: t('menu_referral'), icon: Share2 },
    { path: '/profile', label: t('menu_profile'), icon: User },
    { path: '/preferences', label: t('menu_preferences'), icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300" onClick={onClose} />
      )}
      
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-xl border-r border-slate-200/60 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.05)]
        transform transition-all duration-300 z-[70] overflow-y-auto
        ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0 opacity-0 lg:opacity-100'}
      `}>
        <div className="p-6 flex justify-between items-center lg:hidden sidebar-safe-top">
          <span className="font-bold text-primary text-xl">Flash Pay</span>
          <button onClick={onClose} className="p-2 hover:bg-primary/10 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <nav className="p-6 space-y-2 mt-4 pb-56 lg:pb-32">
          {menuItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all
                  ${active
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 font-semibold'
                    : 'text-slate-600 hover:bg-primary/5 hover:text-primary'
                  }
                `}
              >
                <Icon size={20} />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] border-t border-slate-100 bg-white/95">
          <div className="mb-6 flex justify-center sm:hidden">
            <LanguageSwitcher />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-rose-500 hover:bg-rose-50 transition-colors font-semibold"
          >
            <LogOut size={20} />
            <span className="text-sm">{t('logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
