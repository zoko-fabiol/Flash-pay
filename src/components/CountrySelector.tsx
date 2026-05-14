import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ChevronDown, Search, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Country {
  code: string;
  name: string;
  dialCode: string;
}

interface CountrySelectorProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  placeholder?: string;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({ value, onChange, label, placeholder }) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    // Add Russia by default since it might not be in the Africa countries collection
    const unsub = onSnapshot(collection(db, 'countries'), (snapshot) => {
      const countryList = snapshot.docs.map(doc => ({
        code: doc.data().code,
        name: doc.data().name,
        dialCode: doc.data().dialCode || ''
      }));
      
      if (!countryList.some(c => c.code === 'RU')) {
        countryList.push({ code: 'RU', name: 'Russie', dialCode: '+7' });
      }

      // Alphabetical sort
      setCountries(countryList.sort((a, b) => a.name.localeCompare(b.name, 'fr')));
    });

    return () => unsub();
  }, []);

  const selectedCountry = countries.find(c => c.code === value);

  const filteredCountries = countries.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-1.5 relative">
      {label && <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 border border-slate-100 rounded-2xl bg-white/50 focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          {selectedCountry ? (
            <>
              <img 
                src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`} 
                alt={selectedCountry.name}
                className="w-6 h-4 object-cover rounded-sm shadow-sm"
              />
              <span className="font-medium text-slate-900">{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-slate-400">{placeholder || 'Choisir un pays'}</span>
          )}
        </div>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-300 overflow-hidden">
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-sm font-medium"
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${value === c.code ? 'bg-primary/5 text-primary' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} 
                      alt={c.name}
                      className="w-6 h-4 object-cover rounded-sm"
                    />
                    <span className="font-bold text-sm">{c.name}</span>
                  </div>
                  {value === c.code && <Check size={16} />}
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-sm font-medium">
                  Aucun pays trouvé
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
