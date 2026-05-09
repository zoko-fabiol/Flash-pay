import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Bell, Mail, Save, Loader, CheckCircle2 } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';

interface UserPreferences {
  language: string;
  promotionalEmails: boolean;
  updatedAt?: Date;
}

export const PreferencesPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language: currentLang, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: currentLang || 'fr',
    promotionalEmails: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    // Set up real-time listener for user document (including preferences)
    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        if (userData.preferences) {
          setPreferences(userData.preferences);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('Error listening to preferences:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleSavePreferences = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, { preferences: { ...preferences, updatedAt: new Date() } }, { merge: true });

      setLanguage(preferences.language as any);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${value ? 'bg-[#6236CC]' : 'bg-slate-200'}`}
    >
      <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${value ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader className="animate-spin text-[#6236CC]" size={32} />
            <span className="font-bold text-slate-500">{t('loading')}</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 pb-10 px-4">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('preferences')}</h1>
          <p className="text-slate-500 mt-1 font-medium">{t('preferences_desc')}</p>
        </div>

        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <span className="font-bold">{t('preferences_saved')}</span>
          </div>
        )}

        {/* Communication Card */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100">
            <h2 className="font-black text-slate-900">{t('communication')}</h2>
          </div>

          <div className="divide-y divide-slate-50">
            {/* Promotional emails */}
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#f7f3ff] flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-[#6236CC]" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{t('promo_emails')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('promo_emails_desc')}</p>
                </div>
              </div>
              <Toggle
                value={preferences.promotionalEmails}
                onChange={() => setPreferences({ ...preferences, promotionalEmails: !preferences.promotionalEmails })}
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex gap-4">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="flex-[2] flex items-center justify-center gap-2 py-4 bg-gradient-to-br from-[#6236CC] to-[#4A1FA0] text-white font-black rounded-2xl shadow-[0_8px_24px_rgba(98,54,204,0.25)] hover:shadow-[0_12px_32px_rgba(98,54,204,0.35)] transition disabled:opacity-50 active:scale-95"
          >
            {saving ? <><Loader size={18} className="animate-spin" /> {t('saving')}</> : <><Save size={18} /> {t('save')}</>}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-4 border-2 border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-50 transition active:scale-95"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </Layout>
  );
};
