import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface UserPreferences {
  language: string;
  pushNotifications: boolean;
  promotionalEmails: boolean;
  updatedAt?: Date;
}

export const PreferencesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<UserPreferences>({
    language: 'fr',
    pushNotifications: true,
    promotionalEmails: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load preferences from Firestore
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      try {
        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data()?.preferences) {
          setPreferences(userDoc.data().preferences);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, [user?.id]);

  const handleSavePreferences = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(
        userRef,
        {
          preferences: {
            ...preferences,
            updatedAt: new Date(),
          },
        },
        { merge: true }
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="animate-spin text-brand" size={32} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition"
          >
            <ArrowLeft size={24} className="text-slate-900" />
          </button>
          <h1 className="text-3xl font-black text-slate-900">Préférences</h1>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-2xl border border-green-200 flex items-center gap-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-semibold">Préférences enregistrées avec succès</span>
          </div>
        )}

        {/* Preferences Card */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Language Preference */}
          <div className="p-6 border-b border-slate-100">
            <label className="block mb-2">
              <span className="text-sm text-slate-500 font-semibold">
                LANGUE DE L'INTERFACE
              </span>
            </label>
            <p className="text-sm text-slate-600 mb-4">
              Choisissez votre langue préférée
            </p>
            <select
              value={preferences.language}
              onChange={(e) =>
                setPreferences({ ...preferences, language: e.target.value })
              }
              className="w-full md:w-48 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand focus:outline-none font-medium"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ru">Русский</option>
            </select>
          </div>

          {/* Push Notifications */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 mb-1">
                  Notifications Push & Pop-ups
                </p>
                <p className="text-sm text-slate-600">
                  Recevoir des alertes sur votre appareil
                </p>
              </div>
              <button
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    pushNotifications: !preferences.pushNotifications,
                  })
                }
                className={`w-14 h-8 rounded-full transition-all flex items-center ${
                  preferences.pushNotifications
                    ? 'bg-green-500'
                    : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    preferences.pushNotifications ? 'ml-7' : 'ml-1'
                  }`}
                ></div>
              </button>
            </div>
          </div>

          {/* Promotional Emails */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 mb-1">
                  Emails promotionnels
                </p>
                <p className="text-sm text-slate-600">
                  Recevoir nos offres par mail
                </p>
              </div>
              <button
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    promotionalEmails: !preferences.promotionalEmails,
                  })
                }
                className={`w-14 h-8 rounded-full transition-all flex items-center ${
                  preferences.promotionalEmails
                    ? 'bg-green-500'
                    : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    preferences.promotionalEmails ? 'ml-7' : 'ml-1'
                  }`}
                ></div>
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="flex-1 py-4 px-6 bg-brand text-white font-bold rounded-2xl hover:bg-brand/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader size={20} className="animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save size={20} />
                Enregistrer
              </>
            )}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-4 px-6 border-2 border-slate-200 text-slate-900 font-bold rounded-2xl hover:bg-slate-50 transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </Layout>
  );
};
