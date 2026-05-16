import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { Loading } from '../components/UI';
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

import { PWAInstallPrompt } from '../components/PWAInstallPrompt';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralBonus, setReferralBonus] = useState(500);
  const [showReferral, setShowReferral] = useState(() => {
    return sessionStorage.getItem('hide_referral_card') !== 'true';
  });

  const handleIgnoreReferral = () => {
    setShowReferral(false);
    sessionStorage.setItem('hide_referral_card', 'true');
  };

  useEffect(() => {
    const unsubRates = onSnapshot(collection(db, 'exchange_rates'), (snapshot) => {
      const globalRates = snapshot.docs.map(doc => doc.data());
      onSnapshot(collection(db, 'custom_rates'), (snapshot2) => {
        const customRates = snapshot2.docs.map(doc => doc.data());
        const allRates = [...globalRates, ...customRates];
        const foundRate = allRates.find(r => r.from === 'RUB' && r.to === 'XAF');
        const inverseRate = !foundRate ? allRates.find(r => r.from === 'XAF' && r.to === 'RUB') : null;
        
        const rate = foundRate?.rate || foundRate?.rateFixed || (inverseRate ? (1 / (inverseRate.rate || inverseRate.rateFixed)) : 1.0);
        setExchangeRate(rate);
        setLoading(false);
      });
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
    return <Loading fullScreen />;
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-6 pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Banner Section - Matching Screenshot */}
        <section className="relative min-h-[220px] overflow-hidden rounded-[34px] bg-gradient-to-br from-[#6344B6] via-[#4A3191] to-[#2A083B] p-7 text-white shadow-[0_24px_60px_rgba(42,8,59,0.28)] sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.1),transparent_26%)]" />
          <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
            <img 
              src="/map-bg.jpg" 
              alt="" 
              className="h-full w-full object-cover translate-x-[20%] scale-110"
              style={{ 
                filter: 'invert(1)',
                mixBlendMode: 'screen'
              }}
            />
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
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-[#6344B6] shadow-[0_10px_24px_rgba(42,8,59,0.2)] transition-transform active:scale-95"
              >
                {t('start_transfer')} 
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        <PWAInstallPrompt />

        {showReferral && (
          <section className="relative overflow-hidden rounded-[28px] bg-[#FDF7FF] p-5 shadow-sm border border-[#F3E8FF]">
            <div className="flex justify-between items-start">
              <div className="space-y-4 flex-1 pr-4">
                <h3 className="text-[15px] font-bold text-slate-800 leading-snug">
                  {t('earn_referral', { amount: formatNumber(referralBonus, 'RUB') })}
                </h3>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => navigate('/referral')} 
                    className="rounded-xl bg-[#6344B6] px-4 py-2 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
                  >
                    {t('refer_now')}
                  </button>
                  <button 
                    onClick={handleIgnoreReferral}
                    className="text-[10px] font-bold text-slate-400 hover:text-[#6344B6] transition-colors uppercase tracking-wider"
                  >
                    {t('ignore')}
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                 <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[9px] font-bold text-[#6344B6] shadow-sm border border-[#F3E8FF]">
                   <Gift size={10} /> {t('special_offer')}
                 </div>
                 <div className="mt-1 scale-100">
                   {/* Placeholder for gift box illustration */}
                   <Gift size={60} className="text-[#D8B4FE]" />
                 </div>
              </div>
            </div>
          </section>
        )}



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

