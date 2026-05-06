import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Transaction, TransactionStatus } from '../../types';
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';

const StatusBadge = ({ status }: { status: TransactionStatus }) => {
  const styles: Record<string, string> = {
    pending: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    proof_received: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    confirmed: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    flagged_problem: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
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
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${styles[status] || styles.pending}`}>
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

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    
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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Queue de Transactions</h2>
          <p className="text-slate-400 text-sm">Gestion et validation des flux financiers</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Rechercher ID, Utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'pending', 'proof_received', 'flagged_problem', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as any)}
            className={`
              px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
              ${statusFilter === status 
                ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
            `}
          >
            {status === 'all' ? 'Toutes' : status.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card-dark border border-border-dark rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Transaction</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Montant</th>
                <th className="px-6 py-4 font-semibold">Commission</th>
                <th className="px-6 py-4 font-semibold">À Recevoir</th>
                <th className="px-6 py-4 font-semibold">Statut</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-500 text-sm">Chargement des transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <Search size={48} strokeWidth={1} />
                      <span>Aucune transaction trouvée</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-mono text-sm font-semibold">#{tx.id.substring(0, 8)}</span>
                        <span className="text-slate-500 text-[10px]">{tx.operator}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-200 text-sm font-semibold">{tx.clientName || 'Client inconnu'}</span>
                        <span className="text-slate-500 text-[10px]">{tx.clientPhone || tx.clientEmail || `${tx.userId.substring(0, 12)}...`}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <ArrowRightLeft size={14} className="text-brand" />
                        <span className="text-xs">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-bold">{tx.amount.toLocaleString()} {tx.currency}</span>
                    </td>
                    <td className="px-6 py-4">
                      {tx.fee !== undefined && tx.commissionPercentage !== undefined ? (
                        <span className="text-amber-400 text-sm font-semibold">{tx.fee.toLocaleString()} {tx.currency} ({tx.commissionPercentage}%)</span>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {tx.receivedAmount !== undefined && tx.destinationCurrency ? (
                        <span className="text-emerald-400 font-bold">{tx.receivedAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} {tx.destinationCurrency}</span>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-300 text-xs">{tx.createdAt.toDate().toLocaleDateString()}</span>
                        <span className="text-slate-500 text-[10px]">{tx.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/admin/queue/${tx.id}`)}
                          className="p-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all" 
                          title="Voir détails"
                        >
                          <Eye size={16} />
                        </button>
                        {tx.status === 'proof_received' && (
                          <button className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all" title="Valider">
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all" title="Signaler problème">
                          <AlertTriangle size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="px-6 py-4 bg-slate-800/30 border-t border-border-dark flex justify-between items-center">
          <span className="text-slate-500 text-xs">Affichage de {filteredTransactions.length} transactions</span>
          <div className="flex gap-2">
             <button className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-500 text-xs disabled:opacity-50" disabled>Précédent</button>
             <button className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-slate-500 text-xs disabled:opacity-50" disabled>Suivant</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionQueuePage;
