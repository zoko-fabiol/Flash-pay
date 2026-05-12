import React, { useState } from 'react';
import { Smartphone, X, Download } from 'lucide-react';
import { usePWAInstall } from '../context/PWAInstallContext';
import { useLanguage } from '../context/LanguageContext';

export const PWAInstallPrompt: React.FC = () => {
  const { canInstall, installApp, isInstalled } = usePWAInstall();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || isInstalled || dismissed) return null;

  return (
    <div className="mx-3 mb-8 animate-in fade-in slide-in-from-top-6 duration-1000 ease-out">
      <div className="relative overflow-hidden rounded-[30px] bg-white/40 backdrop-blur-md border border-white/60 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.03)] group">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-[#661489]/5 opacity-50" />
        
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#661489] to-[#4D0F67] text-white shadow-lg shadow-[#661489]/20">
              <Smartphone size={22} className="animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-[14px] font-black text-slate-900 leading-tight tracking-tight">
                {t('install_app_title') || 'Expérience Premium'}
              </h4>
              <p className="text-[11px] font-bold text-slate-500 leading-tight mt-1 opacity-80">
                {t('install_app_subtitle') || 'Installez l\'app pour un accès instantané'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={installApp}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-[11px] font-black text-white shadow-xl transition-all active:scale-95 hover:bg-black"
            >
              <Download size={14} />
              {t('install') || 'Installer'}
            </button>
            <button 
              onClick={() => setDismissed(true)}
              className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
