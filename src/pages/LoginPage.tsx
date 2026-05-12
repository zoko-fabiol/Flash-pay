import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, Lock, Fingerprint } from 'lucide-react';
import { Error } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { biometricService } from '../services/biometricService';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, resetPassword } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [resetSent, setResetSent] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(localStorage.getItem('biometric_enabled') === 'true');
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [isInstallable] = useState(
    Capacitor.isNativePlatform() || 
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone || 
    false
  );

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometricService.isAvailable();
      setBiometricAvailable(available);
      
      // Auto-trigger if enabled
      if (available && biometricEnabled) {
        handleBiometricLogin();
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricLogin = async () => {
    setError('');
    const credentials = await biometricService.getCredentials();
    if (credentials) {
      setLoading(true);
      try {
        await login(credentials.email, credentials.password);
        navigate('/');
      } catch (err: any) {
        setError(err.message || t('login_error'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSent(false);
    setLoading(true);
    try {
      await login(email, password);
      
      // Check if we should ask for biometric activation
      if (isInstallable && biometricAvailable && !biometricEnabled && localStorage.getItem('biometric_asked') !== 'true') {
        setShowBiometricPrompt(true);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || t('login_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometricAfterLogin = async () => {
    setLoading(true);
    try {
      const success = await biometricService.saveCredentials({ email, password });
      if (success) {
        localStorage.setItem('biometric_asked', 'true');
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to enable biometric after login:', err);
      navigate('/'); // Still go to dashboard even if biometric setup fails
    } finally {
      setLoading(false);
    }
  };

  const handleSkipBiometric = () => {
    localStorage.setItem('biometric_asked', 'true');
    navigate('/');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError(t('enter_email_first'));
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-mesh px-4 relative">
      {/* Language Selector */}
      <div className="absolute top-6 right-6 flex items-center gap-1 bg-white/30 backdrop-blur-md p-1 rounded-2xl border border-white/50 shadow-sm z-10">
        <button 
          onClick={() => setLanguage('fr')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'fr' ? 'bg-[#661489] text-white shadow-md' : 'text-slate-600 hover:bg-white/40'}`}
        >
          FR
        </button>
        <button 
          onClick={() => setLanguage('en')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-[#661489] text-white shadow-md' : 'text-slate-600 hover:bg-white/40'}`}
        >
          EN
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] glass-effect shadow-premium mb-6 overflow-hidden border border-white/50">
            <img src="/logo.png" alt="Flash Pay Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Flash Pay</h1>
          <p className="text-slate-500 mt-2 font-medium">{t('welcome_back')}</p>
        </div>

        {/* Card */}
        <div className="premium-card p-10 bg-white/80 backdrop-blur-xl border-white/50">
          {error && <Error message={error} onDismiss={() => setError('')} />}
          {resetSent && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-bold flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Mail size={16} />
              </div>
              {t('reset_link_sent')}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{t('email')}</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  className="w-full pl-12 pr-4 py-4 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary font-medium text-slate-900 transition-all bg-white/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{t('password')}</label>
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] font-bold text-primary hover:underline underline-offset-2 uppercase tracking-wider"
                >
                  {t('forgot_password')}
                </button>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary font-medium text-slate-900 transition-all bg-white/50"
                  required={!resetSent}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-lg shadow-primary/30"
            >
              {loading ? t('connecting') : t('login')}
            </button>

            {biometricAvailable && biometricEnabled && (
              <button
                type="button"
                onClick={handleBiometricLogin}
                className="w-full mt-4 flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-primary/20 text-primary font-black hover:bg-primary/5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                <Fingerprint size={24} />
                {t('biometric_login')}
              </button>
            )}
          </form>

          <div className="text-center mt-6 text-sm text-slate-500 font-medium">
            {t('no_account')}{' '}
            <button onClick={() => navigate('/signup')} className="text-primary font-bold hover:underline underline-offset-4">
              {t('signup')}
            </button>
          </div>
        </div>

          <div className="mt-8 text-center opacity-60">
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-widest">
              <button onClick={() => navigate('/terms')} type="button" className="hover:text-primary transition">{t('terms_of_use')}</button>
              {' • '}
              <button onClick={() => navigate('/privacy-policy')} type="button" className="hover:text-primary transition">{t('privacy_policy')}</button>
            </p>
        </div>
      </div>


      {/* Biometric Activation Popup */}
      {showBiometricPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-500">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 rounded-[28px] bg-[#661489]/10 flex items-center justify-center text-[#661489] animate-bounce-slow">
                <Fingerprint size={40} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Activer l'empreinte ?</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  Souhaitez-vous utiliser votre empreinte digitale pour vous connecter plus rapidement la prochaine fois ?
                </p>
              </div>

              <div className="w-full space-y-3 pt-2">
                <button
                  onClick={handleEnableBiometricAfterLogin}
                  disabled={loading}
                  className="w-full py-4 bg-[#661489] text-white rounded-2xl font-black text-sm shadow-lg shadow-[#661489]/20 active:scale-95 transition-all"
                >
                  {loading ? 'Activation...' : 'ACTIVER MAINTENANT'}
                </button>
                <button
                  onClick={handleSkipBiometric}
                  className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  PLUS TARD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="fixed bottom-4 left-0 right-0 text-center text-[10px] text-gray-400 pointer-events-none opacity-50">
        v1.1 - Biometric Fix
      </div>
    </div>
  );
};

