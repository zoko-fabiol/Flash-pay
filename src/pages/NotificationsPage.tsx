import React from 'react';
import { Layout } from '../components/Layout';
import { Bell } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const NotificationsPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 pb-10 px-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">{t('notifications') || 'Notifications'}</h1>
          <p className="text-slate-500 font-medium">{t('notifications_desc') || 'Centre de notifications'}</p>
        </div>
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm p-12 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#f7f3ff] flex items-center justify-center">
            <Bell size={28} className="text-[#6236CC]" />
          </div>
          <p className="font-bold text-slate-900">Aucune notification</p>
          <p className="text-sm text-slate-400">Vous n'avez pas de nouvelles notifications.</p>
        </div>
      </div>
    </Layout>
  );
};
