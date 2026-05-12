import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StepWrapperProps {
  title: string;
  description?: string;
  onBack: () => void;
  onNext?: () => void;
  isValid?: boolean;
  children: React.ReactNode;
  nextLabel?: string;
}

export const StepWrapper: React.FC<StepWrapperProps> = ({
  title,
  description,
  onBack,
  onNext,
  isValid = true,
  children,
  nextLabel
}) => {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-[0.5mm]">
      <h2 className="text-2xl font-black text-[#1D1B20] tracking-tight mb-6">{title}</h2>

      {children}

      <div className="mt-12 flex flex-col-reverse gap-4 sm:flex-row">
        <button
          onClick={onBack}
          className="w-full px-8 py-5 rounded-full border-2 border-slate-200 text-slate-500 font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-3 sm:flex-1"
        >
          <ChevronLeft size={24} /> Retour
        </button>
        {onNext && (
          <button
            onClick={onNext}
            disabled={!isValid}
            className="w-full px-8 py-5 rounded-full font-black transition-all flex items-center justify-center gap-3 bg-brand text-white shadow-xl shadow-brand/20 disabled:opacity-40 disabled:bg-slate-300 sm:flex-[2]"
          >
            {nextLabel || 'Suivant'} <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
};
