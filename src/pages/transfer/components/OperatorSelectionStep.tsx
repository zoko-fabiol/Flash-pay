import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Smartphone, User, Zap } from 'lucide-react';

interface OperatorSelectionStepProps {
  transferData: any;
  updateTransferData: (data: any) => void;
  countries: any[];
  t: (key: string) => string;
  nextStep: () => void;
  previousStep: () => void;
}

export const OperatorSelectionStep: React.FC<OperatorSelectionStepProps> = ({ 
  transferData, 
  updateTransferData, 
  countries, 
  t, 
  nextStep, 
  previousStep 
}) => {
  const selectedCountry = countries.find((c: any) => c.code === transferData.destinationCountry);
  const operators = selectedCountry?.operators || [];

  const handleManualOperatorSelect = (recipientIndex: number, opName: string) => {
    if (transferData.isBulk) {
      const newBulk = [...(transferData.bulkRecipients || [])];
      newBulk[recipientIndex] = { ...newBulk[recipientIndex], operator: opName };
      updateTransferData({ bulkRecipients: newBulk });
    } else {
      updateTransferData({ recipientOperator: opName });
    }
  };

  const recipientsToProcess = transferData.isBulk 
    ? transferData.bulkRecipients?.map((r: any, i: number) => ({ ...r, originalIndex: i })).filter((r: any) => !r.operator)
    : (!transferData.recipientOperator ? [{ name: transferData.recipientName, phone: transferData.recipientPhone, originalIndex: -1 }] : []);

  // Auto-redirect if everything is detected
  useEffect(() => {
    if (recipientsToProcess.length === 0) {
      const timer = setTimeout(() => nextStep(), 1500);
      return () => clearTimeout(timer);
    }
  }, [recipientsToProcess.length, nextStep]);

  if (recipientsToProcess.length === 0) {
    return (
      <div className="py-20 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[32px] flex items-center justify-center mx-auto mb-6 animate-bounce shadow-lg shadow-emerald-500/10">
          <Zap size={40} fill="currentColor" />
        </div>
        <h3 className="text-2xl font-black text-slate-900">Détection terminée !</h3>
        <p className="text-slate-500 mt-2 font-medium">Tous les opérateurs ont été identifiés avec succès.</p>
        <div className="mt-8 flex justify-center">
          <div className="flex gap-1">
             <div className="w-2 h-2 rounded-full bg-brand animate-bounce [animation-delay:-0.3s]"></div>
             <div className="w-2 h-2 rounded-full bg-brand animate-bounce [animation-delay:-0.15s]"></div>
             <div className="w-2 h-2 rounded-full bg-brand animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-black text-[#1D1B20] tracking-tight">Opérateur(s)</h2>
        <p className="text-[#49454F] mt-3 font-medium text-lg">Veuillez sélectionner l'opérateur pour les numéros non reconnus.</p>
      </div>
      
      <div className="space-y-8">
        {recipientsToProcess.map((r: any, i: number) => (
          <div key={i} className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand font-black">
                {r.originalIndex === -1 ? <User size={24} /> : r.originalIndex + 1}
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{r.name}</p>
                <p className="font-bold text-brand">{r.phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {operators.map((op: any) => (
                <button
                  key={op.name}
                  onClick={() => handleManualOperatorSelect(r.originalIndex === -1 ? 0 : r.originalIndex, op.name)}
                  className={`p-6 rounded-[28px] border-2 transition-all flex flex-col items-center gap-3 ${
                    (r.originalIndex === -1 ? transferData.recipientOperator : transferData.bulkRecipients[r.originalIndex].operator) === op.name 
                    ? 'border-brand bg-brand/5 ring-4 ring-brand/5' 
                    : 'border-slate-50 hover:border-brand/20 bg-slate-50 hover:bg-white'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm p-2 overflow-hidden">
                    {op.logo ? <img src={op.logo} alt={op.name} className="w-full h-full object-contain" /> : <Smartphone className="text-slate-300" />}
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">{op.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col-reverse gap-4 sm:flex-row">
        <button onClick={previousStep} className="w-full px-8 py-5 rounded-full border-2 border-slate-200 text-slate-500 font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-3 sm:flex-1">
          <ChevronLeft size={24} /> {t('back')}
        </button>
        <button
          onClick={nextStep}
          disabled={recipientsToProcess.some((r: any) => {
            if (r.originalIndex === -1) return !transferData.recipientOperator;
            return !transferData.bulkRecipients[r.originalIndex].operator;
          })}
          className="w-full px-8 py-5 rounded-full font-black transition-all flex items-center justify-center gap-3 bg-brand text-white shadow-xl shadow-brand/20 disabled:opacity-40 disabled:bg-slate-300 sm:flex-[2]"
        >
          {t('next')} <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};
