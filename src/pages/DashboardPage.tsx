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
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#6236CC] to-[#3B1F8C] p-8 text-white shadow-xl mx-2 min-h-[220px]">
          {/* Africa Map Background - Dotted Style */}
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-30 pointer-events-none">
            <svg viewBox="0 0 200 200" className="h-full w-full object-contain translate-x-8">
              <path fill="white" d="M106.1,23.1c-1.8-0.9-3.8-1.5-5.9-1.8c-2.1-0.3-4.2-0.3-6.3,0c-2.1,0.3-4.1,0.9-5.9,1.8c-1.8,0.9-3.4,2.2-4.7,3.7c-1.3,1.5-2.2,3.3-2.7,5.2c-0.5,1.9-0.5,3.9-0.2,5.8c0.3,1.9,1,3.7,2.1,5.2c1.1,1.5,2.5,2.8,4.1,3.7c1.6,0.9,3.4,1.5,5.2,1.8c1.8,0.3,3.7,0.3,5.5,0c1.8-0.3,3.5-0.9,5.1-1.8c1.6-0.9,2.9-2.2,4-3.7c1.1-1.5,1.8-3.3,2.2-5.2c0.4-1.9,0.4-3.9,0-5.8c-0.4-1.9-1.1-3.7-2.3-5.2C109.5,25.3,107.9,24,106.1,23.1z" opacity="0.05" />
              <path fill="currentColor" d="M85,35c-10,5-15,15-12,25c2,8,10,12,15,18c5,6,3,15,8,22c5,7,15,5,22,8c7,3,12,10,18,8c6-2,8-10,12-15c4-5,12-5,15-10c3-5,0-15-5-20c-5-5-15-8-25-10c-10-2-20-3-28-1c-8,2-15,10-20,15" opacity="0.1" />
              {/* Dotted pattern overlay - simplified for performance */}
              <defs>
                <pattern id="dots" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.2" fill="white" opacity="0.4" />
                </pattern>
              </defs>
              <rect width="200" height="200" fill="url(#dots)" mask="url(#africa-mask)" />
              <mask id="africa-mask">
                <path fill="white" d="M90,30c-15,5-25,20-20,40c3,15,15,20,20,35c5,15,0,30,10,45c10,15,30,10,40,25c10,15,5,35,20,40c15,5,25-10,35-20c10-10,15-25,10-40c-5-15-20-20-25-35c-5-15,5-30-5-45c-10-15-30-10-40-25c-10-15-5-35-20-40c-15-5-20,5-25,20" />
              </mask>
            </svg>
          </div>

          <div className="relative z-10 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              {t('dashboard')}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('welcome')}, {user?.nom?.split(' ')[0] || t('user')}
            </h1>
            <p className="max-w-[200px] text-sm font-medium text-white/70 leading-relaxed">
              {t('transfer_funds')}
            </p>
            <div className="pt-4">
              <button 
                onClick={() => navigate('/transfer')} 
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#6236CC] shadow-lg transition-transform active:scale-95"
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
                <button className="text-sm font-bold text-slate-500 hover:text-slate-700">
                  {t('ignore')}
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

