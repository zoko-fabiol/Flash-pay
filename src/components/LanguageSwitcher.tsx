import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const langs = [
    { code: 'fr', label: 'FR' },
    { code: 'en', label: 'EN' },
  ] as const;

  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-[#eadfff]">
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLanguage(l.code)}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
            language === l.code
              ? 'bg-white text-[#6344B6] shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

