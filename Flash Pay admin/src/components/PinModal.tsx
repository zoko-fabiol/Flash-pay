import React, { useState, useEffect } from 'react';
import { Lock, X, Delete } from 'lucide-react';

interface PinModalProps {
  mode: 'set' | 'verify';
  onSuccess: (pin?: string) => void;
  onCancel?: () => void;
  title?: string;
}

export const PinModal: React.FC<PinModalProps> = ({ mode, onSuccess, onCancel, title }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(mode === 'set' ? 'enter' : 'verify');
  const [error, setError] = useState('');

  const handleNumber = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (mode === 'verify') {
        onSuccess(pin);
      } else if (step === 'enter') {
        setConfirmPin(pin);
        setPin('');
        setStep('confirm');
      } else {
        if (pin === confirmPin) {
          onSuccess(pin);
        } else {
          setError('Les codes ne correspondent pas');
          setPin('');
          setStep('enter');
        }
      }
    }
  }, [pin]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#1D1B20]/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-sm p-8 flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-[24px] bg-[#6344B6]/10 flex items-center justify-center text-[#6344B6] shadow-inner">
            <Lock size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white tracking-tight">
              {title || (step === 'confirm' ? 'Confirmez votre code' : mode === 'set' ? 'Créez un code PIN' : 'Entrez votre code PIN')}
            </h2>
            <p className="text-[#E7E0EB] text-[10px] font-black uppercase tracking-widest opacity-60">
              {error || 'Sécurisez l\'accès au panel admin'}
            </p>
          </div>
        </div>

        {/* Pin Display */}
        <div className="flex gap-4">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${pin[i] ? 'bg-[#6344B6] border-[#6344B6] scale-125 shadow-lg shadow-[#6344B6]/40' : 'border-[#49454F]'}`}
            />
          ))}
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleNumber(num.toString())}
              className="w-16 h-16 rounded-full bg-white/5 text-white text-2xl font-black hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center mx-auto border border-white/5 shadow-sm"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleNumber('0')}
            className="w-16 h-16 rounded-full bg-white/5 text-white text-2xl font-black hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center mx-auto border border-white/5 shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full flex items-center justify-center text-[#E7E0EB] hover:text-white transition-colors mx-auto active:scale-90"
          >
            <Delete size={24} />
          </button>
        </div>

        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-[#E7E0EB] font-black text-[10px] uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
};
