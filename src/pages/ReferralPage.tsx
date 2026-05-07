import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, db } from '../services/firebase';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { Copy, Share2 } from 'lucide-react';

export const ReferralPage: React.FC = () => {
  const { user } = useAuth();
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

    // Listen for global settings (referral bonus)
    const qSettings = query(collection(db, 'settings'), limit(1));
    const unsubscribeSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const settings = snapshot.docs[0].data();
        if (settings.referralBonusRUB) {
          setReferralBonusRUB(settings.referralBonusRUB);
        }
      }
    });

    return () => unsubscribeSettings();
  }, [user]);

  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const handleCopy = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoignez Flash Pay',
          text: 'Inscrivez-vous sur Flash Pay et bénéficiez de bonus!',
          url: referralLink,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Parrainage</h1>
          <p className="text-slate-600">Gagnez des bonus en invitant vos amis</p>
        </div>

        {/* Referral Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Utilisateurs Parrainés</h3>
            <p className="text-3xl font-bold text-primary">{invitedCount}</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Bonus Total</h3>
            <p className="text-3xl font-bold text-green-600">{totalBonus} RUB</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">En attente / validés</h3>
            <p className="text-3xl font-bold text-blue-600">{pendingCount} / {rewardedCount}</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200 md:col-span-3">
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Commission par Inscription</h3>
            <p className="text-3xl font-bold text-blue-600">{referralBonusRUB} RUB</p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-bold text-lg mb-4">Votre Lien de Parrainage</h3>
          
          <div className="space-y-4">
            <div className="bg-slate-50 border border-primary rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-slate-700 mb-1">Lien:</p>
                <p className="text-xs text-slate-600 truncate">{referralLink}</p>
              </div>
              <button
                onClick={handleCopy}
                disabled={!referralCode}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors whitespace-nowrap font-semibold"
              >
                <Copy size={16} />
                {copied ? 'Copié!' : 'Copier'}
              </button>
            </div>

            <button
              onClick={handleShare}
              disabled={!referralCode}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-semibold"
            >
              <Share2 size={18} />
              Partager
            </button>
          </div>
        </div>

        {/* Code Display */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-bold text-lg mb-4">Code de Parrainage</h3>
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary rounded-xl p-8 text-center">
            <p className="text-slate-700 font-semibold mb-2">Votre Code Unique:</p>
            <p className="text-4xl font-black text-primary tracking-widest font-mono">{referralCode || '...'}</p>
            <p className="text-sm text-slate-600 mt-4">Partagez ce code avec vos amis</p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-bold text-lg mb-4">Comment Ça Marche?</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">1</div>
              <div>
                <p className="font-semibold text-slate-900">Partagez votre code</p>
                <p className="text-sm text-slate-600">Envoyez votre lien de parrainage à vos amis</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">2</div>
              <div>
                <p className="font-semibold text-slate-900">Ils s'inscrivent</p>
                <p className="text-sm text-slate-600">Votre ami crée un compte avec votre code</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">3</div>
              <div>
                <p className="font-semibold text-slate-900">Gagnez des bonus</p>
                <p className="text-sm text-slate-600">Recevez {referralBonusRUB} RUB par inscription réussie</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referred Users */}
        {referredUsers.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="font-bold text-lg mb-4">Amis Parrainés</h3>
            <div className="space-y-3">
              {referredUsers.map((userId, idx) => (
                <div key={userId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-slate-700">Utilisateur {idx + 1}</span>
                  <span className="text-sm font-semibold text-green-600">+{referralBonusRUB} RUB</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
