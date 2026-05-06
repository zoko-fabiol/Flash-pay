import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../constants/data';

interface AppContextType {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
  transferType: 'unique' | 'masse';
  setTransferType: (type: 'unique' | 'masse') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [transferType, setTransferType] = useState<'unique' | 'masse'>('unique');

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <AppContext.Provider value={{
      settings,
      updateSettings,
      transferType,
      setTransferType,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
