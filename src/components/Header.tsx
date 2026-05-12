import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { NotificationBell } from './notifications/NotificationBell';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <header className="glass-effect px-5 py-4 flex justify-between items-center sticky top-0 z-50 border-b border-white/50 shadow-sm">
      <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
        <img src="/header-logo.png" alt="Flash Pay" className="h-8 w-auto object-contain" />
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold text-slate-500 hidden sm:block">
          {user?.nom || 'Invité'}
        </span>
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        <NotificationBell />
        <button
          onClick={handleLogout}
          className="text-xs font-bold px-4 py-2 rounded-full border-2 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition hidden sm:block"
        >
          {t('logout')}
        </button>
        <button
          onClick={onMenuClick}
          className="hamburger-btn p-2 hover:bg-[#efe6ff] rounded-2xl transition"
        >
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
};
