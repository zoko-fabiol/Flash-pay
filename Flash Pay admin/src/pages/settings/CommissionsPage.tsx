import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc,
  updateDoc,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Commission } from '../../types';
import { 
  Save, 
  History,
  AlertCircle,
  ArrowRightLeft,
  ChevronRight
} from 'lucide-react';

const CommissionsPage: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'commissions'));
    const unsubComm = onSnapshot(q, (snapshot) => {
      setCommissions(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as Commission[]);
    });

    const qLogs = query(collection(db, 'admin_logs'), orderBy('timestamp', 'desc'), limit(5));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });

    return () => {
      unsubComm();
      unsubLogs();
    };
  }, []);

  const handleUpdate = async (id: string, value: number) => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'commissions', id), {
        percentage: value,
        updatedAt: Timestamp.now(),
        updatedBy: 'admin'
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour.');
    } finally {
      setIsSaving(false);
    }
  };

  const getLabel = (type: string) => {
    if (type === 'russia-africa') return 'Russie → Afrique';
    if (type === 'africa-russia') return 'Afrique → Russie';
    return 'Russie → Russie';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Commissions & Frais</h2>
        <p className="text-slate-400 text-sm">Configuration des revenus de la plateforme par type de transfert</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Commissions */}
        <div className="space-y-6">
          {commissions.map(commission => (
            <div key={commission.id} className="bg-card-dark border border-border-dark p-6 rounded-3xl hover:border-brand/30 transition-all group">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand/10 text-brand rounded-2xl">
                    <ArrowRightLeft size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{getLabel(commission.transferType)}</h3>
                    <p className="text-slate-500 text-xs">Dernière modif : {commission.updatedAt.toDate().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="text-right">
                  {editingId === commission.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="0.1"
                        value={editValue}
                        onChange={(e) => setEditValue(parseFloat(e.target.value))}
                        className="w-20 bg-slate-800 border border-brand/50 rounded-lg px-2 py-1.5 text-white text-right focus:outline-none"
                      />
                      <button 
                        onClick={() => handleUpdate(commission.id, editValue)}
                        disabled={isSaving}
                        className="p-2 bg-brand text-white rounded-lg hover:bg-brand-dark transition-all"
                      >
                        <Save size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white"
                      >
                        <AlertCircle size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-black text-brand">{commission.percentage}%</div>
                      <button 
                        onClick={() => { setEditingId(commission.id); setEditValue(commission.percentage); }}
                        className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 p-3 rounded-2xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Minimum</span>
                  <p className="text-white font-mono">{commission.minAmount} {commission.currency}</p>
                </div>
                <div className="bg-slate-800/30 p-3 rounded-2xl border border-slate-700/50">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Maximum</span>
                  <p className="text-white font-mono">{commission.maxAmount} {commission.currency}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Global Settings / Summary */}
        <div className="space-y-6">
          <div className="bg-card-dark border border-border-dark p-8 rounded-3xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <History className="text-brand" size={20} />
              Historique des Changements
            </h3>
            <div className="space-y-6">
               {logs.length === 0 ? (
                 <p className="text-slate-500 text-xs italic">Aucun changement récent enregistré.</p>
               ) : (
                 logs.map(log => (
                   <div key={log.id} className="border-l-2 border-slate-800 pl-6 relative">
                     <div className="absolute -left-[9px] top-0 w-4 h-4 bg-brand rounded-full border-4 border-card-dark"></div>
                     <p className="text-white text-sm font-bold">{log.action.replace(/_/g, ' ')}</p>
                     <p className="text-slate-500 text-[10px]">{log.timestamp?.toDate().toLocaleString()} par {log.adminId || 'Système'}</p>
                   </div>
                 ))
               )}
            </div>
          </div>

          <div className="bg-brand/10 border border-brand/20 p-6 rounded-3xl">
             <div className="flex gap-4">
               <AlertCircle className="text-brand shrink-0" size={24} />
               <div>
                 <h4 className="text-brand font-bold text-sm">Note Stratégique</h4>
                 <p className="text-brand/80 text-xs mt-1 leading-relaxed">
                   Les commissions sont appliquées sur le montant brut avant conversion. 
                   Toute modification impacte immédiatement les nouveaux transferts.
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionsPage;
