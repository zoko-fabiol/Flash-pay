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
    <header className="px-5 pb-1.5 flex justify-between items-center sticky top-0 z-50 shadow-sm safe-top-padding border-b"
      style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'var(--border-light)',
      }}
    >
      <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
        <img src="/header-logo.png" alt="Flash Pay" className="h-8 w-auto object-contain dark:brightness-200 dark:saturate-0 dark:invert" />
      </div>
      
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold hidden sm:block" style={{ color: 'var(--text-muted)' }}>
          {user?.nom || 'Invité'}
        </span>
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        <NotificationBell />
        <button
          onClick={handleLogout}
          className="text-xs font-bold px-4 py-2 rounded-full border-2 transition hidden sm:block hover:border-slate-300 dark:hover:border-slate-600"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-muted)',
          }}
        >
          {t('logout')}
        </button>
        <button
          onClick={onMenuClick}
          className="hamburger-btn flex items-center justify-center p-2 rounded-2xl transition dark:hover:bg-white/10 hover:bg-[#efe6ff]"
          style={{ color: 'var(--text-primary)' }}
        >
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
};
