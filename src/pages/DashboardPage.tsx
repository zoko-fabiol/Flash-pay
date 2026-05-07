import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { db } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';

import { ArrowRight, History, Send, Shield, Share2, Sparkles, TrendingUp, Globe, Gift } from 'lucide-react';

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

export const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();
  const { t, formatNumber, formatDate, language } = useLanguage();
  const navigate = useNavigate();
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState(7.22);
  const [referralBonus, setReferralBonus] = useState(500);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const unsubRates = onSnapshot(collection(db, 'exchange_rates'), (snapshot) => {
      const rubToXaf = snapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .find((rate) => rate.from === 'RUB' && rate.to === 'XAF');

      setExchangeRate(rubToXaf?.rate || 7.22);
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

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">{t('loading')}</div>;
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20">
        {/* Banner Section */}
        {/* Banner Section - M3 Expressive Style */}
        <section className="relative overflow-hidden rounded-[32px] bg-[#6750A4] p-8 text-white shadow-xl">
          {/* Background Pattern */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#EADDFF]/10 blur-3xl"></div>
          <div className="absolute right-0 top-0 h-full w-1/2 opacity-10 flex items-center justify-center">
             <Globe size={240} className="text-white translate-x-12 translate-y-4" />
          </div>

          <div className="relative z-10">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white/90 mb-6">{t('dashboard')}</span>
            <h1 className="text-4xl font-black leading-[1.1] sm:text-6xl tracking-tight">{t('welcome')}, <br/>{user?.nom?.split(' ')[0] || t('user')}</h1>
            <p className="mt-6 max-w-[240px] text-base font-medium text-white/70 leading-relaxed">
              {t('transfer_funds')}
            </p>
            <div className="mt-10">
              <button onClick={() => navigate('/transfer')} className="inline-flex items-center gap-3 rounded-full bg-[#EADDFF] px-8 py-5 text-sm font-black text-[#21005D] shadow-2xl hover:scale-105 transition-all">
                {t('start_transfer')} <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </section>

        {/* Referral Section */}
        <section className="bg-[#E8DEF8] rounded-[32px] p-8 relative overflow-hidden border border-[#D0BCFF]/20">
          <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="max-w-[75%]">
              <h3 className="text-2xl font-black text-[#1D192B] leading-tight tracking-tight">
                {t('earn_referral', { amount: formatNumber(referralBonus, 'RUB') })}
              </h3>
            </div>
            <div className="bg-[#FEF7FF] px-4 py-2 rounded-2xl flex items-center gap-2 text-[#6750A4] font-black text-[10px] uppercase shadow-sm">
              <Gift size={16} /> {t('promo')}
            </div>
          </div>

          <div className="flex items-center gap-8 relative z-10">
            <div className="flex flex-col gap-4 flex-1">
              <button onClick={() => navigate('/referral')} className="w-full sm:w-fit px-8 py-4 bg-[#6750A4] text-white font-black rounded-full shadow-lg text-sm transition-transform active:scale-95">
                {t('refer_now')}
              </button>
            </div>
            
            <div className="hidden sm:flex w-28 h-28 items-center justify-center bg-[#FEF7FF] rounded-[32px] shadow-inner">
                <Gift size={56} className="text-[#6750A4]" />
            </div>
          </div>
        </section>

        {/* Exchange Rate Section */}
        <section>
          <div className="bg-[#EADDFF] rounded-[32px] p-8 border border-[#D0BCFF]/30">
            <div className="flex items-center justify-between mb-6">
              <div className="px-4 py-2 bg-[#FEF7FF] rounded-xl flex items-center gap-2 text-[#21005D] shadow-sm font-black text-xs">
                <Globe size={16} /> {t('current_rate_title')}
              </div>
              <TrendingUp className="text-[#6750A4]" size={24} />
            </div>
            <p className="text-[10px] font-black text-[#21005D]/60 uppercase tracking-[0.2em] mb-3">{t('rub_rate_info')}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl font-black text-[#21005D] tracking-tighter">
                {exchangeRate.toLocaleString(language === 'en' ? 'en-US' : language === 'ru' ? 'ru-RU' : 'fr-FR')}
              </span>
              <span className="text-2xl font-black text-[#21005D]/40">XAF</span>
            </div>
          </div>
        </section>


        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-[#eadfff] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6236CC]">{t('account')}</p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">{t('kyc_status')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('verification_level')}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${
                getKycStatus(user) === 'blocked' ? 'bg-orange-100 text-orange-800' :
                getKycStatus(user) === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                getKycStatus(user) === 'pending' ? 'bg-amber-100 text-amber-700' :
                getKycStatus(user) === 'rejected' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {t(`kyc_${getKycStatus(user)}`)}
              </span>
            </div>
            <div className="mt-5 rounded-[24px] bg-slate-50 p-5">
              <p className="text-sm text-slate-500">{t('available_bonus')}</p>
              <p className="mt-2 text-3xl font-black text-[#6236CC]">{formatNumber(user?.solde_bonus || 0, 'XAF')}</p>
              <p className="mt-1 text-sm text-slate-500">{t('use_on_transfers')}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#eadfff] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6236CC]">{t('activity')}</p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">{t('recent_transactions')}</h3>
              </div>
              <button onClick={() => navigate('/transactions')} className="text-sm font-semibold text-[#6236CC]">
                {t('see_all')}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <button key={tx.id} onClick={() => navigate(`/transactions/${tx.id}`)} className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-4 text-left transition-all hover:border-[#6236CC]/30 hover:bg-white">
                    <div>
                      <p className="font-semibold text-slate-900">{tx.recipientName || t('unknown_recipient')}</p>
                      <p className="text-sm text-slate-500">{formatDate(tx.createdAt?.toDate?.() || tx.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#6236CC]">{formatNumber(tx.amount, tx.currency)}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{t(`status_${(tx.status || 'pending').toLowerCase()}`)}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-200 p-8 text-center text-slate-500">
                  {t('no_transactions')}
                </div>
              )}
            </div>
          </div>
        </section>


      </div>
    </Layout>
  );
};

interface QuickActionCardProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="rounded-[24px] border border-white/70 bg-white p-5 text-center shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(98,54,204,0.10)]"
    >
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6236CC]/10">{icon}</div>
      <span className="font-semibold text-slate-900">{label}</span>
    </button>
  );
};
