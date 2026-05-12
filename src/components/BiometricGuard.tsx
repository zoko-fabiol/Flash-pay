import React, { useState, useEffect } from 'react';
import { biometricService } from '../services/biometricService';
import { Loading } from './UI';
import { Fingerprint, Lock } from 'lucide-react';

interface BiometricGuardProps {
  children: React.ReactNode;
}

export const BiometricGuard: React.FC<BiometricGuardProps> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(() => {
    return localStorage.getItem('app_lock_enabled') === 'true';
  });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLocked) {
      handleAuthenticate();
    }
  }, []);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      // We don't necessarily need the credentials, just a successful scan
      // But getCredentials() triggers the OS biometric prompt
      const creds = await biometricService.getCredentials();
      if (creds) {
        setIsLocked(false);
      } else {
        setError('Authentification échouée. Veuillez réessayer.');
      }
    } catch (err) {
      setError('Erreur lors de l\'authentification.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#661489] flex flex-col items-center justify-center p-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.1),transparent_40%)]" />
      
      <div className="relative z-10 flex flex-col items-center gap-8 max-w-xs text-center">
        <div className="w-24 h-24 rounded-[32px] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl animate-pulse">
          <Lock size={40} className="text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">Application Verrouillée</h1>
          <p className="text-white/60 text-sm font-medium leading-relaxed">
            Le verrouillage biométrique est activé. Veuillez vous authentifier pour accéder à Flash Pay.
          </p>
        </div>

        {error && (
          <p className="text-pink-300 text-xs font-bold bg-pink-500/10 px-4 py-2 rounded-xl border border-pink-500/20">
            {error}
          </p>
        )}

        <button
          onClick={handleAuthenticate}
          disabled={isAuthenticating}
          className="w-full flex items-center justify-center gap-3 py-4 bg-white text-[#661489] rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
        >
          {isAuthenticating ? (
            <div className="w-5 h-5 border-2 border-[#661489] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Fingerprint size={20} />
              DÉVERROUILLER
            </>
          )}
        </button>
      </div>

      <div className="absolute bottom-10 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
        Flash Pay Security
      </div>
    </div>
  );
};
