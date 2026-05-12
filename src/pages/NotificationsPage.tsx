import React from 'react';
import { Layout } from '../components/Layout';
import { Loading } from '../components/UI';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Loader2, 
  ArrowLeft, 
  ChevronRight, 
  Circle, 
  Info, 
  CreditCard, 
  ShieldCheck, 
  Gift, 
  AlertTriangle 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../types/notifications';

const normalizeText = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const formatRelativeDate = (value: any, t: (key: string, vars?: Record<string, any>) => string, language: string) => {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return t('notification_now');
  if (diffMinutes < 60) return t('notification_minutes_ago', { count: diffMinutes });

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return t('notification_hours_ago', { count: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return t('notification_days_ago', { count: diffDays });

  return date.toLocaleDateString(language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'fr-FR');
};

const translateNotificationText = (
  notification: Notification,
  t: (key: string, vars?: Record<string, any>) => string
) => {
  const title = normalizeText(notification.title || '');
  const body = normalizeText(notification.body || '');
  const type = normalizeText(String((notification as any).type || ''));
  const event = normalizeText(String((notification as any).event || notification.data?.event || ''));

  const txIdMatch = notification.body?.match(/#([A-Za-z0-9_-]{4,})/);
  const txId = txIdMatch?.[1];

  if (type === 'points_earned') {
    const pointsMatch = notification.body?.match(/(\d[\d\s.,]*)\s*points?/i);
    return {
      title: t('notification_points_received_title'),
      body: t('notification_points_received_body', { points: pointsMatch?.[1] || '' })
    };
  }

  if (type === 'transaction_update') {
    if (title.includes('completed') || title.includes('termine') || body.includes('success') || body.includes('succès') || body.includes('succes')) {
      return {
        title: t('notification_transfer_completed_title'),
        body: t('notification_transfer_completed_body', { id: txId || '' })
      };
    }
    if (title.includes('failed') || title.includes('echec') || body.includes('failed') || body.includes('echoué')) {
      return {
        title: t('notification_transfer_problem_title'),
        body: t('notification_transfer_problem_body')
      };
    }
    return {
      title: t('notification_transfer_update_title'),
      body: t('notification_transfer_update_body')
    };
  }

  if (type === 'transaction_problem') {
    return {
      title: t('notification_transfer_problem_title'),
      body: t('notification_transfer_problem_body')
    };
  }

  if (type === 'support_resolution') {
    return {
      title: t('notification_support_resolution_title'),
      body: t('notification_support_resolution_body')
    };
  }

  if (type === 'support') {
    return {
      title: t('notification_support_title'),
      body: t('notification_support_body')
    };
  }

  if (type === 'kyc') {
    if (event === 'approved' || title.includes('approved') || title.includes('approuve')) {
      return {
        title: t('notification_kyc_approved_title'),
        body: t('notification_kyc_approved_body')
      };
    }
    if (event === 'rejected' || title.includes('rejected') || title.includes('rejete')) {
      return {
        title: t('notification_kyc_rejected_title'),
        body: t('notification_kyc_rejected_body')
      };
    }
    return {
      title: t('notification_kyc_submitted_title'),
      body: t('notification_kyc_submitted_body')
    };
  }

  if (type === 'referral' || type === 'referral_reward') {
    return {
      title: t('notification_referral_title'),
      body: t('notification_referral_body')
    };
  }

  if (type === 'general' && (title.includes('welcome') || title.includes('bienvenue'))) {
    return {
      title: t('notification_welcome_title'),
      body: t('notification_welcome_body')
    };
  }

  if (title.includes('points de fidelite reçus') || title.includes('points de fidelite recus') || title.includes('points de fidelite')) {
    const pointsMatch = notification.body?.match(/(\d[\d\s.,]*)\s*points?/i);
    return {
      title: t('notification_points_received_title'),
      body: t('notification_points_received_body', { points: pointsMatch?.[1] || '' })
    };
  }

  if (title.includes('mise a jour de votre transfert') || title.includes('update de votre transfert') || title.includes('transfer update')) {
    return {
      title: t('notification_transfer_update_title'),
      body: t('notification_transfer_update_body')
    };
  }

  if (title.includes('transfert termine') || title.includes('transfer completed') || title.includes('transfer termine')) {
    return {
      title: t('notification_transfer_completed_title'),
      body: t('notification_transfer_completed_body', { id: txId || '' })
    };
  }

  if (title.includes('bienvenue sur flash pay') || title.includes('welcome to flash pay')) {
    return {
      title: t('notification_welcome_title'),
      body: t('notification_welcome_body')
    };
  }

  if (title.includes('probleme sur votre transfert') || title.includes('problem on your transfer')) {
    return {
      title: t('notification_transfer_problem_title'),
      body: notification.body?.replace(/probl[èe]me sur votre transfert/i, t('notification_transfer_problem_body')).replace(/on your transfer/i, t('notification_transfer_problem_body')) || t('notification_transfer_problem_body')
    };
  }

  if (title.includes('kyc soumis') || title.includes('kyc submitted')) {
    return {
      title: t('notification_kyc_submitted_title'),
      body: t('notification_kyc_submitted_body')
    };
  }

  if (title.includes('kyc approuve') || title.includes('kyc approved')) {
    return {
      title: t('notification_kyc_approved_title'),
      body: t('notification_kyc_approved_body')
    };
  }

  if (title.includes('kyc rejete') || title.includes('kyc rejected')) {
    return {
      title: t('notification_kyc_rejected_title'),
      body: t('notification_kyc_rejected_body')
    };
  }

  if (title.includes('nouveau parrainage') || title.includes('referral')) {
    return {
      title: t('notification_referral_title'),
      body: t('notification_referral_body')
    };
  }

  if (title.includes('ticket de support') || title.includes('support ticket')) {
    return {
      title: t('notification_support_title'),
      body: t('notification_support_body')
    };
  }

  if (body.includes('a été traité avec succès') || body.includes('has been processed successfully')) {
    return {
      title: t('notification_transfer_completed_title'),
      body: t('notification_transfer_completed_body', { id: txId || '' })
    };
  }

  return { title: notification.title, body: notification.body };
};

const NotificationIcon: React.FC<{ notification: Notification }> = ({ notification }) => {
  const title = (notification.title || '').toLowerCase();
  const body = (notification.body || '').toLowerCase();

  if (title.includes('transfert') || body.includes('transfert')) {
    return <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600"><CreditCard size={20} /></div>;
  }
  if (title.includes('kyc') || title.includes('vérification') || body.includes('identit')) {
    return <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600"><ShieldCheck size={20} /></div>;
  }
  if (title.includes('bonus') || title.includes('parrainage') || body.includes('cadeau')) {
    return <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Gift size={20} /></div>;
  }
  if (title.includes('alerte') || title.includes('attention') || body.includes('problème')) {
    return <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600"><AlertTriangle size={20} /></div>;
  }

  return <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600"><Info size={20} /></div>;
};

export const NotificationsPage: React.FC = () => {
  const { t, language } = useLanguage();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();
  const navigate = useNavigate();

  const totalLabel = t('notifications_total', { count: notifications.length });

  const handleNotificationClick = async (item: Notification) => {
    if (!item.read) await markAsRead(item.id);
    
    // Use deeplink or actionUrl first
    const targetLink = item.deeplink || item.actionUrl;
    if (targetLink) {
      // Check if it's an external URL
      if (targetLink.startsWith('http')) {
        window.open(targetLink, '_blank');
      } else {
        navigate(targetLink);
      }
      return;
    }

    const rawType = String((item as any).type || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const body = (item.body || '').toLowerCase();

    if (
      rawType === 'points_earned' ||
      title.includes('points') ||
      body.includes('points') ||
      title.includes('loyalty') ||
      body.includes('loyalty')
    ) {
      navigate('/profile#points');
      return;
    }

    // Smart fallback based on data or content
    const transferId = item.data?.transactionId || item.data?.transferId || item.data?.orderId || item.data?.id || item.id;
    if (transferId && (
      item.title?.toLowerCase().includes('transfert') || 
      item.body?.toLowerCase().includes('transfert') || 
      item.title?.toLowerCase().includes('transfer')
    )) {
      navigate(`/transactions/${transferId}`);
      return;
    }

    if (title.includes('kyc') || title.includes('vérification')) {
      navigate('/kyc');
    } else if (title.includes('bonus') || title.includes('parrainage')) {
      navigate('/referral');
    } else if (title.includes('profil') || title.includes('sécurité')) {
      navigate('/profile');
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto pb-20 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 pt-4">
          <button 
            onClick={() => navigate('/')} 
            className="w-fit inline-flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#661489] hover:opacity-70 transition-all group px-2"
          >
            <div className="p-2 bg-[#661489]/10 rounded-full group-hover:-translate-x-1 transition-transform">
              <ArrowLeft size={16} />
            </div>
            {t('back')}
          </button>

          <div className="flex items-end justify-between px-2">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1">{t('notifications')}</h1>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-wider opacity-60">
                {t('notifications_desc')}
              </p>
            </div>
            {unreadCount > 0 && (
              <div className="px-4 py-1.5 bg-[#661489] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-[#661489]/30">
                {unreadCount} {t('unread')}
              </div>
            )}
          </div>
        </div>

        {/* Action Bar - Glassmorphism */}
        <div className="sticky top-4 z-20 rounded-[28px] bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-xl shadow-slate-200/40 p-4 flex items-center justify-between gap-3 mx-1">
          <div className="flex items-center gap-2 pl-2">
            <Bell className={unreadCount > 0 ? "text-[#661489] animate-bounce" : "text-slate-400"} size={20} />
            <span className="text-sm font-bold text-slate-700">{totalLabel}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <CheckCheck size={16} /> <span className="hidden sm:inline">{t('mark_all_read')}</span>
            </button>
            <button
              onClick={clearAllNotifications}
              disabled={notifications.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-rose-100 text-rose-500 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Trash2 size={16} /> <span className="hidden sm:inline">{t('clear_all')}</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {isLoading ? (
            <Loading />
          ) : notifications.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center gap-6 bg-white rounded-[40px] border border-slate-100 shadow-sm px-10">
              <div className="w-24 h-24 rounded-[36px] bg-[#F5E8FF] flex items-center justify-center shadow-inner relative">
                <div className="absolute inset-0 bg-[#661489]/5 rounded-[36px] animate-ping duration-[3000ms]"></div>
                <Bell size={40} className="text-[#661489] relative z-10" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-black text-slate-900 tracking-tight">{t('no_notifications')}</p>
                <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">{t('no_notifications_desc')}</p>
              </div>
              <button 
                onClick={() => navigate('/')}
                className="mt-2 px-8 py-4 bg-[#661489] text-white font-black uppercase text-xs tracking-widest rounded-full shadow-2xl shadow-[#661489]/30 hover:scale-105 active:scale-95 transition-all"
              >
                {t('back_to_home')}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {notifications.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => handleNotificationClick(item)}
                  className={`group relative overflow-hidden rounded-[32px] border transition-all duration-300 hover:shadow-2xl hover:shadow-[#661489]/10 hover:-translate-y-1 cursor-pointer ${
                    item.read 
                      ? 'bg-white border-slate-100 opacity-90' 
                      : 'bg-gradient-to-br from-white to-[#f9f7ff] border-[#eadfff] shadow-lg shadow-[#661489]/5'
                  }`}
                >
                  <div className="p-6 flex gap-5">
                    {/* Left Icon Section */}
                    <div className="relative">
                      <NotificationIcon notification={item} />
                      {!item.read && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#661489] rounded-full border-2 border-white shadow-sm animate-pulse"></div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="space-y-1">
                          {(() => {
                            const translated = translateNotificationText(item, t);
                            return (
                              <p className={`font-black text-lg tracking-tight transition-colors ${item.read ? 'text-slate-800' : 'text-slate-900 group-hover:text-[#661489]'}`}>
                                {translated.title}
                              </p>
                            );
                          })()}
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <span>{formatRelativeDate(item.createdAt, t, language)}</span>
                            {!item.read && (
                              <>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span className="text-[#661489]">{t('new')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Inline Actions */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {!item.read && (
                            <button
                              onClick={() => markAsRead(item.id)}
                              className="p-2.5 rounded-xl hover:bg-[#661489]/10 text-[#661489] transition-colors"
                              title={t('mark_read')}
                            >
                              <Check size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(item.id)}
                            className="p-2.5 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <p className={`text-sm leading-relaxed mt-3 ${item.read ? 'text-slate-500' : 'text-slate-700 font-medium'}`}>
                        {translateNotificationText(item, t).body}
                      </p>
                      
                      <div className="mt-4 flex items-center text-[11px] font-black uppercase tracking-[0.15em] text-[#661489] transition-all group-hover:translate-x-1 w-fit bg-[#661489]/5 px-4 py-2 rounded-xl">
                        {t('view_details')} <ChevronRight size={14} className="ml-1" />
                      </div>
                      </div>
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

export default NotificationsPage;



