import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
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
  Save, 
  X, 
  TrendingUp, 
  DollarSign, 
  Euro, 
  Coins,
  Shield
} from 'lucide-react';

const RateCard = ({ rate, onEdit }: { rate: ExchangeRate; onEdit: (rate: ExchangeRate) => void }) => {
  const getIcon = (currency: string) => {
    if (currency === 'USD') return <DollarSign size={20} className="text-emerald-500" />;
    if (currency === 'EUR') return <Euro size={20} className="text-blue-500" />;
    return <Coins size={20} className="text-amber-500" />;
  };

  return (
    <div className="bg-card-dark border border-border-dark p-6 rounded-3xl hover:border-brand/30 transition-all group">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 z-10">
              {getIcon(rate.from)}
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 -ml-3">
              {getIcon(rate.to)}
            </div>
          </div>
          <div>
            <h3 className="text-white font-bold">{rate.from} ↔ {rate.to}</h3>
            <p className="text-slate-500 text-[10px]">Mis à jour {rate.updatedAt.toDate().toLocaleDateString()}</p>
          </div>
        </div>
        <button 
          onClick={() => onEdit(rate)}
          className="p-2 bg-slate-800 text-slate-400 hover:text-brand hover:bg-brand/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
        >
          <Edit3 size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-4 py-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <span className="text-slate-400 text-xs font-medium">Taux actuel</span>
          <span className="text-white font-mono font-bold text-lg">{rate.rate.toFixed(4)}</span>
        </div>
        <div className="flex justify-between items-center px-4 py-2 bg-brand/5 rounded-2xl border border-brand/10">
          <span className="text-brand/70 text-[10px] font-bold uppercase tracking-wider">Marge plateforme</span>
          <span className="text-brand font-bold">{(rate.margin * 100).toFixed(1)}%</span>
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

  // Daily limit state
  const [dailyLimit, setDailyLimit] = useState<number>(150000);
  const [editingLimit, setEditingLimit] = useState<string>('150000');
  const [isSavingLimit, setIsSavingLimit] = useState(false);

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

    // Load daily limit
    const qSettings = query(collection(db, 'settings'));
    const unsubSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const settingsDoc = snapshot.docs[0].data();
        const limit = settingsDoc.dailyLimitRUB || 150000;
        setDailyLimit(limit);
        setEditingLimit(limit.toString());
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
    try {
      await adminService.updateExchangeRate(editingRate.id, newRateValue, newMarginValue / 100);
      toast.success('Taux mis à jour');
      setEditingRate(null);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDailyLimit = async () => {
    const newLimit = parseInt(editingLimit);
    if (isNaN(newLimit) || newLimit <= 0) {
      toast.error('Limite invalide');
      return;
    }
    setIsSavingLimit(true);
    try {
      await adminService.updateDailyLimit(newLimit);
      setDailyLimit(newLimit);
      toast.success('Limite journalière mise à jour');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSavingLimit(false);
    }
  };

  const handleAddCustomRate = async () => {
    if (!newCustomRate.from || !newCustomRate.to || !newCustomRate.rate) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    try {
      await adminService.saveCustomRate(
        newCustomRate.from.toUpperCase(), 
        newCustomRate.to.toUpperCase(), 
        parseFloat(newCustomRate.rate)
      );
      toast.success('Nouvelle paire ajoutée');
      setIsAddModalOpen(false);
      setNewCustomRate({ from: '', to: '', rate: '' });
    } catch (err) {
      toast.error('Erreur lors de l\'ajout');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Taux de Change</h2>
          <p className="text-slate-400 text-sm">Gestion des devises et marges opérationnelles</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl border border-slate-700 transition-all text-sm font-medium">
          <RefreshCcw size={16} /> Actualiser via API
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rates.map(rate => (
          <RateCard key={rate.id} rate={rate} onEdit={handleEdit} />
        ))}
        
        {/* Daily Limits Config Card */}
        <div className="bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-500/20 text-rose-500 rounded-xl">
                <Shield size={20} />
              </div>
              <h3 className="text-white font-bold">Limites de Sécurité</h3>
            </div>
            <p className="text-slate-400 text-xs mb-6">Contrôle du plafond de transaction quotidien pour les comptes standards.</p>
            
            <div className="space-y-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Limite Max Journalière (RUB)</label>
                 <div className="relative">
                   <input 
                    type="number" 
                    value={editingLimit}
                    onChange={(e) => setEditingLimit(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono font-bold focus:ring-1 focus:ring-rose-500/50 outline-none"
                   />
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-bold">RUB</span>
                 </div>
               </div>
            </div>
          </div>
          <button 
            onClick={handleSaveDailyLimit}
            disabled={isSavingLimit}
            className="mt-6 w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-rose-500 font-bold rounded-xl border border-rose-500/30 transition-all text-xs flex items-center justify-center gap-2"
          >
            {isSavingLimit ? (
              <>
                <RefreshCcw size={14} className="animate-spin" />
                Mise à jour...
              </>
            ) : (
              <>
                <Save size={14} />
                Mettre à jour la limite
              </>
            )}
          </button>
        </div>
      </div>

      {/* Custom Rates Section */}
      <div className="bg-card-dark border border-border-dark p-8 rounded-3xl mt-12">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Coins className="text-brand" size={20} />
          Taux Personnalisés (Paires Additionnelles)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-4 py-3">De</th>
                <th className="px-4 py-3">À</th>
                <th className="px-4 py-3">Taux Fixe</th>
                <th className="px-4 py-3">Dernière Modif</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800/30">
              {customRates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">Aucune paire personnalisée configurée.</td>
                </tr>
              ) : (
                customRates.map(crate => (
                  <tr key={crate.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-4 text-white font-bold">{crate.from}</td>
                    <td className="px-4 py-4 text-white font-bold">{crate.to}</td>
                    <td className="px-4 py-4 text-brand font-mono font-bold">{crate.rate.toFixed(2)}</td>
                    <td className="px-4 py-4 text-slate-500">{crate.updatedAt?.toDate().toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                       <button 
                         onClick={() => adminService.deleteCustomRate(crate.id)}
                         className="p-2 text-slate-500 hover:text-rose-500 transition-all"
                       >
                         <X size={16} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="mt-6 w-full py-4 bg-slate-800/50 hover:bg-slate-800 text-slate-400 font-bold rounded-2xl border border-dashed border-slate-700 transition-all text-xs uppercase tracking-[0.2em]"
          >
            + Ajouter une Paire Personnalisée
          </button>
        </div>
      </div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Nouvelle Paire de Devises"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">Source (ex: USD)</label>
              <input 
                value={newCustomRate.from}
                onChange={e => setNewCustomRate({...newCustomRate, from: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-1 focus:ring-brand outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase">Cible (ex: XAF)</label>
              <input 
                value={newCustomRate.to}
                onChange={e => setNewCustomRate({...newCustomRate, to: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-1 focus:ring-brand outline-none"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase">Taux Fixe</label>
            <input 
              type="number"
              value={newCustomRate.rate}
              onChange={e => setNewCustomRate({...newCustomRate, rate: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-1 focus:ring-brand outline-none"
            />
          </div>
          <button 
            onClick={handleAddCustomRate}
            className="w-full mt-4 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-all"
          >
            Ajouter la paire
          </button>
        </div>
      </Modal>

      {/* Edit Modal / Slide-over */}
      {editingRate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-bg-dark/80 backdrop-blur-sm">
          <div className="bg-card-dark border border-border-dark w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border-dark flex justify-between items-center bg-slate-800/30">
              <h3 className="text-xl font-bold text-white">Éditer {editingRate.from} ↔ {editingRate.to}</h3>
              <button onClick={() => setEditingRate(null)} className="text-slate-500 hover:text-white p-1">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nouveau Taux</label>
                <div className="relative">
                  <TrendingUp className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input 
                    type="number" 
                    step="0.0001"
                    value={newRateValue}
                    onChange={(e) => setNewRateValue(parseFloat(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Marge (%)</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                  <input 
                    type="number" 
                    step="0.1"
                    value={newMarginValue}
                    onChange={(e) => setNewMarginValue(parseFloat(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">* La marge est appliquée au taux de base pour le calcul final.</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setEditingRate(null)}
                  className="flex-1 px-6 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark shadow-lg shadow-brand/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeRatesPage;
