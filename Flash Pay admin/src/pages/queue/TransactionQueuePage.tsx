import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  where
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Transaction, TransactionStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  Filter, 
  Eye, 
  Clock,
  ArrowUpRight,
  MoreVertical,
  Globe,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }: { status: TransactionStatus }) => {
  const styles: Record<string, string> = {
    pending: 'bg-[#ECE6F0] text-[#49454F]',
    proof_received: 'bg-[#EADDFF] text-[#21005D]',
    confirmed: 'bg-[#E8DEF8] text-[#1D192B]',
    completed: 'bg-[#E8DEF8] text-[#1D192B] border border-[#661489]/10',
    failed: 'bg-[#F9DEDC] text-[#B3261E]',
    flagged_problem: 'bg-[#FFFBFE] text-[#B3261E] border border-[#B3261E]',
  };

  const labels: Record<string, string> = {
    pending: 'En attente',
    proof_received: 'Preuve reçue',
    confirmed: 'Confirmé',
    completed: 'Terminé',
    failed: 'Échoué',
    flagged_problem: 'Problème',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
};

const TransactionQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const { profile } = useAuth();

  const isAgent = (profile?.adminRole as any) === 'agent';
  const assignedCountry = profile?.assignedCountry;

  useEffect(() => {
    let q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    
    if (isAgent && assignedCountry) {
      q = query(
        collection(db, 'transactions'), 
        where('destinationCountry', '==', assignedCountry),
        orderBy('createdAt', 'desc')
      );
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Transaction[];
      setTransactions(txs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tx.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.clientPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tx.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Stats Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight">Queue de Transactions</h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Suivi en temps réel des flux financiers</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="m3-search flex-1 lg:w-80">
            <Search className="text-[#49454F]" size={18} />
            <input 
              type="text"
              placeholder="ID, Client, Téléphone..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full"
            />
          </div>
          <button className="p-3.5 bg-white border border-[#E7E0EB] rounded-full text-[#49454F] hover:bg-[#F3EDF7] transition-all shadow-sm">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'pending', 'proof_received', 'flagged_problem', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as any)}
            className={`
              px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm
              ${statusFilter === status 
                ? 'bg-[#661489] text-white shadow-lg shadow-[#661489]/20' 
                : 'bg-white text-[#49454F] border border-[#E7E0EB] hover:bg-[#F3EDF7]'}
            `}
          >
            {status === 'all' ? 'Toutes les transactions' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Transactions Container */}
      <div className="m3-card-elevated !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F3EDF7]/50 text-[#49454F] text-[10px] uppercase font-black tracking-[0.2em] border-b border-[#E7E0EB]">
                <th className="px-8 py-5">Identifiant</th>
                <th className="px-8 py-5">Expéditeur</th>
                <th className="px-8 py-5">Flux & Montant</th>
                <th className="px-8 py-5">Destination</th>
                <th className="px-8 py-5">Statut</th>
                <th className="px-8 py-5">Horodatage</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0EB]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-[#661489] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[#49454F] text-[10px] font-black uppercase tracking-widest">Analyse de la file d'attente...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-[#49454F]/30">
                      <Search size={64} strokeWidth={1} />
                      <span className="text-sm font-black uppercase tracking-widest">Aucune transaction correspondante</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx: Transaction) => (
                  <tr key={tx.id} className="hover:bg-[#F3EDF7]/30 transition-all group cursor-pointer" onClick={() => navigate(`/queue/${tx.id}`)}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-[#EADDFF] text-[#21005D] rounded-xl flex items-center justify-center font-mono font-black text-xs">
                           #{tx.id.substring(0, 2)}
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[#1D1B20] font-mono text-sm font-black tracking-tight">#{tx.id.substring(0, 10).toUpperCase()}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[#661489] text-[9px] font-black uppercase tracking-widest">{tx.isBulk ? 'Multi-Envoi' : 'Unique'}</span>
                              {tx.paymentMethod === 'bonus' && (
                                <span className="text-emerald-600 text-[8px] font-black uppercase tracking-widest bg-emerald-100 px-1.5 py-0.5 rounded-sm">
                                  {tx.isHybrid ? 'Hybride' : 'Bonus'}
                                </span>
                              )}
                            </div>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-[#1D1B20] text-sm font-black tracking-tight">{tx.clientName || 'Anonyme'}</span>
                        <div className="flex flex-col mt-0.5">
                          {tx.clientPhone && (
                            <a href={`tel:${tx.clientPhone}`} className="text-[#661489] text-[10px] font-bold hover:underline">{tx.clientPhone}</a>
                          )}
                          {tx.clientEmail && (
                            <div className="flex items-center gap-1">
                              <a href={`mailto:${tx.clientEmail}`} className="text-[#49454F] text-[10px] font-bold opacity-60 hover:underline">{tx.clientEmail}</a>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(tx.clientEmail!);
                                  toast.success('Email copié !');
                                }}
                                className="p-1 hover:bg-[#EADDFF] rounded text-[#661489] transition-colors"
                                title="Copier l'email"
                              >
                                <Copy size={10} />
                              </button>
                            </div>
                          )}
                          {!tx.clientPhone && !tx.clientEmail && <span className="text-[#49454F] text-[10px] font-bold opacity-60">Pas de contact</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-sm font-black text-[#1D1B20]">{tx.amount.toLocaleString()}</span>
                           <span className="text-[10px] font-black text-[#661489] uppercase">{tx.currency}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-[#49454F] uppercase tracking-widest opacity-40">
                           <ArrowUpRight size={10} /> {tx.operator || 'Système'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-[#F3EDF7] rounded-full flex items-center justify-center text-[#661489] border border-[#E7E0EB]">
                            <Globe size={14} />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-sm font-black text-[#1D1B20]">{(tx.receivedAmount || 0).toLocaleString()} {tx.destinationCurrency}</span>
                            <span className="text-[9px] font-bold text-[#49454F] opacity-50 uppercase">{tx.toCountry || 'Afrique'}</span>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-[#49454F]">
                         <Clock size={14} className="opacity-40" />
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black text-[#1D1B20] uppercase">{tx.createdAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                           <span className="text-[9px] font-bold opacity-40">{tx.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/queue/${tx.id}`)}
                          className="p-2.5 bg-white border border-[#E7E0EB] text-[#49454F] hover:bg-[#661489] hover:text-white rounded-xl transition-all shadow-sm" 
                        >
                          <Eye size={18} />
                        </button>
                        <button className="p-2.5 bg-white border border-[#E7E0EB] text-[#49454F] hover:bg-[#B3261E] hover:text-white rounded-xl transition-all shadow-sm">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer Info */}
        <div className="px-8 py-6 bg-[#F3EDF7]/30 border-t border-[#E7E0EB] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#49454F] text-[10px] font-black uppercase tracking-[0.2em]">Affichage de {filteredTransactions.length} flux monétaires actifs</p>
          <div className="flex gap-3">
             <button className="m3-btn-tonal !py-2 !px-5 !text-[9px] opacity-50 cursor-not-allowed">Précédent</button>
             <button className="m3-btn-tonal !py-2 !px-5 !text-[9px] opacity-50 cursor-not-allowed">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionQueuePage;

