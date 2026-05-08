import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

import ReactDOM from 'react-dom';

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
            <X size={24} />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
