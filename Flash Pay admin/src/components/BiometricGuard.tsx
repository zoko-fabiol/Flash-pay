import React, { useState, useEffect, useRef } from 'react';
import { biometricService } from '../services/biometricService';
import { pinService } from '../services/pinService';
import { auth } from '../lib/firebase';
import { Loading } from './ui/Loading';
import { Fingerprint, Lock, KeyRound, Smartphone, ShieldCheck, Delete } from 'lucide-react';
import { translateFirebaseError } from '../utils/errorMessages';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';

interface BiometricGuardProps {
  children: React.ReactNode;
}

const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes

export const BiometricGuard: React.FC<BiometricGuardProps> = ({ children }) => {
  const isNative = Capacitor.isNativePlatform();
  const [isLocked, setIsLocked] = useState(() => {
    return localStorage.getItem('admin_app_lock_enabled') === 'true';
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlockMode, setUnlockMode] = useState<'primary' | 'password' | 'pin'>(
    isNative ? 'primary' : (pinService.isEnabled() ? 'pin' : 'password')
  );
  
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [pin, setPin] = useState('');
  const [inactivityMessage, setInactivityMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageVisibilityRef = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pageVisibilityRef.current = Date.now();
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      } else {
        if (pageVisibilityRef.current) {
          const hiddenTime = Date.now() - pageVisibilityRef.current;
          if (hiddenTime > INACTIVITY_TIMEOUT && localStorage.getItem('admin_app_lock_enabled') === 'true') {
            setIsLocked(true);
            setInactivityMessage('Session verrouillée pour inactivité.');
            setUnlockMode(isNative ? 'primary' : (pinService.isEnabled() ? 'pin' : 'password'));
            if (isNative && localStorage.getItem('admin_biometric_enabled') === 'true') {
              handleBiometric();
            }
          }
        }
        pageVisibilityRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isNative]);

  useEffect(() => {
    if (isLocked || localStorage.getItem('admin_app_lock_enabled') !== 'true' || !auth.currentUser) return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        setIsLocked(true);
        setInactivityMessage('Session verrouillée après 2 minutes d\'inactivité.');
        setUnlockMode(isNative ? 'primary' : (pinService.isEnabled() ? 'pin' : 'password'));
        if (isNative && localStorage.getItem('admin_biometric_enabled') === 'true') {
          handleBiometric();
        }
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'click', 'mousemove'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [isLocked, isNative]);

  const handleBiometric = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const creds = await biometricService.getCredentials();
      if (creds) {
        setIsLocked(false);
        setInactivityMessage('');
      } else {
        setError('Échec de la biométrie.');
      }
    } catch (err) {
      setError('Erreur d\'accès biométrique.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePinInput = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = (pinToVerify: string) => {
    if (pinService.verifyPin(pinToVerify)) {
      setIsLocked(false);
      setPin('');
      setInactivityMessage('');
    } else {
      setError('Code PIN incorrect');
      setPin('');
      setTimeout(() => setError(null), 2000);
    }
  };

  const handleUnlockWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setPasswordError('');

    try {
      const user = auth.currentUser;
      if (!user?.email) {
        setPasswordError('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      await signInWithEmailAndPassword(auth, user.email, password);
      setIsLocked(false);
      setPassword('');
      setInactivityMessage('');
    } catch (err: any) {
      setPasswordError(translateFirebaseError(err));
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isLocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#1D1B20] flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#6344B6] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#D0BCFF] blur-[120px]" />
      </div>
      
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-10">
        {/* Header Icon */}
        <div className="relative">
          <div className="w-24 h-24 rounded-[32px] bg-[#6344B6] flex items-center justify-center shadow-2xl shadow-[#6344B6]/40 animate-in zoom-in duration-500">
            {isNative ? <Fingerprint size={48} className="text-white" /> : <ShieldCheck size={48} className="text-white" />}
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg animate-bounce">
            <Lock size={20} className="text-[#6344B6]" />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight">Accès Verrouillé</h1>
          <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.2em] max-w-[200px] mx-auto leading-relaxed">
            {inactivityMessage || 'Veuillez vous authentifier pour accéder à la console admin.'}
          </p>
        </div>

        {error && (
          <div className="px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-xl animate-in shake duration-300">
            <p className="text-pink-300 text-xs font-black uppercase tracking-wider">{error}</p>
          </div>
        )}

        {/* Dynamic Input Modes */}
        <div className="w-full">
          {unlockMode === 'primary' && isNative && (
            <div className="space-y-6">
              <button 
                onClick={handleBiometric} 
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-3 py-5 bg-[#6344B6] text-white rounded-[24px] font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                {isAuthenticating ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><Fingerprint size={24} /> Utiliser la Biométrie</>}
              </button>
              <button 
                onClick={() => setUnlockMode('password')}
                className="w-full text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                Utiliser le mot de passe
              </button>
            </div>
          )}

          {unlockMode === 'pin' && (
            <div className="flex flex-col items-center gap-10">
              <div className="flex gap-5">
                {[0, 1, 2, 3].map(i => (
                  <div 
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin[i] ? 'bg-white border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-white/20'}`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((item, idx) => (
                  item === '' ? <div key={idx} /> :
                  item === 'del' ? (
                    <button key={idx} onClick={() => setPin(p => p.slice(0, -1))} className="w-16 h-16 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors">
                      <Delete size={28} />
                    </button>
                  ) : (
                    <button 
                      key={idx} 
                      onClick={() => handlePinInput(item.toString())}
                      className="w-16 h-16 rounded-full bg-white/5 border border-white/5 text-2xl font-black hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
                    >
                      {item}
                    </button>
                  )
                ))}
              </div>

              <button 
                onClick={() => setUnlockMode('password')}
                className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                Mode Mot de Passe
              </button>
            </div>
          )}

          {unlockMode === 'password' && (
            <form onSubmit={handleUnlockWithPassword} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="relative">
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Mot de passe administrateur" 
                  className="w-full px-6 py-5 rounded-[24px] bg-white/5 border border-white/10 text-white placeholder:text-white/20 outline-none focus:border-[#6344B6] focus:ring-4 focus:ring-[#6344B6]/20 transition-all"
                  autoFocus 
                />
                <KeyRound size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20" />
              </div>
              {passwordError && <p className="text-pink-400 text-[10px] font-bold text-center">{passwordError}</p>}
              <button 
                type="submit" 
                disabled={isVerifying} 
                className="w-full py-5 bg-white text-[#1D1B20] rounded-[24px] font-black text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {isVerifying ? 'Vérification...' : 'Déverrouiller'}
              </button>
              <button 
                type="button" 
                onClick={() => setUnlockMode(isNative ? 'primary' : (pinService.isEnabled() ? 'pin' : 'password'))} 
                className="w-full text-xs font-black uppercase tracking-widest text-white/40 py-2"
              >
                Retour
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
           <Smartphone size={14} className="text-[#6344B6]" />
           <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/40">Mode: {isNative ? 'APK Native' : 'PWA / Web'}</span>
        </div>
      </div>
    </div>
  );
};
