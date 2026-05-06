import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type TransferType = 'africa-russia' | 'russia-africa' | 'russia-russia' | null;
export type RecipientType = 'bank' | 'operator' | null;

interface TransferData {
  // Common
  transferType: TransferType;
  recipientName: string;
  amount: number;
  currency: string;
  narration?: string;
  notes?: string;
  
  // For Afrique→Afrique
  originCountry?: string;
  recipientPhone?: string;
  recipientOperator?: string;
  
  // For Afrique→Russie
  beneficiaryAccount?: string;
  selectedOperator?: string;
  
  // For Russie→Afrique
  destinationCountry?: string;
  
  // For Russie→Russie
  recipientType?: RecipientType;
  recipientAccount?: string;
  depositInfo?: {
    accountNumber: string;
    bankName: string;
    accountHolder: string;
  };
  
  // Proof
  proofOfPayment?: File;
}

interface TransferWizardContextType {
  currentStep: number;
  transferData: TransferData;
  updateTransferData: (data: Partial<TransferData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetWizard: () => void;
  setCurrentStep: (step: number) => void;
}

const TransferWizardContext = createContext<TransferWizardContextType | undefined>(undefined);

const initialTransferData: TransferData = {
  transferType: null,
  recipientName: '',
  amount: 0,
  currency: 'RUB',
};

export const TransferWizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [transferData, setTransferData] = useState<TransferData>(initialTransferData);

  const updateTransferData = (data: Partial<TransferData>) => {
    setTransferData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const previousStep = () => setCurrentStep(prev => Math.max(1, prev - 1));

  const resetWizard = () => {
    setCurrentStep(1);
    setTransferData(initialTransferData);
  };

  return (
    <TransferWizardContext.Provider value={{
      currentStep,
      transferData,
      updateTransferData,
      nextStep,
      previousStep,
      resetWizard,
      setCurrentStep,
    }}>
      {children}
    </TransferWizardContext.Provider>
  );
};

export const useTransferWizard = () => {
  const context = useContext(TransferWizardContext);
  if (!context) {
    throw new Error('useTransferWizard must be used within TransferWizardProvider');
  }
  return context;
};
