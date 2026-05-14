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
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-600 hover:text-brand hover:border-brand transition-all active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-[#1D1B20] tracking-tight">{title}</h2>
      </div>

      {children}


      {onNext && (
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <button
            onClick={onNext}
            disabled={!isValid}
            className="w-full px-8 py-5 rounded-full font-black transition-all flex items-center justify-center gap-3 bg-brand text-white shadow-xl shadow-brand/20 disabled:opacity-40 disabled:bg-slate-300"
          >
            {nextLabel || 'Suivant'} <ChevronRight size={24} />
          </button>
        </div>
      )}
    </div>
  );
};
