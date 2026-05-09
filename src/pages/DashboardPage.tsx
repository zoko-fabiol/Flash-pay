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
      ? onSnapshot(query(
          collection(db, 'transactions'), 
          where('userId', '==', userId),
          limit(30) // Fetch slightly more to handle client-side sorting if needed, but much less than infinity
        ), (snapshot) => {
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })) as any[];
          data.sort((a, b) => {
            const t1 = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
            const t2 = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
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
      <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Banner Section - Premium Glass Card */}
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-primary p-8 sm:p-14 text-white shadow-2xl shadow-primary/30 mx-2">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-[100px] animate-pulse"></div>
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-10 flex items-center justify-center">
             <Globe size={320} className="text-white translate-x-20 translate-y-10 rotate-12" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-white/90 border border-white/20 shadow-sm">
              <Zap size={14} className="text-accent" /> {t('dashboard')}
            </div>
            <h1 className="text-5xl font-bold leading-[1.1] sm:text-6xl tracking-tight">
              {t('welcome')}, <br/>
              <span className="text-white/70 font-light">{user?.nom?.split(' ')[0] || t('user')}</span>
            </h1>
            <p className="max-w-[320px] text-lg font-normal text-white/60 leading-relaxed">
              {t('transfer_funds')}
            </p>
            <div className="pt-6">
              <button 
                onClick={() => navigate('/transfer')} 
                className="group inline-flex items-center gap-4 rounded-2xl bg-white px-8 py-4 text-base font-bold text-primary shadow-xl hover:translate-y-[-4px] active:scale-95 transition-all"
              >
                {t('start_transfer')} 
                <div className="p-1 bg-primary/10 rounded-lg group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={20} />
                </div>
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2 px-2">
          {/* Exchange Rate Section - Bento Style */}
          <section className="premium-card p-8 group relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="px-4 py-2 bg-slate-50 rounded-xl flex items-center gap-3 text-slate-600 font-bold text-[11px] uppercase tracking-wider border border-slate-100 shadow-sm">
                <Globe size={18} className="text-primary" /> {t('current_rate_title')}
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
            </div>
            
            <div className="space-y-2">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('rub_rate_info')}</p>
               <div className="flex items-baseline gap-3">
                 <span className="text-6xl font-bold text-slate-900 tracking-tight">
                   {exchangeRate.toLocaleString(language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'fr-FR')}
                 </span>
                 <span className="text-2xl font-bold text-slate-300 uppercase">XAF</span>
               </div>
            </div>

            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl -z-10 group-hover:bg-primary/10 transition-colors"></div>
          </section>

          {/* Referral Section - Bento Style */}
          <section className="premium-card p-8 bg-gradient-to-br from-slate-50 to-white relative overflow-hidden border-primary/5">
            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="space-y-4">
                <div className="bg-primary/10 px-4 py-2 rounded-xl inline-flex items-center gap-2 text-primary font-bold text-[10px] uppercase">
                  <Gift size={16} /> {t('promo')}
                </div>
                <h3 className="text-3xl font-bold text-slate-900 leading-tight tracking-tight max-w-[280px]">
                  {t('earn_referral', { amount: formatNumber(referralBonus, 'RUB') })}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-6 relative z-10">
                <button 
                  onClick={() => navigate('/referral')} 
                  className="btn-primary w-full sm:w-auto"
                >
                  {t('refer_now')}
                </button>
            </div>
            
            <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] rotate-12">
                <Gift size={200} />
            </div>
          </section>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] px-2">
          {/* Account/KYC Card */}
          <div className="premium-card p-8 space-y-8">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{t('account')}</p>
              <div className="p-2.5 bg-slate-50 rounded-xl text-primary border border-slate-100">
                <Shield size={22} />
              </div>
            </div>
            
            <div className="flex flex-col gap-4 pb-6 border-b border-slate-50">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{t('kyc_status')}</h3>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{t('verification_level')}</p>
                <span className={`rounded-lg px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-current/10 ${
                  getKycStatus(user) === 'blocked' ? 'bg-orange-50 text-orange-600' :
                  getKycStatus(user) === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                  getKycStatus(user) === 'pending' ? 'bg-amber-50 text-amber-600' :
                  getKycStatus(user) === 'rejected' ? 'bg-rose-50 text-rose-600' :
                  'bg-slate-50 text-slate-500'
                }`}>
                  {t(`kyc_${getKycStatus(user)}`)}
                </span>
              </div>
            </div>

            <div className="rounded-3xl bg-slate-50 p-6 space-y-3 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('available_bonus')}</p>
              <p className="text-4xl font-bold text-primary tracking-tight">{formatNumber(user?.solde_bonus || 0, 'RUB')}</p>
              <p className="text-[11px] font-medium text-slate-400 leading-relaxed">{t('use_on_transfers')}</p>
            </div>
          </div>

          {/* Activity/Recent Transactions Card */}
          <div className="premium-card p-8 space-y-8">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{t('activity')}</p>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{t('recent_transactions')}</h3>
              </div>
              <button 
                onClick={() => navigate('/transactions')} 
                className="px-5 py-2.5 bg-slate-50 text-slate-600 font-bold text-[11px] uppercase tracking-wider rounded-xl hover:bg-primary hover:text-white transition-all border border-slate-100"
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
                    className="group flex w-full items-center justify-between rounded-2xl border border-slate-50 bg-white p-4 transition-all hover:bg-slate-50 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary font-bold group-hover:scale-110 transition-transform">
                        {tx.recipientName?.charAt(0) || '?'}
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-900 transition-colors group-hover:text-primary">
                          {tx.recipientName || t('unknown_recipient')}
                        </h4>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">
                        {formatNumber(tx.amount, tx.currency)}
                      </div>
                      <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${
                        (tx.status || 'pending').toLowerCase() === 'completed' ? 'text-emerald-600' :
                        (tx.status || 'pending').toLowerCase() === 'failed' ? 'text-rose-600' :
                        'text-amber-600'
                      }`}>
                         {t(`status_${(tx.status || 'pending').toLowerCase()}`)}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-3xl border-2 border-dashed border-slate-100 p-10 text-center text-slate-300">
                  <History size={40} className="mx-auto mb-3 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">{t('no_transactions')}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

