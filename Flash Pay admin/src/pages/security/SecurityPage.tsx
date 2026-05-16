import React, { useState, useEffect } from 'react';
import { Shield, Fingerprint, Key, Smartphone, ChevronRight, Lock, Bell, Eye, EyeOff } from 'lucide-react';
import { biometricService } from '../../services/biometricService';
import { pinService } from '../../services/pinService';
import { PinModal } from '../../components/PinModal';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

export const SecurityPage: React.FC = () => {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(localStorage.getItem('admin_biometric_enabled') === 'true');
  const [pinEnabled, setPinEnabled] = useState(pinService.isEnabled());
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
      toast.success('Empreinte digitale désactivée');
    } else {
      // Logic for enabling is usually done during login or we can ask for current password
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
        {/* Native Biometric Section */}
        {isNative && biometricAvailable && (
          <div className="m3-card-elevated group overflow-hidden">
            <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
              <Fingerprint size={160} />
            </div>
            
            <div className="flex items-start justify-between mb-8">
              <div className="p-4 bg-[#6344B6]/10 text-[#6344B6] rounded-[24px]">
                <Fingerprint size={28} strokeWidth={2.5} />
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={biometricEnabled} 
                  onChange={handleToggleBiometric} 
                  className="sr-only peer" 
                />
                <div className="w-14 h-8 bg-[#E7E0EB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#6344B6] shadow-sm"></div>
              </label>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-[#1D1B20]">Empreinte digitale</h3>
              <p className="text-[#49454F] text-sm font-medium leading-relaxed opacity-70">
                Utilisez votre empreinte pour déverrouiller le portail admin instantanément sans retaper votre mot de passe.
              </p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-[#E7E0EB] flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-widest ${biometricEnabled ? 'text-[#6344B6]' : 'text-slate-400'}`}>
                {biometricEnabled ? 'Activé' : 'Désactivé'}
              </span>
              <Smartphone size={16} className="text-[#49454F]/30" />
            </div>
          </div>
        )}

        {/* PIN Code Section (For PWA/Web) */}
        {!isNative && (
          <div className="m3-card-elevated group overflow-hidden">
            <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
              <Key size={160} />
            </div>
            
            <div className="flex items-start justify-between mb-8">
              <div className="p-4 bg-[#6344B6]/10 text-[#6344B6] rounded-[24px]">
                <Key size={28} strokeWidth={2.5} />
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={pinEnabled} 
                  onChange={handleTogglePin} 
                  className="sr-only peer" 
                />
                <div className="w-14 h-8 bg-[#E7E0EB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#6344B6] shadow-sm"></div>
              </label>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-[#1D1B20]">Code PIN de sécurité</h3>
              <p className="text-[#49454F] text-sm font-medium leading-relaxed opacity-70">
                Configurez un code à 4 chiffres pour sécuriser votre session sur ce navigateur. Plus besoin de mot de passe long.
              </p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-[#E7E0EB] flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-widest ${pinEnabled ? 'text-[#6344B6]' : 'text-slate-400'}`}>
                {pinEnabled ? 'Activé' : 'Désactivé'}
              </span>
              <Lock size={16} className="text-[#49454F]/30" />
            </div>
          </div>
        )}

        {/* Session Info Section */}
        <div className="m3-card-elevated bg-[#F3EDF7]/30 border-dashed">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#6344B6] text-white rounded-lg shadow-lg shadow-[#6344B6]/20">
              <Shield size={20} />
            </div>
            <h3 className="text-lg font-black text-[#1D1B20]">Statut de Sécurité</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E7E0EB]">
              <div className="flex items-center gap-3">
                <Bell size={18} className="text-[#6344B6]" />
                <span className="text-xs font-bold text-[#1D1B20]">Alertes de connexion</span>
              </div>
              <span className="text-[9px] font-black uppercase bg-[#EADDFF] text-[#21005D] px-2 py-1 rounded-full">Actif</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E7E0EB]">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-[#6344B6]" />
                <span className="text-xs font-bold text-[#1D1B20]">Appareil vérifié</span>
              </div>
              <span className="text-[9px] font-black uppercase bg-[#E8DEF8] text-[#1D192B] px-2 py-1 rounded-full">Oui</span>
            </div>
          </div>

          <p className="mt-6 text-[10px] font-medium text-[#49454F] leading-relaxed opacity-60 text-center italic">
            "Le portail admin Flash Pay utilise un chiffrement de bout en bout et des protocoles de sécurité bancaire pour protéger vos accès."
          </p>
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
