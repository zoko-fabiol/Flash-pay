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
  Info,
  Settings,
  Percent
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
    transferType: 'africa-africa',
    feeType: 'percentage',
    percentage: 0,
    fixedAmount: 0,
    minAmount: 0,
    maxAmount: 1000000,
    currency: 'XAF'
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
    const t = toast.loading('Enregistrement de la règle...');
    try {
      const data = {
        ...formData,
        updatedAt: Timestamp.now(),
        updatedBy: 'admin'
      };

      if (editingId) {
        await updateDoc(doc(db, 'commissions', editingId), data);
        toast.success('Règle mise à jour', { id: t });
      } else {
        await addDoc(collection(db, 'commissions'), data);
        toast.success('Nouvelle règle ajoutée', { id: t });
      }
      
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        transferType: 'africa-africa',
        feeType: 'percentage',
        percentage: 0,
        fixedAmount: 0,
        minAmount: 0,
        maxAmount: 1000000,
        currency: 'XAF'
      });
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'enregistrement', { id: t });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette règle de commission ?')) return;
    const t = toast.loading('Suppression...');
    try {
      await deleteDoc(doc(db, 'commissions', id));
      toast.success('Règle supprimée', { id: t });
    } catch (err) {
      console.error(err);
      toast.error('Erreur', { id: t });
    }
  };

  const getTransferLabel = (type: string) => {
    if (type === 'russia-africa') return 'Russie ➔ Afrique';
    if (type === 'africa-russia') return 'Afrique ➔ Russie';
    return 'Afrique ➔ Afrique';
  };

  const selectedCountryData = countries.find(c => c.code === formData.destinationCountry);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-[#661489] text-white rounded-[16px] flex items-center justify-center shadow-lg"><Percent size={24} /></div>
            Gestion des Frais
          </h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Structure tarifaire et commissions réseau</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); }}
          className="m3-btn-filled flex items-center gap-3"
        >
          <Plus size={20} /> Nouvelle Règle
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Rules List */}
        <div className="lg:col-span-2 space-y-6">
          {commissions.length === 0 ? (
            <div className="m3-card-elevated p-20 text-center bg-[#F3EDF7]/30 border-2 border-dashed">
               <Settings className="mx-auto text-[#661489]/20 mb-6" size={64} />
               <p className="text-[#49454F] font-black uppercase text-[10px] tracking-widest">Aucune règle tarifaire configurée</p>
            </div>
          ) : (
            commissions.sort((a, b) => a.transferType.localeCompare(b.transferType)).map(rule => (
              <div key={rule.id} className="m3-card-elevated group relative overflow-hidden transition-all hover:border-[#661489]/30">
                <div className="flex justify-between items-start">
                  <div className="flex gap-5">
                    <div className={`p-4 rounded-[20px] shadow-sm border border-black/5 ${rule.transferType === 'russia-africa' ? 'bg-[#E8DEF8] text-[#1D192B]' : 'bg-[#EADDFF] text-[#21005D]'}`}>
                      <ArrowRightLeft size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">{getTransferLabel(rule.transferType)}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rule.destinationCountry && (
                          <div className="flex items-center gap-1.5 bg-[#F3EDF7] px-3 py-1 rounded-full text-[9px] text-[#661489] font-black uppercase tracking-widest border border-[#E7E0EB]">
                            <Globe size={12} /> {rule.destinationCountry}
                          </div>
                        )}
                        {rule.destinationOperator && (
                          <div className="flex items-center gap-1.5 bg-[#EADDFF] px-3 py-1 rounded-full text-[9px] text-[#21005D] font-black uppercase tracking-widest border border-[#661489]/10">
                            <Smartphone size={12} /> {rule.destinationOperator}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-black text-[#661489] tracking-tighter">
                      {rule.feeType === 'fixed' ? `${rule.fixedAmount} ${rule.currency}` : `${rule.percentage}%`}
                    </p>
                    <p className="text-[10px] text-[#49454F] font-black uppercase tracking-widest mt-1 opacity-60">
                      {rule.minAmount.toLocaleString()} - {rule.maxAmount.toLocaleString()} {rule.currency}
                    </p>
                  </div>
                </div>

                <div className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 transition-all flex gap-3 translate-x-4 group-hover:translate-x-0">
                  <button 
                    onClick={() => { setEditingId(rule.id); setFormData(rule); setIsAdding(true); }}
                    className="p-3 bg-white border border-[#E7E0EB] text-[#661489] hover:bg-[#661489] hover:text-white rounded-xl shadow-lg transition-all"
                  >
                    <Save size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(rule.id)}
                    className="p-3 bg-white border border-[#E7E0EB] text-[#B3261E] hover:bg-[#B3261E] hover:text-white rounded-xl shadow-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar: Add/Edit Form & Logs */}
        <div className="space-y-8">
          {isAdding && (
            <div className="m3-card-elevated !bg-[#FEF7FF] border-[#661489]/20 relative animate-in slide-in-from-right-10 duration-500 shadow-2xl">
              <button onClick={() => setIsAdding(false)} className="absolute top-6 right-6 p-2 bg-[#F3EDF7] text-[#49454F] rounded-full hover:bg-[#F9DEDC] hover:text-[#B3261E] transition-all">
                <X size={18} />
              </button>
              <h3 className="text-xl font-black text-[#1D1B20] tracking-tight mb-8">
                {editingId ? 'Modifier la règle' : 'Nouvelle règle'}
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1 mb-2 block">Type de transfert</label>
                  <select 
                    value={formData.transferType}
                    onChange={e => {
                      const type = e.target.value as any;
                      setFormData({ 
                        ...formData, 
                        transferType: type,
                        currency: type === 'africa-africa' ? 'XAF' : 'RUB'
                      });
                    }}
                    className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 text-sm font-bold text-[#1D1B20] focus:ring-4 focus:ring-[#661489]/10 transition-all outline-none appearance-none"
                  >
                    <option value="russia-africa">Russie → Afrique</option>
                    <option value="africa-russia">Afrique → Russie</option>
                    <option value="africa-africa">Afrique → Afrique</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1 mb-2 block">Pays Destination</label>
                    <select 
                      value={formData.destinationCountry || ''}
                      onChange={e => setFormData({ ...formData, destinationCountry: e.target.value || undefined, destinationOperator: undefined })}
                      className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-4 py-3.5 text-[11px] font-bold text-[#1D1B20] outline-none"
                    >
                      <option value="">Tous les pays</option>
                      {countries.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1 mb-2 block">Opérateur</label>
                    <select 
                      value={formData.destinationOperator || ''}
                      onChange={e => setFormData({ ...formData, destinationOperator: e.target.value || undefined })}
                      disabled={!formData.destinationCountry}
                      className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-4 py-3.5 text-[11px] font-bold text-[#1D1B20] outline-none disabled:opacity-30"
                    >
                      <option value="">Tous les réseaux</option>
                      {selectedCountryData?.operators?.map((op: any) => <option key={op.name} value={op.name}>{op.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1 mb-3 block">Type de tarification</label>
                  <div className="flex bg-[#F3EDF7] p-1.5 rounded-full border border-[#E7E0EB] shadow-inner">
                    <button 
                      onClick={() => setFormData({ ...formData, feeType: 'percentage' })}
                      className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${formData.feeType === 'percentage' ? 'bg-[#661489] text-white shadow-md' : 'text-[#49454F] hover:bg-white/50'}`}
                    >
                      Pourcentage
                    </button>
                    <button 
                      onClick={() => setFormData({ ...formData, feeType: 'fixed' })}
                      className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${formData.feeType === 'fixed' ? 'bg-[#661489] text-white shadow-md' : 'text-[#49454F] hover:bg-white/50'}`}
                    >
                      Somme Fixe
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1 mb-2 block">Valeur des frais</label>
                  <div className="relative group">
                    <input 
                      type="number"
                      step="0.01"
                      value={formData.feeType === 'percentage' ? formData.percentage : formData.fixedAmount}
                      onChange={e => setFormData({ ...formData, [formData.feeType === 'percentage' ? 'percentage' : 'fixedAmount']: parseFloat(e.target.value) })}
                      className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-2xl px-5 py-4 text-lg font-black text-[#1D1B20] focus:ring-4 focus:ring-[#661489]/10 transition-all outline-none"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[#661489] font-black text-sm">
                      {formData.feeType === 'percentage' ? '%' : formData.currency}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#49454F] uppercase tracking-widest ml-1 opacity-60">Min. Transfert</label>
                    <input 
                      type="number"
                      value={formData.minAmount}
                      onChange={e => setFormData({ ...formData, minAmount: parseFloat(e.target.value) })}
                      className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-xl px-4 py-3 text-xs font-bold text-[#1D1B20] outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#49454F] uppercase tracking-widest ml-1 opacity-60">Max. Transfert</label>
                    <input 
                      type="number"
                      value={formData.maxAmount}
                      onChange={e => setFormData({ ...formData, maxAmount: parseFloat(e.target.value) })}
                      className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-xl px-4 py-3 text-xs font-bold text-[#1D1B20] outline-none"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full m3-btn-filled py-4 text-[11px] uppercase tracking-widest mt-4 shadow-xl"
                >
                  <Save size={20} /> {isSaving ? 'Synchronisation...' : 'Enregistrer la règle'}
                </button>
              </div>
            </div>
          )}

          <div className="m3-card-elevated border-[#E7E0EB] !p-8">
            <h3 className="text-lg font-black text-[#1D1B20] tracking-tight mb-8 flex items-center gap-3">
              <History className="text-[#661489]" size={20} />
              Historique des Modifications
            </h3>
            <div className="space-y-6">
               {logs.length === 0 ? (
                 <p className="text-[#49454F] text-[10px] font-bold italic opacity-40 uppercase tracking-widest text-center py-6">Aucun log récent</p>
               ) : (
                 logs.map(log => (
                   <div key={log.id} className="relative pl-6 border-l-2 border-[#F3EDF7] group/log">
                     <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-[#661489] group-hover/log:scale-150 transition-transform"></div>
                     <p className="text-[#1D1B20] text-[11px] font-black uppercase tracking-tight leading-tight mb-1">{log.action?.replace(/_/g, ' ')}</p>
                     <p className="text-[#49454F] text-[9px] font-bold opacity-60">{log.timestamp?.toDate().toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                   </div>
                 ))
               )}
            </div>
          </div>

          <div className="bg-[#EADDFF] p-6 rounded-[28px] border border-[#661489]/10 flex gap-5 items-start">
             <div className="p-3 bg-white rounded-2xl shadow-sm text-[#661489]"><Info size={24} /></div>
             <p className="text-[11px] text-[#21005D] font-bold leading-relaxed">
                Priorité du système : Les règles par <span className="font-black underline">pays spécifique</span> prévalent toujours sur les configurations générales. Assurez-vous d'éviter les conflits de plages de montants.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionsPage;

