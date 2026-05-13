import React, { useState, useEffect } from 'react';
import { Lock, X, Delete, Check } from 'lucide-react';

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm p-8 flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Lock size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">
              {title || (step === 'confirm' ? 'Confirmez votre code' : mode === 'set' ? 'Créez un code PIN' : 'Entrez votre code PIN')}
            </h2>
            <p className="text-slate-400 text-sm font-medium">
              {error || 'Entrez 4 chiffres pour sécuriser votre accès'}
            </p>
          </div>
        </div>

        {/* Pin Display */}
        <div className="flex gap-4">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${pin[i] ? 'bg-primary border-primary scale-125' : 'border-slate-600'}`}
            />
          ))}
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-6 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleNumber(num.toString())}
              className="w-16 h-16 rounded-full bg-white/5 text-white text-2xl font-black hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center mx-auto"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleNumber('0')}
            className="w-16 h-16 rounded-full bg-white/5 text-white text-2xl font-black hover:bg-white/10 active:bg-white/20 transition-all flex items-center justify-center mx-auto"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors mx-auto"
          >
            <Delete size={24} />
          </button>
        </div>

        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-slate-500 font-bold text-sm uppercase tracking-widest hover:text-slate-300 transition-colors"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
};
