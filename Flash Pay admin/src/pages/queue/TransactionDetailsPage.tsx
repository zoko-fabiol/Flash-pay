import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, Timestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Transaction, BulkRecipient, TransactionStatus } from '../../types';
import { adminService } from '../../services/adminService';
import jsPDF from 'jspdf';
import { isNativeApp, downloadPdfNative } from '../../utils/capacitorUtils';
import { 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  User as UserIcon,
  CreditCard,
  Copy,
  Printer,
  Smartphone,
  Activity,
  AlertCircle,
  FileText,
  Check,
  Mail,
  X,
  ChevronDown,
  Award
} from 'lucide-react';
import ImageLightbox from '../../components/ui/ImageLightbox';
import ReactDOM from 'react-dom';
import { emailService } from '../../services/emailService';

const REJECTION_REASONS = [
  "Justificatif invalide ou illisible",
  "Le montant ne correspond pas",
  "Fonds non reçus sur notre compte",
  "Coordonnées du bénéficiaire incorrectes",
  "Transaction suspecte",
  "Autre (précisez ci-dessous)"
];


const TransactionDetailsPage: React.FC = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'update' | 'details'>('update');

  // Email Manual State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('À propos de votre transfert Flash Pay');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [destinationCountryName, setDestinationCountryName] = useState<string>('');

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

  useEffect(() => {
    const resolveCountryName = async () => {
      const code = transaction?.destinationCountry || transaction?.toCountry;
      if (!code) return;
      
      // If it looks like a name already (more than 3 chars), keep it
      if (code.length > 3) {
        setDestinationCountryName(code);
        return;
      }

      try {
        const q = query(collection(db, 'countries'), where('code', '==', code.toUpperCase()), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setDestinationCountryName(snap.docs[0].data().name);
        } else {
          setDestinationCountryName(code);
        }
      } catch (err) {
        console.error('Error resolving country name:', err);
        setDestinationCountryName(code);
      }
    };

    resolveCountryName();
  }, [transaction]);

  const handleSendManualEmail = async () => {
    if (!transaction?.clientEmail || !emailMessage) return;
    
    setIsSendingEmail(true);
    const t = toast.loading('Envoi de l\'email...');
    try {
      const htmlBody = emailService.getCustomMessageTemplate(emailMessage);
      await emailService.sendEmail(transaction.clientEmail, emailSubject, htmlBody);
      toast.success('Email envoyé avec succès !', { id: t });
      setIsEmailModalOpen(false);
      setEmailMessage('');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'envoi de l\'email', { id: t });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleStatusUpdate = async (status: TransactionStatus) => {
    if (!transaction) return;
    setIsActionLoading(true);
    const t = toast.loading('Mise à jour du statut...');
    try {
      await adminService.updateTransactionStatus(transaction.id, status, adminNote);
      setAdminNote('');
      toast.success(`Transaction marquée comme ${status}`, { id: t });
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour', { id: t });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateBulkRecipientStatus = async (recipientId: string, status: 'completed' | 'failed' | 'pending') => {
    if (!transaction || !transaction.bulkRecipients) return;
    
    setIsActionLoading(true);
    const t = toast.loading('Validation du destinataire...');
    try {
      const updatedRecipients = transaction.bulkRecipients.map(r => {
        if (r.id === recipientId) {
          return { ...r, status, validatedAt: status === 'completed' ? Timestamp.now() : r.validatedAt };
        }
        return r;
      });

      await updateDoc(doc(db, 'transactions', transaction.id), {
        bulkRecipients: updatedRecipients,
        status: updatedRecipients.every(r => r.status === 'completed' || r.status === 'failed') 
          ? 'completed' 
          : 'proof_received'
      });
      
      toast.success('Statut mis à jour', { id: t });
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la mise à jour', { id: t });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGeneratePDF = async (recipient?: BulkRecipient) => {
    if (!transaction) return;
    const t_toast = toast.loading('Génération du reçu...');
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      let y = 15;

      const mainColor = [102, 20, 137]; // M3 Primary #6344B6

      pdf.setFillColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.rect(0, 0, pageWidth, 28, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FLASH PAY', pageWidth / 2, 14, { align: 'center' });
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('RECU DE TRANSFERT OFFICIEL', pageWidth / 2, 21, { align: 'center' });

      y = 42;
      pdf.setTextColor(60, 60, 60);
      
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
      pdf.setDrawColor(240, 240, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;
      
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
      const recipientContactBase = recipient 
        ? (recipient.phone || recipient.account || '') 
        : (transaction.recipientPhone || transaction.recipientAccount || transaction.beneficiaryAccount || '');
      const recipientContact = recipientContactBase + (!recipient && transaction.beneficiaryBankAccount ? ` (Acc: ${transaction.beneficiaryBankAccount})` : '');
      pdf.text(recipientContact, pageWidth - margin, y + 12, { align: 'right' });

      y += 28;
      pdf.setFillColor(243, 237, 247); // M3 Surface Variant
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
      const formatNumber = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

      pdf.text(`${formatNumber(sendAmt)} ${transaction.currency || 'RUB'}`, pageWidth - margin - 8, y, { align: 'right' });
      
      y += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Taux appliqué:', margin + 8, y);
      pdf.text(`1 ${transaction.currency || 'RUB'} = ${rate.toFixed(2)} ${transaction.destinationCurrency || 'XAF'}`, pageWidth - margin - 8, y, { align: 'right' });
      
      y += 14;
      pdf.setFontSize(12);
      pdf.setTextColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.text('MONTANT PERÇU:', margin + 8, y);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatNumber(recvAmt)} ${transaction.destinationCurrency || 'XAF'}`, pageWidth - margin - 8, y, { align: 'right' });

      y += 28;
      const status = recipient ? (recipient.status || 'pending') : transaction.status;
      const isSuccess = status === 'completed';
      
      if (isSuccess) {
        pdf.setFillColor(232, 252, 241);
        pdf.roundedRect(pageWidth / 2 - 25, y, 50, 12, 6, 6, 'F');
        pdf.setTextColor(16, 124, 65);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('TRANSFERT EFFECTUE', pageWidth / 2, y + 7.5, { align: 'center' });
      } else {
        pdf.setFillColor(255, 241, 242);
        pdf.roundedRect(pageWidth / 2 - 25, y, 50, 12, 6, 6, 'F');
        pdf.setTextColor(225, 29, 72);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('EN ATTENTE', pageWidth / 2, y + 7.5, { align: 'center' });
      }

      pdf.setTextColor(180, 180, 180);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Document généré par Flash Pay Admin.', pageWidth / 2, pageHeight - 15, { align: 'center' });
      
      const fileName = `FlashPay_${recipient ? recipient.name.replace(/\s+/g, '_') : 'Recu'}_${transaction.id.substring(0, 8)}.pdf`;

      if (isNativeApp()) {
        const pdfBase64 = pdf.output('datauristring');
        await downloadPdfNative(pdfBase64, fileName);
        toast.success('Prêt à partager !', { id: t_toast });
      } else {
        pdf.save(fileName);
        toast.success('Reçu généré !', { id: t_toast });
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur de génération', { id: t_toast });
    }
  };

  const isPdfDocument = (url?: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.startsWith('data:application/pdf') || lowerUrl.includes('.pdf');
  };

  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxStartIndex, setLightboxStartIndex] = useState<number>(0);

  const openProof = (url?: string) => {
    if (!url) return;
    if (isPdfDocument(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setLightboxImages([url]);
    setLightboxStartIndex(0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-[#6344B6] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 text-[#49454F] font-black uppercase text-[10px] tracking-widest">Chargement des détails...</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="m3-card p-12 text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-black text-[#1D1B20] mb-4 tracking-tight">Transaction Introuvable</h2>
        <p className="text-[#49454F] mb-8 font-medium">Cette transaction n'existe pas ou a été supprimée.</p>
        <button onClick={() => navigate('/queue')} className="m3-btn-filled mx-auto">
          <ArrowLeft size={20} /> Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <button onClick={() => navigate('/queue')} className="flex items-center gap-2 text-[#6344B6] font-black uppercase text-[10px] tracking-widest mb-4 hover:translate-x-[-4px] transition-transform">
            <ArrowLeft size={16} /> Retour à la file d'attente
          </button>
          <div className="flex items-center gap-4">
             <h2 className="text-3xl font-black text-[#1D1B20] tracking-tighter">
               Transaction <span className="font-mono text-[#6344B6]">#{transaction.id.substring(0, 10)}</span>
               {(destinationCountryName) && (
                 <span className="ml-3 px-3 py-1 bg-[#6344B6]/10 text-[#6344B6] rounded-lg text-xs align-middle">
                   {destinationCountryName}
                 </span>
               )}
             </h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
           <div className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
             transaction.status === 'completed' ? 'bg-[#E8DEF8] text-[#1D192B]' : 
             transaction.status === 'failed' ? 'bg-[#F9DEDC] text-[#B3261E]' : 
             'bg-[#ECE6F0] text-[#49454F]'
           }`}>
             {transaction.status.replace('_', ' ')}
           </div>
        </div>
      </div>

      {/* Premium Status Header */}
      {transaction.status === 'completed' && (
        <div className="m3-card-elevated flex flex-col items-center justify-center py-16 text-center animate-in zoom-in duration-700 border-b-4 border-[#6344B6]">
          <div className="w-24 h-24 bg-[#6344B6] text-white rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-[#6344B6]/40 scale-110">
            <Check size={48} strokeWidth={4} />
          </div>
          <h2 className="text-2xl font-black text-[#6344B6] tracking-tight uppercase mb-2">Transfert effectué</h2>
          <p className="text-5xl font-black text-[#1D1B20] tracking-tighter">
            {transaction.amount.toLocaleString()} <span className="text-xl opacity-40 uppercase">roubles</span>
          </p>
          <p className="text-[#49454F] text-sm font-bold mt-6 opacity-60 flex items-center gap-2">
            <Clock size={16} />
            {transaction.createdAt ? (typeof transaction.createdAt.toDate === 'function' ? transaction.createdAt.toDate().toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(transaction.createdAt as any).toLocaleString('fr-FR')) : ''}
          </p>
          
          <div className="flex items-center gap-4 mt-12">
            <button 
              onClick={() => setActiveTab('update')}
              className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${
                activeTab === 'update' ? 'bg-[#6344B6] text-white' : 'bg-[#F3EDF7] text-[#6344B6] hover:bg-[#EADDFF]'
              }`}
            >
              Mise à jour
            </button>
            <button 
              onClick={() => setActiveTab('details')}
              className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${
                activeTab === 'details' ? 'bg-[#6344B6] text-white' : 'bg-white border border-[#E7E0EB] text-[#49454F] hover:bg-[#F3EDF7]'
              }`}
            >
              Détails
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Tabs for All Statuses */}
      {transaction.status !== 'completed' && (
        <div className="flex items-center gap-4 mb-8">
           <button 
            onClick={() => setActiveTab('update')}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${
              activeTab === 'update' ? 'bg-[#6344B6] text-white' : 'bg-[#F3EDF7] text-[#6344B6] hover:bg-[#EADDFF]'
            }`}
          >
            Mise à jour
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm transition-all ${
              activeTab === 'details' ? 'bg-[#6344B6] text-white' : 'bg-white border border-[#E7E0EB] text-[#49454F] hover:bg-[#F3EDF7]'
            }`}
          >
            Détails
          </button>
        </div>
      )}

      <div className="animate-in fade-in duration-500">
        {activeTab === 'details' ? (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="m3-card flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#EADDFF] text-[#21005D] rounded-[16px]"><UserIcon size={24} /></div>
                  <button onClick={() => { navigator.clipboard.writeText(transaction.userId); toast.success('ID Copié'); }} className="p-2 text-[#49454F] hover:bg-[#F3EDF7] rounded-full transition-all"><Copy size={14} /></button>
                </div>
                <div>
                  <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1">Expéditeur</p>
                  <h3 className="text-lg font-black text-[#1D1B20] tracking-tight truncate">{transaction.clientName || 'Inconnu'}</h3>
                  <div className="flex flex-col mt-1">
                    {transaction.clientPhone && <a href={`tel:${transaction.clientPhone}`} className="text-[#6344B6] text-[10px] font-bold hover:underline">{transaction.clientPhone}</a>}
                    {transaction.clientEmail && (
                      <div className="flex items-center gap-2 mt-1">
                        <a href={`mailto:${transaction.clientEmail}`} className="text-[#49454F] text-[9px] font-bold opacity-60 hover:underline truncate max-w-[120px]">{transaction.clientEmail}</a>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(transaction.clientEmail!);
                            toast.success('Email copié !');
                          }}
                          className="p-1.5 bg-[#F3EDF7] text-[#49454F] rounded-md hover:bg-[#6344B6] hover:text-white transition-all shadow-sm flex items-center justify-center"
                          title="Copier l'email"
                        >
                          <Copy size={12} />
                        </button>
                        <button 
                          onClick={() => setIsEmailModalOpen(true)}
                          className="p-1.5 bg-[#EADDFF] text-[#21005D] rounded-md hover:bg-[#6344B6] hover:text-white transition-all shadow-sm flex items-center justify-center"
                          title="Envoyer un mail direct"
                        >
                          <Mail size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="m3-card flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-[#F3EDF7] text-[#6344B6] rounded-[16px]"><CreditCard size={24} /></div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-[#6344B6] bg-[#EADDFF] px-2 py-0.5 rounded-md">{transaction.currency}</div>
                </div>
                <div>
                  <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1">Montant Envoyé</p>
                  <h3 className="text-2xl font-black text-[#1D1B20] tracking-tighter">{transaction.amount.toLocaleString()} <span className="text-sm opacity-40">{transaction.currency}</span></h3>
                </div>
              </div>

              <div className="m3-card bg-[#EADDFF] border-transparent flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 opacity-[0.05]"><Activity size={100} /></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-white text-[#6344B6] rounded-[16px] shadow-sm">
                    {transaction.paymentMethod === 'bonus' ? <Award size={24} /> : <Activity size={24} />}
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-white px-2 py-0.5 rounded-md">
                    {transaction.paymentMethod === 'bonus' ? 'Bonus Parrainage' : 'Transfert Classique'}
                  </div>
                </div>
                <div>
                  <p className="text-[#6344B6] text-[9px] font-black uppercase tracking-widest mb-1">
                    {transaction.paymentMethod === 'bonus' 
                      ? (transaction.isHybrid ? 'Payé par Bonus + Cash' : 'Payé par Bonus')
                      : 'Net à Distribuer'}
                  </p>
                  <h3 className="text-2xl font-black text-[#21005D] tracking-tighter">
                    {transaction.paymentMethod === 'bonus' 
                      ? (transaction.bonusUsed ? `${transaction.bonusUsed.toLocaleString()} RUB` : 'TOTAL')
                      : `${(transaction.receivedAmount || transaction.amount).toLocaleString()} ${transaction.destinationCurrency}`}
                  </h3>
                  {(destinationCountryName) && (
                    <p className="text-[10px] font-black text-[#6344B6] opacity-40 uppercase tracking-widest mt-1">
                      Vers le {destinationCountryName}
                    </p>
                  )}
                  {transaction.isHybrid && (
                    <p className="text-[9px] font-black text-[#6344B6] mt-1 opacity-60">
                      + {transaction.paidByCash?.toLocaleString()} {transaction.currency} cash
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Recipient(s) Section */}
            {transaction.isBulk ? (
              <div className="m3-card-elevated !p-0 overflow-hidden">
                <div className="p-8 border-b border-[#E7E0EB] flex justify-between items-center bg-[#F3EDF7]/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#6344B6] text-white rounded-[16px] flex items-center justify-center shadow-lg"><Smartphone size={24} /></div>
                    <div>
                      <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Liste des Bénéficiaires</h3>
                      <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest">{transaction.bulkRecipients?.length || 0} destinataires groupés</p>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#F3EDF7]/50 text-[#49454F] text-[10px] font-black uppercase tracking-[0.2em]">
                        <th className="px-8 py-5">Destinataire</th>
                        <th className="px-8 py-5">Réseau</th>
                        <th className="px-8 py-5">Montant Net</th>
                        <th className="px-8 py-5">Statut</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E0EB]">
                      {transaction.bulkRecipients?.map((recipient) => (
                        <tr key={recipient.id} className="hover:bg-[#F3EDF7]/30 transition-all group">
                          <td className="px-8 py-6">
                            <p className="text-sm font-black text-[#1D1B20]">{recipient.name}</p>
                            <div className="mt-1 flex flex-col">
                                {recipient.phone && <a href={`tel:${recipient.phone}`} className="text-[10px] font-bold text-[#6344B6] hover:underline">{recipient.phone}</a>}
                                {recipient.account && <span className="text-[10px] font-bold text-[#49454F] opacity-60">Acc: {recipient.account}</span>}
                             </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-[#EADDFF] text-[#21005D] rounded-md">{recipient.operator}</span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-sm font-black text-[#1D1B20]">{Math.floor(recipient.amount * (transaction.exchangeRate || 1)).toLocaleString()} {transaction.destinationCurrency}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              recipient.status === 'completed' ? 'bg-[#E8DEF8] text-[#1D192B]' :
                              recipient.status === 'failed' ? 'bg-[#F9DEDC] text-[#B3261E]' :
                              'bg-[#ECE6F0] text-[#49454F]'
                            }`}>
                              {recipient.status || 'En attente'}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              {recipient.status !== 'completed' && (
                                <button onClick={() => handleUpdateBulkRecipientStatus(recipient.id, 'completed')} className="p-2 bg-[#E8DEF8] text-[#6344B6] rounded-lg hover:shadow-md"><CheckCircle2 size={16} /></button>
                              )}
                              <button onClick={() => handleGeneratePDF(recipient)} className="p-2 bg-[#F3EDF7] text-[#49454F] rounded-lg hover:shadow-md"><Printer size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="m3-card-elevated">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F3EDF7] text-[#6344B6] rounded-[16px] flex items-center justify-center"><Smartphone size={24} /></div>
                    <div>
                      <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Détails du Destinataire</h3>
                      <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest">Transfert unique direct</p>
                    </div>
                  </div>
                  <button onClick={() => handleGeneratePDF()} className="m3-btn-tonal !py-2 !px-4"><Printer size={16} /> Reçu PDF</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="bg-[#F3EDF7] p-5 rounded-[24px]">
                      <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1">Nom Complet</p>
                      <p className="text-[#1D1B20] font-black text-lg tracking-tight">{transaction.recipientName || 'N/A'}</p>
                    </div>
                    <div className="bg-[#F3EDF7] p-5 rounded-[24px]">
                      <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1">Réseau / Opérateur</p>
                      <p className="text-[#6344B6] font-black text-lg tracking-tight uppercase">
                        {transaction.recipientOperator || transaction.operator || transaction.selectedOperator || 'Inconnu'}
                      </p>
                    </div>
                    {(destinationCountryName) && (
                      <div className="bg-[#F3EDF7] p-5 rounded-[24px]">
                        <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1">Pays de destination</p>
                        <p className="text-[#1D1B20] font-black text-lg tracking-tight uppercase">
                          {destinationCountryName}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="bg-[#F3EDF7] p-5 rounded-[24px] group flex justify-between items-end">
                      <div>
                        <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1">
                          {transaction.type === 'russia-africa' ? 'Numéro de Téléphone' : 
                           transaction.type === 'africa-russia' ? 'Numéro SBP (Téléphone)' : 'Coordonnées (Compte/Carte)'}
                        </p>
                        <div className="text-[#1D1B20] font-black text-lg tracking-tight animate-in fade-in duration-300">
                           {transaction.recipientPhone || transaction.recipientAccount || transaction.beneficiaryAccount ? (
                             <span className="text-[#6344B6] block">
                               {transaction.recipientPhone || transaction.recipientAccount || transaction.beneficiaryAccount}
                             </span>
                           ) : 'N/A'}
                           {transaction.type === 'africa-russia' ? (
                             <div className="flex flex-wrap gap-2 mt-1.5">
                               {transaction.beneficiaryBankName && (
                                 <span className="text-[#49454F] text-xs bg-white/60 px-2.5 py-1 rounded-xl shadow-sm border border-slate-100/50">
                                   Banque : <span className="text-[#6344B6] font-bold">{transaction.beneficiaryBankName}</span>
                                 </span>
                               )}
                               {transaction.beneficiaryBankAccount && (
                                 <span className="text-[#49454F] text-xs bg-white/60 px-2.5 py-1 rounded-xl shadow-sm border border-slate-100/50">
                                   Carte : <span className="text-[#6344B6] font-bold">{transaction.beneficiaryBankAccount}</span>
                                 </span>
                               )}
                             </div>
                           ) : (
                             transaction.beneficiaryBankAccount && (
                               <span className="text-[#49454F] block text-sm mt-1 bg-white/50 inline-block px-2 py-0.5 rounded-md">
                                 Acc: <span className="text-[#6344B6]">{transaction.beneficiaryBankAccount}</span>
                               </span>
                             )
                           )}
                        </div>
                      </div>
                      <button onClick={() => { 
                        const value = transaction.recipientPhone || transaction.recipientAccount || transaction.beneficiaryAccount || '';
                        const bank = transaction.type === 'africa-russia' && transaction.beneficiaryBankName ? ` / Banque: ${transaction.beneficiaryBankName}` : '';
                        const card = transaction.beneficiaryBankAccount ? ` / ${transaction.type === 'africa-russia' ? 'Carte' : 'Acc'}: ${transaction.beneficiaryBankAccount}` : '';
                        navigator.clipboard.writeText(value + bank + card); 
                        toast.success('Copié'); 
                      }} className="p-2 bg-white text-[#6344B6] rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"><Copy size={16} /></button>
                    </div>
                    <div className="bg-[#EADDFF] p-5 rounded-[24px]">
                      <p className="text-[#6344B6] text-[9px] font-black uppercase tracking-widest mb-1">Net à Percevoir</p>
                      <p className="text-[#21005D] font-black text-xl tracking-tighter">{(transaction.receivedAmount || transaction.amount).toLocaleString()} {transaction.destinationCurrency}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4 duration-500">
            {/* Left: Main Info (Actions & Proof) */}
            <div className="lg:col-span-2 space-y-8">
               {/* Proof of Payment */}
              <div className="m3-card-elevated">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-[#1D1B20] tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#F3EDF7] text-[#6344B6] rounded-[12px] flex items-center justify-center"><FileText size={20} /></div>
                    Preuve de Règlement
                  </h3>
                </div>
                
                {transaction.proofUrl && transaction.proofUrl !== 'PAID_WITH_BONUS' ? (
                  <div className="relative group rounded-[32px] overflow-hidden border border-[#E7E0EB] bg-[#F3EDF7] shadow-inner">
                    <img onClick={() => openProof(transaction.proofUrl)} src={transaction.proofUrl} alt="Preuve" className="w-full object-contain max-h-[600px] transition-transform duration-700 group-hover:scale-[1.02] cursor-pointer" />
                    <div className="absolute inset-0 bg-[#1D1B20]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => openProof(transaction.proofUrl)} className="p-5 bg-white rounded-full shadow-2xl text-[#6344B6] hover:scale-110 transition-transform">
                        <ExternalLink size={28} />
                      </button>
                    </div>
                  </div>
                ) : transaction.proofUrl === 'PAID_WITH_BONUS' ? (
                  <div className="p-20 text-center bg-[#EADDFF]/30 rounded-[32px] border-2 border-dashed border-[#6344B6]/20">
                    <Award size={48} className="mx-auto text-[#6344B6] mb-4 animate-bounce" />
                    <p className="text-[#6344B6] font-black uppercase text-[12px] tracking-[0.1em] mb-2">Payé par Bonus</p>
                  </div>
                ) : (
                  <div className="p-20 text-center bg-[#F3EDF7] rounded-[32px] border-2 border-dashed border-[#E7E0EB]">
                    <AlertCircle size={48} className="mx-auto text-[#6344B6]/20 mb-4" />
                    <p className="text-[#49454F] font-black uppercase text-[10px] tracking-widest">Aucune preuve soumise</p>
                  </div>
                )}
              </div>

              {/* Administrative Note Area */}
              {transaction.adminNotes && (
                <div className="bg-[#F9DEDC] border-2 border-[#B3261E]/20 p-6 rounded-[32px]">
                  <p className="text-[#B3261E] text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertCircle size={14} /> Note administrative actuelle (visible client)
                  </p>
                  <p className="text-[#B3261E] font-bold italic">"{transaction.adminNotes}"</p>
                </div>
              )}
            </div>

            {/* Right: Actions & Timeline */}
            <div className="space-y-8">
              {/* Main Action Card */}
              <div className="bg-[#6344B6] p-8 rounded-[32px] shadow-2xl shadow-[#6344B6]/30 text-white space-y-6">
                <div className="flex items-center gap-3 border-b border-white/20 pb-4">
                  <Activity size={24} />
                  <h3 className="font-black uppercase text-xs tracking-[0.2em]">Actions Administrateur</h3>
                </div>
                
                <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Motif de rejet prédéfini</label>
                      <div className="relative">
                        <select 
                          value={selectedReason}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            setSelectedReason(e.target.value);
                            if (e.target.value !== "Autre (précisez ci-dessous)") {
                              setAdminNote(e.target.value);
                            }
                          }}
                          className="w-full bg-white/10 border border-white/20 rounded-[20px] p-4 text-sm text-white focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="" className="text-slate-900">Choisir un motif (optionnel)</option>
                          {REJECTION_REASONS.map(r => (
                            <option key={r} value={r} className="text-slate-900">{r}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                          <ChevronDown size={18} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Détails ou Note libre (visible client)</label>
                      <textarea 
                      placeholder="Ex: Précisez le motif du rejet..."
                      value={adminNote}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdminNote(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-[20px] p-4 text-sm text-white placeholder:text-white/40 focus:outline-none transition-all h-24"
                      />
                    </div>
                  
                  <button 
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={isActionLoading || transaction.status === 'completed'}
                    className="w-full py-4 bg-white text-[#6344B6] font-black uppercase text-[10px] tracking-widest rounded-full hover:shadow-2xl transition-all disabled:opacity-50"
                  >
                    Valider la Transaction
                  </button>
                  
                  <button 
                    onClick={() => handleStatusUpdate('failed')}
                    disabled={isActionLoading || transaction.status === 'failed'}
                    className="w-full py-4 bg-[#B3261E] text-white font-black uppercase text-[10px] tracking-widest rounded-full hover:shadow-2xl transition-all disabled:opacity-50"
                  >
                    Rejeter la demande
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="m3-card-elevated space-y-8 !p-8">
                <h3 className="text-sm font-black text-[#1D1B20] uppercase tracking-widest flex items-center gap-3">
                  <Clock size={20} className="text-[#6344B6]" /> Chronologie
                </h3>
                <div className="space-y-10 relative ml-3">
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[#F3EDF7]" />
                  {transaction.statusHistory?.slice().reverse().map((entry, i) => (
                    <div key={i} className="relative pl-12">
                      <div className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                        i === 0 ? 'bg-[#6344B6] text-white shadow-lg shadow-[#6344B6]/20' : 'bg-[#EADDFF] text-[#6344B6]'
                      }`}>
                        <Check size={14} strokeWidth={4} />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-black text-[#1D1B20] tracking-tight">
                          {entry.status.replace('_', ' ')}
                        </p>
                        <p className="text-[11px] font-bold text-[#49454F] mt-0.5 opacity-60">
                            {entry.timestamp.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          labels={['Preuve de paiement']}
          startIndex={lightboxStartIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}

      {isEmailModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/40 backdrop-blur-sm" onClick={() => setIsEmailModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-[#E7E0EB]" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-[#E7E0EB] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#EADDFF] text-[#21005D] rounded-xl flex items-center justify-center">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Message au Client</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#49454F] opacity-60">À: {transaction.clientEmail}</p>
                </div>
              </div>
              <button onClick={() => setIsEmailModalOpen(false)} className="p-2 hover:bg-[#F3EDF7] rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F] px-1">Sujet du message</label>
                <input 
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[#F3EDF7] border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-[#1D1B20] focus:border-[#6344B6] outline-none transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F] px-1">Contenu du mail</label>
                <textarea 
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Écrivez votre message ici..."
                  className="w-full bg-[#F3EDF7] border border-transparent rounded-[24px] px-5 py-4 text-sm font-bold text-[#1D1B20] focus:border-[#6344B6] outline-none transition-all h-48 resize-none"
                />
                <p className="text-[9px] text-[#49454F] opacity-60 px-1 font-medium italic">
                  * L'email sera envoyé même si l'utilisateur a désactivé les notifications.
                </p>
              </div>
            </div>
            
            <div className="p-8 bg-[#F3EDF7]/30 border-t border-[#E7E0EB] flex gap-4">
              <button 
                onClick={() => setIsEmailModalOpen(false)}
                className="flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest text-[#49454F] hover:bg-white transition-all border border-transparent hover:border-[#CAC4D0]"
              >
                Annuler
              </button>
              <button 
                onClick={handleSendManualEmail}
                disabled={isSendingEmail || !emailMessage}
                className="flex-[2] py-4 bg-[#6344B6] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#6344B6]/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {isSendingEmail ? 'Envoi en cours...' : 'Envoyer le mail'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TransactionDetailsPage;

