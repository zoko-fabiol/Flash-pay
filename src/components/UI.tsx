import React from 'react';
import { Loader } from 'lucide-react';

interface LoadingProps {
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ fullScreen = false }) => {
  const content = (
    <div className="relative flex flex-col items-center">
      {/* Animated Rings Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 rounded-full border-2 border-[#6344B6]/5 animate-[spin_3s_linear_infinite]" />
        <div className="absolute w-40 h-40 rounded-full border-t-2 border-[#6344B6]/20 animate-spin" />
      </div>

      {/* Branded Logo with Pulse Effect */}
      <div className="relative w-32 h-32 mb-6 animate-[pulse_2s_ease-in-out_infinite] flex items-center justify-center">
        <img src="/loader-icon.png" alt="Flash Pay" className="w-full h-full object-contain" />
      </div>

      {/* Loading Text & Bar */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6344B6]/50 ml-1">Chargement</span>
        <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-[#6344B6] w-full animate-[shimmer_1.5s_infinite] origin-left" />
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
      <div className="fixed inset-0 bg-[#F7F6F8] flex items-center justify-center z-[9999] transition-opacity duration-500">
        {content}
      </div>
    );
  }

  return (
    <div className="p-12 flex items-center justify-center bg-[#F7F6F8]/50 rounded-[32px] border border-slate-100">
      {content}
    </div>
  );
};

interface ErrorProps {
  message: string;
  onDismiss?: () => void;
}

export const Error: React.FC<ErrorProps> = ({ message, onDismiss }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-red-900">Erreur</h3>
          <p className="text-red-700 text-sm mt-1">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800 font-bold text-lg"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

interface SuccessProps {
  message: string;
}

export const Success: React.FC<SuccessProps> = ({ message }) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-green-900">Succès</h3>
      <p className="text-green-700 text-sm mt-1">{message}</p>
    </div>
  );
};

