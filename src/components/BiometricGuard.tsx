import React, { useState, useEffect, useRef } from 'react';
import { biometricService } from '../services/biometricService';
import { authService, auth } from '../services/firebase';
import { Capacitor } from '@capacitor/core';
import { Loading } from './UI';
import { Fingerprint, Lock, KeyRound, LogOut, Key } from 'lucide-react';
import { translateFirebaseError } from '../utils/errorMessages';
import { pinService } from '../services/pinService';
import { PinModal } from './PinModal';

interface BiometricGuardProps {
  children: React.ReactNode;
}

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes in milliseconds

const getLanguage = () => {
  try {
    return (localStorage.getItem('flashpay_lang') as 'fr' | 'en' | 'ru' | null) || document.documentElement.lang || 'fr';
  } catch {
    return 'fr';
  }
};

const copy = {
  fr: {
    biometric_auth_failed: 'Authentification échouée. Veuillez réessayer.',
    biometric_auth_error: "Erreur lors de l'authentification.",
    biometric_lock_title: 'Application verrouillée',
    biometric_lock_desc: 'Le verrouillage biométrique est activé. Veuillez vous authentifier pour accéder à Flash Pay.',
    unlock: 'Déverrouiller',
    flash_pay_security: 'Sécurité Flash Pay',
    use_password: 'Utiliser le mot de passe',
    password: 'Mot de passe',
    unlock_with_password: 'Déverrouiller avec mot de passe',
    password_error: 'Mot de passe incorrect.',
    invalid_credentials: 'Identifiants invalides.',
    inactivity_locked: 'Session expirée après 2 minutes d\'inactivité.',
    lock_app: 'Verrouiller l\'app',
    back_to_biometric: 'Retour à l\'empreinte',
    unlock_with_pin: 'Déverrouiller avec PIN',
  },
  en: {
    biometric_auth_failed: 'Authentication failed. Please try again.',
    biometric_auth_error: 'Authentication error.',
    biometric_lock_title: 'App locked',
    biometric_lock_desc: 'Biometric lock is enabled. Please authenticate to access Flash Pay.',
    unlock: 'Unlock',
    flash_pay_security: 'Flash Pay Security',
    use_password: 'Use password',
    password: 'Password',
    unlock_with_password: 'Unlock with password',
    password_error: 'Incorrect password.',
    invalid_credentials: 'Invalid credentials.',
    inactivity_locked: 'Session expired after 2 minutes of inactivity.',
    lock_app: 'Lock app',
    back_to_biometric: 'Back to biometric',
    unlock_with_pin: 'Unlock with PIN',
  },
  ru: {
    biometric_auth_failed: 'Аутентификация не удалась. Повторите попытку.',
    biometric_auth_error: 'Ошибка аутентификации.',
    biometric_lock_title: 'Приложение заблокировано',
    biometric_lock_desc: 'Биометрическая блокировка включена. Пожалуйста, подтвердите личность для доступа к Flash Pay.',
    unlock: 'Разблокировать',
    flash_pay_security: 'Безопасность Flash Pay',
    use_password: 'Использовать пароль',
    password: 'Пароль',
    unlock_with_password: 'Разблокировать с помощью пароля',
    password_error: 'Неверный пароль.',
    invalid_credentials: 'Неверные учетные данные.',
    inactivity_locked: 'Сеанс истек через 2 минуты неактивности.',
    lock_app: 'Заблокировать приложение',
    back_to_biometric: 'Вернуться к отпечатку',
    unlock_with_pin: 'Разблокировать с помощью ПИН',
  },
} as const;

const t = (key: keyof typeof copy.fr) => {
  const lang = getLanguage();
  return copy[lang as keyof typeof copy]?.[key] || copy.fr[key];
};

export const BiometricGuard: React.FC<BiometricGuardProps> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(() => {
    const isNative = Capacitor.isNativePlatform();
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || false;
    const biometricLock = localStorage.getItem('app_lock_enabled') === 'true';
    const pinLock = pinService.isAppLockEnabled();
    return (isNative && biometricLock) || (!isNative && pinLock);
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [inactivityMessage, setInactivityMessage] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageVisibilityRef = useRef<string | null>(null);

  // Track page visibility (app in background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pageVisibilityRef.current = new Date().toISOString();
        // Clear inactivity timer when leaving app
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      } else {
        // App came back to foreground
        if (pageVisibilityRef.current) {
          const hiddenTime = new Date().getTime() - new Date(pageVisibilityRef.current).getTime();
          if (hiddenTime > INACTIVITY_TIMEOUT && (localStorage.getItem('app_lock_enabled') === 'true' || pinService.isAppLockEnabled())) {
            setIsLocked(true);
            setInactivityMessage(t('inactivity_locked'));
            setShowPasswordForm(false);
            setError(null);
            // Start auth immediately
            if (isNative) {
              handleAuthenticate();
            } else {
              setShowPinModal(true);
            }
          }
        }
        pageVisibilityRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Reset inactivity timer on user interaction
  useEffect(() => {
    if (isLocked || !localStorage.getItem('app_lock_enabled')) return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        setIsLocked(true);
        setInactivityMessage(t('inactivity_locked'));
        setShowPasswordForm(false);
        if (isNative) {
          handleAuthenticate();
        } else {
          setShowPinModal(true);
        }
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isLocked]);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setError(null);
    setInactivityMessage('');
    try {
      const creds = await biometricService.getCredentials();
      if (creds) {
        setIsLocked(false);
        setShowPasswordForm(false);
        setPassword('');
      } else {
        // Only show error if we actually have credentials but authentication failed/was cancelled
        const hasLocalCreds = !!localStorage.getItem('flash_pay_biometric_creds') || Capacitor.isNativePlatform();
        if (hasLocalCreds) {
          setError(t('biometric_auth_failed'));
        } else {
          // No credentials set up on this device/browser yet
          setShowPasswordForm(true);
        }
      }
    } catch (err) {
      setError(t('biometric_auth_error'));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleUnlockWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingPassword(true);
    setPasswordError('');

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        setPasswordError(t('invalid_credentials'));
        setIsVerifyingPassword(false);
        return;
      }

      // Try to re-authenticate with password
      await authService.login(user.email, password);
      setIsLocked(false);
      setShowPasswordForm(false);
      setPassword('');
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPasswordError('Mot de passe incorrect. Veuillez réessayer.');
      } else {
        const friendlyError = translateFirebaseError(err);
        setPasswordError(friendlyError || 'Erreur d\'authentification');
      }
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleManualLock = () => {
    setIsLocked(true);
    setShowPasswordForm(false);
    setError(null);
    setPassword('');
  };

  const handlePinUnlock = (pin?: string) => {
    if (pin && pinService.verifyPin(pin)) {
      setIsLocked(false);
      setShowPinModal(false);
    } else {
      setError('Code PIN incorrect');
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  if (showPinModal && !isNative) {
    return <PinModal mode="verify" onSuccess={handlePinUnlock} title={t('biometric_lock_title')} />;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#661489] flex flex-col items-center justify-center p-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_40%)]" />
      
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-xs text-center">
        <div className="w-24 h-24 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl animate-pulse">
          <Lock size={40} className="text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">{t('biometric_lock_title')}</h1>
          <p className="text-white/60 text-sm font-medium leading-relaxed">
            {inactivityMessage || t('biometric_lock_desc')}
          </p>
        </div>

        {error && (
          <p className="text-pink-300 text-xs font-bold bg-pink-500/10 px-4 py-2 rounded-xl border border-pink-500/20">
            {error}
          </p>
        )}

        {!showPasswordForm ? (
          <>
            {/* Biometric Button */}
            <button
              onClick={() => isNative ? handleAuthenticate() : setShowPinModal(true)}
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white text-[#661489] rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {isAuthenticating ? (
                <div className="w-5 h-5 border-2 border-[#661489] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isNative ? <Fingerprint size={20} /> : <Key size={20} />}
                  {t('unlock')}
                </>
              )}
            </button>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={() => setShowPasswordForm(true)}
                className="flex items-center justify-center gap-2 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                <KeyRound size={16} />
                {t('use_password')}
              </button>
              <button
                onClick={handleManualLock}
                className="flex items-center justify-center gap-2 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                <LogOut size={16} />
                {t('lock_app')}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Password Form */}
            <form onSubmit={handleUnlockWithPassword} className="w-full space-y-4">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('password')}
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 font-medium focus:outline-none focus:border-white/60 transition-all"
                  autoFocus
                  disabled={isVerifyingPassword}
                />
              </div>

              {passwordError && (
                <p className="text-pink-300 text-xs font-bold bg-pink-500/10 px-4 py-2 rounded-xl border border-pink-500/20">
                  {passwordError}
                </p>
              )}

              <button
                type="submit"
                disabled={isVerifyingPassword || !password}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white text-[#661489] rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isVerifyingPassword ? (
                  <div className="w-5 h-5 border-2 border-[#661489] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound size={20} />
                    {t('unlock_with_password')}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setPassword('');
                  setPasswordError('');
                }}
                className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                {isNative ? t('back_to_biometric') : 'Retour'}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="absolute bottom-10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
        {t('flash_pay_security')}
      </div>
    </div>
  );
};
