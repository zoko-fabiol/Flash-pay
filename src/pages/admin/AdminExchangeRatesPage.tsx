import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, onSnapshot, query, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Layout } from '../../components/Layout';
import { Loading } from '../../components/UI';
import { useLanguage } from '../../context/LanguageContext';
import { Save, TrendingUp, Gift, Percent } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const AdminExchangeRatesPage: React.FC = () => {
  const { t, formatNumber } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    rate_eur_xaf: 655.957,
    rate_rub_xaf: 7.5,
    feePercentage: 2,
    referralBonus: 500
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'settings'), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setSettings({
          rate_eur_xaf: data.rate_eur_xaf || 655.957,
          rate_rub_xaf: data.rate_rub_xaf || 7.5,
          feePercentage: (data.feePercentage || 0.02) * 100,
          referralBonus: data.referralBonus || 500
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsRef = doc(db, 'settings', 'global');
      await setDoc(settingsRef, {
        rate_eur_xaf: Number(settings.rate_eur_xaf),
        rate_rub_xaf: Number(settings.rate_rub_xaf),
        feePercentage: Number(settings.feePercentage) / 100,
        referralBonus: Number(settings.referralBonus),
        updatedAt: new Date()
      }, { merge: true });
      
      toast.success(t('settings_updated'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('admin_title')}</h1>
            <p className="text-slate-500">{t('admin_exchange_rates')}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#6344B6] text-white px-6 py-3 rounded-full font-black shadow-lg hover:scale-105 transition-all disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? t('saving') : t('save_settings')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Exchange Rates */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
                <TrendingUp size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{t('exchange_rate')}</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">1 EUR = XAF</label>
                <input
                  type="number"
                  value={settings.rate_eur_xaf}
                  onChange={e => setSettings({ ...settings, rate_eur_xaf: Number(e.target.value) })}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-[#6344B6] outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">1 RUB = XAF</label>
                <input
                  type="number"
                  value={settings.rate_rub_xaf}
                  onChange={e => setSettings({ ...settings, rate_rub_xaf: Number(e.target.value) })}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-[#6344B6] outline-none font-bold"
                />
              </div>
            </div>
          </div>

          {/* Fees & Referral */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 rounded-2xl text-purple-600">
                <Gift size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{t('referral_title')} & {t('fees')}</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">{t('referral_reward_amount')}</label>
                <input
                  type="number"
                  value={settings.referralBonus}
                  onChange={e => setSettings({ ...settings, referralBonus: Number(e.target.value) })}
                  className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-[#6344B6] outline-none font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">{t('fees')} (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.feePercentage}
                    onChange={e => setSettings({ ...settings, feePercentage: Number(e.target.value) })}
                    className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-[#6344B6] outline-none font-bold pr-12"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Percent size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-[24px] p-6 text-blue-800 text-sm">
          <p className="font-bold mb-2">Note:</p>
          <p>Les changements de taux et de bonus sont appliqués instantanément sur l'interface de tous les utilisateurs.</p>
        </div>
      </div>
    </Layout>
  );
};

