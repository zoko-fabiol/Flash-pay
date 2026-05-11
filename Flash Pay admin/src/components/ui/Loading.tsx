import React from 'react';
import { CreditCard } from 'lucide-react';

interface LoadingProps {
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ fullScreen = false }) => {
  const content = (
    <div className="relative flex flex-col items-center">
      {/* Animated Rings Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-150">
        <div className="w-48 h-48 rounded-full border border-[#470B37]/10 animate-[spin_6s_linear_infinite]" />
        <div className="absolute w-32 h-32 rounded-full border-t border-[#470B37] animate-spin" />
      </div>

      {/* Branded Logo with Pulse Effect */}
      <div className="relative w-24 h-24 mb-10 flex items-center justify-center">
        <div className="absolute inset-0 bg-[#EADDFF] rounded-[32px] animate-pulse opacity-50"></div>
        <div className="relative w-16 h-16 bg-[#470B37] rounded-[24px] flex items-center justify-center shadow-2xl shadow-[#470B37]/20 animate-bounce">
           <CreditCard className="text-white" size={32} />
        </div>
      </div>

      {/* Loading Text & Bar */}
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="flex flex-col items-center">
           <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#1D1B20]">Flash Pay</span>
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#470B37] opacity-60 mt-1">Initialisation...</span>
        </div>
        <div className="w-24 h-1 bg-[#F3EDF7] rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-[#470B37] w-full animate-[shimmer_1.5s_infinite] origin-left" />
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[#FEF7FF] flex items-center justify-center z-[9999] transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-[#EADDFF]/20 to-transparent"></div>
        {content}
      </div>
    );
  }

  return (
    <div className="p-20 flex items-center justify-center bg-white border border-[#E7E0EB] rounded-[48px] shadow-sm">
      {content}
    </div>
  );
};
