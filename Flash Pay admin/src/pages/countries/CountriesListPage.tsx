import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import type { Country, RussianBank } from '../../types';
import { adminService } from '../../services/adminService';
import {
  Globe,
  Plus,
  Edit3,
  Trash2,
  Smartphone,
  Landmark,
  Phone,
  Upload,
  Settings2,
  Zap,
  ArrowRightLeft,
  X,
  ChevronRight
} from 'lucide-react';

const CountriesListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'countries' | 'operators' | 'banks'>('countries');
  const [countries, setCountries] = useState<Country[]>([]);
  const [banks, setBanks] = useState<RussianBank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [tempOperators, setTempOperators] = useState<any[]>([]);
  const [bankLogo, setBankLogo] = useState('');
  const [restrictionModal, setRestrictionModal] = useState<{ open: boolean; country: any }>({ open: false, country: null });
  const [destinationsModal, setDestinationsModal] = useState<{ open: boolean; country: Country | null }>({ open: false, country: null });
  const [rateModal, setRateModal] = useState<{ open: boolean; from: string; to: string; onConfirm: (rate: number) => void }>({ 
    open: false, 
    from: '', 
    to: '', 
    onConfirm: () => {} 
  });

  const sortedCountries = useMemo(
    () => [...countries].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })),
    [countries]
  );

  const sortedBanks = useMemo(
    () => [...banks].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })),
    [banks]
  );

  const sortedOperators = useMemo(
    () =>
      countries
        .flatMap((country) => country.operators.map((operator) => ({ ...operator, countryName: country.name, parentCountry: country })))
        .sort((left, right) => {
          const nameComparison = left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' });
          return nameComparison !== 0 ? nameComparison : left.countryName.localeCompare(right.countryName, 'fr', { sensitivity: 'base' });
        }),
    [countries]
  );

  useEffect(() => {
    const qCountries = query(collection(db, 'countries'));
    const unsubCountries = onSnapshot(qCountries, (snapshot) => {
      setCountries(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any);
    });

    const qBanks = query(collection(db, 'banks'));
    const unsubBanks = onSnapshot(qBanks, (snapshot) => {
      setBanks(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as any);
    });

    return () => {
      unsubCountries();
      unsubBanks();
    };
  }, []);

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setTempOperators(item.operators || []);
    setBankLogo(item?.logo || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, collectionName: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cet élément ?')) {
      try {
        await adminService.deleteDocument(collectionName, id);
        toast.success('Supprimé avec succès');
      } catch (err) {
        console.error(err);
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight">Gestion du Réseau</h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Configurez les pays, opérateurs et comptes bancaires</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setTempOperators([]); setBankLogo(''); setIsModalOpen(true); }}
          className="m3-btn-filled"
        >
          <Plus size={20} /> Ajouter un élément
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#F3EDF7] p-1.5 rounded-full shadow-sm w-full lg:w-auto overflow-x-auto scrollbar-hide">
        {[
          { id: 'countries', label: 'Pays Africains', icon: Globe },
          { id: 'operators', label: 'Opérateurs', icon: Smartphone },
          { id: 'banks', label: 'Banques Russes', icon: Landmark }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex-1 lg:flex-none flex items-center gap-3 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-[#470B37] text-white shadow-lg shadow-[#470B37]/20' 
                : 'text-[#49454F] hover:bg-[#EADDFF] hover:text-[#21005D]'}
            `}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* TAB: COUNTRIES */}
        {activeTab === 'countries' && sortedCountries.map(country => (
          <div key={country.id} className="m3-card-elevated group relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#F3EDF7] rounded-[20px] flex items-center justify-center overflow-hidden border border-[#E7E0EB] shadow-inner group-hover:scale-105 transition-transform duration-500">
                  <img 
                    src={`https://flagcdn.com/${country.code.toLowerCase()}.svg`} 
                    alt={country.name}
                    className="w-full h-full object-cover scale-110"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://flagcdn.com/un.svg'; }}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">{country.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[#470B37] text-[10px] font-black uppercase tracking-widest bg-[#EADDFF] px-2 py-0.5 rounded-md">{(country as any).dialCode || '+???'}</span>
                    <span className="text-[#49454F] text-[10px] font-bold uppercase tracking-widest">• {country.currency}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(country)} className="p-2.5 bg-[#F3EDF7] text-[#470B37] rounded-full hover:bg-[#EADDFF] transition-all"><Edit3 size={16} /></button>
                <button onClick={() => handleDelete(country.id, 'countries')} className="p-2.5 bg-[#F9DEDC] text-[#B3261E] rounded-full hover:bg-[#B3261E] hover:text-white transition-all"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#49454F]">
                <span>Opérateurs actifs</span>
                <span className="text-[#1D1B20]">{country.operators.length}</span>
              </div>
              <div className="h-1.5 bg-[#F3EDF7] rounded-full overflow-hidden">
                <div className="h-full bg-[#470B37] rounded-full" style={{ width: `${Math.min(100, country.operators.length * 20)}%` }}></div>
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#49454F]">
                <span>Comptes dépôt</span>
                <span className="text-[#1D1B20]">{country.depositAccounts?.length || 0}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-[#E7E0EB] flex justify-between items-center">
              <div>
                 <p className="text-[9px] font-black text-[#470B37] uppercase tracking-widest mb-1">Status Réseau</p>
                 <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${country.enabled ? 'bg-emerald-500' : 'bg-[#CAC4D0]'}`}></div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${country.enabled ? 'text-emerald-600' : 'text-[#49454F]'}`}>
                      {country.enabled ? 'Opérationnel' : 'Désactivé'}
                    </span>
                 </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDestinationsModal({ open: true, country })} className="m3-btn-tonal !py-2 !px-4 text-[9px] uppercase tracking-[0.2em] shadow-sm">
                  Destinations <ArrowRightLeft size={14} className="ml-1" />
                </button>
                <button onClick={() => setRestrictionModal({ open: true, country })} className="p-2.5 bg-[#F3EDF7] text-[#470B37] rounded-full hover:bg-[#EADDFF] transition-all">
                  <Settings2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* TAB: OPERATORS (Table Style) */}
        {activeTab === 'operators' && (
          <div className="col-span-full m3-card-elevated !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F3EDF7]/50 text-[#49454F] text-[10px] uppercase font-black tracking-[0.2em]">
                    <th className="px-8 py-5">Opérateur</th>
                    <th className="px-8 py-5">Pays d'origine</th>
                    <th className="px-8 py-5">Préfixes Autorisés</th>
                    <th className="px-8 py-5">Statut Système</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E0EB]">
                  {sortedOperators.map((op, idx) => (
                    <tr key={idx} className="hover:bg-[#F3EDF7]/30 transition-all group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#EADDFF] text-[#21005D] rounded-xl flex items-center justify-center font-black text-xs shadow-sm">
                            {op.logo ? <img src={op.logo} className="w-full h-full object-contain p-1" alt="logo" /> : op.name.charAt(0)}
                          </div>
                          <span className="text-[#1D1B20] font-black text-sm">{op.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <span className="text-[#49454F] font-bold text-xs uppercase tracking-wider">{op.countryName}</span>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex flex-wrap gap-1.5">
                           {(op as any).prefixes?.map((p: string, i: number) => (
                             <span key={i} className="px-2 py-0.5 bg-[#F3EDF7] text-[#470B37] rounded text-[9px] font-mono font-bold border border-[#E7E0EB]">{p}</span>
                           )) || <span className="text-[#CAC4D0] italic text-[10px]">Tous</span>}
                         </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                           <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Actif</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => { setActiveTab('countries'); handleEdit(op.parentCountry); }} className="p-2.5 bg-[#F3EDF7] text-[#470B37] rounded-xl hover:bg-[#EADDFF] transition-all opacity-0 group-hover:opacity-100"><Edit3 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: BANKS */}
        {activeTab === 'banks' && sortedBanks.map(bank => (
          <div key={bank.id} className="m3-card-elevated group">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#EADDFF] rounded-[20px] flex items-center justify-center text-[#21005D] border border-[#470B37]/10 shadow-sm overflow-hidden">
                  {bank.logo ? <img src={bank.logo} alt={bank.name} className="w-full h-full object-cover" /> : <Landmark size={28} />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">{bank.name}</h3>
                  <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">
                    {bank.type === 'phone' ? 'SBP / Mobile' : 'Compte Bancaire'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(bank)} className="p-2.5 bg-[#F3EDF7] text-[#470B37] rounded-full hover:bg-[#EADDFF] transition-all"><Edit3 size={16} /></button>
                <button onClick={() => handleDelete(bank.id, 'banks')} className="p-2.5 bg-[#F9DEDC] text-[#B3261E] rounded-full hover:bg-[#B3261E] hover:text-white transition-all"><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="bg-[#F3EDF7] p-5 rounded-[24px] border border-[#E7E0EB] mb-8 group/num relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-[0.05]"><Phone size={60} /></div>
               <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1">Identifiant / Numéro</p>
               <p className="text-[#1D1B20] font-mono font-black text-lg tracking-tight flex items-center gap-2">
                 <Phone size={14} className="text-[#470B37]" /> {bank.number}
               </p>
               {bank.holder && <p className="text-[10px] font-bold text-[#470B37] mt-2 uppercase tracking-wide opacity-70 truncate">{bank.holder}</p>}
            </div>

            <div className="flex justify-between items-center">
               <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                 bank.active ? 'bg-[#E8DEF8] text-[#1D192B] border border-[#EADDFF]' : 'bg-[#F3EDF7] text-[#49454F]'
               }`}>
                 {bank.active ? 'EN SERVICE' : 'HORS SERVICE'}
               </span>
               <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${bank.active ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <span className="text-[9px] font-black uppercase text-[#49454F] tracking-widest">{bank.active ? 'Connecté' : 'Offline'}</span>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: ADD/EDIT COUNTRY OR BANK */}
      {isModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#FEF7FF] w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-full border border-[#E7E0EB]" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-[#E7E0EB] flex justify-between items-center bg-[#FEF7FF] sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#EADDFF] text-[#21005D] rounded-[16px] flex items-center justify-center shadow-sm">
                  {activeTab === 'banks' ? <Landmark size={24} /> : <Globe size={24} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight">
                    {editingItem ? 'Modifier' : 'Ajouter'} {activeTab === 'banks' ? 'une Banque' : 'un Pays'}
                  </h3>
                  <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest opacity-60">Configuration réseau système</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-[#F3EDF7] text-[#49454F] rounded-full hover:bg-[#F9DEDC] hover:text-[#B3261E] transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto scrollbar-hide flex-1">
              <form className="space-y-8" onSubmit={async (e) => {
                e.preventDefault();
                const t = toast.loading('Enregistrement...');
                const formData = new FormData(e.currentTarget);
                try {
                  if (activeTab === 'countries') {
                    const cleanedOperators = tempOperators.map(op => ({
                      ...op,
                      prefixes: op.prefixes?.filter((p: string) => p.trim() !== '') || []
                    }));
                    await adminService.saveCountry(editingItem?.id || null, {
                      name: formData.get('name'),
                      code: formData.get('code'),
                      currency: formData.get('currency'),
                      dialCode: formData.get('dialCode'),
                      enabled: editingItem ? editingItem.enabled : true,
                      operators: cleanedOperators,
                      depositAccounts: editingItem ? editingItem.depositAccounts : []
                    });
                  } else {
                    await adminService.saveBank(editingItem?.id || null, {
                      name: formData.get('name'),
                      number: formData.get('number'),
                      type: formData.get('type'),
                      holder: formData.get('holder'),
                      logo: bankLogo || editingItem?.logo || '',
                      active: editingItem ? editingItem.active : true
                    });
                  }
                  toast.success('Modifications enregistrées', { id: t });
                  setIsModalOpen(false);
                } catch (err) {
                  toast.error('Erreur lors de l\'enregistrement', { id: t });
                }
              }}>
                {activeTab === 'countries' ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Nom du Pays</label>
                        <input name="name" required defaultValue={editingItem?.name} placeholder="Cameroun" className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 text-sm font-bold text-[#1D1B20] focus:ring-4 focus:ring-[#470B37]/10 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Code ISO (CM, CI...)</label>
                        <input name="code" required defaultValue={editingItem?.code} placeholder="CM" className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 text-sm font-bold text-[#1D1B20] focus:ring-4 focus:ring-[#470B37]/10 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Devise Locale</label>
                        <input name="currency" required defaultValue={editingItem?.currency} placeholder="XAF" className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 text-sm font-bold text-[#1D1B20] focus:ring-4 focus:ring-[#470B37]/10 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Indicatif (+)</label>
                        <input name="dialCode" required defaultValue={editingItem?.dialCode} placeholder="+237" className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 text-sm font-bold text-[#1D1B20] focus:ring-4 focus:ring-[#470B37]/10 transition-all" />
                      </div>
                    </div>

                    <div className="space-y-6 pt-4 border-t border-[#E7E0EB]">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-black text-[#1D1B20] uppercase tracking-widest flex items-center gap-2">
                          <Smartphone size={16} className="text-[#470B37]" /> Gestion des Opérateurs
                        </h4>
                        <button type="button" onClick={() => setTempOperators([...tempOperators, { name: '', prefixes: [], depositNumber: '', depositHolder: '', logo: '', id: Date.now().toString() }])} className="m3-btn-tonal !py-2 !px-4 text-[9px] uppercase tracking-widest">
                          <Plus size={14} /> Ajouter un réseau
                        </button>
                      </div>
                      <div className="space-y-4">
                        {tempOperators.map((op, i) => (
                          <div key={i} className="bg-[#F3EDF7] p-6 rounded-[28px] border border-[#E7E0EB] relative group/op">
                            <button type="button" onClick={() => setTempOperators(tempOperators.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 p-2 bg-[#F9DEDC] text-[#B3261E] rounded-full shadow-lg hover:scale-110 transition-all">
                              <X size={14} />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <input value={op.name} onChange={e => { const n = [...tempOperators]; n[i].name = e.target.value; setTempOperators(n); }} placeholder="Nom (ex: MTN Money)" className="bg-white border border-[#E7E0EB] rounded-xl px-4 py-2.5 text-xs font-bold" />
                               <input value={op.prefixes?.join(', ')} onChange={e => { const n = [...tempOperators]; n[i].prefixes = e.target.value.split(',').map(p => p.trim()); setTempOperators(n); }} placeholder="Préfixes (ex: 655, 677)" className="bg-white border border-[#E7E0EB] rounded-xl px-4 py-2.5 text-xs font-mono" />
                               <input value={op.depositNumber || ''} onChange={e => { const n = [...tempOperators]; n[i].depositNumber = e.target.value; setTempOperators(n); }} placeholder="Numéro de dépôt (ex: 694116078)" className="col-span-full bg-white border border-[#E7E0EB] rounded-xl px-4 py-2.5 text-xs font-bold" />
                               <input value={op.depositHolder || ''} onChange={e => { const n = [...tempOperators]; n[i].depositHolder = e.target.value; setTempOperators(n); }} placeholder="Titulaire du compte (ex: FLASH PAY)" className="col-span-full bg-white border border-[#E7E0EB] rounded-xl px-4 py-2.5 text-xs font-bold" />
                               <div className="col-span-full flex items-center gap-4 bg-white/50 p-3 rounded-2xl border border-dashed border-[#E7E0EB]">
                                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-[#E7E0EB]">
                                    {op.logo ? <img src={op.logo} className="w-full h-full object-contain p-1" /> : <Upload size={14} className="text-[#470B37]/30" />}
                                  </div>
                                  <input type="file" accept="image/*" onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const u = toast.loading('Upload logo...');
                                      try {
                                        const url = await adminService.uploadFile(`operators/${op.id || Date.now()}.jpg`, file);
                                        const n = [...tempOperators]; n[i].logo = url; setTempOperators(n);
                                        toast.success('Logo mis à jour', { id: u });
                                      } catch (err) { toast.error('Échec upload', { id: u }); }
                                    }
                                  }} className="flex-1 text-[10px] text-[#49454F] file:m3-btn-tonal file:!py-1.5 file:!px-3 file:mr-4 file:border-none" />
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Nom de la Banque</label>
                      <input name="name" required defaultValue={editingItem?.name} placeholder="Sberbank" className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 text-sm font-bold text-[#1D1B20] focus:ring-4 focus:ring-[#470B37]/10 transition-all" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Type de Compte</label>
                        <select name="type" defaultValue={editingItem?.type || 'phone'} className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 text-sm font-bold text-[#1D1B20] focus:ring-4 focus:ring-[#470B37]/10 transition-all appearance-none">
                          <option value="phone">Virement SBP (Téléphone)</option>
                          <option value="card">Numéro de Carte / IBAN</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Numéro / Identifiant</label>
                        <input name="number" required defaultValue={editingItem?.number} placeholder="+7 900..." className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 text-sm font-mono font-bold text-[#1D1B20] focus:ring-4 focus:ring-[#470B37]/10 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Titulaire du Compte</label>
                      <input name="holder" defaultValue={editingItem?.holder} placeholder="Nom du détenteur" className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 text-sm font-bold text-[#1D1B20] focus:ring-4 focus:ring-[#470B37]/10 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Logo Banque</label>
                      <div className="flex items-center gap-4 bg-[#F3EDF7] p-5 rounded-[28px] border border-[#E7E0EB]">
                         <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner border border-[#E7E0EB] overflow-hidden">
                           {bankLogo ? <img src={bankLogo} className="w-full h-full object-cover" /> : <Landmark size={24} className="opacity-20" />}
                         </div>
                         <input type="file" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const u = toast.loading('Upload logo...');
                              try {
                                const url = await adminService.uploadFile(`banks/${editingItem?.id || Date.now()}.jpg`, file);
                                setBankLogo(url); toast.success('Upload réussi', { id: u });
                              } catch (err) { toast.error('Échec upload', { id: u }); }
                            }
                         }} className="text-[10px] text-[#49454F] file:m3-btn-tonal file:mr-4" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-8 sticky bottom-0 bg-[#FEF7FF] py-4 border-t border-[#E7E0EB]">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-[#F3EDF7] text-[#49454F] font-black uppercase text-[10px] tracking-widest rounded-full hover:bg-[#E7E0EB] transition-all">Annuler</button>
                   <button type="submit" className="flex-1 m3-btn-filled py-4 text-[10px] uppercase tracking-widest">Enregistrer les données</button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: RESTRICTION CONFIG */}
      {restrictionModal.open && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/60 backdrop-blur-md" onClick={() => setRestrictionModal({ open: false, country: null })} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-8 border border-[#E7E0EB]" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[#EADDFF] text-[#21005D] rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-lg">
                 <ArrowRightLeft size={40} />
              </div>
              <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight mb-2">Flux de Transfert</h3>
              <p className="text-[#49454F] text-sm font-medium">Définissez les restrictions pour <span className="text-[#470B37] font-black">{restrictionModal.country?.name}</span></p>
            </div>

            <div className="space-y-3">
               {[
                 { id: 'full', label: 'Service Complet', desc: 'Double sens (RU ↔ AF)', icon: Zap, color: '#470B37' },
                 { id: 'ru-af', label: 'RU ➔ AF Unique', desc: 'Réception uniquement', icon: Globe, color: '#10B981' },
                 { id: 'af-ru', label: 'AF ➔ RU Unique', desc: 'Envoi uniquement', icon: Settings2, color: '#F59E0B' },
                 { id: 'off', label: 'Désactiver le Pays', desc: 'Maintenance / Bloqué', icon: Trash2, color: '#EF4444' }
               ].map((opt) => (
                 <button
                   key={opt.id}
                   onClick={async () => {
                      const c = restrictionModal.country;
                      let u = {};
                      if (opt.id === 'full') u = { enabled: true, canSendToRussia: true, canReceiveFromRussia: true };
                      if (opt.id === 'ru-af') u = { enabled: true, canSendToRussia: false, canReceiveFromRussia: true };
                      if (opt.id === 'af-ru') u = { enabled: true, canSendToRussia: true, canReceiveFromRussia: false };
                      if (opt.id === 'off') u = { enabled: false };

                      try {
                        await adminService.saveCountry(c.id, { ...c, ...u });
                        toast.success('Configuration mise à jour');
                      } catch (err) { toast.error('Erreur'); }
                      setRestrictionModal({ open: false, country: null });
                   }}
                   className="w-full flex items-center gap-4 p-5 rounded-[28px] bg-[#F3EDF7] border border-transparent hover:border-[#470B37]/20 hover:bg-white transition-all text-left shadow-sm group"
                 >
                    <div className="w-12 h-12 rounded-[16px] bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                       <opt.icon size={24} style={{ color: opt.color }} />
                    </div>
                    <div>
                       <p className="text-sm font-black text-[#1D1B20] leading-none mb-1">{opt.label}</p>
                       <p className="text-[10px] text-[#49454F] font-bold opacity-60 uppercase tracking-widest">{opt.desc}</p>
                    </div>
                 </button>
               ))}
            </div>

            <button onClick={() => setRestrictionModal({ open: false, country: null })} className="w-full mt-8 py-4 text-[#49454F] font-black uppercase text-[10px] tracking-[0.2em] hover:text-[#B3261E] transition-colors">
              Fermer sans changer
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: DESTINATIONS CONFIG */}
      {destinationsModal.open && destinationsModal.country && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/60 backdrop-blur-md" onClick={() => setDestinationsModal({ open: false, country: null })} />
          <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden p-8 border border-[#E7E0EB] flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8 shrink-0">
              <div className="w-20 h-20 bg-[#EADDFF] text-[#21005D] rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-lg">
                 <Globe size={40} />
              </div>
              <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight mb-2">Destinations Afrique-Afrique</h3>
              <p className="text-[#49454F] text-sm font-medium">Sélectionnez les pays vers lesquels <span className="text-[#470B37] font-black">{destinationsModal.country.name}</span> peut envoyer de l'argent.</p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-8 scrollbar-hide">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sortedCountries.filter(c => c.id !== destinationsModal.country?.id).map((c) => {
                  const isSelected = destinationsModal.country?.allowedDestinations?.includes(c.code) || false;
                  return (
                    <button
                      key={c.id}
                      onClick={async () => {
                        const currentCountry = destinationsModal.country!;
                        const currentDestinations = currentCountry.allowedDestinations || [];
                        const isAdding = !isSelected;
                        
                        const handleSave = async (rate?: number) => {
                          let newDestinations;
                          if (isSelected) {
                            newDestinations = currentDestinations.filter(code => code !== c.code);
                          } else {
                            newDestinations = [...currentDestinations, c.code];
                          }
                          
                          try {
                            await adminService.saveCountry(currentCountry.id, { 
                              ...currentCountry, 
                              allowedDestinations: newDestinations 
                            });

                            if (rate && isAdding) {
                              // Find if rate exists or just add new
                              const q = query(
                                collection(db, 'exchange_rates'),
                                where('from', '==', currentCountry.currency),
                                where('to', '==', c.currency)
                              );
                              const snap = await getDocs(q);
                              if (!snap.empty) {
                                await adminService.updateExchangeRate(snap.docs[0].id, rate, 0);
                              } else {
                                await addDoc(collection(db, 'exchange_rates'), {
                                  from: currentCountry.currency,
                                  to: c.currency,
                                  rate: rate,
                                  margin: 0,
                                  updatedAt: Timestamp.now(),
                                  updatedBy: auth.currentUser?.uid,
                                  source: 'manual'
                                });
                              }
                            }

                            setDestinationsModal({ 
                              open: true, 
                              country: { ...currentCountry, allowedDestinations: newDestinations } 
                            });
                            toast.success(isSelected ? 'Destination retirée' : 'Destination ajoutée');
                          } catch (err) {
                            toast.error('Erreur lors de la mise à jour');
                          }
                        };

                        if (isAdding && currentCountry.currency !== c.currency) {
                          setRateModal({
                            open: true,
                            from: currentCountry.currency,
                            to: c.currency,
                            onConfirm: (rate) => {
                              handleSave(rate);
                              setRateModal(prev => ({ ...prev, open: false }));
                            }
                          });
                        } else {
                          handleSave();
                        }
                      }}
                      className={`flex items-center gap-4 p-4 rounded-[24px] border-2 transition-all text-left shadow-sm group ${isSelected ? 'border-[#470B37] bg-[#470B37]/5' : 'border-[#F3EDF7] bg-white hover:border-[#470B37]/20'}`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-[#E7E0EB] shrink-0">
                        <img 
                          src={`https://flagcdn.com/${c.code.toLowerCase()}.svg`} 
                          alt={c.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-black uppercase tracking-widest ${isSelected ? 'text-[#470B37]' : 'text-[#1D1B20]'}`}>{c.name}</p>
                      </div>
                      {isSelected && <div className="w-6 h-6 bg-[#470B37] rounded-full flex items-center justify-center text-white shrink-0"><Plus size={14} className="rotate-45" /></div>}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={() => setDestinationsModal({ open: false, country: null })} className="w-full py-5 m3-btn-filled rounded-full text-[10px] uppercase tracking-[0.2em] shadow-lg shrink-0">
              Terminer la configuration
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: EXCHANGE RATE POPUP */}
      {rateModal.open && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/60 backdrop-blur-md" onClick={() => setRateModal(prev => ({ ...prev, open: false }))} />
          <div className="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden p-8 border border-[#E7E0EB]" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-[#EADDFF] text-[#21005D] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
                 <ArrowRightLeft size={32} />
              </div>
              <h3 className="text-xl font-black text-[#1D1B20] tracking-tight mb-2">Taux de Change</h3>
              <p className="text-[#49454F] text-xs font-medium uppercase tracking-widest opacity-60">Configuration de la conversion</p>
            </div>

            <div className="bg-[#F3EDF7] p-6 rounded-[28px] border border-[#E7E0EB] mb-8">
               <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-[#470B37] uppercase tracking-widest">Paire</span>
                  <span className="text-xs font-black text-[#1D1B20]">{rateModal.from} ➔ {rateModal.to}</span>
               </div>
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-[#49454F] uppercase tracking-widest ml-1">Valeur de 1 {rateModal.from}</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.0001"
                      autoFocus
                      placeholder="0.0000"
                      id="rateInput"
                      className="w-full bg-white border-2 border-[#E7E0EB] rounded-2xl px-5 py-4 text-lg font-mono font-black text-[#1D1B20] focus:border-[#470B37] outline-none transition-all"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#470B37] uppercase tracking-widest">{rateModal.to}</span>
                  </div>
               </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setRateModal(prev => ({ ...prev, open: false }))}
                className="flex-1 py-4 bg-[#F3EDF7] text-[#49454F] font-black uppercase text-[10px] tracking-widest rounded-full hover:bg-[#E7E0EB] transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  const val = (document.getElementById('rateInput') as HTMLInputElement).value;
                  if (!val || parseFloat(val) <= 0) {
                    toast.error('Veuillez entrer un taux valide');
                    return;
                  }
                  rateModal.onConfirm(parseFloat(val));
                }}
                className="flex-1 bg-[#470B37] text-white py-4 font-black uppercase text-[10px] tracking-widest rounded-full shadow-lg shadow-[#470B37]/20 hover:bg-[#5D4696] transition-all"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CountriesListPage;
