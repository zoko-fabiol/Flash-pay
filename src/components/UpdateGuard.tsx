import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, ChevronRight, Sparkles } from 'lucide-react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface VersionData {
  version: string;
  versionCode: number;
  downloadUrl: string;
  changelog: string;
  forceUpdate: boolean;
}

export const UpdateGuard: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<VersionData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Sécurité absolue : si on est sur le Web, on ne fait RIEN
  const isWeb = Capacitor.getPlatform() === 'web' || !Capacitor.isNativePlatform();

  useEffect(() => {
    if (isWeb) return;

    const checkVersion = async () => {
      try {
        const info = await App.getInfo();
        const localVersionCode = parseInt(info.build, 10);

        // On récupère le fichier version.json sur le serveur Netlify
        const response = await fetch(`/version.json?t=${Date.now()}`);
        if (!response.ok) return;

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          return;
        }

        const data: VersionData = await response.json();
        
        // Comparaison : Si le versionCode du serveur est strictement plus grand que le local
        if (data.versionCode > localVersionCode) {
          setUpdateInfo(data);
          setShowModal(true);
        }
      } catch (error) {
        console.error('Erreur lors du check de version:', error);
      }
    };

    // Petit délai pour laisser l'app charger tranquillement
    const timer = setTimeout(checkVersion, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = () => {
    if (updateInfo?.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank');
    }
  };

  if (isWeb || !showModal || isDismissed) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-[#1D1B20]/40 backdrop-blur-xl" />
      
      <div className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl border border-[#E7E0EB] overflow-hidden animate-in zoom-in-95 duration-500">
        {/* Header Illustration */}
        <div className="h-40 bg-[#6344B6] relative flex items-center justify-center overflow-hidden">
           <div className="relative">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[28px] flex items-center justify-center text-white shadow-xl animate-bounce">
                <RefreshCw size={40} />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-[#1D1B20] shadow-lg">
                <Sparkles size={16} />
              </div>
           </div>
        </div>

        <div className="p-8 text-center">
          <div className="mb-6">
            <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight mb-2">Mise à jour disponible</h3>
            <div className="inline-flex items-center gap-2 bg-[#F3EDF7] px-3 py-1 rounded-full border border-[#EADDFF]">
              <span className="text-[10px] font-black text-[#6344B6] uppercase tracking-widest">Version {updateInfo?.version}</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left border border-slate-100">
             <p className="text-[10px] font-black text-[#49454F] uppercase tracking-widest mb-2 opacity-50 text-center">Quoi de neuf ?</p>
             <p className="text-xs font-medium text-[#49454F] leading-relaxed italic">
               "{updateInfo?.changelog || 'Améliorations générales et corrections de bugs.'}"
             </p>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleUpdate}
              className="w-full bg-[#6344B6] text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-[#6344B6]/20 hover:bg-[#4A3191] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Download size={18} /> Télécharger maintenant
            </button>
            
            {!updateInfo?.forceUpdate && (
              <button 
                onClick={() => setIsDismissed(true)}
                className="w-full py-4 text-[#49454F] font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
              >
                Plus tard
              </button>
            )}
          </div>
        </div>
        
        {/* Corner Decoration */}
        <div className="absolute bottom-[-10px] left-[-10px] opacity-[0.03] pointer-events-none">
           <RefreshCw size={100} />
        </div>
      </div>
    </div>
  );
};
