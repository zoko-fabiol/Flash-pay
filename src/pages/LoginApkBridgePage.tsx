import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebase';
import { LogIn, ShieldCheck, AlertCircle, ArrowLeftRight } from 'lucide-react';

export const LoginApkBridgePage: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setStatus('loading');
      setErrorMessage(null);

      const provider = new GoogleAuthProvider();
      // Enforce account selection popup
      provider.setCustomParameters({ prompt: 'select_account' });

      console.log("[Bridge] Launching Firebase signInWithPopup...");
      const result = await signInWithPopup(auth, provider);
      
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credential?.idToken;

      if (!idToken) {
        throw new Error("Impossible de récupérer le jeton de sécurité Google (ID Token).");
      }

      setStatus('success');
      console.log("[Bridge] Login successful, redirecting to APK...");
      
      // Redirect back to the native app using deep link scheme
      const deepLinkUrl = `flashpay://login?idToken=${encodeURIComponent(idToken)}`;
      
      // Auto-trigger redirect
      window.location.href = deepLinkUrl;

      // Fallback redirect if window.location.href is blocked
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = deepLinkUrl;
        a.click();
      }, 500);

    } catch (err: any) {
      console.error("[Bridge] OAuth Bridge error:", err);
      setStatus('error');
      setErrorMessage(err.message || "Une erreur de connexion est survenue. Veuillez réessayer.");
    }
  };

  // Auto-login attempt on mount to make the flow friction-free
  useEffect(() => {
    const timer = setTimeout(() => {
      handleGoogleLogin();
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#120024] via-[#1a0033] to-[#0a0018] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glowing Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#8b5cf6]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#ec4899]/10 blur-[120px] pointer-events-none" />

      {/* Main Glass Container */}
      <div className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center">
        {/* Animated Custom Logo Area */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#7c3aed] to-[#db2777] flex items-center justify-center shadow-lg shadow-[#7c3aed]/30 mb-8 animate-pulse">
          <ArrowLeftRight className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-[#e879f9]">
          Flash Pay Auth
        </h1>
        <p className="text-gray-400 text-sm mb-8">
          Passerelle de connexion sécurisée pour application mobile
        </p>

        {/* Dynamic Card Body based on Status */}
        {status === 'idle' && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <p className="text-gray-300 text-sm mb-6 max-w-xs">
              Cliquez ci-dessous pour lancer la connexion Google sécurisée.
            </p>
            <button
              onClick={handleGoogleLogin}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#db2777] hover:from-[#6d28d9] hover:to-[#be185d] text-white font-semibold flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#7c3aed]/20"
            >
              <LogIn className="w-5 h-5" />
              Se connecter avec Google
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div className="w-full flex flex-col items-center py-6">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-6" />
            <p className="text-purple-200 font-medium text-sm animate-pulse">
              Connexion Google en cours...
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Veuillez valider vos identifiants dans la fenêtre de connexion.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="w-full flex flex-col items-center py-6 animate-scale-up">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <p className="text-emerald-400 font-bold text-lg">
              Connexion réussie !
            </p>
            <p className="text-gray-300 text-sm mt-2 max-w-xs">
              Redirection en cours vers votre application Flash Pay...
            </p>
            
            <button
              onClick={() => {
                const idToken = auth.currentUser?.getIdToken();
                idToken?.then(token => {
                  window.location.href = `flashpay://login?idToken=${encodeURIComponent(token)}`;
                });
              }}
              className="mt-6 text-xs text-[#d946ef] underline hover:text-[#f472b6] transition-colors"
            >
              L'application ne s'ouvre pas ? Cliquez ici
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="w-full flex flex-col items-center py-4 animate-shake">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-6">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="text-rose-400 font-bold text-lg">
              Échec de la connexion
            </p>
            <p className="text-gray-400 text-sm mt-2 max-w-xs px-2">
              {errorMessage}
            </p>
            
            <button
              onClick={handleGoogleLogin}
              className="w-full mt-6 py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold flex items-center justify-center gap-3 transition-all duration-300 border border-white/10"
            >
              Réessayer la connexion
            </button>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <p className="relative z-10 text-xs text-gray-600 mt-8">
        Propulsé par le protocole de sécurité Flash Pay. Tous droits réservés.
      </p>
    </div>
  );
};
