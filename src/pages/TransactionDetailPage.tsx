import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Banknote, CheckCircle2, Clock3, Copy, Download, FileText, Info, Send, Smartphone, User } from 'lucide-react';
import { db } from '../services/firebase';
import { Layout } from '../components/Layout';
import { Loading } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { isNativeApp, downloadPdfNative } from '../utils/capacitorUtils';

const statusOrder = ['pending', 'proof_received', 'confirmed', 'completed'] as const;

const statusLabels: Record<string, string> = {
  pending: 'Vous avez initié le transfert',
  proof_received: 'Paiement en cours',
  confirmed: 'Paiement confirmé',
  completed: 'Paiement effectué',
  failed: 'Échec du transfert',
  flagged_problem: 'Problème signalé',
};

const statusTone: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  proof_received: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
  flagged_problem: 'bg-amber-100 text-amber-700',
};

export const TransactionDetailPage: React.FC = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { formatNumber } = useLanguage();
  const [transaction, setTransaction] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'update' | 'details'>('update');

  useEffect(() => {
    if (!transactionId) return;

    const unsubscribe = onSnapshot(doc(db, 'transactions', transactionId), (snapshot) => {
      setTransaction(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      setLoading(false);
    });

    return unsubscribe;
  }, [transactionId]);

  const currentStatus = transaction?.status || 'pending';

  const steps = useMemo(() => {
    if (currentStatus === 'failed') {
      // If failed, we show up to the point it reached then add failure
      const reached = ['pending'];
      if (transaction?.proofUrl) reached.push('proof_received');
      if (transaction?.statusHistory?.some((h: any) => h.status === 'confirmed')) reached.push('confirmed');
      return [...reached, 'failed'] as string[];
    }
    return statusOrder;
  }, [currentStatus, transaction]);

  const stepIndex = useMemo(() => {
    const index = steps.indexOf(currentStatus as any);
    return index === -1 ? 0 : index;
  }, [currentStatus, steps]);

  const handleReceiptDownload = async (recipient?: any) => {
    if (!transaction) return;
    const t_toast = toast.loading('Génération du reçu...');
    
    try {
      const isBulkRec = !!recipient;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isBulkRec ? 'a5' : 'a6'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = isBulkRec ? 12 : 10;
      let y = 15;

      const mainColor = [102, 20, 137]; // #661489

      // Header background
      pdf.setFillColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.rect(0, 0, pageWidth, isBulkRec ? 28 : 25, 'F');

      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(isBulkRec ? 22 : 18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FLASH PAY', pageWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(isBulkRec ? 11 : 10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(isBulkRec ? 'RECU DE TRANSFERT OFFICIEL' : 'RECU OFFICIEL', pageWidth / 2, 18, { align: 'center' });

      y = isBulkRec ? 42 : 38;
      pdf.setTextColor(60, 60, 60);
      
      // Transaction Header
      pdf.setFontSize(isBulkRec ? 9 : 8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REFERENCE', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`#${transaction.id.substring(0, 10).toUpperCase()}${recipient ? '-' + recipient.id.substring(0, 4) : ''}`, margin, y + 6);
      
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
      pdf.text(formatDate(transaction.createdAt?.toDate ? transaction.createdAt.toDate() : new Date()), pageWidth - margin, y + 6, { align: 'right' });

      y += 18;

      // Parties Section
      pdf.setDrawColor(240, 240, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;
      
      pdf.setFontSize(isBulkRec ? 10 : 9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXPEDITEUR', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(transaction.clientName || 'Client Flash Pay', margin, y + 6);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('BENEFICIAIRE', pageWidth - margin, y, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(recipient ? recipient.name : (transaction.recipientName || 'N/A'), pageWidth - margin, y + 6, { align: 'right' });
      pdf.text(recipient ? (recipient.phone || '') : (transaction.recipientPhone || ''), pageWidth - margin, y + 10, { align: 'right' });

      y += isBulkRec ? 25 : 22;

      // Financials
      pdf.setFillColor(250, 250, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 40, 4, 4, 'F');
      y += 8;
      
      const sendAmt = recipient ? recipient.amount : transaction.amount;
      const rate = transaction.exchangeRate || 1;
      const recvAmt = Math.floor(sendAmt * rate);

      // Helper to format number with space
      const formatNum = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

      pdf.setFontSize(isBulkRec ? 9 : 8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Montant envoye:', margin + 6, y);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 40, 40);
      pdf.text(`${formatNum(sendAmt)} ${transaction.currency}`, margin + 6, y);
      
      y += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Taux de change:', margin + 6, y);
      pdf.text(`1 ${transaction.currency} = ${rate.toFixed(2)} ${transaction.destinationCurrency}`, pageWidth - margin - 6, y, { align: 'right' });
      
      y += 12;
      pdf.setFontSize(isBulkRec ? 12 : 11);
      pdf.setTextColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.text('NET A RECEVOIR:', margin + 6, y);
      pdf.setFontSize(isBulkRec ? 15 : 13);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatNum(recvAmt)} ${transaction.destinationCurrency}`, pageWidth - margin - 6, y, { align: 'right' });

      y += 22;

      // Status Badge (Only for Bulk recipients in user view)
      if (isBulkRec) {
        const isComp = recipient.status === 'completed';
        pdf.setFillColor(isComp ? 232 : 255, isComp ? 252 : 241, isComp ? 241 : 242);
        pdf.roundedRect(pageWidth / 2 - 20, y, 40, 10, 5, 5, 'F');
        pdf.setTextColor(isComp ? 16 : 225, isComp ? 124 : 29, isComp ? 65 : 72);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(isComp ? 'VALIDE' : 'EN ATTENTE', pageWidth / 2, y + 6.5, { align: 'center' });
      }

      y += 22;
      
      pdf.setTextColor(180, 180, 180);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Merci d\'utiliser Flash Pay.', pageWidth / 2, pageHeight - 8, { align: 'center' });
      
      const fileName = `FlashPay_${recipient ? recipient.name.replace(/\s+/g, '_') : 'Recu'}.pdf`;

      if (isNativeApp()) {
        const pdfBase64 = pdf.output('datauristring');
        await downloadPdfNative(pdfBase64, fileName);
        toast.success('Prêt à partager !', { id: t_toast });
      } else {
        pdf.save(fileName);
        toast.success('Reçu téléchargé !', { id: t_toast });
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du téléchargement', { id: t_toast });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loading />
        </div>
      </Layout>
    );
  }

  if (!transaction) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-900">Transaction introuvable</p>
          <button onClick={() => navigate('/transactions')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#661489] px-5 py-3 font-semibold text-white">
            <ArrowLeft size={16} /> Retour
          </button>
        </div>
      </Layout>
    );
  }

  const completedRecipients = transaction.isBulk ? (transaction.bulkRecipients?.filter((r: any) => r.status === 'completed')?.length || 0) : 0;
  const totalRecipients = transaction.isBulk ? (transaction.bulkRecipients?.length || 0) : 0;
  const bulkProgress = totalRecipients > 0 ? (completedRecipients / totalRecipients) * 100 : 0;

  return (
    <Layout>
      <div className="mx-auto max-w-md space-y-5 pb-24 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => navigate('/transactions')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#661489] hover:bg-[#661489]/10 transition-all"
            aria-label="Retour"
          >
            <ArrowLeft size={22} />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#661489] hover:bg-[#661489]/10 transition-all"
            aria-label="Aide"
          >
            <Info size={20} />
          </button>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-[#eadfff] bg-white shadow-[0_20px_60px_rgba(98,54,204,0.10)]">
          <div className="bg-white px-6 pt-10 pb-8 text-center relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(98,54,204,0.10),transparent_70%)]" />

            <div className="relative z-10 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EFE7FF] text-[#661489] shadow-sm">
                {currentStatus === 'completed' ? <CheckCircle2 size={28} /> : <Send size={28} />}
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#661489]">
                  {transaction.isBulk ? 'Transfert groupé' : (currentStatus === 'completed' ? 'Terminé' : 'En cours')}
                </p>
                <h1 className="text-3xl font-black tracking-tight text-[#1D1B20]">
                  {currentStatus === 'completed' ? 'Transfert effectué' : 'Transfert en cours'}
                </h1>
                <p className="text-[11px] font-medium text-[#49454F] opacity-80">
                  {currentStatus === 'completed'
                    ? 'Votre transfert a été validé avec succès.'
                    : 'Votre transfert est en cours. Nous vous tiendrons informé dès qu’il sera terminé.'}
                </p>
              </div>

              <div className="pt-2">
                <div className="text-5xl font-black tracking-tighter text-[#1D1B20]">
                  {transaction.amount?.toLocaleString('fr-FR')} <span className="text-2xl font-bold text-[#49454F] opacity-70">{transaction.currency}</span>
                </div>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[#49454F] opacity-60">
                  {transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>

              <div className="mx-auto mt-3 flex w-full max-w-[320px] rounded-full bg-[#F3EDF7] p-1.5">
                <button 
                  onClick={() => setActiveTab('update')}
                  className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-bold transition-all ${
                    activeTab === 'update' ? 'bg-[#E8DEF8] text-[#21005D] shadow-sm' : 'text-[#49454F]'
                  }`}
                >
                  Mise à jour
                </button>
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-bold transition-all ${
                    activeTab === 'details' ? 'bg-[#E8DEF8] text-[#21005D] shadow-sm' : 'text-[#49454F]'
                  }`}
                >
                  Détails
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-[#FCFAFF] px-5 pb-6 pt-4 min-h-[400px]">
            {activeTab === 'update' ? (
              <>
            {transaction.isBulk && (
              <div className="rounded-[28px] border border-[#661489]/10 bg-white p-6 space-y-5 shadow-[0_10px_30px_rgba(98,54,204,0.06)]">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-[#661489] font-black text-lg tracking-tight">Progression de l'envoi</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{completedRecipients} sur {totalRecipients} bénéficiaires payés</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-[#661489] tracking-tighter">{Math.round(bulkProgress)}%</span>
                  </div>
                </div>
                <div className="w-full h-4 bg-[#F3EDF7] rounded-full overflow-hidden p-1 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#661489] rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${bulkProgress}%` }}
                  >
                    <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-bar-stripes_2s_linear_infinite]" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 px-2">
                <div className="w-1 h-4 bg-[#661489] rounded-full"></div>
                {transaction.isBulk ? 'Liste des bénéficiaires' : 'Détails du bénéficiaire'}
              </h3>

              {!transaction.isBulk ? (
                <div className="rounded-[28px] border border-[#eadfff] bg-white p-6 shadow-[0_10px_30px_rgba(98,54,204,0.06)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#49454F]">Vous envoyez</p>
                      <p className="text-3xl font-black text-[#1D1B20] tracking-tight">{transaction.amount?.toLocaleString('fr-FR')}</p>
                      <p className="text-sm font-black text-[#661489] tracking-tight">{transaction.currency}</p>
                      <p className="text-xs text-[#49454F] font-medium pt-2">à {transaction.recipientName || 'N/A'}</p>
                    </div>
                    <div className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] shadow-sm border ${statusTone[currentStatus] || statusTone.pending} border-current/10`}>
                      {statusLabels[currentStatus] || currentStatus}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {transaction.bulkRecipients?.map((rec: any) => (
                    <div key={rec.id} className="rounded-[28px] border border-slate-100 bg-white p-5 flex items-center justify-between shadow-sm">
                      <div className="space-y-1">
                        <p className="font-black text-slate-900 text-lg tracking-tight">{rec.name}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{rec.phone} • {rec.operator}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-black text-slate-900 tracking-tighter">{Math.floor(rec.amount * (transaction.exchangeRate || 1)).toLocaleString()} <span className="text-xs opacity-40">{transaction.destinationCurrency}</span></p>
                          <div className={`text-[9px] font-black uppercase tracking-widest mt-1 flex items-center justify-end gap-1.5 ${rec.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {rec.status === 'completed' && <CheckCircle2 size={10} />}
                            {rec.status === 'completed' ? 'Effectué' : 'En attente'}
                          </div>
                        </div>
                        {rec.status === 'completed' && (
                          <button
                            onClick={() => handleReceiptDownload(rec)}
                            className="p-4 bg-[#661489]/5 text-[#661489] rounded-[20px] hover:bg-[#661489] hover:text-white transition-all shadow-sm border border-[#661489]/10"
                            title="Télécharger le reçu A5"
                          >
                            <Download size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!transaction.isBulk && (
              <div className="rounded-[28px] border border-[#eadfff] bg-white p-6 shadow-[0_10px_30px_rgba(98,54,204,0.06)]">
                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#661489] mb-8">
                  <div className="p-2 bg-[#661489]/10 rounded-lg">
                    <Clock3 size={18} />
                  </div>
                  Mise à jour
                </div>

                <div className="space-y-8 relative ml-3">
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[#f3edff]" />
                  {steps.map((status, index) => {
                    const active = index <= stepIndex;
                    const isFailed = status === 'failed' && currentStatus === 'failed';

                    return (
                      <div key={status} className="flex gap-6 relative z-10 group">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-700 ${
                          isFailed ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/30' :
                          active ? 'bg-[#661489] text-white shadow-xl shadow-[#661489]/30 scale-110' : 'bg-white border-2 border-[#f3edff] text-[#f3edff]'
                        }`}>
                          {isFailed ? <ArrowLeft size={18} strokeWidth={3} className="rotate-[135deg]" /> : <CheckCircle2 size={18} strokeWidth={3} className={active ? 'animate-in zoom-in duration-500' : ''} />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className={`font-black text-[18px] tracking-tight transition-colors duration-500 ${isFailed ? 'text-rose-600' : active ? 'text-slate-900' : 'text-slate-200'}`}>{statusLabels[status]}</p>
                          <div className={`text-sm font-medium leading-relaxed transition-colors duration-500 ${isFailed ? 'text-rose-500' : active ? 'text-slate-500' : 'text-slate-100'}`}>
                            {status === 'pending' && 'La demande a été transmise à notre service.'}
                            {status === 'proof_received' && 'Nous avons bien reçu votre justificatif de paiement.'}
                            {status === 'confirmed' && 'Votre paiement est validé, les fonds sont en route.'}
                            {status === 'completed' && 'Félicitations ! Le transfert est terminé.'}
                            {isFailed && (
                              <div className="mt-3 p-4 bg-rose-50 rounded-2xl border border-rose-100 italic">
                                "{transaction.adminNote || 'Votre justificatif n\'a pas pu être validé.'}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {currentStatus === 'completed' && !transaction.isBulk && (
              <div className="rounded-[28px] border border-[#eadfff] bg-gradient-to-br from-white to-[#F3EDF7]/50 p-6 shadow-[0_18px_50px_rgba(98,54,204,0.10)]">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-[#661489] shadow-lg border border-[#eadfff]">
                    <FileText size={30} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-black text-slate-900 text-xl tracking-tight">Télécharger le reçu de la transaction</h4>
                    <p className="text-sm text-slate-500 font-medium">Cliquez pour télécharger le reçu de votre transaction.</p>
                  </div>
                </div>
                <button
                  onClick={() => handleReceiptDownload()}
                  className="mt-6 w-full px-6 py-4 bg-[#661489] text-white font-black rounded-full shadow-[0_14px_30px_rgba(98,54,204,0.24)] active:scale-95 transition-all flex items-center justify-center gap-4"
                >
                  <Download size={20} /> Télécharger le reçu
                </button>
              </div>
            )}
            </>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Financial Summary */}
                <div className="rounded-[28px] border border-[#eadfff] bg-white p-6 shadow-sm space-y-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                    <Banknote size={14} className="text-brand" /> Résumé Financier
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Montant envoyé</span>
                      <span className="font-bold text-slate-900">{transaction.amount?.toLocaleString()} {transaction.currency}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Taux de change</span>
                      <span className="font-bold text-slate-900">1 {transaction.currency} = {transaction.exchangeRate?.toFixed(2)} {transaction.destinationCurrency}</span>
                    </div>
                    {transaction.commission > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Commission</span>
                        <span className="font-bold text-slate-900">{transaction.commission?.toLocaleString()} {transaction.currency}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-brand font-black">Net à recevoir</span>
                      <span className="text-2xl font-black text-brand">{Math.floor(transaction.amount * (transaction.exchangeRate || 1)).toLocaleString()} {transaction.destinationCurrency}</span>
                    </div>
                  </div>
                </div>

                {/* Participants */}
                <div className="grid gap-4">
                  <div className="rounded-[28px] border border-[#eadfff] bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      <User size={14} className="text-brand" /> Expéditeur
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold">
                        {transaction.clientName?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{transaction.clientName || 'Client Flash Pay'}</p>
                        <p className="text-xs text-slate-500 font-medium">Payé via {transaction.selectedOperator || 'Méthode directe'}</p>
                      </div>
                    </div>
                  </div>

                  {!transaction.isBulk && (
                    <div className="rounded-[28px] border border-[#eadfff] bg-white p-6 shadow-sm space-y-4">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                        <Smartphone size={14} className="text-brand" /> Bénéficiaire
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center text-brand font-bold">
                          {transaction.recipientName?.charAt(0).toUpperCase() || 'B'}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{transaction.recipientName}</p>
                          <p className="text-xs text-slate-500 font-medium">{transaction.recipientPhone} • {transaction.recipientOperator}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical Info */}
                <div className="rounded-[28px] border border-dashed border-slate-200 p-6 space-y-4">
                   <div className="flex justify-between items-start">
                     <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Transaction</p>
                       <p className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">#{transaction.id.toUpperCase()}</p>
                     </div>
                     <button 
                       onClick={() => {
                         navigator.clipboard.writeText(transaction.id);
                         toast.success('ID copié !');
                       }}
                       className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                     >
                       <Copy size={16} />
                     </button>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date du transfert</p>
                     <p className="text-xs text-slate-600 font-bold">
                       {transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                     </p>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes progress-bar-stripes {
          from { background-position: 1rem 0; }
          to { background-position: 0 0; }
        }
      `}</style>
    </Layout>
  );
};

export default TransactionDetailPage;

