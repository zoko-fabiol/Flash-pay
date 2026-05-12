import React, { useState, useEffect, useRef } from 'react';
import { biometricService } from '../services/biometricService';
import { auth } from '../lib/firebase';
import { Loading } from './ui/Loading';
import { Fingerprint, Lock, KeyRound, LogOut } from 'lucide-react';
import { translateFirebaseError } from '../utils/errorMessages';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface BiometricGuardProps {
  children: React.ReactNode;
}

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes

export const BiometricGuard: React.FC<BiometricGuardProps> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(() => {
    return localStorage.getItem('admin_app_lock_enabled') === 'true';
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [inactivityMessage, setInactivityMessage] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageVisibilityRef = useRef<string | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pageVisibilityRef.current = new Date().toISOString();
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      } else {
        if (pageVisibilityRef.current) {
          const hiddenTime = new Date().getTime() - new Date(pageVisibilityRef.current).getTime();
          if (hiddenTime > INACTIVITY_TIMEOUT && localStorage.getItem('admin_app_lock_enabled') === 'true') {
            setIsLocked(true);
            setInactivityMessage('Session expirée après 2 minutes d\'inactivité.');
            setShowPasswordForm(false);
            handleAuthenticate();
          }
        }
        pageVisibilityRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (isLocked || localStorage.getItem('admin_app_lock_enabled') !== 'true') return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        setIsLocked(true);
        setInactivityMessage('Session expirée après 2 minutes d\'inactivité.');
        handleAuthenticate();
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
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
        setError('Authentification échouée.');
      }
    } catch (err) {
      setError('Erreur d\'authentification.');
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
        setPasswordError('Identifiants invalides.');
        return;
      }
      await signInWithEmailAndPassword(auth, user.email, password);
      setIsLocked(false);
      setShowPasswordForm(false);
      setPassword('');
    } catch (err: any) {
      setPasswordError(translateFirebaseError(err));
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  if (!isLocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#661489] flex flex-col items-center justify-center p-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_40%)]" />
      
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-xs text-center">
        <div className="w-24 h-24 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl animate-pulse">
          <Lock size={40} className="text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">Console Verrouillée</h1>
          <p className="text-white/60 text-sm font-medium leading-relaxed">
            {inactivityMessage || 'Le verrouillage biométrique est activé pour la console admin.'}
          </p>
        </div>

        {error && <p className="text-pink-300 text-xs font-bold bg-pink-500/10 px-4 py-2 rounded-xl border border-pink-500/20">{error}</p>}

        {!showPasswordForm ? (
          <div className="w-full space-y-4">
            <button onClick={handleAuthenticate} disabled={isAuthenticating} className="w-full flex items-center justify-center gap-3 py-4 bg-white text-[#661489] rounded-2xl font-black text-sm shadow-xl">
              {isAuthenticating ? <div className="w-5 h-5 border-2 border-[#661489] border-t-transparent rounded-full animate-spin" /> : <><Fingerprint size={20} /> Déverrouiller</>}
            </button>
            <button onClick={() => setShowPasswordForm(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-white/20 rounded-xl font-black text-xs uppercase tracking-wider">
              <KeyRound size={16} /> Utiliser le mot de passe
            </button>
          </div>
        ) : (
          <form onSubmit={handleUnlockWithPassword} className="w-full space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white outline-none" autoFocus />
            {passwordError && <p className="text-pink-300 text-xs font-bold">{passwordError}</p>}
            <button type="submit" disabled={isVerifyingPassword} className="w-full py-4 bg-white text-[#661489] rounded-2xl font-black text-sm">
              {isVerifyingPassword ? 'Vérification...' : 'Confirmer'}
            </button>
            <button type="button" onClick={() => setShowPasswordForm(false)} className="w-full py-3 text-xs uppercase font-black opacity-60">Retour</button>
          </form>
        )}
      </div>
    </div>
  );
};
