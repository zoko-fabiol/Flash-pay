import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();

  return (
    <button
      onClick={() => navigate('/notifications')}
      className="relative p-2 hover:bg-[#efe6ff] rounded-2xl transition"
      aria-label={t('notifications_open')}
    >
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] font-bold text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
