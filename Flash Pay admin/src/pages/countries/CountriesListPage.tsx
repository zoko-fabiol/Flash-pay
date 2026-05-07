import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  collection,
  onSnapshot,
  query
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
  ArrowRightLeft
} from 'lucide-react';

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (e: React.MouseEvent) => void }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onChange(e); }}
    className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-300 focus:outline-none ${enabled ? 'bg-brand shadow-[0_0_15px_rgba(98,54,204,0.4)]' : 'bg-slate-700'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 shadow-md ${enabled ? 'translate-x-7' : 'translate-x-1'}`}
    />
  </button>
);

const CountriesListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'countries' | 'operators' | 'banks'>('countries');
  const [countries, setCountries] = useState<Country[]>([]);
  const [banks, setBanks] = useState<RussianBank[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [tempOperators, setTempOperators] = useState<any[]>([]);
  const [bankLogo, setBankLogo] = useState('');
  const [restrictionModal, setRestrictionModal] = useState<{ open: boolean; country: any }>({ open: false, country: null });

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
    if (confirm('Voulez-vous vraiment supprimer cet élément ?')) {
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestion Réseau</h2>
          <p className="text-slate-400 text-sm">Configuration des pays, opérateurs et comptes bancaires</p>
        </div>
        <button
          onClick={() => { setEditingItem(null); setTempOperators([]); setBankLogo(''); setIsModalOpen(true); }}
          className="bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand/20 transition-all"
        >
          <Plus size={20} /> Ajouter un élément
        </button>
      </div>

      <div className="flex gap-2 border-b border-border-dark pb-px">
        {[
          { id: 'countries', label: 'Pays Africains', icon: Globe },
          { id: 'operators', label: 'Opérateurs Télécom', icon: Smartphone },
          { id: 'banks', label: 'Banques Russes', icon: Landmark }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2
              ${activeTab === tab.id
                ? 'border-brand text-brand bg-brand/5'
                : 'border-transparent text-slate-500 hover:text-slate-300'}
            `}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'countries' && sortedCountries.map(country => (
          <div key={country.id} className="bg-card-dark border border-border-dark p-6 rounded-3xl group hover:border-brand/30 transition-all shadow-lg">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-slate-700/50 shadow-inner">
                  <img 
                    src={`https://flagcdn.com/${country.code.toLowerCase()}.svg`} 
                    alt={country.name}
                    className="w-full h-full object-cover scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://flagcdn.com/un.svg';
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-white font-bold">{country.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-brand text-[10px] font-bold">{(country as any).dialCode || '+???'}</span>
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">• {country.currency}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => handleEdit(country)}
                  className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(country.id, 'countries')}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Opérateurs</span>
                <span className="text-white font-medium">{country.operators.length} actifs</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Comptes dépôt</span>
                <span className="text-white font-medium">{country.depositAccounts?.length || 0} configurés</span>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-800/50 flex justify-between items-center">
                <div className="flex flex-col gap-1">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Statut Réseau</span>
                   <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${country.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                      <span className={`text-[10px] font-bold ${country.enabled ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {country.enabled ? (
                          (country as any).canSendToRussia === false ? 'RU ➔ AF UNIQUE' :
                          (country as any).canReceiveFromRussia === false ? 'AF ➔ RU UNIQUE' : 'OPÉRATIONNEL'
                        ) : 'DÉSACTIVÉ'}
                      </span>
                   </div>
                </div>
                <Toggle 
                  enabled={country.enabled} 
                  onChange={() => setRestrictionModal({ open: true, country })} 
                />
              </div>
            </div>
          </div>
        ))}

        {activeTab === 'operators' && (
          <div className="col-span-full bg-card-dark border border-border-dark rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] border-b border-border-dark">
                  <th className="px-6 py-4">Opérateur</th>
                  <th className="px-6 py-4">Pays</th>
                  <th className="px-6 py-4">Préfixes</th>
                  <th className="px-6 py-4">Statut Dépôt</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-800/50">
                {sortedOperators.map((op, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center text-[10px] font-bold text-brand">
                          {op.name.charAt(0)}
                        </div>
                        <span className="text-white font-bold">{op.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">{op.countryName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-brand/70">{(op as any).prefixes?.join(', ') || 'Tous'}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                        Opérationnel
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setActiveTab('countries'); handleEdit(op.parentCountry); }}
                        className="text-slate-500 hover:text-white transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'banks' && sortedBanks.map(bank => (
          <div key={bank.id} className="bg-card-dark border border-border-dark p-6 rounded-3xl group hover:border-brand/30 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-slate-700 overflow-hidden shrink-0">
                  {bank.logo ? (
                    <img src={bank.logo} alt={bank.name} className="w-full h-full object-cover" />
                  ) : (
                    <Landmark size={24} />
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold">{bank.name}</h3>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                    {bank.type === 'phone' ? 'Virement Téléphone' : 'Carte/Compte'}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => handleEdit(bank)}
                  className="p-2 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-lg"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(bank.id, 'banks')}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 mb-4">
              <div className="flex items-center gap-2 text-brand text-sm font-mono font-bold">
                <Phone size={14} /> {bank.number}
              </div>
              {bank.details && <p className="text-slate-500 text-[10px] mt-1 italic">{bank.details}</p>}
            </div>

            <div className="pt-2">
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${bank.active ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                {bank.active ? 'EN SERVICE' : 'HORS SERVICE'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Management Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-bg-dark/80 backdrop-blur-sm overflow-y-auto py-12">
          <div className="bg-card-dark border border-border-dark w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300 my-auto">
            <div className="p-6 border-b border-border-dark flex justify-between items-center bg-slate-800/30">
              <h3 className="text-xl font-bold text-white">
                {activeTab === 'countries' ? 'Configurer un Pays' : 'Ajouter une Banque Russe'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            <div className="p-8">
              <form className="space-y-6" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
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
                    details: formData.get('details'),
                    logo: bankLogo || editingItem?.logo || '',
                    active: editingItem ? editingItem.active : true
                  });
                }
                setIsModalOpen(false);
              }}>
                {activeTab === 'countries' ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nom du Pays</label>
                        <input name="name" required defaultValue={editingItem?.name} placeholder="Cameroun" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Code (ISO)</label>
                        <input name="code" required defaultValue={editingItem?.code} placeholder="CM" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Devise locale</label>
                        <input name="currency" required defaultValue={editingItem?.currency} placeholder="XAF" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Indicatif (+)</label>
                        <input name="dialCode" required defaultValue={editingItem?.dialCode} placeholder="+237" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand transition-all" />
                      </div>
                    </div>

                    {/* Operators Management inside Modal */}
                    <div className="border-t border-slate-800 pt-6">
                      <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Smartphone size={16} className="text-brand" />
                        Opérateurs & Détection automatique
                      </h4>
                      <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                        {tempOperators.map((op: any, i: number) => (
                          <div key={i} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700 relative group/op">
                            <button
                              type="button"
                              onClick={() => setTempOperators(tempOperators.filter((_, idx) => idx !== i))}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/op:opacity-100 transition-all shadow-lg"
                            >
                              <Plus size={14} className="rotate-45" />
                            </button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Nom de l'opérateur</label>
                                <input
                                  value={op.name}
                                  onChange={(e) => {
                                    const newOps = [...tempOperators];
                                    newOps[i].name = e.target.value;
                                    setTempOperators(newOps);
                                  }}
                                  placeholder="Orange Money"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Préfixes (655, 699...)</label>
                                <input
                                  value={op.prefixes?.join(', ')}
                                  onChange={(e) => {
                                    const newOps = [...tempOperators];
                                    // Allow typing (trailing commas) by not filtering empty strings immediately
                                    newOps[i].prefixes = e.target.value.split(',').map(p => p.trim());
                                    setTempOperators(newOps);
                                  }}
                                  placeholder="655, 699"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Numéro de Dépôt (Client)</label>
                                <input
                                  value={op.depositNumber || ''}
                                  onChange={(e) => {
                                    const newOps = [...tempOperators];
                                    newOps[i].depositNumber = e.target.value;
                                    setTempOperators(newOps);
                                  }}
                                  placeholder="6xx xx xx xx"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-emerald-400 font-bold"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Nom du Titulaire</label>
                                <input
                                  value={op.depositHolder || ''}
                                  onChange={(e) => {
                                    const newOps = [...tempOperators];
                                    newOps[i].depositHolder = e.target.value;
                                    setTempOperators(newOps);
                                  }}
                                  placeholder="FLASH PAY SERVICES"
                                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                                />
                              </div>
                              <div className="col-span-full space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Logo de l'opérateur (Upload)</label>
                                <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-700">
                                  {op.logo ? (
                                    <img src={op.logo} className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-600" alt="logo" />
                                  ) : (
                                    <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 border border-dashed border-slate-600">
                                      <Upload size={14} />
                                    </div>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        toast.dismiss();
                                        const t = toast.loading('Compression et envoi...');
                                        try {
                                          const safeName = (op.name || 'unnamed').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                                          const url = await adminService.uploadFile(`operators/${safeName}_${Date.now()}.jpg`, file);
                                          const newOps = [...tempOperators];
                                          newOps[i].logo = url;
                                          setTempOperators(newOps);
                                          toast.success('Logo téléchargé !', { id: t });
                                        } catch (err: any) {
                                          console.error('Erreur détaillée:', err);
                                          toast.error(`Échec: ${err.message || 'Erreur inconnue'}`, { id: t });
                                        }
                                      }
                                    }}
                                    className="block w-full text-[10px] text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 transition-all cursor-pointer"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setTempOperators([...tempOperators, { name: '', prefixes: [], logo: '' }])}
                        className="mt-4 text-xs font-bold text-brand hover:text-brand-dark flex items-center gap-1 transition-all"
                      >
                        <Plus size={14} /> Ajouter un opérateur
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Nom de la Banque</label>
                      <input name="name" required defaultValue={editingItem?.name} placeholder="Sberbank" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                        <select name="type" defaultValue={editingItem?.type || 'phone'} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand">
                          <option value="phone">Virement SBP (Téléphone)</option>
                          <option value="card">Numéro de Carte</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Numéro / ID</label>
                        <input name="number" required defaultValue={editingItem?.number} placeholder="+7 900..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Détails Additionnels (Propriétaire, etc.)</label>
                      <textarea name="details" defaultValue={editingItem?.details} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand h-24" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Logo de la Banque</label>
                      <div className="flex items-center gap-3 bg-slate-800/70 border border-slate-700 rounded-xl p-3">
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                          {bankLogo ? (
                            <img src={bankLogo} alt="Logo banque" className="w-full h-full object-cover" />
                          ) : (
                            <Landmark size={20} className="text-slate-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              toast.dismiss();
                              const t = toast.loading('Upload du logo...');
                              try {
                                const safeName = (editingItem?.name || 'bank').toString().replace(/[^a-z0-9]/gi, '_').toLowerCase();
                                const url = await adminService.uploadFile(`banks/${safeName}_${Date.now()}.jpg`, file);
                                setBankLogo(url);
                                toast.success('Logo téléchargé !', { id: t });
                              } catch (err: any) {
                                console.error(err);
                                toast.error(`Échec: ${err.message || 'Erreur inconnue'}`, { id: t });
                              }
                            }}
                            className="block w-full text-[10px] text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 transition-all cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-700 transition-all">
                    Annuler
                  </button>
                  <button type="submit" className="flex-1 py-4 bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark shadow-lg shadow-brand/20 transition-all">
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Restriction Popup Modal */}
      {restrictionModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#1a1c24] border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl shadow-black/50 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand/20">
                 <ArrowRightLeft className="text-brand" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Configuration de flux</h3>
              <p className="text-slate-400 text-sm">Définissez les restrictions pour <span className="text-brand font-bold">{restrictionModal.country?.name}</span></p>
            </div>

            <div className="space-y-3">
               {[
                 { id: 'full', label: 'Service Complet', desc: 'Russie ↔ Afrique (Double sens)', icon: Zap, color: 'brand' },
                 { id: 'ru-af', label: 'Russie ➔ Afrique Uniquement', desc: 'Envoi depuis la Russie seulement', icon: Globe, color: 'emerald' },
                 { id: 'af-ru', label: 'Afrique ➔ Russie Uniquement', desc: 'Envoi depuis l\'Afrique seulement', icon: Settings2, color: 'amber' },
                 { id: 'off', label: 'Désactiver le pays', desc: 'Aucun transfert autorisé', icon: Trash2, color: 'rose' }
               ].map((opt) => (
                 <button
                   key={opt.id}
                   onClick={async () => {
                      const c = restrictionModal.country;
                      let updates = {};
                      if (opt.id === 'full') updates = { enabled: true, canSendToRussia: true, canReceiveFromRussia: true };
                      if (opt.id === 'ru-af') updates = { enabled: true, canSendToRussia: false, canReceiveFromRussia: true };
                      if (opt.id === 'af-ru') updates = { enabled: true, canSendToRussia: true, canReceiveFromRussia: false };
                      if (opt.id === 'off') updates = { enabled: false };

                      try {
                        await adminService.saveCountry(c.id, { ...c, ...updates });
                        toast.success('Configuration mise à jour');
                      } catch (err) {
                        toast.error('Erreur de mise à jour');
                      }
                      setRestrictionModal({ open: false, country: null });
                   }}
                   className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-left group"
                 >
                    <div className={`w-10 h-10 rounded-xl bg-${opt.color}-500/10 flex items-center justify-center text-${opt.color}-500 group-hover:scale-110 transition-transform`}>
                       <opt.icon size={20} />
                    </div>
                    <div>
                       <p className="text-sm font-bold text-white leading-none mb-1">{opt.label}</p>
                       <p className="text-[10px] text-slate-500 font-medium">{opt.desc}</p>
                    </div>
                 </button>
               ))}
            </div>

            <button 
              onClick={() => setRestrictionModal({ open: false, country: null })}
              className="w-full mt-6 py-3 text-slate-500 font-bold text-sm hover:text-white transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountriesListPage;
