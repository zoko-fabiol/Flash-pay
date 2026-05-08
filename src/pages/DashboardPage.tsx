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
  History
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
      <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Banner Section - M3 Expressive Style */}
        <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#6750A4] via-[#6236CC] to-[#4d259f] p-6 sm:p-12 text-white shadow-2xl shadow-[#6236CC]/20 mx-2">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-[100px] animate-pulse"></div>
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-10 flex items-center justify-center">
             <Globe size={320} className="text-white translate-x-20 translate-y-10 rotate-12" />
          </div>

          <div className="relative z-10 space-y-8">
            <span className="inline-block px-5 py-2 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-black uppercase tracking-[0.4em] text-white/90 border border-white/10 shadow-sm">{t('dashboard')}</span>
            <h1 className="text-4xl font-black leading-[1.1] sm:text-5xl tracking-tighter drop-shadow-lg">
              {t('welcome')}, <br/>
              <span className="text-white/60">{user?.nom?.split(' ')[0] || t('user')}</span>
            </h1>
            <p className="max-w-[280px] text-base font-medium text-white/70 leading-relaxed uppercase tracking-widest text-[11px]">
              {t('transfer_funds')}
            </p>
            <div className="pt-4">
              <button 
                onClick={() => navigate('/transfer')} 
                className="group inline-flex items-center gap-4 rounded-full bg-white px-10 py-5 text-sm font-black text-[#21005D] shadow-2xl hover:translate-y-[-4px] active:scale-95 transition-all"
              >
                {t('start_transfer')} 
                <div className="p-1 bg-[#6236CC]/10 rounded-full group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={22} />
                </div>
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2 px-2">
          {/* Referral Section - Glassmorphism */}
          <section className="bg-gradient-to-br from-[#E8DEF8] to-[#F3EDF7] rounded-[40px] p-6 sm:p-10 relative overflow-hidden border border-[#D0BCFF]/30 shadow-xl shadow-[#6236CC]/5">
            <div className="flex justify-between items-start mb-10 relative z-10">
              <div className="max-w-[80%] space-y-3">
                <div className="bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl inline-flex items-center gap-2 text-[#6750A4] font-black text-[10px] uppercase border border-white/40 shadow-sm">
                  <Gift size={16} /> {t('promo')}
                </div>
                <h3 className="text-3xl font-black text-[#1D192B] leading-tight tracking-tight">
                  {t('earn_referral', { amount: formatNumber(referralBonus, 'RUB') })}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-10 relative z-10">
              <div className="flex-1">
                <button 
                  onClick={() => navigate('/referral')} 
                  className="w-full sm:w-fit px-10 py-5 bg-[#6750A4] text-white font-black uppercase text-xs tracking-widest rounded-full shadow-2xl shadow-[#6750A4]/30 transition-all hover:translate-y-[-2px] active:scale-95"
                >
                  {t('refer_now')}
                </button>
              </div>
              
              <div className="hidden sm:flex w-32 h-32 items-center justify-center bg-white/40 backdrop-blur-lg rounded-[40px] shadow-sm border border-white/40 rotate-6 group hover:rotate-12 transition-transform">
                  <Gift size={64} className="text-[#6750A4] drop-shadow-sm" />
              </div>
            </div>
            
            {/* Decor */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#6750A4]/5 rounded-full blur-3xl"></div>
          </section>

          {/* Exchange Rate Section - High Contrast */}
          <section className="bg-white rounded-[40px] p-6 sm:p-10 border border-[#eadfff] shadow-xl shadow-slate-900/5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-10">
              <div className="px-5 py-2.5 bg-[#F3EDF7] rounded-2xl flex items-center gap-3 text-[#21005D] font-black text-[11px] uppercase tracking-widest border border-[#eadfff] shadow-sm">
                <Globe size={18} /> {t('current_rate_title')}
              </div>
              <div className="p-3 bg-[#EADDFF] rounded-2xl text-[#6750A4] group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
            </div>
            
            <div className="space-y-4">
               <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">{t('rub_rate_info')}</p>
               <div className="flex items-baseline gap-4">
                 <span className="text-5xl font-black text-slate-900 tracking-tighter sm:text-6xl">
                   {exchangeRate.toLocaleString(language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'fr-FR')}
                 </span>
                 <span className="text-2xl font-black text-slate-300 tracking-tight uppercase">XAF</span>
               </div>
            </div>

            {/* Background Accent */}
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#F3EDF7] rounded-full blur-3xl -z-10 group-hover:bg-[#EADDFF] transition-colors"></div>
          </section>
        </div>

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] px-2">
          {/* Account/KYC Card */}
          <div className="rounded-[40px] border border-[#eadfff] bg-white p-6 sm:p-10 shadow-xl shadow-slate-900/5 space-y-8">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#6236CC]">{t('account')}</p>
              <div className="p-3 bg-[#F3EDF7] rounded-2xl text-[#6236CC]">
                <Shield size={22} />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 pb-6 border-b border-slate-50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('kyc_status')}</h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-400 font-bold uppercase tracking-widest opacity-60">{t('verification_level')}</p>
              </div>
              <span className={`rounded-xl px-4 sm:px-5 py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm border border-current/10 shrink-0 ${
                getKycStatus(user) === 'blocked' ? 'bg-orange-50 text-orange-600' :
                getKycStatus(user) === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                getKycStatus(user) === 'pending' ? 'bg-amber-50 text-amber-600' :
                getKycStatus(user) === 'rejected' ? 'bg-rose-50 text-rose-600' :
                'bg-slate-50 text-slate-500'
              }`}>
                {t(`kyc_${getKycStatus(user)}`)}
              </span>
            </div>

            <div className="rounded-[32px] bg-gradient-to-br from-[#F3EDF7] to-white p-8 border border-[#eadfff] space-y-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('available_bonus')}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-[#6236CC] tracking-tighter">{formatNumber(user?.solde_bonus || 0, 'XAF')}</p>
              </div>
              <p className="text-[11px] font-bold text-slate-400 leading-relaxed">{t('use_on_transfers')}</p>
            </div>
          </div>

          {/* Activity/Recent Transactions Card */}
          <div className="rounded-[40px] border border-[#eadfff] bg-white p-6 sm:p-10 shadow-xl shadow-slate-900/5 space-y-8">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#6236CC]">{t('activity')}</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('recent_transactions')}</h3>
              </div>
              <button 
                onClick={() => navigate('/transactions')} 
                className="px-6 py-3 bg-[#F3EDF7] text-[#6236CC] font-black text-[11px] uppercase tracking-widest rounded-full hover:bg-[#6236CC] hover:text-white transition-all shadow-sm"
              >
                {t('see_all')}
              </button>
            </div>

            <div className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <button 
                    key={tx.id} 
                    onClick={() => navigate(`/transactions/${tx.id}`)} 
                    className="group relative flex w-full flex-col gap-4 rounded-[32px] border border-slate-100 bg-white p-5 transition-all duration-300 hover:shadow-2xl hover:shadow-[#6236CC]/10 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F8F9FC] border border-slate-50 font-black text-[#6236CC] shadow-sm transition-transform duration-500 group-hover:scale-110">
                        {tx.recipientName?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h4 className="truncate text-lg font-black tracking-tight text-slate-900 transition-colors group-hover:text-[#6236CC]">
                          {tx.recipientName || t('unknown_recipient')}
                        </h4>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-50 pt-4 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
                      <div className="text-xl font-black tracking-tighter text-slate-900">
                        {formatNumber(tx.amount, tx.currency)}
                      </div>
                      <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                        (tx.status || 'pending').toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                        (tx.status || 'pending').toLowerCase() === 'failed' ? 'bg-rose-50 text-rose-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                         <div className="h-1 w-1 rounded-full bg-current opacity-50 animate-pulse" />
                         {t(`status_${(tx.status || 'pending').toLowerCase()}`)}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[32px] border-2 border-dashed border-[#eadfff] p-12 text-center text-slate-400 bg-[#F8F9FC]/50">
                  <div className="text-3xl mb-4 opacity-30">📂</div>
                  <p className="text-sm font-black uppercase tracking-widest">{t('no_transactions')}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

