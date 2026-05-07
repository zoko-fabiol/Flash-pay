import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection } from 'firebase/firestore';
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
  ShieldCheck,
  Copy
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
  const [countries, setCountries] = useState<any[]>([]);
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

    const unsubCountries = onSnapshot(collection(db, 'countries'), (snapshot) => {
      setCountries(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });

    return () => {
      unsubscribe();
      unsubCountries();
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

  const getCountryName = (code: string) => {
    if (!code) return 'N/A';
    if (code === 'RU') return 'Russie';
    const country = countries.find(c => c.code === code);
    return country ? country.name : code;
  };

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
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a6'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let y = 15;

      const mainColor = [115, 78, 212]; // #734ED4

      // Header background
      pdf.setFillColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.rect(0, 0, pageWidth, 25, 'F');

      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FLASH PAY', pageWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('RECU OFFICIEL', pageWidth / 2, 18, { align: 'center' });

      y = 35;
      pdf.setTextColor(60, 60, 60);
      
      // Transaction Header
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REFERENCE TRANSACTION', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`#${transaction.id}`, margin, y + 5);
      
      const formatDate = (date: Date) => {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const ye = date.getFullYear();
        const h = date.getHours().toString().padStart(2, '0');
        const mi = date.getMinutes().toString().padStart(2, '0');
        return `${d}/${m}/${ye} ${h}:${mi}`;
      };

      pdf.setFont('helvetica', 'bold');
      pdf.text('DATE ET HEURE', pageWidth - margin, y, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(transaction.createdAt.toDate()), pageWidth - margin, y + 5, { align: 'right' });

      y += 18;

      // Client Section
      pdf.setDrawColor(230, 230, 230);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CLIENT', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(transaction.clientName || clientProfile?.nom || 'Client inconnu', margin, y + 5);
      pdf.setFontSize(7);
      pdf.text(`ID: ${transaction.userId}`, margin, y + 9);

      y += 18;

      // Transfer Details Section
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DETAILS DU TRANSFERT', margin, y);
      
      pdf.setFontSize(8);
      y += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Type:', margin, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.type.toUpperCase(), margin + 25, y);
      
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Destination:', margin, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${transaction.destinationCountry || 'N/A'} (${transaction.operator || 'N/A'})`, margin + 25, y);
      
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Beneficiaire:', margin, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.recipientName || 'N/A', margin + 25, y);
      
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Telephone:', margin, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.recipientPhone || 'N/A', margin + 25, y);

      y += 12;

      const formatNum = (num: number) => {
        if (num === undefined || num === null) return '0';
        return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      };

      // Calculation Section
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, y, pageWidth - (margin * 2), 35, 'F');
      y += 6;
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Montant envoye:', margin + 4, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatNum(transaction.amount)} ${transaction.currency}`, pageWidth - margin - 4, y, { align: 'right' });
      
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Frais de transfert:', margin + 4, y);
      pdf.text(`${formatNum(transaction.fee || 0)} ${transaction.currency}`, pageWidth - margin - 4, y, { align: 'right' });
      
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Taux de change:', margin + 4, y);
      pdf.text(`1 ${transaction.currency} = ${transaction.exchangeRate?.toFixed(2) || '1.00'} ${transaction.destinationCurrency || transaction.currency}`, pageWidth - margin - 4, y, { align: 'right' });
      
      y += 8;
      pdf.setFontSize(10);
      pdf.setTextColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.text('NET A RECEVOIR:', margin + 4, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatNum(transaction.receivedAmount || transaction.amount)} ${transaction.destinationCurrency || transaction.currency}`, pageWidth - margin - 4, y, { align: 'right' });

      // Status
      y += 12;
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('STATUT DE LA TRANSACTION', pageWidth / 2, y, { align: 'center' });
      
      y += 5;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      const statusColor = transaction.status === 'completed' ? [0, 150, 0] : transaction.status === 'failed' ? [200, 0, 0] : [255, 150, 0];
      pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.text(transaction.status.toUpperCase(), pageWidth / 2, y, { align: 'center' });

      // Footer
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Merci d\'avoir utilise Flash Pay.', pageWidth / 2, pageHeight - 8, { align: 'center' });
      
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
                  <p className="text-white font-bold text-lg">{transaction.clientName || clientProfile?.nom || 'Client inconnu'}</p>
                  <p className="text-slate-400 text-sm mt-1">ID: {transaction.userId}</p>
                  {(transaction.clientPhone || clientProfile?.tel) && (
                    <div className="flex items-center justify-between group/field">
                      <a 
                        href={`tel:${transaction.clientPhone || clientProfile?.tel}`}
                        className="text-slate-400 hover:text-brand text-sm mt-1 transition-colors flex items-center gap-2"
                      >
                        Téléphone: {transaction.clientPhone || clientProfile?.tel}
                      </a>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(transaction.clientPhone || clientProfile?.tel || ''); toast.success('Téléphone copié'); }}
                        className="p-1.5 text-slate-600 hover:text-white opacity-0 group-hover/field:opacity-100 transition-all"
                        title="Copier le numéro"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  )}
                  {(transaction.clientEmail || clientProfile?.email) && (
                    <div className="flex items-center justify-between group/field">
                      <a 
                        href={`mailto:${transaction.clientEmail || clientProfile?.email}`}
                        className="text-slate-400 hover:text-brand text-sm mt-1 transition-colors flex items-center gap-2"
                      >
                        Email: {transaction.clientEmail || clientProfile?.email}
                      </a>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(transaction.clientEmail || clientProfile?.email || ''); toast.success('Email copié'); }}
                        className="p-1.5 text-slate-600 hover:text-white opacity-0 group-hover/field:opacity-100 transition-all"
                        title="Copier l'email"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  )}
                  <p className="text-slate-400 text-sm mt-1">
                    Status KYC: <span className={`${
                      (clientProfile?.kyc?.status === 'approved' || clientProfile?.statut_kyc === 'Approved') ? 'text-emerald-500' : 
                      (clientProfile?.kyc?.status === 'pending' || clientProfile?.statut_kyc === 'Pending') ? 'text-amber-500' : 
                      'text-rose-500'
                    } font-medium`}>
                      {clientProfile?.kyc?.status === 'approved' ? 'Approuvé' : 
                       clientProfile?.statut_kyc === 'Approved' ? 'Approuvé' :
                       clientProfile?.kyc?.status === 'pending' ? 'En attente' :
                       clientProfile?.statut_kyc === 'Pending' ? 'En attente' :
                       clientProfile?.kyc?.status === 'rejected' ? 'Rejeté' :
                       'Non soumis'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <CreditCard size={16} /> Détails du Transfert
                </h3>
                <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Type</p>
                      <p className="text-white font-bold text-sm">{transaction.type}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Route</p>
                      <p className="text-white font-bold text-sm">
                        {transaction.fromCountry || 'N/A'} → {transaction.toCountry || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-700/30 pt-2.5">
                    <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-1">Montant Envoyé</p>
                    <p className="text-white font-bold text-lg">{transaction.amount.toLocaleString()} {transaction.currency}</p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Pays du Bénéficiaire</p>
                    <p className="text-white font-bold text-sm">{getCountryName(transaction.toCountry || transaction.destinationCountry || '')}</p>
                  </div>

                  {transaction.recipientName && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Bénéficiaire</p>
                      <p className="text-slate-300 text-sm font-medium">{transaction.recipientName}</p>
                    </div>
                  )}

                  {transaction.recipientPhone && (
                    <div className="space-y-1.5 pt-1 group/field">
                      <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Tél. Bénéficiaire</p>
                      <div className="flex items-center justify-between">
                        <a 
                          href={`tel:${transaction.recipientPhone}`}
                          className="text-slate-300 hover:text-brand text-sm font-mono transition-colors"
                        >
                          {transaction.recipientPhone}
                        </a>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(transaction.recipientPhone || ''); toast.success('Numéro copié'); }}
                          className="p-1.5 text-slate-600 hover:text-white opacity-0 group-hover/field:opacity-100 transition-all"
                          title="Copier le numéro"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {transaction.narration && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-700/30">
                      <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Note/Narration</p>
                      <p className="text-slate-300 text-sm italic">{transaction.narration}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Calculation Recap */}
          <div className="bg-card-dark border border-border-dark p-8 rounded-3xl">
            <div className="flex justify-between items-start mb-8">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck size={20} /> Résumé Complet de la Commande
              </h3>
              <span className="text-xs text-slate-400 px-2 py-1 bg-slate-800 rounded-full">
                {transaction.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              {/* Transaction Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">Transaction ID</p>
                  <p className="text-slate-300 font-mono text-sm">{transaction.id.substring(0, 16)}...</p>
                </div>
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">Date & Heure</p>
                  <p className="text-slate-300 text-sm">{transaction.createdAt.toDate().toLocaleString()}</p>
                </div>
              </div>

              {/* Client & Destinataire */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30 group/field">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-400 text-xs uppercase font-bold mb-1">Expéditeur</p>
                      <p className="text-slate-300 font-medium text-sm">{transaction.clientName || clientProfile?.nom || 'N/A'}</p>
                      <a href={`tel:${transaction.clientPhone || clientProfile?.tel || ''}`} className="text-slate-500 hover:text-brand text-xs mt-1 block">
                        {transaction.clientPhone || clientProfile?.tel || 'N/A'}
                      </a>
                    </div>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(transaction.clientPhone || clientProfile?.tel || ''); toast.success('Copié'); }}
                      className="text-slate-600 hover:text-white opacity-0 group-hover/field:opacity-100 transition-all"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30 group/field">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-slate-400 text-xs uppercase font-bold mb-1">Bénéficiaire</p>
                      <p className="text-slate-300 font-medium text-sm">{transaction.recipientName || 'N/A'}</p>
                      <a href={`tel:${transaction.recipientPhone || ''}`} className="text-slate-500 hover:text-brand text-xs mt-1 block">
                        {transaction.recipientPhone || 'N/A'}
                      </a>
                    </div>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(transaction.recipientPhone || ''); toast.success('Copié'); }}
                      className="text-slate-600 hover:text-white opacity-0 group-hover/field:opacity-100 transition-all"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Route & Montants */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">De</p>
                  <p className="text-slate-300 text-sm font-medium">{transaction.fromCountry || 'N/A'}</p>
                </div>
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30 flex items-center justify-center">
                  <p className="text-brand font-bold">→</p>
                </div>
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">Vers</p>
                  <p className="text-slate-300 text-sm font-medium">{transaction.toCountry || transaction.destinationCountry || 'N/A'}</p>
                </div>
              </div>

              {/* Financial Details */}
              <div className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Montant Envoyé:</span>
                  <span className="text-white font-bold">{transaction.amount.toLocaleString()} {transaction.currency}</span>
                </div>
                {transaction.fee !== undefined && (
                  <div className="flex justify-between items-center text-amber-400/80">
                    <span className="text-sm">Commission ({transaction.commissionPercentage || 0}%):</span>
                    <span className="font-bold">- {transaction.fee.toLocaleString()} {transaction.currency}</span>
                  </div>
                )}
                {transaction.exchangeRate !== undefined && (
                  <div className="flex justify-between items-center text-slate-300 text-sm">
                    <span>Taux:</span>
                    <span className="font-mono">1 {transaction.currency} = {transaction.exchangeRate.toFixed(2)} {transaction.destinationCurrency}</span>
                  </div>
                )}
                {transaction.receivedAmount !== undefined && (
                  <div className="flex justify-between items-center pt-2 border-t border-blue-500/20">
                    <span className="text-emerald-400 font-bold">À Recevoir:</span>
                    <span className="text-emerald-400 font-bold text-lg">{transaction.receivedAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} {transaction.destinationCurrency}</span>
                  </div>
                )}
              </div>

              {/* Operateurs & Infos Supplémentaires */}
              {(transaction.operator || transaction.recipientOperator) && (
                <div className="grid grid-cols-2 gap-4">
                  {transaction.operator && (
                    <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
                      <p className="text-slate-400 text-xs uppercase font-bold mb-1">Opérateur Expéditeur</p>
                      <p className="text-slate-300 text-sm">{transaction.operator}</p>
                    </div>
                  )}
                  {transaction.recipientOperator && (
                    <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
                      <p className="text-slate-400 text-xs uppercase font-bold mb-1">Opérateur Destinataire</p>
                      <p className="text-slate-300 text-sm">{transaction.recipientOperator}</p>
                    </div>
                  )}
                </div>
              )}

              {transaction.narration && (
                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
                  <p className="text-slate-400 text-xs uppercase font-bold mb-1">Note/Référence</p>
                  <p className="text-slate-300 text-sm italic">{transaction.narration}</p>
                </div>
              )}
            </div>
          </div>
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
