import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Transaction, BulkRecipient } from '../../types';
import { adminService } from '../../services/adminService';
import jsPDF from 'jspdf';
import { 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  User,
  CreditCard,
  ShieldCheck,
  Copy,
  Printer
} from 'lucide-react';

type ClientProfile = {
  nom?: string;
  tel?: string;
  email?: string;
  kyc?: {
    status: string;
  };
  statut_kyc?: string;
};

const TransactionDetailsPage: React.FC = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
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

    return () => {
      unsubscribe();
    };
  }, [transactionId]);

  useEffect(() => {
    if (!transaction?.userId) {
      setClientProfile(null);
      return;
    }

    const unsubscribeUser = onSnapshot(doc(db, 'users', transaction.userId), (userDoc) => {
      if (userDoc.exists()) {
        setClientProfile(userDoc.data() as ClientProfile);
      } else {
        setClientProfile(null);
      }
    });

    return () => unsubscribeUser();
  }, [transaction?.userId]);

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

  const handleUpdateBulkRecipientStatus = async (recipientId: string, status: 'completed' | 'failed' | 'pending') => {
    if (!transaction || !transaction.bulkRecipients) return;
    
    setIsActionLoading(true);
    try {
      const updatedRecipients = transaction.bulkRecipients.map(r => {
        if (r.id === recipientId) {
          return { ...r, status, validatedAt: status === 'completed' ? Timestamp.now() : r.validatedAt };
        }
        return r;
      });

      await updateDoc(doc(db, 'transactions', transaction.id), {
        bulkRecipients: updatedRecipients,
        // Optional: auto-complete global status if all are done
        status: updatedRecipients.every(r => r.status === 'completed' || r.status === 'failed') 
          ? 'completed' 
          : 'proof_received'
      });
      
      toast.success('Statut du destinataire mis à jour');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGeneratePDF = (recipient?: BulkRecipient) => {
    if (!transaction) return;
    const t_toast = toast.loading('Génération du reçu...');
    
    try {
      // Use A5 for bulk, A6 for standard if preferred, but A5 is requested for bulk
      const isA5 = !!recipient || transaction.isBulk;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isA5 ? 'a5' : 'a6'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      let y = 15;

      const mainColor = [115, 78, 212]; // #734ED4

      // Header background
      pdf.setFillColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.rect(0, 0, pageWidth, 28, 'F');

      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FLASH PAY', pageWidth / 2, 14, { align: 'center' });
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('RECU DE TRANSFERT OFFICIEL', pageWidth / 2, 21, { align: 'center' });

      y = 42;
      pdf.setTextColor(60, 60, 60);
      
      // Transaction Info
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REFERENCE', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`#${transaction.id.substring(0, 10).toUpperCase()}${recipient ? '-' + recipient.id.substring(0, 4) : ''}`, margin, y + 7);
      
      const formatDate = (date: Date) => {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const ye = date.getFullYear();
        const h = date.getHours().toString().padStart(2, '0');
        const mi = date.getMinutes().toString().padStart(2, '0');
        return `${d}/${m}/${ye} ${h}:${mi}`;
      };

      pdf.setFont('helvetica', 'bold');
      pdf.text('DATE D\'EMISSION', pageWidth - margin, y, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(new Date()), pageWidth - margin, y + 7, { align: 'right' });

      y += 24;

      // Divider
      pdf.setDrawColor(240, 240, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;
      
      // Parties
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXPEDITEUR', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(transaction.clientName || 'Client Flash Pay', margin, y + 7);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('BENEFICIAIRE', pageWidth - margin, y, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(recipient ? recipient.name : (transaction.recipientName || 'N/A'), pageWidth - margin, y + 7, { align: 'right' });
      pdf.setFontSize(9);
      pdf.text(recipient ? (recipient.phone || '') : (transaction.recipientPhone || ''), pageWidth - margin, y + 12, { align: 'right' });

      y += 28;

      // Amount Box
      pdf.setFillColor(250, 250, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 48, 4, 4, 'F');
      
      y += 12;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Montant du transfert:', margin + 8, y);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 40, 40);
      
      const rate = transaction.exchangeRate || 1;
      const sendAmt = recipient ? recipient.amount : transaction.amount;
      const recvAmt = Math.floor(sendAmt * rate);
      
      // Helper to format number with space to avoid encoding issues
      const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

      pdf.text(`${formatNumber(sendAmt)} ${transaction.currency || 'RUB'}`, pageWidth - margin - 8, y, { align: 'right' });
      
      y += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Taux appliqué:', margin + 8, y);
      pdf.text(`1 RUB = ${rate.toFixed(2)} ${transaction.destinationCurrency || 'XAF'}`, pageWidth - margin - 8, y, { align: 'right' });
      
      y += 14;
      pdf.setFontSize(12);
      pdf.setTextColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.text('MONTANT PERÇU:', margin + 8, y);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatNumber(recvAmt)} ${transaction.destinationCurrency || 'XAF'}`, pageWidth - margin - 8, y, { align: 'right' });

      y += 28;

      // Status Badge
      const status = recipient ? (recipient.status || 'pending') : transaction.status;
      const isSuccess = status === 'completed';
      
      if (isSuccess) {
        pdf.setFillColor(232, 252, 241); // Light emerald
        pdf.roundedRect(pageWidth / 2 - 25, y, 50, 12, 6, 6, 'F');
        pdf.setTextColor(16, 124, 65); // Dark emerald
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TRANSFERE', pageWidth / 2, y + 7.5, { align: 'center' });
      } else {
        pdf.setFillColor(255, 241, 242); // Light rose
        pdf.roundedRect(pageWidth / 2 - 25, y, 50, 12, 6, 6, 'F');
        pdf.setTextColor(225, 29, 72); // Dark rose
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('EN ATTENTE', pageWidth / 2, y + 7.5, { align: 'center' });
      }

      // Footer
      pdf.setTextColor(180, 180, 180);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Ceci est un document genere electroniquement.', pageWidth / 2, pageHeight - 15, { align: 'center' });
      pdf.text('Flash Pay - La rapidite au service de vos transferts.', pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      pdf.save(`FlashPay_${recipient ? recipient.name.replace(/\s+/g, '_') : 'Recu'}_${transaction.id.substring(0, 5)}.pdf`);
      toast.success('Reçu généré !', { id: t_toast });
    } catch (error) {
      console.error(error);
      toast.error('Erreur de génération', { id: t_toast });
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
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/admin/queue')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} /> Retour à la queue
        </button>
        
        {transaction.isBulk && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-brand/10 border border-brand/20 rounded-full">
            <ShieldCheck size={16} className="text-brand" />
            <span className="text-[10px] font-black text-brand uppercase tracking-widest">Envoi Multiple</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Transaction Card */}
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

            <div className={`grid grid-cols-1 ${transaction.isBulk ? 'md:grid-cols-2' : 'lg:grid-cols-3 md:grid-cols-2'} gap-8`}>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <User size={16} /> Information Expéditeur
                </h3>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <p className="text-white font-bold text-lg">{transaction.clientName || clientProfile?.nom || 'Client inconnu'}</p>
                  <p className="text-slate-400 text-sm mt-1">ID: {transaction.userId}</p>
                  {(transaction.clientPhone || clientProfile?.tel) && (
                    <div className="flex items-center justify-between group/field mt-2">
                      <span className="text-slate-500 text-xs">Tél: {transaction.clientPhone || clientProfile?.tel}</span>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(transaction.clientPhone || clientProfile?.tel || ''); toast.success('Copié'); }}
                        className="p-1 text-slate-600 hover:text-white opacity-0 group-hover/field:opacity-100 transition-all"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  )}
                  <p className="text-slate-400 text-sm mt-1">
                    Status KYC: <span className={`${
                      (clientProfile?.kyc?.status === 'approved' || clientProfile?.statut_kyc === 'Expert' || clientProfile?.statut_kyc === 'Approved') ? 'text-emerald-500' : 'text-amber-500'
                    } font-bold text-xs uppercase`}>
                      {clientProfile?.statut_kyc || clientProfile?.kyc?.status || 'Inconnu'}
                    </span>
                  </p>
                </div>
              </div>

              {!transaction.isBulk && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                    <Smartphone size={16} /> Information Destinataire
                  </h3>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <p className="text-white font-bold text-lg">{transaction.recipientName || 'Destinataire inconnu'}</p>
                    <div className="flex items-center justify-between group/field mt-2">
                      <span className="text-slate-400 text-sm">Tél: {transaction.recipientPhone}</span>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(transaction.recipientPhone || ''); toast.success('Copié'); }}
                        className="p-1 text-slate-600 hover:text-white opacity-0 group-hover/field:opacity-100 transition-all"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <p className="text-brand text-xs font-black uppercase mt-1 tracking-widest">{transaction.recipientOperator}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <CreditCard size={16} /> Résumé du Transfert
                </h3>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-500 text-xs uppercase font-bold">Total Envoyé</span>
                    <span className="text-white font-black">{transaction.amount.toLocaleString()} {transaction.currency}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-500 text-xs uppercase font-bold">Frais</span>
                    <span className="text-slate-300 font-bold">{transaction.fee?.toLocaleString()} {transaction.currency}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700 flex justify-between">
                    <span className="text-brand text-xs uppercase font-black">Net à distribuer</span>
                    <span className="text-brand font-black">{(transaction.receivedAmount || transaction.amount).toLocaleString()} {transaction.destinationCurrency}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BULK RECIPIENTS SECTION */}
          {transaction.isBulk && transaction.bulkRecipients && (
            <div className="bg-card-dark border border-border-dark p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck size={24} className="text-brand" />
                  Liste des Bénéficiaires ({transaction.bulkRecipients.length})
                </h3>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <div className="flex items-center gap-1.5 text-emerald-500">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    {transaction.bulkRecipients.filter(r => r.status === 'completed').length} Validés
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    {transaction.bulkRecipients.filter(r => r.status === 'pending' || !r.status).length} En attente
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Bénéficiaire</th>
                      <th className="px-6 py-4">Détails</th>
                      <th className="px-6 py-4">Montant (Net)</th>
                      <th className="px-6 py-4">Statut</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transaction.bulkRecipients.map((recipient) => {
                      const netAmount = recipient.amount * (transaction.exchangeRate || 1);
                      const status = recipient.status || 'pending';
                      
                      return (
                        <tr key={recipient.id} className="hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-white">{recipient.name}</p>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {recipient.id.substring(0, 8)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-300 font-medium">{recipient.phone || recipient.account}</p>
                            <span className="text-[10px] text-brand font-black uppercase">{recipient.operator}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-white">{Math.floor(netAmount).toLocaleString()} {transaction.destinationCurrency}</p>
                            <span className="text-[10px] text-slate-500">Basé sur {recipient.amount} RUB</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 
                              status === 'failed' ? 'bg-rose-500/10 text-rose-500' : 
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                              {status === 'completed' ? 'Validé' : status === 'failed' ? 'Échec' : 'En attente'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => handleUpdateBulkRecipientStatus(recipient.id, 'completed')}
                                    className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                                    title="Valider ce destinataire"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateBulkRecipientStatus(recipient.id, 'failed')}
                                    className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                                    title="Marquer comme échec"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}
                              <button 
                                onClick={() => handleGeneratePDF(recipient)}
                                className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-brand hover:text-white transition-all"
                                title="Imprimer le reçu A5"
                              >
                                <Printer size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Proof of Payment */}
          <div className="bg-card-dark border border-border-dark p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Preuve de Transfert
              </h3>
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
                <p className="text-slate-500">Aucune preuve soumise.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Global Actions */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-brand/20 to-transparent border border-brand/20 p-6 rounded-3xl shadow-xl">
             <h3 className="text-sm font-bold text-brand uppercase tracking-widest mb-4">Actions Globales</h3>
             {!transaction.isBulk && (
               <button 
                onClick={() => handleGeneratePDF()}
                className="w-full py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20 mb-3"
               >
                 <Printer size={18} /> Générer le Reçu Standard
               </button>
             )}
             <div className="space-y-3">
               <textarea 
                placeholder="Note pour le client (optionnel)..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand h-20"
               />
               <button 
                onClick={() => handleStatusUpdate('completed')}
                disabled={isActionLoading || transaction.status === 'completed'}
                className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
               >
                 <CheckCircle2 size={18} /> Valider la Transaction
               </button>
               <button 
                onClick={() => handleStatusUpdate('failed')}
                disabled={isActionLoading || transaction.status === 'failed'}
                className="w-full py-3 bg-rose-600/20 text-rose-500 border border-rose-500/20 font-bold rounded-xl hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
               >
                 <XCircle size={18} /> Rejeter tout
               </button>
             </div>
          </div>

          {/* History */}
          <div className="bg-card-dark border border-border-dark p-6 rounded-3xl">
            <h3 className="text-sm font-semibold text-slate-400 mb-6 flex items-center gap-2">
              <Clock size={16} /> Historique
            </h3>
            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-slate-700">
              {transaction.statusHistory.map((history, idx) => (
                <div key={idx} className="relative pl-8">
                  <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-card-dark bg-slate-600 ${idx === 0 ? 'bg-brand' : ''}`}></div>
                  <p className="text-white text-xs font-bold uppercase">{history.status.replace('_', ' ')}</p>
                  <p className="text-slate-500 text-[10px]">{history.timestamp.toDate().toLocaleString()}</p>
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
