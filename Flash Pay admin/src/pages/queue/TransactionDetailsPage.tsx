import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Transaction, StatusHistoryItem } from '../../types';
import { adminService } from '../../services/adminService';
import jsPDF from 'jspdf';
import { 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  User,
  CreditCard,
  ShieldCheck
} from 'lucide-react';

const TransactionDetailsPage: React.FC = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (!transactionId) return;

    const unsubscribe = onSnapshot(doc(db, 'transactions', transactionId), (doc) => {
      if (doc.exists()) {
        setTransaction({ id: doc.id, ...(doc.data() as any) } as Transaction);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [transactionId]);

  const handleStatusUpdate = async (status: any) => {
    if (!transaction) return;
    setIsActionLoading(true);
    try {
      await adminService.updateTransactionStatus(transaction.id, status, adminNote);
      setAdminNote('');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGeneratePDF = () => {
    if (!transaction) return;
    const t = toast.loading('Génération du reçu...');
    
    try {
      const pdf = new jsPDF();
      pdf.setFontSize(22);
      pdf.setTextColor(0, 178, 200);
      pdf.text('Flash Pay - Recu Officiel', 20, 20);
      
      pdf.setFontSize(12);
      pdf.setTextColor(50, 50, 50);
      pdf.text(`Transaction ID: #${transaction.id}`, 20, 40);
      pdf.text(`Date: ${transaction.createdAt.toDate().toLocaleString()}`, 20, 50);
      pdf.text(`Client ID: ${transaction.userId}`, 20, 60);
      
      pdf.setFontSize(16);
      pdf.text('Details du Transfert', 20, 80);
      
      pdf.setFontSize(12);
      pdf.text(`Type: ${transaction.type.toUpperCase()}`, 20, 95);
      pdf.text(`Montant: ${transaction.amount.toLocaleString()} ${transaction.currency}`, 20, 105);
      if (transaction.operator) pdf.text(`Operateur: ${transaction.operator}`, 20, 115);
      if (transaction.recipientPhone) pdf.text(`Telephone: ${transaction.recipientPhone}`, 20, 125);
      if (transaction.recipientName) pdf.text(`Nom: ${transaction.recipientName}`, 20, 135);
      
      pdf.setFontSize(14);
      pdf.setTextColor(0, 150, 0);
      pdf.text(`Statut: ${transaction.status.toUpperCase()}`, 20, 160);
      
      pdf.save(`FlashPay_Recu_${transaction.id}.pdf`);
      toast.success('Reçu généré avec succès !', { id: t });
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la génération', { id: t });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="bg-card-dark border border-border-dark p-12 rounded-3xl text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Transaction introuvable</h2>
        <button 
          onClick={() => navigate('/admin/queue')}
          className="text-brand hover:underline flex items-center justify-center gap-2 mx-auto"
        >
          <ArrowLeft size={16} /> Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate('/admin/queue')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={20} /> Retour à la queue
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card-dark border border-border-dark p-8 rounded-3xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest bg-brand/10 px-2 py-0.5 rounded">Transaction ID</span>
                <h2 className="text-2xl font-mono font-bold text-white mt-1">#{transaction.id}</h2>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-xs">Effectuée le</span>
                <p className="text-white font-medium">{transaction.createdAt.toDate().toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <User size={16} /> Information Client
                </h3>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-white font-bold text-lg">ID: {transaction.userId}</p>
                  <p className="text-slate-400 text-sm mt-1">Status KYC: <span className="text-emerald-500 font-medium">Approuvé</span></p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <CreditCard size={16} /> Flux Financier
                </h3>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">{transaction.type}</p>
                  <p className="text-white font-bold text-2xl mt-1">{transaction.amount.toLocaleString()} {transaction.currency}</p>
                  <p className="text-brand text-xs mt-1">Opérateur: {transaction.operator}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Proof of Transfer */}
          <div className="bg-card-dark border border-border-dark p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Preuve de Transfert
              </h3>
              {transaction.proofUrl && (
                 <a 
                  href={transaction.proofUrl} 
                  download={`proof-${transaction.id}.jpg`}
                  className="text-xs font-bold text-brand hover:text-brand-dark flex items-center gap-1.5 bg-brand/5 px-3 py-1.5 rounded-lg border border-brand/10 transition-all"
                >
                  <ArrowLeft size={14} className="-rotate-90" /> Télécharger
                </a>
              )}
            </div>
            {transaction.proofUrl ? (
              <div className="relative group">
                <img 
                  src={transaction.proofUrl} 
                  alt="Preuve" 
                  className="w-full rounded-2xl border border-slate-700 shadow-xl"
                />
                <a 
                  href={transaction.proofUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="absolute top-4 right-4 p-3 bg-black/60 backdrop-blur-md text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink size={20} />
                </a>
              </div>
            ) : (
              <div className="bg-slate-800/50 border-2 border-dashed border-slate-700 p-12 rounded-2xl text-center">
                <p className="text-slate-500">Aucune preuve n'a été soumise pour le moment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Actions & History */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-gradient-to-br from-brand/20 to-transparent border border-brand/20 p-6 rounded-3xl shadow-xl">
             <h3 className="text-sm font-bold text-brand uppercase tracking-widest mb-4">Utilitaires</h3>
             <button 
              onClick={handleGeneratePDF}
              className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20 mb-3"
             >
               <ExternalLink size={18} /> Générer le Reçu (PDF)
             </button>
             <button 
              onClick={() => navigate('/admin/kyc')}
              className="w-full py-3 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-700"
             >
               <ShieldCheck size={18} /> Vérifier le dossier KYC
             </button>
          </div>
          <div className="bg-card-dark border border-border-dark p-6 rounded-3xl">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">Actions Administrateur</h3>
            
            <div className="space-y-4">
              <textarea 
                placeholder="Ajouter une note interne..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand h-24"
              />

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleStatusUpdate('proof_received')}
                  disabled={isActionLoading || transaction.status === 'proof_received'}
                  className="px-4 py-3 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl text-xs font-bold hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50"
                >
                  <CheckCircle2 size={16} className="mx-auto mb-1" />
                  CONFIRMER REÇU
                </button>
                <button 
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={isActionLoading || transaction.status === 'completed'}
                  className="px-4 py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                >
                  <CheckCircle2 size={16} className="mx-auto mb-1" />
                  VALIDER FINAL
                </button>
                <button 
                  onClick={() => handleStatusUpdate('flagged_problem')}
                  disabled={isActionLoading || transaction.status === 'flagged_problem'}
                  className="px-4 py-3 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-xs font-bold hover:bg-amber-500 hover:text-white transition-all disabled:opacity-50"
                >
                  <AlertTriangle size={16} className="mx-auto mb-1" />
                  SIGNALER PROBLÈME
                </button>
                <button 
                  onClick={() => handleStatusUpdate('failed')}
                  disabled={isActionLoading || transaction.status === 'failed'}
                  className="px-4 py-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                >
                  <XCircle size={16} className="mx-auto mb-1" />
                  REJETER / ÉCHEC
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="bg-card-dark border border-border-dark p-6 rounded-3xl">
            <h3 className="text-sm font-semibold text-slate-400 mb-6 flex items-center gap-2">
              <Clock size={16} /> Historique du Statut
            </h3>
            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-700">
              {transaction.statusHistory.map((history: StatusHistoryItem, idx: number) => (
                <div key={idx} className="relative pl-8">
                  <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-card-dark bg-slate-600 ${idx === 0 ? 'bg-brand' : ''}`}></div>
                  <p className="text-white text-sm font-bold uppercase tracking-tight">{history.status.replace('_', ' ')}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">{history.timestamp.toDate().toLocaleString()}</p>
                  {history.notes && (
                    <div className="mt-2 p-2 bg-slate-800/50 rounded-lg text-[11px] text-slate-400 border border-slate-700/50 italic">
                      "{history.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsPage;
