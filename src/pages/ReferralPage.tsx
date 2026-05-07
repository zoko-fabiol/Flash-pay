import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, db } from '../services/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { Copy, Share2, Users, Gift, Clock, TrendingUp } from 'lucide-react';
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
      <div className="max-w-2xl mx-auto space-y-5 pb-10 px-4">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#6236CC] to-[#4A1FA0] p-6 text-white shadow-[0_16px_40px_rgba(98,54,204,0.28)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative">
            <Share2 size={28} className="mb-3 opacity-90" />
            <h1 className="text-2xl font-black tracking-tight mb-1">{t('referral_title')}</h1>
            <p className="text-white/70 text-sm font-medium">
              Gagnez {formatNumber(referralBonusRUB, 'RUB')} pour chaque ami parrainé qui valide son compte.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`rounded-[24px] ${bg} border border-slate-100 p-5 flex flex-col gap-2`}>
              <div className="flex items-center gap-2">
                <Icon size={16} className={color} />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
              </div>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Referral Code + Link */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100">
            <h2 className="font-black text-slate-900">{t('referral_code')}</h2>
          </div>

          {/* Code display */}
          <div className="px-6 py-5 border-b border-slate-50">
            <div 
              onClick={handleCopyCode}
              className="bg-gradient-to-br from-[#f7f3ff] to-[#ede7ff] border border-[#e0d6ff] rounded-2xl p-5 text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group/code relative"
            >
              <div className="absolute top-3 right-3 opacity-0 group-hover/code:opacity-100 transition-opacity">
                <Copy size={14} className="text-[#6236CC]/40" />
              </div>
              <p className="text-[11px] font-bold text-[#6236CC]/60 uppercase tracking-widest mb-2">{t('referral_code')}</p>
              <p className="text-4xl font-black text-[#6236CC] tracking-[0.3em] font-mono">{referralCode || '...'}</p>
              <p className="mt-2 text-[10px] font-bold text-[#6236CC]/40 uppercase tracking-wider opacity-0 group-hover/code:opacity-100 transition-opacity">Cliquer pour copier le code</p>
            </div>
          </div>

          {/* Link copy */}
          <div className="px-6 py-5 flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
              <p className="flex-1 text-xs text-slate-500 font-medium truncate">{referralLink}</p>
              <button
                onClick={handleCopy}
                disabled={!referralCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6236CC] text-white rounded-xl font-bold text-xs shrink-0 hover:bg-[#4A1FA0] transition"
              >
                <Copy size={13} /> {copied ? t('copied') : t('copy_link')}
              </button>
            </div>
            <button
              onClick={handleShare}
              disabled={!referralCode}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-[#6236CC]/20 text-[#6236CC] font-bold hover:bg-[#f7f3ff] transition"
            >
              <Share2 size={16} /> {t('share')}
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100">
            <h2 className="font-black text-slate-900">{t('how_it_works')}</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { num: 1, title: t('step1_title'), desc: t('step1_desc') },
              { num: 2, title: t('step2_title'), desc: t('step2_desc') },
              { num: 3, title: t('step3_title'), desc: t('step3_desc') },
            ].map(({ num, title, desc }) => (
              <div key={num} className="flex gap-4 px-6 py-4 items-start">
                <div className="w-8 h-8 rounded-xl bg-[#f7f3ff] flex items-center justify-center text-[#6236CC] font-black text-sm shrink-0">
                  {num}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referred users list */}
        {referredUsers.length > 0 && (
          <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-slate-100">
              <h2 className="font-black text-slate-900">{t('referred_users')}</h2>
            </div>
            <div className="divide-y divide-slate-50">
              {referredUsers.map((userId, idx) => (
                <div key={userId} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">{idx + 1}</div>
                    <span className="text-slate-700 font-medium text-sm">{t('user')} {idx + 1}</span>
                  </div>
                  <span className="text-sm font-black text-emerald-600">+{formatNumber(referralBonusRUB, 'RUB')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
