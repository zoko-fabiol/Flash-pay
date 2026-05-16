import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, Key, Smartphone, Lock, Bell, Clock, Info } from 'lucide-react';
import { biometricService } from '../../services/biometricService';
import { pinService } from '../../services/pinService';
import { PinModal } from '../../components/PinModal';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

export const SecurityPage: React.FC = () => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(localStorage.getItem('admin_biometric_enabled') === 'true');
  const [pinEnabled, setPinEnabled] = useState(pinService.isEnabled());
  const [appLockEnabled, setAppLockEnabled] = useState(localStorage.getItem('admin_app_lock_enabled') === 'true');
  const [showPinModal, setShowPinModal] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometricService.isAvailable();
      setBiometricAvailable(available);
    };
    checkBiometric();
  }, []);

  const handleToggleBiometric = async () => {
    if (biometricEnabled) {
      await biometricService.removeCredentials();
      setBiometricEnabled(false);
      localStorage.setItem('admin_biometric_enabled', 'false');
      toast.success('Empreinte digitale désactivée');
    } else {
      toast.error('Pour des raisons de sécurité, l\'empreinte digitale s\'active lors de votre prochaine connexion.');
    }
  };

  const handleTogglePin = () => {
    if (pinEnabled) {
      pinService.removePin();
      setPinEnabled(false);
      toast.success('Code PIN désactivé');
    } else {
      setShowPinModal(true);
    }
  };

  const handleToggleAppLock = () => {
    const newValue = !appLockEnabled;
    if (newValue && !biometricEnabled && !pinEnabled) {
      toast.error(isNative ? 'Activez d\'abord l\'empreinte digitale' : 'Configurez d\'abord un code PIN');
      return;
    }
    setAppLockEnabled(newValue);
    localStorage.setItem('admin_app_lock_enabled', String(newValue));
    toast.success(newValue ? 'Verrouillage auto activé (2 min)' : 'Verrouillage auto désactivé');
  };

  const handlePinSuccess = (pin?: string) => {
    if (pin) {
      pinService.setPin(pin);
      setPinEnabled(true);
      setShowPinModal(false);
      toast.success('Code PIN activé avec succès');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight">Sécurité</h2>
        <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] opacity-60">Gérez vos options de protection biométrique et accès rapide</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Platform Specific Section */}
        {isNative ? (
          /* APK Section */
          <div className="m3-card-elevated group overflow-hidden border-2 border-[#6344B6]/10">
            <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
              <Fingerprint size={160} />
            </div>
            
            <div className="flex items-start justify-between mb-8">
              <div className="p-4 bg-[#6344B6]/10 text-[#6344B6] rounded-[24px]">
                <Fingerprint size={28} strokeWidth={2.5} />
              </div>
              {biometricAvailable && (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={biometricEnabled} onChange={handleToggleBiometric} className="sr-only peer" />
                  <div className="w-14 h-8 bg-[#E7E0EB] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#6344B6] shadow-sm"></div>
                </label>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-[#1D1B20]">Protection Biométrique (APK)</h3>
              <p className="text-[#49454F] text-sm font-medium leading-relaxed opacity-70">
                Utilisez l'empreinte digitale ou la reconnaissance faciale de votre appareil pour déverrouiller l'administration.
              </p>
            </div>
            
            {!biometricAvailable && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex gap-3">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 font-bold">Biométrie non disponible sur cet appareil.</p>
              </div>
            )}
          </div>
        ) : (
          /* PWA Section */
          <div className="m3-card-elevated group overflow-hidden border-2 border-[#6344B6]/10">
            <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
              <Key size={160} />
            </div>
            
            <div className="flex items-start justify-between mb-8">
              <div className="p-4 bg-[#6344B6]/10 text-[#6344B6] rounded-[24px]">
                <Key size={28} strokeWidth={2.5} />
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={pinEnabled} onChange={handleTogglePin} className="sr-only peer" />
                <div className="w-14 h-8 bg-[#E7E0EB] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#6344B6] shadow-sm"></div>
              </label>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-[#1D1B20]">Code PIN de sécurité (PWA)</h3>
              <p className="text-[#49454F] text-sm font-medium leading-relaxed opacity-70">
                Configurez un code à 4 chiffres pour sécuriser votre session sur ce navigateur Web.
              </p>
            </div>
          </div>
        )}

        {/* Global Auto-Lock Section */}
        <div className="m3-card-elevated group overflow-hidden bg-[#6344B6] text-white">
          <div className="absolute -right-6 -top-6 opacity-[0.1] group-hover:scale-110 transition-transform duration-700">
            <Clock size={160} />
          </div>
          
          <div className="flex items-start justify-between mb-8">
            <div className="p-4 bg-white/20 text-white rounded-[24px] backdrop-blur-md">
              <Lock size={28} strokeWidth={2.5} />
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={appLockEnabled} onChange={handleToggleAppLock} className="sr-only peer" />
              <div className="w-14 h-8 bg-white/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-400 shadow-sm"></div>
            </label>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black">Verrouillage Automatique</h3>
            <p className="text-white/70 text-sm font-medium leading-relaxed">
              Verrouille automatiquement la console après <span className="text-white font-black underline decoration-2">2 minutes</span> d'inactivité.
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Délai standard : 120s</span>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${appLockEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">{appLockEnabled ? 'Actif' : 'Inactif'}</span>
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="m3-card-elevated bg-[#F3EDF7]/30 border-dashed flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#6344B6] text-white rounded-lg shadow-lg shadow-[#6344B6]/20">
              <Shield size={20} />
            </div>
            <h3 className="text-lg font-black text-[#1D1B20]">Conseils de Sécurité</h3>
          </div>
          
          <div className="space-y-4">
             <div className="flex gap-4 p-4 bg-white rounded-2xl border border-[#E7E0EB]">
                <Bell size={20} className="text-[#6344B6] shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-[#1D1B20]">Alertes actives</p>
                  <p className="text-[10px] text-[#49454F] font-medium leading-snug">Vous recevrez un push en cas de connexion suspecte.</p>
                </div>
             </div>
             <div className="flex gap-4 p-4 bg-white rounded-2xl border border-[#E7E0EB]">
                <Smartphone size={20} className="text-[#6344B6] shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-[#1D1B20]">Session {isNative ? 'Mobile' : 'Navigateur'}</p>
                  <p className="text-[10px] text-[#49454F] font-medium leading-snug">Optimisé pour la plateforme actuelle.</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {showPinModal && (
        <PinModal 
          mode="set" 
          onSuccess={handlePinSuccess} 
          onCancel={() => setShowPinModal(false)} 
        />
      )}
    </div>
  );
};
