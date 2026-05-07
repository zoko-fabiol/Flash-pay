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
      <div className="max-w-2xl mx-auto space-y-8 pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Hero Section - Premium Expressive */}
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#6750A4] via-[#6236CC] to-[#4d259f] p-8 text-white shadow-2xl shadow-[#6236CC]/20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-[80px] animate-pulse"></div>
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[#7C4DFF]/20 blur-[60px]"></div>
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl">
              <Share2 size={28} className="text-white drop-shadow-md" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tighter sm:text-3xl">{t('referral_title')}</h1>
              <p className="text-white/70 text-sm font-bold leading-relaxed max-w-[80%]">
                Gagnez <span className="text-white">{formatNumber(referralBonusRUB, 'RUB')}</span> pour chaque ami parrainé qui valide son compte.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid - Premium Cards */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`rounded-[32px] ${bg} border border-slate-100 p-6 flex flex-col gap-3 shadow-lg shadow-slate-900/5 hover:scale-[1.02] transition-all group`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm group-hover:scale-110 transition-transform`}>
                   <Icon size={18} className={color} />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
              </div>
              <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Referral Code + Link Card */}
        <div className="rounded-[40px] bg-white border border-[#eadfff] shadow-xl shadow-slate-900/5 overflow-hidden">
          <div className="px-8 pt-8 pb-4 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{t('referral_code')}</h2>
            <Sparkles className="text-[#6236CC] opacity-30" size={20} />
          </div>

          {/* Code display - Modern Glass/Gradient */}
          <div className="px-8 py-8 border-b border-slate-50 bg-[#F3EDF7]/30 backdrop-blur-xl">
            <div 
              onClick={handleCopyCode}
              className="bg-white border-2 border-[#6236CC]/10 rounded-[32px] p-6 text-center cursor-pointer hover:shadow-2xl hover:shadow-[#6236CC]/10 active:scale-[0.98] transition-all group/code relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover/code:opacity-100 transition-opacity">
                <Copy size={16} className="text-[#6236CC]/40" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4">{t('votre_code_unique') || 'VOTRE CODE UNIQUE'}</p>
              <p className="text-4xl font-black text-[#6236CC] tracking-[0.2em] sm:text-5xl">{referralCode || '...'}</p>
              <p className="mt-4 text-[10px] font-black text-[#6236CC] uppercase tracking-[0.2em] opacity-0 group-hover/code:opacity-100 transition-all translate-y-2 group-hover/code:translate-y-0">Cliquer pour copier</p>
              
              {/* Animated Background Highlight */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#6236CC]/5 to-transparent opacity-0 group-hover/code:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Link copy section */}
          <div className="px-8 py-6 flex flex-col gap-4">
            <div className="flex items-center gap-4 bg-[#F8F9FC] rounded-[24px] p-2 border border-slate-100 shadow-inner">
              <p className="flex-1 text-xs text-slate-400 font-bold px-4 truncate">{referralLink}</p>
              <button
                onClick={handleCopy}
                disabled={!referralCode}
                className="flex items-center gap-2 px-6 py-4 bg-[#6236CC] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#6236CC]/30 hover:bg-[#4A1FA0] transition active:scale-95"
              >
                <Copy size={14} /> {copied ? t('copied') : t('copy_link')}
              </button>
            </div>
            <button
              onClick={handleShare}
              disabled={!referralCode}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-[24px] border-2 border-[#6236CC]/10 text-[#6236CC] font-black uppercase text-xs tracking-widest hover:bg-[#F3EDF7] transition active:scale-95"
            >
              <Share2 size={18} /> {t('share')}
            </button>
          </div>
        </div>

        {/* How it works - Refined steps */}
        <div className="rounded-[40px] bg-white border border-[#eadfff] shadow-xl shadow-slate-900/5 overflow-hidden">
          <div className="px-8 pt-8 pb-4 border-b border-slate-50">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{t('how_it_works')}</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { num: 1, title: t('step1_title'), desc: t('step1_desc'), icon: Share2 },
              { num: 2, title: t('step2_title'), desc: t('step2_desc'), icon: Users },
              { num: 3, title: t('step3_title'), desc: t('step3_desc'), icon: Gift },
            ].map(({ num, title, desc, icon: StepIcon }) => (
              <div key={num} className="flex gap-6 px-8 py-6 items-start group hover:bg-[#F3EDF7]/20 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-[#F3EDF7] flex items-center justify-center text-[#6236CC] font-black text-lg shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  <StepIcon size={22} />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-slate-900 text-lg tracking-tight">{title}</p>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed opacity-80">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referred users list - Minimal Premium */}
        {referredUsers.length > 0 && (
          <div className="rounded-[40px] bg-white border border-[#eadfff] shadow-xl shadow-slate-900/5 overflow-hidden">
            <div className="px-8 pt-8 pb-4 border-b border-slate-50">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{t('referred_users')}</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {referredUsers.map((userId, idx) => (
                <div key={userId} className="flex items-center justify-between px-8 py-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-black text-xs border border-slate-100">{idx + 1}</div>
                    <span className="text-slate-900 font-black text-sm tracking-tight">{t('user')} {idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">+{formatNumber(referralBonusRUB, 'RUB')}</span>
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
