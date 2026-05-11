import React from 'react';
import { useAdminNotifications } from '../../context/AdminNotificationContext';
import { useNavigate } from 'react-router-dom';
import { 
  HistoryProIcon, 
  KycProIcon, 
  ProblemsProIcon, 
  ShieldProIcon, 
  SettingsProIcon,
  CloseProIcon
} from '../../components/ui/ProIcons';
import type { AdminNotification } from '../../services/adminInternalNotificationService';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearRead 
  } = useAdminNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'transaction': return <HistoryProIcon size={20} />;
      case 'kyc': return <KycProIcon size={20} />;
      case 'support': return <ProblemsProIcon size={20} />;
      case 'security': return <ShieldProIcon size={20} />;
      default: return <SettingsProIcon size={20} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transaction': return 'bg-blue-50 text-blue-600';
      case 'kyc': return 'bg-purple-50 text-purple-600';
      case 'support': return 'bg-amber-50 text-amber-600';
      case 'security': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Notifications Admin</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {unreadCount > 0 
              ? `Vous avez ${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}.` 
              : "Toutes les notifications ont été lues."}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={markAllAsRead}
            className="px-4 py-2 bg-white text-slate-600 text-xs font-bold uppercase tracking-widest border border-slate-200 rounded-full hover:bg-slate-50 transition-all shadow-sm"
          >
            Tout marquer comme lu
          </button>
          <button 
            onClick={clearRead}
            className="px-4 py-2 bg-[#F9DEDC] text-[#B3261E] text-xs font-bold uppercase tracking-widest border border-[#F2B8B5] rounded-full hover:bg-[#F2B8B5] transition-all shadow-sm"
          >
            Effacer les lues
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-[32px] p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
              <ShieldProIcon size={32} />
            </div>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Aucune notification</p>
            <p className="text-slate-400 text-xs mt-1">Les alertes système apparaîtront ici en temps réel.</p>
          </div>
        ) : (
          notifications.map((notification: AdminNotification) => (
            <div 
              key={notification.id}
              onClick={async () => {
                if (!notification.read) await markAsRead(notification.id);
                if (notification.link) {
                  // Clean the link to remove legacy /admin prefix
                  const targetLink = notification.link.startsWith('/admin') 
                    ? notification.link.replace('/admin', '') 
                    : notification.link;
                  navigate(targetLink || '/');
                }
              }}
              className={`
                group relative bg-white border rounded-[24px] p-5 flex items-start gap-4 transition-all cursor-pointer shadow-sm hover:shadow-md
                ${notification.read ? 'border-slate-100 opacity-75' : 'border-[#EADDFF] ring-1 ring-[#470B37]/5 shadow-[#470B37]/5'}
              `}
            >
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                ${getTypeColor(notification.type)}
              `}>
                {getIcon(notification.type)}
              </div>
              
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`text-sm font-black tracking-tight ${notification.read ? 'text-slate-700' : 'text-slate-900'}`}>
                    {notification.title}
                  </h4>
                  {!notification.read && (
                    <span className="w-1.5 h-1.5 bg-[#470B37] rounded-full"></span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {notification.body}
                </p>
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                  {notification.createdAt ? (
                    new Intl.DateTimeFormat('fr-FR', {
                      dateStyle: 'long',
                      timeStyle: 'short'
                    }).format(
                      notification.createdAt.toDate 
                        ? notification.createdAt.toDate() 
                        : (typeof notification.createdAt === 'number' || typeof notification.createdAt === 'string')
                          ? new Date(notification.createdAt)
                          : new Date()
                    )
                  ) : 'Date inconnue'}
                </p>
              </div>

              <button 
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-[#B3261E] hover:bg-[#F9DEDC]/50 rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                <CloseProIcon size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
