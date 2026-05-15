import React, { createContext, useContext, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, Info, HelpCircle, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<(value: boolean) => void>(() => {});

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    resolveRef(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolveRef(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/40 backdrop-blur-md" onClick={handleCancel} />
          <div className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl border border-[#E7E0EB] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-6 ${
                options.type === 'danger' ? 'bg-rose-50 text-rose-500' : 
                options.type === 'warning' ? 'bg-amber-50 text-amber-500' : 
                'bg-indigo-50 text-indigo-500'
              }`}>
                {options.type === 'danger' ? <AlertTriangle size={36} /> : 
                 options.type === 'warning' ? <AlertTriangle size={36} /> : 
                 <HelpCircle size={36} />}
              </div>
              
              <h3 className="text-xl font-black text-[#1D1B20] tracking-tight mb-2">{options.title}</h3>
              <p className="text-[#49454F] text-sm font-medium leading-relaxed mb-8 px-2">
                {options.message}
              </p>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleConfirm}
                  className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95 ${
                    options.type === 'danger' ? 'bg-rose-500 text-white hover:bg-rose-600' : 
                    'bg-[#661489] text-white hover:bg-[#4D0F67]'
                  }`}
                >
                  {options.confirmLabel || 'Confirmer'}
                </button>
                <button 
                  onClick={handleCancel}
                  className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-[#49454F] hover:bg-slate-50 transition-all"
                >
                  {options.cancelLabel || 'Annuler'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
};
