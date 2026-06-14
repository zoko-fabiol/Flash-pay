import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Loading } from '../components/UI';
import { Save, Loader, CheckCircle2, Type, Smartphone, Download, Sun, Moon, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';
import { deviceService } from '../services/deviceService';

interface UserPreferences {
  language: string;
  fontSize: 'tiny' | 'small' | 'normal';
  theme: 'light' | 'dark' | 'system';
  promotionalEmails: boolean;
  updatedAt?: Date;
}

export const PreferencesPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language: currentLang, setLanguage, fontSize: currentFontSize, setFontSize, theme: currentTheme, setTheme } = useLanguage();
  const navigate = useNavigate();

  // Saved state (from Firestore / what is currently applied to the app)
  const [saved, setSaved] = useState<UserPreferences>({
    language: currentLang || 'fr',
    fontSize: currentFontSize || 'small',
    theme: currentTheme || 'light',
    promotionalEmails: false,
  });

  // Draft state (what the user is currently editing — not yet applied)
  const [draft, setDraft] = useState<UserPreferences>({
    language: currentLang || 'fr',
    fontSize: currentFontSize || 'small',
    theme: currentTheme || 'light',
    promotionalEmails: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Detect unsaved changes
  const hasChanges =
    draft.language !== saved.language ||
    draft.fontSize !== saved.fontSize ||
    draft.theme !== saved.theme ||
    draft.promotionalEmails !== saved.promotionalEmails;

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        if (userData.preferences) {
          const prefs: UserPreferences = {
            language: userData.preferences.language || 'fr',
            fontSize: userData.preferences.fontSize || 'small',
            theme: userData.preferences.theme || 'light',
            promotionalEmails: userData.preferences.promotionalEmails ?? false,
          };
          setSaved(prefs);
          setDraft(prefs);
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
      await setDoc(userRef, { preferences: { ...draft, updatedAt: new Date() } }, { merge: true });

      // Apply to app only after saving
      setLanguage(draft.language as any);
      setFontSize(draft.fontSize);
      setTheme(draft.theme);

      setSaved({ ...draft });
      setSuccess(true);
      toast.success(t('preferences_saved'));
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset draft to last saved state (discard unsaved changes)
    setDraft({ ...saved });
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-14 h-8 rounded-full transition-all flex items-center px-1 ${value ? 'bg-[#6344B6]' : 'bg-slate-200 dark:bg-slate-700'}`}
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
        <div className="pt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('preferences')}</h1>
            <p className="mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{t('preferences_desc')}</p>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-black uppercase tracking-wide shrink-0 mt-1 animate-in fade-in duration-300">
              <AlertCircle size={13} />
              Non sauvegardé
            </div>
          )}
        </div>

        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200 flex items-center gap-3 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in duration-300">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            <span className="font-bold">{t('preferences_saved')}</span>
          </div>
        )}

        {/* Font Size Card */}
        <div className="rounded-[32px] border shadow-sm overflow-hidden transition-colors" style={{ background: 'var(--bg-surface)', borderColor: draft.fontSize !== saved.fontSize ? '#f59e0b' : 'var(--border-color)' }}>
          <div className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#6344B6]/10 flex items-center justify-center text-[#6344B6]">
                <Type size={18} />
              </div>
              <h2 className="font-black" style={{ color: 'var(--text-primary)' }}>{t('font_size')}</h2>
            </div>
            {draft.fontSize !== saved.fontSize && (
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 animate-in fade-in duration-300">modifié</span>
            )}
          </div>
          <div className="p-6">
            <div className="flex p-1.5 rounded-2xl gap-1" style={{ background: 'var(--bg-surface-secondary)' }}>
              {(['tiny', 'small', 'normal'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setDraft({ ...draft, fontSize: size })}
                  className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    draft.fontSize === size
                      ? 'bg-white text-[#6344B6] shadow-md ring-1 ring-slate-100 scale-[1.02] dark:bg-[#2A2344] dark:ring-white/10'
                      : 'hover:text-[#6344B6]'
                  }`}
                  style={draft.fontSize !== size ? { color: 'var(--text-muted)' } : {}}
                >
                  {t(`font_${size}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Theme Card */}
        <div className="rounded-[32px] border shadow-sm overflow-hidden transition-colors" style={{ background: 'var(--bg-surface)', borderColor: draft.theme !== saved.theme ? '#f59e0b' : 'var(--border-color)' }}>
          <div className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#6344B6]/10 flex items-center justify-center text-[#6344B6]">
                {draft.theme === 'dark' ? <Moon size={18} /> : draft.theme === 'system' ? <Smartphone size={18} /> : <Sun size={18} />}
              </div>
              <h2 className="font-black" style={{ color: 'var(--text-primary)' }}>{t('theme')}</h2>
            </div>
            {draft.theme !== saved.theme && (
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 animate-in fade-in duration-300">modifié</span>
            )}
          </div>
          <div className="p-6">
            <div className="flex p-1.5 rounded-2xl gap-1" style={{ background: 'var(--bg-surface-secondary)' }}>
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDraft({ ...draft, theme: mode })}
                  className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    draft.theme === mode
                      ? 'bg-white text-[#6344B6] shadow-md ring-1 ring-slate-100 scale-[1.02] dark:bg-[#2A2344] dark:ring-white/10'
                      : 'hover:text-[#6344B6]'
                  }`}
                  style={draft.theme !== mode ? { color: 'var(--text-muted)' } : {}}
                >
                  {t(`theme_${mode}`)}
                </button>
              ))}
            </div>
            {draft.theme !== saved.theme && (
              <p className="mt-3 text-center text-xs font-medium text-amber-600 dark:text-amber-400 animate-in fade-in duration-300">
                ⚠️ Enregistrez pour appliquer le nouveau thème
              </p>
            )}
          </div>
        </div>

        {/* Native Version Card (Android only) */}
        {deviceService.isAndroid() && !deviceService.isNative() && (
          <div className="rounded-[32px] bg-gradient-to-br from-[#6344B6] to-[#4A3191] border border-white/20 shadow-xl overflow-hidden p-6 text-white relative">
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
                    window.location.href = 'https://github.com/zoko-fabiol/Flash-pay/releases/latest';
                  }}
                  className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-white text-[#6344B6] rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  <Download size={14} />
                  Télécharger l'APK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save / Cancel */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSavePreferences}
            disabled={saving || !hasChanges}
            className="flex-[2] flex items-center justify-center gap-2 py-4 bg-[#6344B6] text-white font-black rounded-2xl shadow-xl shadow-[#6344B6]/20 hover:shadow-2xl hover:shadow-[#6344B6]/30 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {saving ? <><Loader size={18} className="animate-spin" /> {t('saving')}</> : <><Save size={18} /> {t('save')}</>}
          </button>
          <button
            onClick={hasChanges ? handleCancel : () => navigate(-1)}
            className="flex-1 py-4 font-black rounded-2xl transition active:scale-95 border-2"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            {hasChanges ? 'Annuler' : t('cancel')}
          </button>
        </div>

        {hasChanges && (
          <p className="text-center text-xs font-medium animate-in fade-in duration-300" style={{ color: 'var(--text-muted)' }}>
            Les modifications ne seront appliquées qu'après avoir cliqué sur <strong>Enregistrer</strong>.
          </p>
        )}

      </div>
    </Layout>
  );
};
