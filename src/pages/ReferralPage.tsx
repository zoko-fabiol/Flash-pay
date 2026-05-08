import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, db } from '../services/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { Copy, Share2, Users, Gift, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { copyToClipboard, nativeShare } from '../utils/capacitorUtils';
import toast from 'react-hot-toast';

export const ReferralPage: React.FC = () => {
  const { user } = useAuth();
  const { t, formatNumber } = useLanguage();
  const [referralCode, setReferralCode] = useState('');
  const [referredUsers, setReferredUsers] = useState<string[]>([]);
  const [totalBonus, setTotalBonus] = useState(0);
  const [invitedCount, setInvitedCount] = useState(0);
  const [rewardedCount, setRewardedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [referralBonusRUB, setReferralBonusRUB] = useState(500);

  useEffect(() => {
    const fetchReferralData = async () => {
      if (!user) return;
      try {
        const data = await userService.getReferralData(user.id);
        setReferralCode(data.referralCode);
        setReferredUsers(data.referredUsers);
        setTotalBonus(data.totalBonus);
        setInvitedCount(data.invitedCount || data.referredUsers.length);
        setRewardedCount(data.rewardedCount || 0);
        setPendingCount(data.pendingCount || 0);
      } catch (err) {
        console.error('Error fetching referral data:', err);
      }
    };
    fetchReferralData();

    const qSettings = query(collection(db, 'settings'), limit(1));
    const unsubscribeSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const settings = snapshot.docs[0].data();
        if (settings.referralBonusRUB) setReferralBonusRUB(settings.referralBonusRUB);
      }
    });
    return () => unsubscribeSettings();
  }, [user]);

  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopy = async () => {
    if (!referralCode) return;
    const ok = await copyToClipboard(referralLink);
    if (ok) {
      toast.success(t('link_copied') || 'Lien copié !');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    const ok = await copyToClipboard(referralCode);
    if (ok) {
      toast.success(t('code_copied') || 'Code copié !');
    }
  };

  const handleShare = async () => {
    await nativeShare({
      title: t('share_title'),
      text: t('share_text'),
      url: referralLink,
    });
  };

  const stats = [
    { icon: Users,     label: t('referred_users'),   value: invitedCount,   color: 'text-[#6236CC]',   bg: 'bg-[#f7f3ff]' },
    { icon: Gift,      label: t('total_bonus'),       value: formatNumber(totalBonus, 'RUB'), color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { icon: Clock,     label: t('pending_validated'), value: `${pendingCount} / ${rewardedCount}`, color: 'text-amber-700', bg: 'bg-amber-50' },
    { icon: TrendingUp,label: t('signup_commission'), value: formatNumber(referralBonusRUB, 'RUB'), color: 'text-blue-700', bg: 'bg-blue-50' },
  ];

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-6 pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Hero Section - Premium Glass Card */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 text-white shadow-xl">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-[60px] animate-pulse"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-xl">
              <Gift size={24} className="text-white" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight">{t('referral_title')}</h1>
              <p className="text-white/70 text-sm font-medium leading-relaxed max-w-xs">
                {t('referral_desc_bonus') || `Gagnez ${formatNumber(referralBonusRUB, 'RUB')} par ami parrainé.`}
              </p>
            </div>
          </div>
        </section>

        {/* Stats Grid - Premium Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="premium-card p-4 flex flex-col gap-3 group">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors`}>
                   <Icon size={14} />
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
              </div>
              <p className={`text-lg font-bold tracking-tight text-slate-900`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Referral Code + Link Card */}
        <div className="premium-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('referral_code')}</h2>
            <Sparkles className="text-primary/30" size={16} />
          </div>

          <div className="px-4 py-6 border-b border-slate-50 bg-slate-50/50">
            <div 
              onClick={handleCopyCode}
              className="bg-white border border-slate-100 rounded-2xl p-6 text-center cursor-pointer hover:shadow-lg active:scale-[0.98] transition-all group/code relative overflow-hidden"
            >
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t('votre_code_unique') || 'CODE UNIQUE'}</p>
              <p className="text-3xl font-bold text-primary tracking-tight break-all">{referralCode || '...'}</p>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <div 
              onClick={handleCopy}
              className={`flex items-center justify-between gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-all group ${!referralCode && 'opacity-50 pointer-events-none'}`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold px-1 truncate transition-colors ${copied ? 'text-emerald-500' : 'text-slate-400 group-hover:text-primary'}`}>{referralLink}</p>
              </div>
              <Copy size={16} className={copied ? 'text-emerald-500 animate-bounce' : 'text-slate-300 group-hover:text-primary'} />
            </div>
            <button
              onClick={handleShare}
              disabled={!referralCode}
              className="btn-primary w-full py-4 text-xs uppercase tracking-widest font-bold"
            >
              <Share2 size={16} /> {t('share')}
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="premium-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-slate-50">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('how_it_works')}</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { num: 1, title: t('step1_title'), desc: t('step1_desc'), icon: Share2 },
              { num: 2, title: t('step2_title'), desc: t('step2_desc'), icon: Users },
              { num: 3, title: t('step3_title'), desc: t('step3_desc'), icon: Gift },
            ].map(({ num, title, desc, icon: StepIcon }) => (
              <div key={num} className="flex gap-4 px-5 py-4 items-start group hover:bg-slate-50/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0 shadow-sm">
                  <StepIcon size={18} />
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 text-sm leading-tight">{title}</p>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed opacity-80">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referred users list */}
        {referredUsers.length > 0 && (
          <div className="premium-card overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-slate-50">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('referred_users')}</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {referredUsers.map((userId, idx) => (
                <div key={userId} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-[10px] border border-slate-100">{idx + 1}</div>
                    <span className="text-slate-900 font-bold text-xs tracking-tight">{t('user')} {idx + 1}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">+{formatNumber(referralBonusRUB, 'RUB')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
