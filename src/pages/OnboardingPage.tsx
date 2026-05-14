import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/firebase';
import { User, Phone, CheckCircle2, Loader, ArrowRight } from 'lucide-react';
import { CountrySelector } from '../components/CountrySelector';
import { Error } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

export const OnboardingPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [nom, setNom] = useState('');
  const [tel, setTel] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setNom(user.nom || '');
      setTel(user.tel || '');
      setCountryCode(user.countryCode || '');
      
      // If onboarding is already complete, go to dashboard
      if (user.isOnboardingComplete) {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !tel || !countryCode) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await userService.updateUserProfile(user!.id, {
        nom,
        tel,
        countryCode,
        isOnboardingComplete: true,
        updatedAt: new Date()
      });
      toast.success('Profil complété !');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-white shadow-xl mb-6 overflow-hidden border border-white/50">
            <img src="/icon.png" alt="Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Presque fini !</h1>
          <p className="text-slate-500 mt-2 font-medium">Complétez votre profil pour commencer.</p>
        </div>

        {/* Card */}
        <div className="premium-card p-8 bg-white/80 backdrop-blur-xl border-white/50">
          {error && <Error message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{t('full_name')}</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Votre nom complet"
                  className="w-full pl-12 pr-4 py-4 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-white/50 font-medium"
                  required
                />
              </div>
            </div>

            <CountrySelector 
              value={countryCode} 
              onChange={setCountryCode} 
              label="Votre Pays" 
              placeholder="Sélectionnez votre pays"
            />

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{t('phone_number')}</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  placeholder="+7 / +237 / ..."
                  className="w-full pl-12 pr-4 py-4 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all bg-white/50 font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#661489] text-white rounded-2xl font-black text-sm shadow-xl shadow-[#661489]/20 hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader size={20} className="animate-spin" />
              ) : (
                <>
                  TERMINER <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
