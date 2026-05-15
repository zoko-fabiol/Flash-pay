import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useConfirm } from '../../context/ConfirmContext';
import type { ExchangeRate } from '../../types';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { canPerformAdminAction } from '../../lib/adminAccess';
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
    return 'bg-[#F3EDF7] text-[#661489]';
  };

  return (
    <div className="m3-card-elevated group hover:border-[#661489]/30 transition-all">
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
          className="p-3 bg-[#F3EDF7] text-[#661489] hover:bg-[#661489] hover:text-white rounded-xl transition-all shadow-sm group-hover:scale-110"
        >
          <Edit3 size={18} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-5 bg-[#F3EDF7] rounded-[24px] border border-[#E7E0EB] shadow-inner">
          <span className="text-[#49454F] text-[10px] font-black uppercase tracking-widest opacity-60">Taux Actuel</span>
          <span className="text-[#1D1B20] font-mono font-black text-xl">{rate.rate.toFixed(4)}</span>
        </div>
        <div className="flex justify-between items-center px-5 py-3 bg-[#EADDFF]/50 rounded-full border border-[#661489]/10">
          <span className="text-[#21005D] text-[9px] font-black uppercase tracking-[0.2em]">Marge Opérationnelle</span>
          <span className="text-[#661489] font-black text-sm">{(rate.margin * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

const ExchangeRatesPage: React.FC = () => {
  const { confirm } = useConfirm();
  const { profile } = useAuth();
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [editingCustomRate, setEditingCustomRate] = useState<any>(null);
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
  const [editingPointsCurrency, setEditingPointsCurrency] = useState<string>('RUB');
  const [editingPointsEarningRate, setEditingPointsEarningRate] = useState<string>('1');
  const [editingPointsRedemptionRate, setEditingPointsRedemptionRate] = useState<string>('1000');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const canAdd = canPerformAdminAction(profile, 'add');
  const canEdit = canPerformAdminAction(profile, 'edit');
  const canDelete = canPerformAdminAction(profile, 'delete');

  // All unique currencies from exchange_rates + custom_rates
  const availableCurrencies = React.useMemo(() => {
    const set = new Set<string>();
    [...rates, ...customRates].forEach(r => {
      if (r.from) set.add(r.from);
      if (r.to)   set.add(r.to);
    });
    return Array.from(set).sort();
  }, [rates, customRates]);

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
        
        // Ensure we always have strings and handle NaN/undefined
        setEditingLimit((limit || 0).toString());
        setEditingStandardLimit((stdLimit || 0).toString());
        setEditingExpertLimit((expLimit || 0).toString());
        setEditingReferralBonus((bonus || 0).toString());
        setEditingEmails(Array.isArray(emails) ? emails : []);
        setEditingPointsCurrency(settingsDoc.pointsCurrency || 'RUB');
        setEditingPointsEarningRate((settingsDoc.pointsEarningRate || 1).toString());
        setEditingPointsRedemptionRate((settingsDoc.pointsRedemptionRate || 1000).toString());
      }
    }, (error) => {
      console.error('Error fetching settings:', error);
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

  const handleEditCustomRate = (rate: any) => {
    setEditingCustomRate(rate);
    setNewRateValue(rate.rate);
  };

  const handleSave = async () => {
    if (editingRate) {
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
    } else if (editingCustomRate) {
      setIsSaving(true);
      const t = toast.loading('Mise à jour de la paire...');
      try {
        await adminService.updateCustomRate(editingCustomRate.id, newRateValue);
        toast.success('Paire mise à jour ✓', { id: t });
        setEditingCustomRate(null);
      } catch (err) {
        toast.error('Erreur de synchronisation', { id: t });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSaveSettings = async () => {
    const newLimit = parseInt(editingLimit);
    const newStdLimit = parseInt(editingStandardLimit);
    const newExpLimit = parseInt(editingExpertLimit);
    const newBonus = parseInt(editingReferralBonus);
    
    const pointsEarnRate = parseFloat(editingPointsEarningRate);
    const pointsRedeemRate = parseFloat(editingPointsRedemptionRate);

    if (isNaN(newLimit) || newLimit <= 0) { toast.error('Limite max invalide'); return; }
    if (isNaN(newStdLimit) || newStdLimit <= 0) { toast.error('Limite Standard invalide'); return; }
    if (isNaN(newExpLimit) || newExpLimit <= 0) { toast.error('Limite Expert invalide'); return; }
    if (isNaN(newBonus) || newBonus < 0) { toast.error('Bonus parrainage invalide'); return; }
    if (isNaN(pointsEarnRate) || pointsEarnRate < 0) { toast.error('Taux de gain invalide'); return; }
    if (isNaN(pointsRedeemRate) || pointsRedeemRate <= 0) { toast.error('Taux de rachat invalide'); return; }

    const t = toast.loading('Mise à jour des paramètres...');
    try {
      await adminService.updateDailyLimit(
        newLimit, 
        newBonus, 
        newStdLimit, 
        newExpLimit, 
        editingEmails,
        editingPointsCurrency,
        pointsEarnRate,
        pointsRedeemRate
      );
      toast.success('Configuration système à jour', { id: t });
    } catch (err: any) {
      console.error('Settings update failed:', err);
      toast.error(`Échec : ${err.message || 'Erreur inconnue'}`, { id: t });
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
            <div className="w-12 h-12 bg-[#661489] text-white rounded-[16px] flex items-center justify-center shadow-lg"><ArrowRightLeft size={24} /></div>
            Devises & Systèmes
          </h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Configuration des marchés et limites opérationnelles</p>
        </div>
        <button className="m3-btn-tonal flex items-center gap-3" disabled={!canEdit}>
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
                  <Coins className="text-[#661489]" size={20} /> Paires Additionnelles
                </h3>
                <button onClick={() => setIsAddModalOpen(true)} disabled={!canAdd} className="m3-btn-tonal !py-2 !px-5 text-[9px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={14} /> Ajouter</button>
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
                          <td className="px-8 py-5 text-sm font-mono font-black text-[#661489]">{crate.rate.toFixed(2)}</td>
                          <td className="px-8 py-5 text-[10px] font-bold text-[#49454F] opacity-50 uppercase">{crate.updatedAt?.toDate().toLocaleDateString('fr-FR')}</td>
                          <td className="px-8 py-5 text-right flex justify-end gap-3">
                             <button onClick={() => handleEditCustomRate(crate)} disabled={!canEdit} className="p-2 text-[#661489] hover:bg-[#F3EDF7] hover:text-[#661489] transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"><Edit3 size={16} /></button>
                             <button onClick={() => adminService.deleteCustomRate(crate.id)} disabled={!canDelete} className="p-2 text-[#49454F]/20 hover:text-[#B3261E] hover:bg-[#FFEBEE] transition-all disabled:opacity-30 disabled:cursor-not-allowed rounded-lg"><Trash2 size={16} /></button>
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
        <div className="m3-card-elevated !bg-[#661489] text-white shadow-2xl">
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
                    <input type="number" value={editingStandardLimit} onChange={e => setEditingStandardLimit(e.target.value)} disabled={!canEdit} className="w-full bg-white/10 border border-white/20 rounded-[24px] px-6 py-4 text-white font-black text-lg outline-none focus:bg-white/20 transition-all disabled:opacity-60" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 font-black text-xs uppercase">RUB</span>
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ml-1 text-emerald-300">Plafond Expert KYC (RUB)</label>
                 <div className="relative">
                    <input type="number" value={editingExpertLimit} onChange={e => setEditingExpertLimit(e.target.value)} disabled={!canEdit} className="w-full bg-white/10 border border-white/20 rounded-[24px] px-6 py-4 text-white font-black text-lg outline-none focus:bg-white/20 transition-all disabled:opacity-60" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 font-black text-xs uppercase">RUB</span>
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ml-1">Bonus Parrainage (en RUB)</label>
                 <p className="text-[9px] text-white/40 italic -mt-2 ml-1">Sera converti en points (1 RUB = 1000 pts)</p>
                 <div className="relative">
                    <input type="number" value={editingReferralBonus} onChange={e => setEditingReferralBonus(e.target.value)} disabled={!canEdit} className="w-full bg-white/10 border border-white/20 rounded-[24px] px-6 py-4 text-white font-black text-lg outline-none focus:bg-white/20 transition-all disabled:opacity-60" />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/40 font-black text-xs uppercase">RUB</span>
                 </div>
              </div>


              <div className="pt-8 border-t border-white/10 space-y-5">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Programme de Fidélité</h4>
                 
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ml-1">Monnaie de base</label>
                    <select
                      value={editingPointsCurrency}
                      onChange={e => setEditingPointsCurrency(e.target.value)}
                      disabled={!canEdit}
                      className="w-full bg-white/10 border border-white/20 rounded-[24px] px-6 py-4 text-white font-black text-lg outline-none focus:bg-white/20 transition-all appearance-none cursor-pointer disabled:opacity-60"
                    >
                      {availableCurrencies.length === 0 && (
                        <option value={editingPointsCurrency} className="bg-[#661489]">{editingPointsCurrency}</option>
                      )}
                      {availableCurrencies.map(cur => (
                        <option key={cur} value={cur} className="bg-[#4D0F67] text-white font-black">{cur}</option>
                      ))}
                    </select>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ml-1">Points gagnés par 1 {editingPointsCurrency} dépensé</label>
                    <input type="number" step="0.01" value={editingPointsEarningRate} onChange={e => setEditingPointsEarningRate(e.target.value)} disabled={!canEdit} className="w-full bg-white/10 border border-white/20 rounded-[24px] px-6 py-4 text-white font-black text-lg outline-none focus:bg-white/20 transition-all" />
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ml-1">Valeur de rachat (pts pour 1 {editingPointsCurrency})</label>
                    <input type="number" value={editingPointsRedemptionRate} onChange={e => setEditingPointsRedemptionRate(e.target.value)} disabled={!canEdit} className="w-full bg-white/10 border border-white/20 rounded-[24px] px-6 py-4 text-white font-black text-lg outline-none focus:bg-white/20 transition-all" />
                    <p className="text-[9px] text-white/40 italic ml-1">Par défaut: 1000 pts = 1 {editingPointsCurrency}</p>
                 </div>
              </div>

              <div className="pt-8 border-t border-white/10 space-y-5">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Emails d'Alerte (Admin)</h4>
                 <div className="flex gap-3">
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="admin@flashpay.ru" disabled={!canEdit} className="flex-1 bg-white/10 border border-white/20 rounded-full px-5 py-3 text-xs outline-none disabled:opacity-60" />
                    <button onClick={addEmail} disabled={!canAdd} className="p-3 bg-white text-[#661489] rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={18} /></button>
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

              <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full py-5 bg-white text-[#661489] rounded-[28px] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                 {isSavingSettings ? 'Mise à jour...' : 'Synchroniser la configuration'}
              </button>

              <div className="pt-4">
                 <button 
                   onClick={async () => {
                     const confirmed = await confirm({
                       title: 'Réinitialisation Globale',
                       message: 'Êtes-vous sûr de vouloir réinitialiser TOUS les bonus de TOUS les utilisateurs à 0 ? Cette action est irréversible.',
                       type: 'danger',
                       confirmLabel: 'Réinitialiser maintenant'
                     });
                     if (confirmed) {
                       const t = toast.loading('Réinitialisation des bonus...');
                       try {
                         const usersSnap = await getDocs(collection(db, 'users'));
                         const promises = usersSnap.docs.map((u: any) => updateDoc(doc(db, 'users', u.id), { solde_bonus: 0 }));
                         await Promise.all(promises);
                         toast.success('Tous les bonus ont été réinitialisés.', { id: t });
                       } catch (e) {
                         toast.error('Erreur lors de la réinitialisation.', { id: t });
                       }
                     }
                   }}
                   className="w-full py-3 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-2xl font-bold uppercase text-[9px] tracking-widest hover:bg-rose-500/30 transition-all"
                 >
                   Réinitialiser tous les bonus (Migration)
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* MODAL: EDIT RATE OR CUSTOM RATE */}
      {(editingRate || editingCustomRate) && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/60 backdrop-blur-md" onClick={() => { setEditingRate(null); setEditingCustomRate(null); }} />
          <div className="relative bg-[#FEF7FF] w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-[#E7E0EB] p-8 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight">
                  {editingRate ? `${editingRate.from} ➔ ${editingRate.to}` : `${editingCustomRate?.from} ➔ ${editingCustomRate?.to}`}
                </h3>
                <button onClick={() => { setEditingRate(null); setEditingCustomRate(null); }} className="p-2 bg-[#F3EDF7] text-[#49454F] rounded-full"><X size={20} /></button>
             </div>
             
             <div className="space-y-6">
                {editingRate ? (
                  <>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F] ml-1 mb-2 block">Valeur du Taux</label>
                       <div className="relative">
                          <TrendingUp className="absolute left-5 top-1/2 -translate-y-1/2 text-[#661489]" size={20} />
                          <input type="number" step="0.0001" value={newRateValue} onChange={e => setNewRateValue(parseFloat(e.target.value))} className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] py-4 pl-14 pr-6 text-xl font-black text-[#1D1B20] outline-none" />
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F] ml-1 mb-2 block">Marge Opérationnelle (%)</label>
                       <div className="relative">
                          <input 
                            type="number" 
                            step="0.1" 
                            value={isNaN(newMarginValue) ? '' : newMarginValue} 
                            onChange={e => setNewMarginValue(e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                            className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] py-4 px-6 text-xl font-black text-[#1D1B20] outline-none" 
                          />
                          <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#661489] font-black">%</span>
                       </div>
                       <p className="text-[10px] text-[#49454F] font-bold opacity-40 mt-3 italic">* Cette marge s'ajoute au taux de base pour le calcul final.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F] ml-1 mb-2 block">Taux Fixe</label>
                       <div className="relative">
                          <TrendingUp className="absolute left-5 top-1/2 -translate-y-1/2 text-[#661489]" size={20} />
                          <input type="number" step="0.01" value={newRateValue} onChange={e => setNewRateValue(parseFloat(e.target.value))} className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] py-4 pl-14 pr-6 text-xl font-black text-[#1D1B20] outline-none" />
                       </div>
                    </div>
                  </>
                )}
                <div className="pt-4 flex gap-4">
                   <button onClick={() => { setEditingRate(null); setEditingCustomRate(null); }} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#49454F]">Annuler</button>
                   <button onClick={handleSave} disabled={isSaving} className="flex-1 m3-btn-filled py-4 text-[10px] font-black uppercase tracking-widest shadow-xl">Enregistrer</button>
                </div>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: ADD CUSTOM RATE */}
      {isAddModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-[#1D1B20]/60 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
           <div className="relative bg-[#FEF7FF] w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-[#E7E0EB] p-10 animate-in zoom-in-95 duration-300 text-center" onClick={e => e.stopPropagation()}>
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default ExchangeRatesPage;

