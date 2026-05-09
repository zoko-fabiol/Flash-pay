import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { 
  ArrowRight, 
  TrendingUp, 
  Shield, 
  Gift, 
  Globe,
  CreditCard,
  Smartphone,
  History,
  Zap
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const [exchangeRate, setExchangeRate] = useState(7.22);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralBonus, setReferralBonus] = useState(500);

  useEffect(() => {
    const unsubRates = onSnapshot(collection(db, 'exchange_rates'), (snapshot) => {
      const rates = snapshot.docs.map(doc => doc.data());
      const rateObj = rates.find(r => r.from === 'RUB' && r.to === 'XAF');
      if (rateObj) setExchangeRate(rateObj.rate);
      setLoading(false);
    });

    const unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      if (!snapshot.empty) {
        const settings = snapshot.docs[0].data();
        if (settings.referralBonusRUB) {
          setReferralBonus(settings.referralBonusRUB);
        }
      }
    });

    const userId = user?.id;
    const unsubTransactions = userId
      ? onSnapshot(query(collection(db, 'transactions'), where('userId', '==', userId)), (snapshot) => {
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as any[];
          data.sort((a, b) => {
            const t1 = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
            const t2 = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
            return t2 - t1;
          });
          setRecentTransactions(data.slice(0, 3));
        })
      : undefined;

    return () => {
      unsubRates();
      unsubSettings();
      unsubTransactions?.();
    };
  }, [user?.id]);

  const getKycStatus = (user: any) => {
    const blockedUntil = user?.kyc?.nextEligibilityDate?.toMillis?.();
    if (user?.kyc?.status === 'blocked' || (blockedUntil && blockedUntil > Date.now())) {
      return 'blocked';
    }
    return user?.kyc?.status ?? (
      user?.statut_kyc === 'Expert' ? 'approved' :
      user?.statut_kyc === 'Pending' ? 'pending' :
      user?.statut_kyc === 'Rejected' ? 'rejected' :
      'not_started'
    );
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t('loading')}</div>;
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Banner Section - Matching Screenshot */}
        <section className="relative mx-2 min-h-[220px] overflow-hidden rounded-[34px] bg-gradient-to-br from-[#6A44D3] via-[#5833B4] to-[#33206F] p-7 text-white shadow-[0_24px_60px_rgba(33,16,82,0.28)] sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.1),transparent_26%)]" />
          <div className="absolute inset-y-0 right-0 w-[70%] opacity-45 pointer-events-none overflow-hidden">
            <svg viewBox="0 0 200 200" className="h-full w-full translate-x-12 text-white">
              <defs>
                <pattern id="banner-dots" x="0" y="0" width="4.5" height="4.5" patternUnits="userSpaceOnUse">
                  <circle cx="1.2" cy="1.2" r="0.9" fill="currentColor" opacity="0.6" />
                </pattern>
                <mask id="banner-africa-mask">
                  <path fill="white" d="M85.4,32.2c-2.3,0.9-4.5,2.1-6.6,3.6c-2.1,1.5-4,3.2-5.7,5.2c-1.7,2-3.1,4.2-4.2,6.6c-1.1,2.4-1.8,5-2.2,7.7c-0.4,2.7-0.4,5.5,0,8.3c0.4,2.8,1.2,5.5,2.4,8.1c1.2,2.6,2.8,5,4.8,7.2c2,2.2,4.3,4.1,6.8,5.7c2.5,1.6,5.2,2.9,8.1,3.8c2.9,0.9,5.9,1.4,8.9,1.5c3,0.1,6.1,0,9.1-0.4c3-0.4,6-1.1,8.9-2.1c2.9-1,5.6-2.4,8.1-4c2.5-1.6,4.8-3.5,6.8-5.7c2-2.2,3.6-4.6,4.8-7.2c1.2-2.6,2-5.3,2.4-8.1c0.4-2.8,0.4-5.6,0-8.3c-0.4-2.7-1.1-5.3-2.2-7.7c-1.1-2.4-2.5-4.6-4.2-6.6c-1.7-2-3.6-3.7-5.7-5.2c-2.1-1.5-4.3-2.7-6.6-3.6c-2.3-0.9-4.7-1.5-7.1-1.8C95.2,30.3,90.3,30.8,85.4,32.2z M100,20c15-5,35,0,45,15c5,10,5,25,15,35c10,10,25,5,35,15c10,10,5,30,0,45c-5,15-15,20-20,35c-5,15,5,35-5,50c-10,15-30,10-45,25c-15,15-5,35-25,40c-20,5-35-10-45-25c-10-15-5-35-20-50c-15-15-35-5-40-20c-5-15,10-30,20-45c10-15,5-30,15-45c10-15,30-10,40-25C80,30,85,25,100,20z" />
                </mask>
              </defs>
              <rect width="200" height="200" fill="url(#banner-dots)" mask="url(#banner-africa-mask)" />
            </svg>
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between gap-6">
            <div className="space-y-3 pr-24 sm:pr-32">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-white/60">
                {t('dashboard')}
              </p>
              <h1 className="max-w-[220px] text-[2.05rem] font-black leading-[1.02] tracking-tight sm:max-w-[290px] sm:text-[2.7rem]">
                {t('welcome')}, {user?.nom?.split(' ')[0] || t('user')}
              </h1>
              <p className="max-w-[230px] text-sm font-medium leading-relaxed text-white/72 sm:max-w-[260px]">
                {t('transfer_funds')}
              </p>
            </div>

            <div>
              <button 
                onClick={() => navigate('/transfer')} 
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-[#5030B1] shadow-[0_10px_24px_rgba(14,8,42,0.2)] transition-transform active:scale-95"
              >
                {t('start_transfer')} 
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Referral Card - Matching Screenshot */}
        <section className="relative mx-2 overflow-hidden rounded-[32px] bg-[#F5F3FF] p-6 shadow-sm border border-[#E9E4FF]">
          <div className="flex justify-between items-start">
            <div className="space-y-6 flex-1 pr-4">
              <h3 className="text-lg font-bold text-slate-800 leading-snug">
                {t('earn_referral', { amount: formatNumber(referralBonus, 'RUB') })}
              </h3>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/referral')} 
                  className="rounded-xl bg-[#6236CC] px-5 py-2.5 text-sm font-bold text-white shadow-md active:scale-95 transition-all"
                >
                  {t('refer_now')}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
               <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-[10px] font-bold text-[#6236CC] shadow-sm border border-[#E9E4FF]">
                 <Gift size={12} /> {t('special_offer')}
               </div>
               <div className="mt-2 scale-110">
                 {/* Placeholder for gift box illustration */}
                 <Gift size={80} className="text-[#A78BFA]" />
               </div>
            </div>
          </div>
        </section>

        <div className="px-4 pt-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4">{t('current_rate_title')}</h2>
          
          {/* Exchange Rate Card - Matching Screenshot */}
          <section className="rounded-[32px] bg-[#F8F7FF] p-8 border border-[#F0EFFF]">
            <div className="space-y-4">
               <div>
                 <p className="text-lg font-bold text-[#6236CC]">RUB</p>
                 <p className="text-xs font-bold text-slate-400">RUB vers XAF</p>
               </div>
               <div className="flex items-baseline gap-2">
                 <span className="text-3xl font-bold text-[#6236CC]">
                   {exchangeRate.toLocaleString(language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'fr-FR')}
                 </span>
                 <span className="text-xl font-bold text-[#6236CC]">XAF</span>
               </div>
            </div>
          </section>
        </div>

        {/* Recent Transactions Section */}
        <section className="px-4 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">{t('recent_transactions')}</h3>
            <button 
              onClick={() => navigate('/transactions')} 
              className="text-sm font-bold text-primary"
            >
              {t('see_all')}
            </button>
          </div>

          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <button 
                  key={tx.id} 
                  onClick={() => navigate(`/transactions/${tx.id}`)} 
                  className="flex w-full items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-50 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-primary font-bold">
                      {tx.recipientName?.charAt(0) || '?'}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 text-sm">
                        {tx.recipientName || t('unknown_recipient')}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 text-sm">
                      {formatNumber(tx.amount, tx.currency)}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-100 p-8 text-center text-slate-300">
                <p className="text-xs font-bold uppercase tracking-widest">{t('no_transactions')}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};

