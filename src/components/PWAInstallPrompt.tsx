import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';
import { usePWAInstall } from '../context/PWAInstallContext';
import { useLanguage } from '../context/LanguageContext';
import { deviceService } from '../services/deviceService';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const PWAInstallPrompt: React.FC = () => {
  const { canInstall, installApp, isInstalled } = usePWAInstall();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  
  const [apkUrl, setApkUrl] = useState('https://github.com/zoko-fabiol/Flash-pay/releases/download/v1.1.1/FlashPay.apk');
  const [showAndroidPromo, setShowAndroidPromo] = useState(true);

  const isIOS = deviceService.isIOS();
  const isAndroid = deviceService.isAndroid();

  // Load configuration from Firestore settings collection
  useEffect(() => {
    const qSettings = query(collection(db, 'settings'), limit(1));
    const unsubscribe = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        if (data.apkDownloadUrl) {
          setApkUrl(data.apkDownloadUrl);
        }
        if (data.showAndroidPromo !== undefined) {
          setShowAndroidPromo(!!data.showAndroidPromo);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // On native platforms (APK already installed), we don't show the prompt
  if (deviceService.isNative() || isInstalled || dismissed) return null;
  
  // If showing Android promo is disabled manually from admin, don't show it for Android users
  if (isAndroid && !showAndroidPromo) return null;

  // On iOS, canInstall is usually false, but we want to show it anyway to guide the user
  if (!canInstall && !isIOS && !isAndroid) return null;

  const handleInstallClick = () => {
    if (isAndroid) {
      // Direct download via window.location for better mobile compatibility
      window.location.href = apkUrl;
    } else if (isIOS) {
      // Pour iOS, on affiche le guide (car pas d'install auto)
      setShowIOSGuide(true);
    } else {
      // Pour les autres (Chrome/Desktop), on lance l'install PWA
      installApp();
    }
  };

  return (
    <>
      <div className="mx-3 mb-8 animate-in fade-in slide-in-from-top-6 duration-1000 ease-out">
        <div className="relative overflow-hidden rounded-[30px] bg-white/40 backdrop-blur-md border border-white/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-[#6344B6]/5 opacity-50" />
          
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6344B6] to-[#4A3191] text-white shadow-lg shadow-[#6344B6]/20">
                <Smartphone size={22} className="animate-pulse" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-[14px] font-black text-slate-900 leading-tight tracking-tight">
                  {isAndroid ? 'Version Android Native' : (t('install_app_title') || 'Expérience Premium')}
                </h4>
                <p className="text-[11px] font-bold text-slate-500 leading-tight mt-1 opacity-80">
                  {isAndroid ? 'Téléchargez l\'APK pour plus de performances' : (t('install_app_subtitle') || 'Installez l\'app pour un accès instantané')}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-[11px] font-black text-white shadow-xl transition-all active:scale-95 hover:bg-black w-full"
              >
                <Download size={14} />
                {isAndroid ? 'Télécharger' : (t('install') || 'Installer')}
              </button>
              <button 
                onClick={() => setDismissed(true)}
                className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest py-1 w-full text-center"
              >
                {t('ignore') || 'Ignorer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guide iOS (Modal simple) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl animate-in zoom-in duration-500">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-[#6344B6]/10 flex items-center justify-center text-[#6344B6]">
                <Download size={32} />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-slate-900">Installer sur iPhone</h3>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                  1. Appuyez sur le bouton <span className="font-bold text-[#6344B6]">Partager</span> en bas de Safari.<br/>
                  2. Faites défiler et appuyez sur <span className="font-bold text-[#6344B6]">Sur l'écran d'accueil</span>.
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm transition-all active:scale-95"
              >
                J'AI COMPRIS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
