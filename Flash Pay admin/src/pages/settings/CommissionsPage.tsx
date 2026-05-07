import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Commission } from '../../types';
import { 
  Save, 
  History,
  ArrowRightLeft,
  Plus,
  Trash2,
  X,
  Globe,
  Smartphone,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const CommissionsPage: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<Commission>>({
    transferType: 'russia-africa',
    feeType: 'percentage',
    percentage: 0,
    fixedAmount: 0,
    minAmount: 0,
    maxAmount: 1000000,
    currency: 'RUB'
  });

  useEffect(() => {
    const q = query(collection(db, 'commissions'));
    const unsubComm = onSnapshot(q, (snapshot) => {
      setCommissions(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as Commission[]);
    });

    const unsubCountries = onSnapshot(collection(db, 'countries'), (snapshot) => {
      setCountries(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });

    const qLogs = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), limit(10));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });

    return () => {
      unsubComm();
      unsubCountries();
      unsubLogs();
    };
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const data = {
        ...formData,
        updatedAt: Timestamp.now(),
        updatedBy: 'admin'
      };

      if (editingId) {
        await updateDoc(doc(db, 'commissions', editingId), data);
        toast.success('Règle mise à jour');
      } else {
        await addDoc(collection(db, 'commissions'), data);
        toast.success('Nouvelle règle ajoutée');
      }
      
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        transferType: 'russia-africa',
        feeType: 'percentage',
        percentage: 0,
        fixedAmount: 0,
        minAmount: 0,
        maxAmount: 1000000,
        currency: 'RUB'
      });
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette règle de commission ?')) return;
    try {
      await deleteDoc(doc(db, 'commissions', id));
      toast.success('Règle supprimée');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getTransferLabel = (type: string) => {
    if (type === 'russia-africa') return 'Russie → Afrique';
    if (type === 'africa-russia') return 'Afrique → Russie';
    return 'Russie → Russie';
  };

  const selectedCountryData = countries.find(c => c.code === formData.destinationCountry);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Configuration des Frais</h2>
          <p className="text-slate-400 text-sm">Gérez les commissions par destination et type de transfert</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); }}
          className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-dark transition-all shadow-lg shadow-brand/20"
        >
          <Plus size={20} /> Nouvelle Règle
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rules List */}
        <div className="lg:col-span-2 space-y-4">
          {commissions.length === 0 ? (
            <div className="bg-card-dark border border-border-dark p-12 rounded-3xl text-center text-slate-500">
              Aucune règle de commission configurée.
            </div>
          ) : (
            commissions.sort((a, b) => a.transferType.localeCompare(b.transferType)).map(rule => (
              <div key={rule.id} className="bg-card-dark border border-border-dark p-5 rounded-3xl hover:border-brand/30 transition-all group relative">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-2xl ${rule.transferType === 'russia-africa' ? 'bg-emerald-500/10 text-emerald-500' : rule.transferType === 'africa-russia' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      <ArrowRightLeft size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{getTransferLabel(rule.transferType)}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {rule.destinationCountry && (
                          <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 font-bold uppercase">
                            <Globe size={10} /> {rule.destinationCountry}
                          </div>
                        )}
                        {rule.destinationOperator && (
                          <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 font-bold uppercase">
                            <Smartphone size={10} /> {rule.destinationOperator}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-black text-brand">
                      {rule.feeType === 'fixed' ? `${rule.fixedAmount} ${rule.currency}` : `${rule.percentage}%`}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                      {rule.minAmount.toLocaleString()} - {rule.maxAmount.toLocaleString()} {rule.currency}
                    </p>
                  </div>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                  <button 
                    onClick={() => { setEditingId(rule.id); setFormData(rule); setIsAdding(true); }}
                    className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg"
                  >
                    <Save size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(rule.id)}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar: Add/Edit Form & Logs */}
        <div className="space-y-6">
          {isAdding && (
            <div className="bg-card-dark border border-brand/30 p-6 rounded-3xl shadow-xl shadow-brand/5 relative animate-in fade-in slide-in-from-right-4">
              <button onClick={() => setIsAdding(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-white mb-6">
                {editingId ? 'Modifier la règle' : 'Nouvelle règle'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Type de transfert</label>
                  <select 
                    value={formData.transferType}
                    onChange={e => setFormData({ ...formData, transferType: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-brand outline-none"
                  >
                    <option value="russia-africa">Russie → Afrique</option>
                    <option value="africa-russia">Afrique → Russie</option>
                    <option value="russia-russia">Russie → Russie</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pays (Optionnel)</label>
                    <select 
                      value={formData.destinationCountry || ''}
                      onChange={e => setFormData({ ...formData, destinationCountry: e.target.value || undefined, destinationOperator: undefined })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-brand outline-none"
                    >
                      <option value="">Tous les pays</option>
                      {countries.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Opérateur (Optionnel)</label>
                    <select 
                      value={formData.destinationOperator || ''}
                      onChange={e => setFormData({ ...formData, destinationOperator: e.target.value || undefined })}
                      disabled={!formData.destinationCountry}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-brand outline-none disabled:opacity-50"
                    >
                      <option value="">Tous les opérateurs</option>
                      {selectedCountryData?.operators?.map((op: any) => <option key={op.name} value={op.name}>{op.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Type de frais</label>
                  <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button 
                      onClick={() => setFormData({ ...formData, feeType: 'percentage' })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.feeType === 'percentage' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-white'}`}
                    >
                      Pourcentage (%)
                    </button>
                    <button 
                      onClick={() => setFormData({ ...formData, feeType: 'fixed' })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${formData.feeType === 'fixed' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-400 hover:text-white'}`}
                    >
                      Fixe (Somme)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Valeur des frais</label>
                  <div className="relative">
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.feeType === 'percentage' ? formData.percentage : formData.fixedAmount}
                      onChange={e => setFormData({ ...formData, [formData.feeType === 'percentage' ? 'percentage' : 'fixedAmount']: parseFloat(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-brand outline-none font-bold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                      {formData.feeType === 'percentage' ? '%' : formData.currency}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Min. ({formData.currency})</label>
                    <input 
                      type="number"
                      value={formData.minAmount}
                      onChange={e => setFormData({ ...formData, minAmount: parseFloat(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-brand outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Max. ({formData.currency})</label>
                    <input 
                      type="number"
                      value={formData.maxAmount}
                      onChange={e => setFormData({ ...formData, maxAmount: parseFloat(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:border-brand outline-none font-mono"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-4 bg-brand text-white font-black rounded-2xl shadow-lg shadow-brand/20 hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={20} /> {isSaving ? 'Enregistrement...' : 'Enregistrer la règle'}
                </button>
              </div>
            </div>
          )}

          <div className="bg-card-dark border border-border-dark p-6 rounded-3xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <History className="text-brand" size={20} />
              Logs récents
            </h3>
            <div className="space-y-4">
               {logs.length === 0 ? (
                 <p className="text-slate-500 text-xs italic">Aucun log disponible.</p>
               ) : (
                 logs.map(log => (
                   <div key={log.id} className="border-l-2 border-slate-800 pl-4">
                     <p className="text-white text-xs font-bold leading-tight">{log.action?.replace(/_/g, ' ')}</p>
                     <p className="text-slate-500 text-[9px] mt-1">{log.timestamp?.toDate().toLocaleString()}</p>
                   </div>
                 ))
               )}
            </div>
          </div>

          <div className="bg-brand/10 border border-brand/20 p-5 rounded-2xl flex gap-4">
             <Info className="text-brand shrink-0" size={20} />
             <p className="text-[11px] text-brand/80 leading-relaxed">
               Le système cherche la règle la plus précise. Une règle pour un <strong>pays spécifique</strong> sera prioritaire sur une règle générale.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionsPage;
