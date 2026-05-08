import React from 'react';
import { Layout } from '../components/Layout';
import { Bell, Check, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';

const formatRelativeDate = (value: any) => {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'A l\'instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Il y a ${diffDays} j`;

  return date.toLocaleDateString('fr-FR');
};

export const NotificationsPage: React.FC = () => {
  const { t } = useLanguage();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 pb-10 px-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">{t('notifications') || 'Notifications'}</h1>
          <p className="text-slate-500 font-medium">{t('notifications_desc') || 'Centre de notifications'}</p>
        </div>

        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-5 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout est lu'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck size={14} /> Tout marquer lu
            </button>
            <button
              onClick={clearAllNotifications}
              disabled={notifications.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} /> Tout effacer
            </button>
          </div>
        </div>

        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm overflow-hidden">
          {isLoading && (
            <div className="p-10 flex flex-col items-center text-center gap-3 text-slate-500">
              <Loader2 className="animate-spin" size={24} />
              <span className="font-semibold">Chargement des notifications...</span>
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="p-12 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#f7f3ff] flex items-center justify-center">
                <Bell size={28} className="text-[#6236CC]" />
              </div>
              <p className="font-bold text-slate-900">Aucune notification</p>
              <p className="text-sm text-slate-400">Vous n'avez pas de nouvelles notifications.</p>
            </div>
          )}

          {!isLoading && notifications.length > 0 && (
            <div className="divide-y divide-slate-100">
              {notifications.map((item) => (
                <div key={item.id} className="px-5 py-4 flex gap-3">
                  <div className={`mt-1 w-2.5 h-2.5 rounded-full ${item.read ? 'bg-slate-200' : 'bg-[#6236CC]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatRelativeDate(item.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!item.read && (
                          <button
                            onClick={() => markAsRead(item.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                            title="Marquer comme lu"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mt-2 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
