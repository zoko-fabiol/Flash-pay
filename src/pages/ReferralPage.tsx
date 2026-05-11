import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, db } from '../services/firebase';
import { onSnapshot, collection, query, limit, where } from 'firebase/firestore';
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
  const [referrals, setReferrals] = useState<any[]>([]);
  const [totalBonus, setTotalBonus] = useState(0);
  const [invitedCount, setInvitedCount] = useState(0);
  const [rewardedCount, setRewardedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [referralBonusRUB, setReferralBonusRUB] = useState(500);

  useEffect(() => {
    if (!user) return;

    // Listen to settings for bonus amount
    const qSettings = query(collection(db, 'settings'), limit(1));
    const unsubscribeSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const settings = snapshot.docs[0].data();
        if (settings.referralBonusRUB) setReferralBonusRUB(settings.referralBonusRUB);
      }
    });

    // Listen to referrals in real-time
    const qReferrals = query(collection(db, 'referrals'), where('referrerId', '==', user.id));
    const unsubscribeReferrals = onSnapshot(qReferrals, (snapshot) => {
      const rawRefs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      // Group by email to merge duplicates
      const groupedByEmail: Record<string, any> = {};
      rawRefs.forEach(ref => {
        const email = (ref.referredEmail || ref.id).toLowerCase();
        if (!groupedByEmail[email] || ref.status === 'rewarded') {
          groupedByEmail[email] = ref;
        }
      });

      const processedRefs = Object.values(groupedByEmail);
      const rewarded = processedRefs.filter((r: any) => r.status === 'rewarded');
      const pending = processedRefs.filter((r: any) => r.status === 'pending');

      setReferralCode(user.referralCode || '');
      setReferredUsers(user.referredUsers || []);
      setReferrals(processedRefs);
      setTotalBonus(user.solde_bonus || 0);
      setInvitedCount(processedRefs.length);
      setRewardedCount(rewarded.length);
      setPendingCount(pending.length);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeReferrals();
    };
  }, [user]);

  const referralLink = `https://flash-pay.site/signup?ref=${referralCode}`;

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
    { icon: Users,     label: t('referred_users'),   value: invitedCount,   color: 'text-[#661489]',   bg: 'bg-[#F5E8FF]' },
    { icon: Gift,      label: t('total_bonus'),       value: formatNumber(totalBonus, 'RUB'), color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { icon: Clock,     label: t('pending_validated'), value: `${pendingCount} / ${rewardedCount}`, color: 'text-amber-700', bg: 'bg-amber-50' },
    { icon: TrendingUp,label: t('signup_commission'), value: formatNumber(referralBonusRUB, 'RUB'), color: 'text-blue-700', bg: 'bg-blue-50' },
  ];

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-6 pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Hero Section - Premium Design Matching Dashboard */}
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#661489] via-[#4D0F67] to-[#2A083B] p-8 text-white shadow-[0_24px_60px_rgba(42,8,59,0.28)]">
          {/* Background Decorative Elements */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.1),transparent_30%)]" />
          <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12">
            <Gift size={160} strokeWidth={1} />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-5">
            <div className="w-14 h-14 bg-white/15 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
              <Gift size={28} className="text-white animate-bounce-slow" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight">{t('referral_title')}</h1>
              <p className="text-white/80 text-sm font-medium leading-relaxed max-w-xs">
                {t('referral_desc_bonus') || `Gagnez ${formatNumber(referralBonusRUB, 'RUB')} par ami parrainé.`}
              </p>
            </div>

            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-white/90">
                <Sparkles size={12} className="text-amber-300" />
                {t('special_offer')}
              </div>
            </div>
          </div>
        </section>

        {/* Referral Code + Link Card - Moved to Top */}
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
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t('unique_code')}</p>
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

        {/* Stats Grid - Moved to Bottom */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="premium-card p-3.5 flex flex-col justify-between gap-3 group min-h-[110px]">
              <div className="space-y-2">
                <div className={`p-1.5 w-fit rounded-lg bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors`}>
                   <Icon size={12} />
                </div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-tight block">
                  {label}
                </span>
              </div>
              <p className={`text-base font-black tracking-tight text-slate-900 truncate`}>{value}</p>
            </div>
          ))}
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
        {referrals.length > 0 && (
          <div className="premium-card overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-slate-50">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('referred_users')}</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {referrals.map((referral, idx) => (
                <div key={referral.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold text-[10px] border border-slate-100">{idx + 1}</div>
                    <span className="text-slate-900 font-bold text-xs tracking-tight">{referral.referredUserName || `${t('user')} ${idx + 1}`}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">+{formatNumber(referral.bonusAmount || referralBonusRUB, 'RUB')}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-widest ${referral.status === 'rewarded' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {referral.status === 'rewarded' ? t('validated') : t('pending')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};


