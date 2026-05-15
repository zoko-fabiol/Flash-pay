import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Loading } from '../components/UI';
import { Bell, Mail, Save, Loader, CheckCircle2, Type, Smartphone, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';
import { deviceService } from '../services/deviceService';

interface UserPreferences {
  language: string;
  fontSize: 'tiny' | 'small' | 'normal';
  promotionalEmails: boolean;
  updatedAt?: Date;
}

export const PreferencesPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language: currentLang, setLanguage, fontSize: currentFontSize, setFontSize } = useLanguage();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: currentLang || 'fr',
    fontSize: currentFontSize || 'normal',
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
          setPreferences(prev => ({
            ...prev,
            ...userData.preferences,
            // Ensure values are defaults if missing
            fontSize: userData.preferences.fontSize || prev.fontSize,
          }));
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
      setFontSize(preferences.fontSize);
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
      className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${value ? 'bg-[#661489]' : 'bg-slate-200'}`}
    >
      <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${value ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 pb-10 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div className="pt-4">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('preferences')}</h1>
          <p className="text-slate-500 mt-1 font-medium">{t('preferences_desc')}</p>
        </div>

        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <span className="font-bold">{t('preferences_saved')}</span>
          </div>
        )}

        {/* Font Size Card */}
        <div className="rounded-[32px] bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#661489]/10 flex items-center justify-center text-[#661489]">
              <Type size={18} />
            </div>
            <h2 className="font-black text-slate-900">{t('font_size')}</h2>
          </div>
          <div className="p-6">
            <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-1">
              {(['tiny', 'small', 'normal'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setPreferences({ ...preferences, fontSize: size })}
                  className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    preferences.fontSize === size 
                      ? 'bg-white text-[#661489] shadow-md ring-1 ring-slate-100 scale-[1.02]' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t(`font_${size}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Native Version Card (Android only) */}
        {deviceService.isAndroid() && !deviceService.isNative() && (
          <div className="rounded-[32px] bg-gradient-to-br from-[#661489] to-[#4D0F67] border border-white/20 shadow-xl overflow-hidden p-6 text-white relative">
            <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Smartphone size={24} />
              </div>
              <div className="flex-1">
                <h2 className="font-black text-lg">Flash Pay pour Android</h2>
                <p className="text-white/80 text-xs font-medium mt-1 leading-relaxed">
                  Profitez d'une expérience plus fluide et de notifications natives en installant l'application officielle.
                </p>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/.netlify/functions/latest-apk';
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-white text-[#661489] rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  <Download size={14} />
                  Télécharger l'APK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Card */}
        <div className="rounded-[32px] bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#661489]/10 flex items-center justify-center text-[#661489]">
              <Bell size={18} />
            </div>
            <h2 className="font-black text-slate-900">{t('notifications')}</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                {Notification.permission === 'granted' ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <Bell size={16} />
                  </div>
                )}
                <div>
                  <p className="text-slate-900 font-black text-sm">{t('push_notifications')}</p>
                  <p className="text-slate-500 text-[10px] font-medium">
                    {Notification.permission === 'granted' 
                      ? (t('notifications_active') || 'Vous recevez les alertes') 
                      : (Notification.permission === 'denied' 
                          ? (t('notifications_blocked') || 'Bloquées par le navigateur')
                          : t('push_notif_desc'))}
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const { requestNotificationPermissionFromUser } = await import('../utils/pushNotifications');
                  const granted = await requestNotificationPermissionFromUser();
                  if (granted) {
                    toast.success(t('notifications_enabled') || 'Notifications activées');
                  }
                }}
                disabled={Notification.permission === 'granted'}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all ${
                  Notification.permission === 'granted'
                    ? 'bg-emerald-500 text-white cursor-default'
                    : 'bg-[#661489] text-white active:scale-95'
                }`}
              >
                {Notification.permission === 'granted' ? (t('active') || 'Activé') : t('activate')}
              </button>
            </div>
          </div>
        </div>


        {/* Save */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="flex-[2] flex items-center justify-center gap-2 py-4 bg-[#661489] text-white font-black rounded-2xl shadow-xl shadow-[#661489]/20 hover:shadow-2xl hover:shadow-[#661489]/30 transition disabled:opacity-50 active:scale-95"
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


