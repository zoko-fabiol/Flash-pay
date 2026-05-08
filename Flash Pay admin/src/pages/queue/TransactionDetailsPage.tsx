import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Transaction, BulkRecipient } from '../../types';
import { adminService } from '../../services/adminService';
import jsPDF from 'jspdf';
import { ImageViewer } from '../../components/ui/ImageViewer';
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
  ZoomIn
} from 'lucide-react';


const TransactionDetailsPage: React.FC = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState('');
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

  const handleGeneratePDF = (recipient?: BulkRecipient) => {
    if (!transaction) return;
    const t_toast = toast.loading('Génération du reçu...');
    
    try {
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

      const mainColor = [103, 80, 164]; // M3 Primary #6750A4

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
      pdf.text(recipient ? (recipient.phone || '') : (transaction.recipientPhone || ''), pageWidth - margin, y + 12, { align: 'right' });

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
      pdf.text(`1 RUB = ${rate.toFixed(2)} ${transaction.destinationCurrency || 'XAF'}`, pageWidth - margin - 8, y, { align: 'right' });
      
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
        pdf.text('TRANSFERE', pageWidth / 2, y + 7.5, { align: 'center' });
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
      
      pdf.save(`FlashPay_${recipient ? recipient.name.replace(/\s+/g, '_') : 'Recu'}_${transaction.id.substring(0, 8)}.pdf`);
      toast.success('Reçu généré !', { id: t_toast });
    } catch (error) {
      console.error(error);
      toast.error('Erreur de génération', { id: t_toast });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-[#6750A4] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 text-[#49454F] font-black uppercase text-[10px] tracking-widest">Chargement des détails...</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="m3-card p-12 text-center max-w-xl mx-auto">
        <h2 className="text-2xl font-black text-[#1D1B20] mb-4 tracking-tight">Transaction Introuvable</h2>
        <p className="text-[#49454F] mb-8 font-medium">Cette transaction n'existe pas ou a été supprimée.</p>
        <button onClick={() => navigate('/admin/queue')} className="m3-btn-filled mx-auto">
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
          <button onClick={() => navigate('/admin/queue')} className="flex items-center gap-2 text-[#6750A4] font-black uppercase text-[10px] tracking-widest mb-4 hover:translate-x-[-4px] transition-transform">
            <ArrowLeft size={16} /> Retour à la file d'attente
          </button>
          <div className="flex items-center gap-4">
             <h2 className="text-3xl font-black text-[#1D1B20] tracking-tighter">Transaction <span className="font-mono text-[#6750A4]">#{transaction.id.substring(0, 10)}</span></h2>
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

      {/* Premium Status Header (Image 2 style) */}
      {transaction.status === 'completed' && (
        <div className="m3-card-elevated flex flex-col items-center justify-center py-16 text-center animate-in zoom-in duration-700 border-b-4 border-[#6750A4]">
          <div className="w-24 h-24 bg-[#6750A4] text-white rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-[#6750A4]/40 scale-110">
            <Check size={48} strokeWidth={4} />
          </div>
          <h2 className="text-2xl font-black text-[#6750A4] tracking-tight uppercase mb-2">Transfert effectué</h2>
          <p className="text-5xl font-black text-[#1D1B20] tracking-tighter">
            {transaction.amount.toLocaleString()} <span className="text-xl opacity-40 uppercase">roubles</span>
          </p>
          <p className="text-[#49454F] text-sm font-bold mt-6 opacity-60 flex items-center gap-2">
            <Clock size={16} />
            {transaction.createdAt ? (typeof transaction.createdAt.toDate === 'function' ? transaction.createdAt.toDate().toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(transaction.createdAt as any).toLocaleString('fr-FR')) : ''}
          </p>
          
          <div className="flex items-center gap-4 mt-12">
            <div className="px-8 py-3 bg-[#F3EDF7] text-[#6750A4] rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Mise à jour</div>
            <div className="px-8 py-3 bg-white border border-[#E7E0EB] text-[#49454F] rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Détails</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Main Info */}
        <div className="lg:col-span-2 space-y-8">
          
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
                    {transaction.clientPhone && <a href={`tel:${transaction.clientPhone}`} className="text-[#6750A4] text-[10px] font-bold hover:underline">{transaction.clientPhone}</a>}
                    {transaction.clientEmail && <a href={`mailto:${transaction.clientEmail}`} className="text-[#49454F] text-[9px] font-bold opacity-60 hover:underline">{transaction.clientEmail}</a>}
                  </div>
                </div>
            </div>

            <div className="m3-card flex flex-col justify-between">
               <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-[#F3EDF7] text-[#6750A4] rounded-[16px]"><CreditCard size={24} /></div>
                 <div className="text-[9px] font-black uppercase tracking-widest text-[#6750A4] bg-[#EADDFF] px-2 py-0.5 rounded-md">{transaction.currency}</div>
               </div>
               <div>
                 <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1">Montant Envoyé</p>
                 <h3 className="text-2xl font-black text-[#1D1B20] tracking-tighter">{transaction.amount.toLocaleString()} <span className="text-sm opacity-40">{transaction.currency}</span></h3>
               </div>
            </div>

            <div className="m3-card bg-[#EADDFF] border-transparent flex flex-col justify-between relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 opacity-[0.05]"><Activity size={100} /></div>
               <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-white text-[#6750A4] rounded-[16px] shadow-sm"><Activity size={24} /></div>
                 <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-white px-2 py-0.5 rounded-md">{transaction.destinationCurrency}</div>
               </div>
               <div>
                 <p className="text-[#6750A4] text-[9px] font-black uppercase tracking-widest mb-1">Net à Distribuer</p>
                 <h3 className="text-2xl font-black text-[#21005D] tracking-tighter">{(transaction.receivedAmount || transaction.amount).toLocaleString()} <span className="text-sm opacity-40">{transaction.destinationCurrency}</span></h3>
               </div>
            </div>
          </div>

          {/* Recipient(s) Section */}
          {transaction.isBulk ? (
            <div className="m3-card-elevated !p-0 overflow-hidden">
               <div className="p-8 border-b border-[#E7E0EB] flex justify-between items-center bg-[#F3EDF7]/30">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-[#6750A4] text-white rounded-[16px] flex items-center justify-center shadow-lg"><Smartphone size={24} /></div>
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
                                {recipient.phone && <a href={`tel:${recipient.phone}`} className="text-[10px] font-bold text-[#6750A4] hover:underline">{recipient.phone}</a>}
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
                                <button onClick={() => handleUpdateBulkRecipientStatus(recipient.id, 'completed')} className="p-2 bg-[#E8DEF8] text-[#6750A4] rounded-lg hover:shadow-md"><CheckCircle2 size={16} /></button>
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
                   <div className="w-12 h-12 bg-[#F3EDF7] text-[#6750A4] rounded-[16px] flex items-center justify-center"><Smartphone size={24} /></div>
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
                     <p className="text-[#6750A4] font-black text-lg tracking-tight uppercase">{transaction.recipientOperator || 'Inconnu'}</p>
                   </div>
                 </div>
                 <div className="space-y-4">
                   <div className="bg-[#F3EDF7] p-5 rounded-[24px] group flex justify-between items-end">
                      <div>
                        <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1">Numéro de Téléphone</p>
                        <p className="text-[#1D1B20] font-black text-lg tracking-tight">
                           {transaction.recipientPhone ? <a href={`tel:${transaction.recipientPhone}`} className="text-[#6750A4] hover:underline">{transaction.recipientPhone}</a> : 'N/A'}
                        </p>
                      </div>
                     <button onClick={() => { navigator.clipboard.writeText(transaction.recipientPhone || ''); toast.success('Copié'); }} className="p-2 bg-white text-[#6750A4] rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"><Copy size={16} /></button>
                   </div>
                   <div className="bg-[#EADDFF] p-5 rounded-[24px]">
                     <p className="text-[#6750A4] text-[9px] font-black uppercase tracking-widest mb-1">Net à Percevoir</p>
                     <p className="text-[#21005D] font-black text-xl tracking-tighter">{(transaction.receivedAmount || transaction.amount).toLocaleString()} {transaction.destinationCurrency}</p>
                   </div>
                 </div>
               </div>
            </div>
          )}

          {/* Proof of Payment */}
          <div className="m3-card-elevated">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-xl font-black text-[#1D1B20] tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 bg-[#F3EDF7] text-[#6750A4] rounded-[12px] flex items-center justify-center"><FileText size={20} /></div>
                 Preuve de Règlement
               </h3>
             </div>
             
             {transaction.proofUrl ? (
                <div 
                  className="relative group rounded-[32px] overflow-hidden border border-[#E7E0EB] bg-[#F3EDF7] shadow-inner cursor-zoom-in"
                  onClick={() => { setViewerSrc(transaction.proofUrl!); setViewerOpen(true); }}
                >
                  <img 
                    src={transaction.proofUrl} 
                    alt="Preuve de paiement" 
                    className="w-full object-contain max-h-[500px] transition-transform duration-700 group-hover:scale-[1.02]" 
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-[#1D1B20]/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3">
                    <div className="p-5 bg-white/90 backdrop-blur-sm rounded-full shadow-2xl text-[#6750A4]">
                      <ZoomIn size={32} />
                    </div>
                    <p className="text-white font-black text-xs uppercase tracking-widest drop-shadow-md">Cliquer pour zoomer</p>
                  </div>
                </div>
              ) : (
                <div className="p-20 text-center bg-[#F3EDF7] rounded-[32px] border-2 border-dashed border-[#E7E0EB]">
                  <AlertCircle size={48} className="mx-auto text-[#6750A4]/20 mb-4" />
                  <p className="text-[#49454F] font-black uppercase text-[10px] tracking-widest">Aucune preuve soumise pour le moment</p>
                </div>
              )}
          </div>
        </div>

        {/* Right: Actions & Timeline */}
        <div className="space-y-8 lg:sticky lg:top-24 h-fit">
          {/* Main Action Card */}
          <div className="bg-[#6750A4] p-8 rounded-[32px] shadow-2xl shadow-[#6750A4]/30 text-white space-y-6">
             <div className="flex items-center gap-3 border-b border-white/20 pb-4">
               <Activity size={24} />
               <h3 className="font-black uppercase text-xs tracking-[0.2em]">Actions Administrateur</h3>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Note administrative (visible client)</label>
                 <textarea 
                  placeholder="Ex: Virement effectué avec succès via Orange Money..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-[20px] p-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-4 focus:ring-white/10 transition-all h-24"
                 />
               </div>
               
               <button 
                onClick={() => handleStatusUpdate('completed')}
                disabled={isActionLoading || transaction.status === 'completed'}
                className="w-full py-4 bg-white text-[#6750A4] font-black uppercase text-[10px] tracking-widest rounded-full hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50"
               >
                 Valider la Transaction
               </button>
               
               <button 
                onClick={() => handleStatusUpdate('failed')}
                disabled={isActionLoading || transaction.status === 'failed'}
                className="w-full py-4 bg-[#B3261E] text-white font-black uppercase text-[10px] tracking-widest rounded-full hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50"
               >
                 Rejeter la demande
               </button>
             </div>
          </div>

          {/* Timeline */}
          <div className="m3-card-elevated space-y-8 !p-8">
             <h3 className="text-sm font-black text-[#1D1B20] uppercase tracking-widest flex items-center gap-3">
               <Clock size={20} className="text-[#6750A4]" /> Chronologie du transfert
             </h3>
             <div className="space-y-10 relative ml-3">
               <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[#F3EDF7]" />
               {transaction.statusHistory?.slice().reverse().map((entry, i) => (
                 <div key={i} className="relative pl-12">
                   <div className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                     i === 0 ? 'bg-[#6750A4] text-white shadow-lg shadow-[#6750A4]/20' : 'bg-[#EADDFF] text-[#6750A4]'
                   }`}>
                     <Check size={14} strokeWidth={4} />
                   </div>
                   <div className="flex flex-col">
                     <p className="text-sm font-black text-[#1D1B20] tracking-tight">
                       {entry.status === 'pending' ? 'Vous avez initié le transfert' :
                        entry.status === 'proof_received' ? 'Paiement en cours' :
                        entry.status === 'completed' ? 'Paiement effectué' :
                        entry.status === 'failed' ? 'Transfert échoué' : entry.status.replace('_', ' ')}
                     </p>
                     <p className="text-[11px] font-bold text-[#49454F] mt-0.5 opacity-60">
                        {entry.timestamp.toDate().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                     </p>
                     {entry.notes && (
                       <p className="text-[11px] font-bold text-[#6750A4] mt-2 border-t border-[#F3EDF7] pt-2 italic">
                         "{entry.notes}"
                       </p>
                     )}
                   </div>
                 </div>
               ))}
             </div>
          </div>
          
          {/* Receipt Section */}
          <div className="m3-card-elevated border-2 border-[#6750A4]/10 !bg-[#F3EDF7]/30 !p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-500">
                <FileText size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-[#1D1B20] tracking-tight">Reçu de transaction</h4>
                <p className="text-[11px] font-bold text-[#49454F] mt-1 opacity-60 leading-relaxed">Téléchargez votre reçu officiel pour cette opération.</p>
                
                <button 
                  onClick={() => handleGeneratePDF()}
                  className="mt-6 w-full py-4 bg-white border border-[#E7E0EB] rounded-[20px] flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-[#6750A4] hover:bg-[#6750A4] hover:text-white transition-all shadow-md group"
                >
                  <Printer size={18} className="group-hover:scale-110 transition-transform" /> Télécharger
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Viewer Lightbox */}
      <ImageViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        src={viewerSrc}
        alt="Preuve de paiement"
      />
    </div>
  );
};

export default TransactionDetailsPage;
