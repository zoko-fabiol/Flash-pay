import React from 'react';
import { Loader } from 'lucide-react';

interface LoadingProps {
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ fullScreen = false }) => {
  const content = (
    <div className="flex items-center justify-center gap-2">
      <Loader className="animate-spin" size={24} />
      <span>Chargement...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return <div className="p-8 text-center text-slate-500">{content}</div>;
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
