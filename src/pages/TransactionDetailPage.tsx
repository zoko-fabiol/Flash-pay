import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Banknote, CheckCircle2, Clock3, Copy, Download, FileText, Info, Send, Share2, Smartphone, User } from 'lucide-react';
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
  const { t, language, formatNumber } = useLanguage();
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

  const handleReceiptDownload = async (recipient?: any, mode: 'download' | 'share' = 'download') => {
    if (!transaction) return;
    const t_toast = toast.loading(mode === 'share' ? t('preparing_share') : t('generating_receipt'));
    
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

      const mainColor = [102, 20, 137]; // #6344B6

      // Header background
      pdf.setFillColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.rect(0, 0, pageWidth, 28, 'F');

      // Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FLASH PAY', pageWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(language === 'en' ? 'OFFICIAL TRANSFER RECEIPT' : 'REÇU DE TRANSFERT OFFICIEL', pageWidth / 2, 18, { align: 'center' });

      y = 40;
      pdf.setTextColor(60, 60, 60);
      
      // Transaction Header
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(language === 'en' ? 'REFERENCE' : 'RÉFÉRENCE', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`#${transaction.id.substring(0, 10).toUpperCase()}${recipient ? '-' + recipient.id.substring(0, 4) : ''}`, margin, y + 5);
      
      const formatDate = (date: Date) => {
        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const ye = date.getFullYear();
        const h = date.getHours().toString().padStart(2, '0');
        const mi = date.getMinutes().toString().padStart(2, '0');
        return `${d}/${m}/${ye} ${h}:${mi}`;
      };

      pdf.setFont('helvetica', 'bold');
      pdf.text(language === 'en' ? 'DATE OF ISSUE' : 'DATE D\'ÉMISSION', pageWidth - margin, y, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(transaction.createdAt?.toDate ? transaction.createdAt.toDate() : new Date()), pageWidth - margin, y + 5, { align: 'right' });

      y += 18;

      // Parties Section
      pdf.setDrawColor(240, 240, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(language === 'en' ? 'SENDER' : 'EXPÉDITEUR', margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(transaction.clientName || (language === 'en' ? 'Flash Pay Customer' : 'Client Flash Pay'), margin, y + 5);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(language === 'en' ? 'BENEFICIARY' : 'BÉNÉFICIAIRE', pageWidth - margin, y, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.text(recipient ? recipient.name : (transaction.recipientName || 'N/A'), pageWidth - margin, y + 5, { align: 'right' });
      pdf.text(recipient ? (recipient.phone || '') : (transaction.recipientPhone || ''), pageWidth - margin, y + 9, { align: 'right' });

      y += 24;

      // Financials
      pdf.setFillColor(250, 250, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 38, 4, 4, 'F');
      y += 6;
      
      const sendAmt = recipient ? recipient.amount : transaction.amount;
      const rate = transaction.exchangeRate || 1;
      const recvAmt = Math.floor(sendAmt * rate);

      // Helper to format number with space
      const formatNum = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(language === 'en' ? 'Amount sent:' : 'Montant envoyé:', margin + 6, y);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(40, 40, 40);
      pdf.text(`${formatNum(sendAmt)} ${transaction.currency}`, pageWidth - margin - 6, y, { align: 'right' });
      
      y += 7;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(language === 'en' ? 'Exchange rate:' : 'Taux de change:', margin + 6, y);
      pdf.text(`1 ${transaction.currency} = ${rate.toFixed(2)} ${transaction.destinationCurrency}`, pageWidth - margin - 6, y, { align: 'right' });
      
      y += 10;
      pdf.setFontSize(12);
      pdf.setTextColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.text(language === 'en' ? 'NET TO RECEIVE:' : 'NET À RECEVOIR:', margin + 6, y);
      pdf.setFontSize(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatNum(recvAmt)} ${transaction.destinationCurrency}`, pageWidth - margin - 6, y, { align: 'right' });

      y += 18;

      // Status Badge (For all transactions)
      const status = recipient ? (recipient.status || 'pending') : transaction.status;
      const isComp = status === 'completed';
      
      pdf.setFillColor(isComp ? 232 : 255, isComp ? 252 : 241, isComp ? 241 : 242);
      pdf.roundedRect(pageWidth / 2 - 25, y, 50, 10, 5, 5, 'F');
      pdf.setTextColor(isComp ? 16 : 225, isComp ? 124 : 29, isComp ? 65 : 72);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isComp ? (language === 'en' ? 'TRANSFER COMPLETED' : 'TRANSFERT EFFECTUÉ') : (language === 'en' ? 'PENDING' : 'EN ATTENTE'), pageWidth / 2, y + 6.5, { align: 'center' });

      const fileName = `FlashPay_${recipient ? recipient.name.replace(/\s+/g, '_') : (language === 'en' ? 'Receipt' : 'Recu')}.pdf`;

      if (isNativeApp()) {
        const pdfBase64 = pdf.output('datauristring');
        const status = await downloadPdfNative(pdfBase64, fileName, mode);
        if (status === 'saved') {
          toast.success(t('toast_saved_documents'), { id: t_toast });
        } else if (status === 'shared') {
          toast.success(t('toast_ready_share'), { id: t_toast });
        } else if (status === 'fallback_shared') {
          toast.success(t('toast_download_fallback'), { id: t_toast, duration: 6000 });
        } else {
          toast.error(t('toast_action_failed'), { id: t_toast });
        }
      } else {
        pdf.save(fileName);
        toast.success(t('toast_receipt_downloaded'), { id: t_toast });
      }
    } catch (error) {
      console.error(error);
      toast.error(t('toast_download_error'), { id: t_toast });
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
          <p className="text-lg font-bold text-slate-900">{t('transaction_not_found')}</p>
          <button onClick={() => navigate('/transactions')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#6344B6] px-5 py-3 font-semibold text-white">
            <ArrowLeft size={16} /> {t('back')}
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
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#6344B6] hover:bg-[#6344B6]/10 transition-all"
            aria-label="Retour"
          >
            <ArrowLeft size={22} />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#6344B6] hover:bg-[#6344B6]/10 transition-all"
            aria-label="Aide"
          >
            <Info size={20} />
          </button>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-[#eadfff] bg-white shadow-[0_20px_60px_rgba(98,54,204,0.10)]">
          <div className="bg-white px-6 pt-10 pb-8 text-center relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(98,54,204,0.10),transparent_70%)]" />

            <div className="relative z-10 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EFE7FF] text-[#6344B6] shadow-sm">
                {currentStatus === 'completed' ? <CheckCircle2 size={28} /> : <Send size={28} />}
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#6344B6]">
                  {transaction.isBulk ? t('bulk_transfer') : (currentStatus === 'completed' ? t('completed') : t('in_progress'))}
                </p>
                <h1 className="text-3xl font-black tracking-tight text-[#1D1B20]">
                  {currentStatus === 'completed' ? t('transfer_completed') : t('transfer_in_progress')}
                </h1>
                <p className="text-[11px] font-medium text-[#49454F] opacity-80">
                  {currentStatus === 'completed'
                    ? t('transfer_completed_desc')
                    : t('transfer_in_progress_desc')}
                </p>
              </div>

              <div className="pt-2">
                <div className="text-5xl font-black tracking-tighter text-[#1D1B20]">
                  {transaction.amount?.toLocaleString(language === 'en' ? 'en-US' : 'fr-FR')} <span className="text-2xl font-bold text-[#49454F] opacity-70">{transaction.currency}</span>
                </div>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[#49454F] opacity-60">
                  {transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>

              <div className="mx-auto mt-3 flex w-full max-w-[320px] rounded-full bg-[#F3EDF7] p-1.5">
                <button 
                  onClick={() => setActiveTab('update')}
                  className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-bold transition-all ${
                    activeTab === 'update' ? 'bg-[#E8DEF8] text-[#21005D] shadow-sm' : 'text-[#49454F]'
                  }`}
                >
                  {t('tab_update')}
                </button>
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-bold transition-all ${
                    activeTab === 'details' ? 'bg-[#E8DEF8] text-[#21005D] shadow-sm' : 'text-[#49454F]'
                  }`}
                >
                  {t('tab_details')}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-[#FCFAFF] px-5 pb-6 pt-4 min-h-[400px]">
            {activeTab === 'update' ? (
              <>
            {transaction.isBulk && (
              <div className="rounded-[28px] border border-[#6344B6]/10 bg-white p-6 space-y-5 shadow-[0_10px_30px_rgba(98,54,204,0.06)]">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-[#6344B6] font-black text-lg tracking-tight">{t('bulk_progress_title')}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t('bulk_progress_desc', { completed: completedRecipients, total: totalRecipients })}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-[#6344B6] tracking-tighter">{Math.round(bulkProgress)}%</span>
                  </div>
                </div>
                <div className="w-full h-4 bg-[#F3EDF7] rounded-full overflow-hidden p-1 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#6344B6] rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${bulkProgress}%` }}
                  >
                    <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-bar-stripes_2s_linear_infinite]" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 px-2">
                <div className="w-1 h-4 bg-[#6344B6] rounded-full"></div>
                {transaction.isBulk ? t('recipients_list') : t('recipient_details')}
              </h3>

              {!transaction.isBulk ? (
                <div className="rounded-[28px] border border-[#eadfff] bg-white p-6 shadow-[0_10px_30px_rgba(98,54,204,0.06)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#49454F]">{t('you_send')}</p>
                      <p className="text-3xl font-black text-[#1D1B20] tracking-tight">{transaction.amount?.toLocaleString(language === 'en' ? 'en-US' : 'fr-FR')}</p>
                      <p className="text-sm font-black text-[#6344B6] tracking-tight">{transaction.currency}</p>
                      <p className="text-xs text-[#49454F] font-medium pt-2">{t('to_recipient', { name: transaction.recipientName || 'N/A' })}</p>
                    </div>
                    <div className={`rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] shadow-sm border ${statusTone[currentStatus] || statusTone.pending} border-current/10`}>
                      {t(`detail_status_${currentStatus}`) || currentStatus}
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
                            {rec.status === 'completed' ? t('completed') : t('status_pending')}
                          </div>
                        </div>
                        {rec.status === 'completed' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReceiptDownload(rec, 'download')}
                              className="p-3.5 bg-[#6344B6]/5 text-[#6344B6] rounded-[18px] hover:bg-[#6344B6] hover:text-white transition-all shadow-sm border border-[#6344B6]/10"
                              title="Télécharger"
                            >
                              <Download size={18} />
                            </button>
                            {isNativeApp() && (
                              <button
                                onClick={() => handleReceiptDownload(rec, 'share')}
                                className="p-3.5 bg-white text-[#6344B6] rounded-[18px] hover:bg-[#6344B6]/5 transition-all shadow-sm border border-[#6344B6]/20"
                                title="Partager"
                              >
                                <Share2 size={18} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!transaction.isBulk && (
              <div className="rounded-[28px] border border-[#eadfff] bg-white p-6 shadow-[0_10px_30px_rgba(98,54,204,0.06)]">
                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#6344B6] mb-8">
                  <div className="p-2 bg-[#6344B6]/10 rounded-lg">
                    <Clock3 size={18} />
                  </div>
                  {t('tab_update')}
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
                          active ? 'bg-[#6344B6] text-white shadow-xl shadow-[#6344B6]/30 scale-110' : 'bg-white border-2 border-[#f3edff] text-[#f3edff]'
                        }`}>
                          {isFailed ? <ArrowLeft size={18} strokeWidth={3} className="rotate-[135deg]" /> : <CheckCircle2 size={18} strokeWidth={3} className={active ? 'animate-in zoom-in duration-500' : ''} />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className={`font-black text-[18px] tracking-tight transition-colors duration-500 ${isFailed ? 'text-rose-600' : active ? 'text-slate-900' : 'text-slate-200'}`}>{t(`detail_status_${status}`)}</p>
                          <div className={`text-sm font-medium leading-relaxed transition-colors duration-500 ${isFailed ? 'text-rose-500' : active ? 'text-slate-500' : 'text-slate-100'}`}>
                            {status === 'pending' && t('step_pending_desc')}
                            {status === 'proof_received' && t('step_proof_received_desc')}
                            {status === 'confirmed' && t('step_confirmed_desc')}
                            {status === 'completed' && t('step_completed_desc')}
                            {isFailed && (
                              <div className="mt-3 p-4 bg-rose-50 rounded-2xl border border-rose-100 italic">
                                "{transaction.adminNote || t('step_failed_desc')}"
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
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-[#6344B6] shadow-lg border border-[#eadfff]">
                    <FileText size={30} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-black text-slate-900 text-xl tracking-tight">{t('receipt_title')}</h4>
                    <p className="text-sm text-slate-500 font-medium">{t('receipt_desc')}</p>
                  </div>
                </div>
                
                {isNativeApp() ? (
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => handleReceiptDownload(null, 'download')}
                      className="flex-1 py-4 bg-[#6344B6] text-white font-black rounded-full shadow-[0_14px_30px_rgba(98,54,204,0.2)] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      <Download size={18} /> {t('download')}
                    </button>
                    <button
                      onClick={() => handleReceiptDownload(null, 'share')}
                      className="flex-1 py-4 bg-white text-[#6344B6] border border-[#6344B6]/20 font-black rounded-full shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 text-sm hover:bg-[#6344B6]/5"
                    >
                      <Share2 size={18} /> {t('share')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleReceiptDownload(null, 'download')}
                    className="mt-6 w-full px-6 py-4 bg-[#6344B6] text-white font-black rounded-full shadow-[0_14px_30px_rgba(98,54,204,0.24)] active:scale-95 transition-all flex items-center justify-center gap-4"
                  >
                    <Download size={20} /> {t('download_receipt')}
                  </button>
                )}
              </div>
            )}
            </>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Financial Summary */}
                <div className="rounded-[28px] border border-[#eadfff] bg-white p-6 shadow-sm space-y-4">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                    <Banknote size={14} className="text-brand" /> {t('financial_summary')}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">{t('amount_sent_label')}</span>
                      <span className="font-bold text-slate-900">{transaction.amount?.toLocaleString(language === 'en' ? 'en-US' : 'fr-FR')} {transaction.currency}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">{t('exchange_rate_label')}</span>
                      <span className="font-bold text-slate-900">1 {transaction.currency} = {transaction.exchangeRate?.toFixed(2)} {transaction.destinationCurrency}</span>
                    </div>
                    {transaction.commission > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">{t('commission')}</span>
                        <span className="font-bold text-slate-900">{transaction.commission?.toLocaleString(language === 'en' ? 'en-US' : 'fr-FR')} {transaction.currency}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-brand font-black">{t('net_to_receive')}</span>
                      <span className="text-2xl font-black text-brand">{Math.floor(transaction.amount * (transaction.exchangeRate || 1)).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR')} {transaction.destinationCurrency}</span>
                    </div>
                  </div>
                </div>

                {/* Participants */}
                <div className="grid gap-4">
                  <div className="rounded-[28px] border border-[#eadfff] bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      <User size={14} className="text-brand" /> {t('sender')}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold">
                        {transaction.clientName?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{transaction.clientName || 'Client Flash Pay'}</p>
                        <p className="text-xs text-slate-500 font-medium">{t('paid_via', { operator: transaction.selectedOperator || t('direct_method') })}</p>
                      </div>
                    </div>
                  </div>

                  {!transaction.isBulk && (
                    <div className="rounded-[28px] border border-[#eadfff] bg-white p-6 shadow-sm space-y-4">
                      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                        <Smartphone size={14} className="text-brand" /> {t('beneficiary_desc')}
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
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('transaction_id')}</p>
                       <p className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded-lg">#{transaction.id.toUpperCase()}</p>
                     </div>
                     <button 
                       onClick={() => {
                         navigator.clipboard.writeText(transaction.id);
                         toast.success(t('copy_id_success'));
                       }}
                       className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
                     >
                       <Copy size={16} />
                     </button>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('transfer_date')}</p>
                     <p className="text-xs text-slate-600 font-bold">
                       {transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
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

