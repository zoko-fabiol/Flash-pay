import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  collection, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { ExchangeRate } from '../../types';
import { adminService } from '../../services/adminService';
import { 
  RefreshCcw, 
  Edit3, 
  X, 
  TrendingUp, 
  DollarSign, 
  Euro, 
  Coins,
  Shield,
  ArrowRightLeft,
  Plus,
  Trash2
} from 'lucide-react';

const RateCard = ({ rate, onEdit }: { rate: ExchangeRate; onEdit: (rate: ExchangeRate) => void }) => {
  const getIcon = (currency: string) => {
    if (currency === 'USD') return <DollarSign size={20} />;
    if (currency === 'EUR') return <Euro size={20} />;
    return <Coins size={20} />;
  };

  const getStyle = (currency: string) => {
    if (currency === 'USD') return 'bg-[#E8DEF8] text-[#1D192B]';
    if (currency === 'EUR') return 'bg-[#EADDFF] text-[#21005D]';
    return 'bg-[#F3EDF7] text-[#6750A4]';
  };

  return (
    <div className="m3-card-elevated group hover:border-[#6750A4]/30 transition-all">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center -space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${getStyle(rate.from)}`}>
              {getIcon(rate.from)}
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${getStyle(rate.to)}`}>
              {getIcon(rate.to)}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black text-[#1D1B20] tracking-tight">{rate.from} ➔ {rate.to}</h3>
            <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">MAJ {rate.updatedAt?.toDate().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        <button 
          onClick={() => onEdit(rate)}
          className="p-3 bg-[#F3EDF7] text-[#6750A4] hover:bg-[#6750A4] hover:text-white rounded-xl transition-all shadow-sm group-hover:scale-110"
        >
          <Edit3 size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-5 bg-[#F3EDF7] rounded-[24px] border border-[#E7E0EB] shadow-inner">
          <span className="text-[#49454F] text-[10px] font-black uppercase tracking-widest opacity-60">Taux Actuel</span>
          <span className="text-[#1D1B20] font-mono font-black text-xl">{rate.rate.toFixed(4)}</span>
        </div>
        <div className="flex justify-between items-center px-5 py-3 bg-[#EADDFF]/50 rounded-full border border-[#6750A4]/10">
          <span className="text-[#21005D] text-[9px] font-black uppercase tracking-[0.2em]">Marge Opérationnelle</span>
          <span className="text-[#6750A4] font-black text-sm">{(rate.margin * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

const ExchangeRatesPage: React.FC = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [newRateValue, setNewRateValue] = useState<number>(0);
  const [newMarginValue, setNewMarginValue] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const [customRates, setCustomRates] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomRate, setNewCustomRate] = useState({ from: '', to: '', rate: '' });

  // Settings state
  const [editingLimit, setEditingLimit] = useState<string>('150000');
  const [editingStandardLimit, setEditingStandardLimit] = useState<string>('20000');
  const [editingExpertLimit, setEditingExpertLimit] = useState<string>('150000');
  const [editingReferralBonus, setEditingReferralBonus] = useState<string>('500');
  const [editingEmails, setEditingEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'exchange_rates'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as ExchangeRate[];
      setRates(data);
    });

    const qCustom = query(collection(db, 'custom_rates'), orderBy('updatedAt', 'desc'));
    const unsubCustom = onSnapshot(qCustom, (snapshot) => {
      setCustomRates(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });

    const qSettings = query(collection(db, 'settings'));
    const unsubSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const settingsDoc = snapshot.docs[0].data();
        const limit = settingsDoc.dailyLimitRUB || 150000;
        const stdLimit = settingsDoc.standardLimitRUB || 20000;
        const expLimit = settingsDoc.expertLimitRUB || 150000;
        const bonus = settingsDoc.referralBonusRUB || 500;
        const emails = settingsDoc.notificationEmails || [];
        setEditingLimit(limit.toString());
        setEditingStandardLimit(stdLimit.toString());
        setEditingExpertLimit(expLimit.toString());
        setEditingReferralBonus(bonus.toString());
        setEditingEmails(emails);
      }
    });

    return () => {
      unsubscribe();
      unsubCustom();
      unsubSettings();
    };
  }, []);

  const handleEdit = (rate: ExchangeRate) => {
    setEditingRate(rate);
    setNewRateValue(rate.rate);
    setNewMarginValue(rate.margin * 100);
  };

  const handleSave = async () => {
    if (!editingRate) return;
    setIsSaving(true);
    const t = toast.loading('Mise à jour du taux...');
    try {
      await adminService.updateExchangeRate(editingRate.id, newRateValue, newMarginValue / 100);
      toast.success('Taux mis à jour ✓', { id: t });
      setEditingRate(null);
    } catch (err) {
      toast.error('Erreur de synchronisation', { id: t });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    const newLimit = parseInt(editingLimit);
    const newStdLimit = parseInt(editingStandardLimit);
    const newExpLimit = parseInt(editingExpertLimit);
    const newBonus = parseInt(editingReferralBonus);
    
    if (isNaN(newLimit) || newLimit <= 0) { toast.error('Limite max invalide'); return; }
    if (isNaN(newStdLimit) || newStdLimit <= 0) { toast.error('Limite Standard invalide'); return; }
    if (isNaN(newExpLimit) || newExpLimit <= 0) { toast.error('Limite Expert invalide'); return; }
    if (isNaN(newBonus) || newBonus < 0) { toast.error('Bonus parrainage invalide'); return; }

    setIsSavingSettings(true);
    const t = toast.loading('Mise à jour des paramètres...');
    try {
      await adminService.updateDailyLimit(newLimit, newBonus, newStdLimit, newExpLimit, editingEmails);
      toast.success('Configuration système à jour', { id: t });
    } catch (err) {
      toast.error('Échec de la mise à jour', { id: t });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const addEmail = () => {
    if (!newEmail.includes('@')) { toast.error('Format email invalide'); return; }
    if (editingEmails.includes(newEmail)) { toast.error('Email déjà présent'); return; }
    setEditingEmails([...editingEmails, newEmail]);
    setNewEmail('');
  };

  const handleAddCustomRate = async () => {
    const rate = parseFloat(newCustomRate.rate);
    if (!newCustomRate.from || !newCustomRate.to || isNaN(rate)) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    const t = toast.loading('Ajout de la paire...');
    try {
      await adminService.saveCustomRate(newCustomRate.from, newCustomRate.to, rate);
      toast.success('Paire ajoutée ✓', { id: t });
      setIsAddModalOpen(false);
      setNewCustomRate({ from: '', to: '', rate: '' });
    } catch (err) {
      toast.error('Erreur lors de l\'ajout', { id: t });
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-[#6750A4] text-white rounded-[16px] flex items-center justify-center shadow-lg"><ArrowRightLeft size={24} /></div>
            Devises & Systèmes
          </h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Configuration des marchés et limites opérationnelles</p>
        </div>
        <button className="m3-btn-tonal flex items-center gap-3">
          <RefreshCcw size={18} /> Actualiser les indices
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
           {rates.map(rate => (
             <RateCard key={rate.id} rate={rate} onEdit={handleEdit} />
           ))}

           {/* Custom Rates Table Integrated */}
           <div className="col-span-full m3-card-elevated !p-0 overflow-hidden mt-4">
             <div className="p-8 border-b border-[#E7E0EB] flex justify-between items-center">
                <h3 className="text-xl font-black text-[#1D1B20] tracking-tight flex items-center gap-3">
                  <Coins className="text-[#6750A4]" size={20} /> Paires Additionnelles
                </h3>
                <button onClick={() => setIsAddModalOpen(true)} className="m3-btn-tonal !py-2 !px-5 text-[9px] uppercase tracking-widest"><Plus size={14} /> Ajouter</button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F3EDF7]/30 text-[#49454F] text-[9px] font-black uppercase tracking-[0.2em]">
                      <th className="px-8 py-4">Source ➔ Cible</th>
                      <th className="px-8 py-4">Taux Fixe</th>
                      <th className="px-8 py-4">Mise à jour</th>
                      <th className="px-8 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E0EB]">
                    {customRates.length === 0 ? (
                      <tr><td colSpan={4} className="px-8 py-10 text-center text-[#49454F]/30 italic text-xs">Aucune paire personnalisée</td></tr>
                    ) : (
                      customRates.map(crate => (
                        <tr key={crate.id} className="hover:bg-[#F3EDF7]/20 transition-all group">
                          <td className="px-8 py-5 text-sm font-black text-[#1D1B20]">{crate.from} ➔ {crate.to}</td>
                          <td className="px-8 py-5 text-sm font-mono font-black text-[#6750A4]">{crate.rate.toFixed(2)}</td>
                          <td className="px-8 py-5 text-[10px] font-bold text-[#49454F] opacity-50 uppercase">{crate.updatedAt?.toDate().toLocaleDateString('fr-FR')}</td>
                          <td className="px-8 py-5 text-right">
                             <button onClick={() => adminService.deleteCustomRate(crate.id)} className="p-2 text-[#49454F]/20 hover:text-[#B3261E] transition-all"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
           </div>
        </div>

        {/* System Settings Sidebar */}
        <div className="m3-card-elevated !bg-[#6750A4] text-white shadow-2xl">
           <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-white/20 rounded-2xl"><Shield size={24} /></div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Sécurité Système</h3>
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mt-1">Gouvernance des flux</p>
              </div>
           </div>

           <div className="space-y-8">
              <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ml-1">Plafond Standard KYC (RUB)</label>
                 <div className="relative">
                    <input type="number" value={editingStandardLimit} onChange={e => setEditingStandardLimit(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-[24px] px-6 py-4 text-white font-black text-lg outline-none focus:bg-white/20 transition-all" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 font-black text-xs uppercase">RUB</span>
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ml-1 text-emerald-300">Plafond Expert KYC (RUB)</label>
                 <div className="relative">
                    <input type="number" value={editingExpertLimit} onChange={e => setEditingExpertLimit(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-[24px] px-6 py-4 text-white font-black text-lg outline-none focus:bg-white/20 transition-all" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 font-black text-xs uppercase">RUB</span>
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ml-1">Bonus Parrainage (RUB)</label>
                 <div className="relative">
                    <input type="number" value={editingReferralBonus} onChange={e => setEditingReferralBonus(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-[24px] px-6 py-4 text-white font-black text-lg outline-none focus:bg-white/20 transition-all" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 font-black text-xs uppercase">RUB</span>
                 </div>
              </div>

              <div className="pt-8 border-t border-white/10 space-y-5">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Emails d'Alerte (Admin)</h4>
                 <div className="flex gap-3">
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="admin@flashpay.ru" className="flex-1 bg-white/10 border border-white/20 rounded-full px-5 py-3 text-xs outline-none" />
                    <button onClick={addEmail} className="p-3 bg-white text-[#6750A4] rounded-full shadow-lg hover:scale-110 transition-transform"><Plus size={18} /></button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {editingEmails.map(email => (
                      <div key={email} className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-[9px] font-black border border-white/10">
                        {email}
                        <button onClick={() => setEditingEmails(editingEmails.filter(e => e !== email))} className="hover:text-rose-300"><X size={10} /></button>
                      </div>
                    ))}
                 </div>
              </div>

              <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full py-5 bg-white text-[#6750A4] rounded-[28px] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                 {isSavingSettings ? 'Mise à jour...' : 'Synchroniser la configuration'}
              </button>
           </div>
        </div>
      </div>

      {/* MODAL: EDIT RATE */}
      {editingRate && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/60 backdrop-blur-md" onClick={() => setEditingRate(null)} />
          <div className="relative bg-[#FEF7FF] w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-[#E7E0EB] p-8 animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight">{editingRate.from} ➔ {editingRate.to}</h3>
                <button onClick={() => setEditingRate(null)} className="p-2 bg-[#F3EDF7] text-[#49454F] rounded-full"><X size={20} /></button>
             </div>
             
             <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F] ml-1 mb-2 block">Valeur du Taux</label>
                   <div className="relative">
                      <TrendingUp className="absolute left-5 top-1/2 -translate-y-1/2 text-[#6750A4]" size={20} />
                      <input type="number" step="0.0001" value={newRateValue} onChange={e => setNewRateValue(parseFloat(e.target.value))} className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] py-4 pl-14 pr-6 text-xl font-black text-[#1D1B20] outline-none" />
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F] ml-1 mb-2 block">Marge Opérationnelle (%)</label>
                   <div className="relative">
                      <input type="number" step="0.1" value={newMarginValue} onChange={e => setNewMarginValue(parseFloat(e.target.value))} className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] py-4 px-6 text-xl font-black text-[#1D1B20] outline-none" />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#6750A4] font-black">%</span>
                   </div>
                   <p className="text-[10px] text-[#49454F] font-bold opacity-40 mt-3 italic">* Cette marge s'ajoute au taux de base pour le calcul final.</p>
                </div>
                <div className="pt-4 flex gap-4">
                   <button onClick={() => setEditingRate(null)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#49454F]">Annuler</button>
                   <button onClick={handleSave} disabled={isSaving} className="flex-1 m3-btn-filled py-4 text-[10px] font-black uppercase tracking-widest shadow-xl">Enregistrer</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM RATE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-[#1D1B20]/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
           <div className="relative bg-[#FEF7FF] w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-[#E7E0EB] p-10 animate-in zoom-in-95 duration-300 text-center">
              <div className="w-20 h-20 bg-[#EADDFF] text-[#21005D] rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-lg">
                 <Coins size={40} />
              </div>
              <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight mb-8">Nouvelle Paire</h3>
              <div className="space-y-6 text-left">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Source (ex: USD)</label>
                       <input value={newCustomRate.from} onChange={e => setNewCustomRate({...newCustomRate, from: e.target.value.toUpperCase()})} className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-3.5 font-black text-[#1D1B20] outline-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Cible (ex: XAF)</label>
                       <input value={newCustomRate.to} onChange={e => setNewCustomRate({...newCustomRate, to: e.target.value.toUpperCase()})} className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-3.5 font-black text-[#1D1B20] outline-none" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Taux Fixe</label>
                    <input type="number" step="0.01" value={newCustomRate.rate} onChange={e => setNewCustomRate({...newCustomRate, rate: e.target.value})} className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 font-black text-[#1D1B20] outline-none text-lg" />
                 </div>
                 <button onClick={handleAddCustomRate} className="w-full m3-btn-filled py-4 mt-4 text-[10px] tracking-widest uppercase shadow-xl">Ajouter la paire</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeRatesPage;
