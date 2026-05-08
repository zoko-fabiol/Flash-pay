import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Clock3, Download, FileText, Info, Send, User } from 'lucide-react';
import { db } from '../services/firebase';
import { Layout } from '../components/Layout';
import { Loading } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

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

  const handleReceiptDownload = (recipient?: any) => {
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

      const mainColor = [115, 78, 212]; // #734ED4

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
      pdf.text(`${formatNum(sendAmt)} ${transaction.currency || 'RUB'}`, pageWidth - margin - 6, y, { align: 'right' });
      
      y += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Taux de change:', margin + 6, y);
      pdf.text(`1 RUB = ${rate.toFixed(2)} ${transaction.destinationCurrency || 'XAF'}`, pageWidth - margin - 6, y, { align: 'right' });
      
      y += 12;
      pdf.setFontSize(isBulkRec ? 12 : 11);
      pdf.setTextColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.text('NET A RECEVOIR:', margin + 6, y);
      pdf.setFontSize(isBulkRec ? 15 : 13);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatNum(recvAmt)} ${transaction.destinationCurrency || 'XAF'}`, pageWidth - margin - 6, y, { align: 'right' });

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

      // Footer
      pdf.setTextColor(180, 180, 180);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Merci d\'avoir utilisé Flash Pay.', pageWidth / 2, pageHeight - 8, { align: 'center' });
      
      pdf.save(`FlashPay_${recipient ? recipient.name.replace(/\s+/g, '_') : 'Recu'}.pdf`);
      toast.success('Reçu téléchargé !', { id: t_toast });
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
          <button onClick={() => navigate('/transactions')} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#6236CC] px-5 py-3 font-semibold text-white">
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
      <div className="mx-auto max-w-3xl space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <button 
          onClick={() => navigate('/transactions')} 
          className="inline-flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#6236CC] hover:opacity-70 transition-all group px-2"
        >
          <div className="p-2 bg-[#6236CC]/10 rounded-full group-hover:-translate-x-1 transition-transform">
            <ArrowLeft size={16} />
          </div>
          Retour à l’historique
        </button>

        <div className="overflow-hidden rounded-[40px] border border-[#eadfff] bg-white shadow-[0_30px_90px_-20px_rgba(98,54,204,0.12)] transition-all">
          {/* Header Section with Glassmorphism Effect */}
          <div className="bg-gradient-to-br from-[#7C4DFF] via-[#6236CC] to-[#4d259f] px-8 py-16 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#7C4DFF]/20 rounded-full -ml-32 -mb-32 blur-[60px]"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/10 backdrop-blur-xl shadow-2xl border border-white/20 scale-110">
                <Send size={32} className="text-white drop-shadow-md" />
              </div>
              
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 drop-shadow-sm">
                  {transaction.isBulk ? 'Transfert Groupé' : (statusLabels[currentStatus] || 'Transaction')}
                </p>
                <h1 className="text-5xl font-black tracking-tighter sm:text-6xl drop-shadow-lg">
                  {transaction.amount?.toLocaleString('fr-FR')} <span className="text-2xl font-bold opacity-60">{transaction.currency}</span>
                </h1>
                <p className="text-sm text-white/60 font-black tracking-widest uppercase">
                  {transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-12 p-8 sm:p-12 bg-[#FEF7FF]/30 backdrop-blur-3xl">
            
            {/* BULK PROGRESS BANNER - Modernized */}
            {transaction.isBulk && (
              <div className="rounded-[36px] border-2 border-[#6236CC]/10 bg-white p-8 space-y-6 shadow-xl shadow-[#6236CC]/5 hover:shadow-2xl hover:shadow-[#6236CC]/10 transition-all duration-500">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <h3 className="text-[#6236CC] font-black text-xl tracking-tight">Progression de l'envoi</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{completedRecipients} sur {totalRecipients} bénéficiaires payés</p>
                  </div>
                  <div className="text-right">
                    <span className="text-4xl font-black text-[#6236CC] tracking-tighter">{Math.round(bulkProgress)}%</span>
                  </div>
                </div>
                <div className="w-full h-5 bg-[#F3EDF7] rounded-full overflow-hidden p-1 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-[#7C4DFF] to-[#6236CC] rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${bulkProgress}%` }}
                  >
                    <div className="w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-bar-stripes_2s_linear_infinite]" />
                  </div>
                </div>
              </div>
            )}

            {/* RECIPIENT(S) LIST - Premium Cards */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3 px-2">
                <div className="w-1 h-4 bg-[#6236CC] rounded-full"></div>
                {transaction.isBulk ? 'Liste des bénéficiaires' : 'Détails du bénéficiaire'}
              </h3>
              
              {!transaction.isBulk ? (
                <div className="rounded-[32px] border border-[#eadfff] bg-white p-8 flex items-center justify-between shadow-lg shadow-[#6236CC]/5 group hover:scale-[1.01] transition-all">
                  <div className="space-y-2">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">{transaction.recipientName || 'N/A'}</p>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400">{transaction.recipientPhone || 'N/A'}</span>
                        <div className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className="text-xs font-black text-[#6236CC] uppercase tracking-widest">{transaction.recipientOperator || 'Orange Money'}</span>
                    </div>
                  </div>
                  <div className={`rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${statusTone[currentStatus] || statusTone.pending} border-current/10`}>
                    {statusLabels[currentStatus] || currentStatus}
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {transaction.bulkRecipients?.map((rec: any) => (
                    <div key={rec.id} className="rounded-[32px] border border-slate-100 bg-white p-6 flex items-center justify-between hover:border-[#6236CC]/30 transition-all group shadow-sm hover:shadow-xl hover:shadow-[#6236CC]/5">
                      <div className="space-y-1">
                        <p className="font-black text-slate-900 text-lg tracking-tight">{rec.name}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{rec.phone} • {rec.operator}</p>
                      </div>
                      <div className="flex items-center gap-6">
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
                            className="p-4 bg-[#6236CC]/5 text-[#6236CC] rounded-[20px] hover:bg-[#6236CC] hover:text-white transition-all shadow-sm border border-[#6236CC]/10"
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

            {/* GLOBAL STATUS TIMELINE - Premium Checkmark Design */}
            {!transaction.isBulk && (
              <div className="rounded-[40px] border border-[#eadfff] bg-white p-10 sm:p-12 shadow-xl shadow-[#6236CC]/5">
                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-[#6236CC] mb-12">
                  <div className="p-2 bg-[#6236CC]/10 rounded-lg">
                    <Clock3 size={18} />
                  </div>
                  Chronologie du transfert
                </div>
                
                <div className="space-y-12 relative ml-3">
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[#f3edff]" />
                  {steps.map((status, index) => {
                    const active = index <= stepIndex;
                    const isFailed = status === 'failed' && currentStatus === 'failed';

                    return (
                      <div key={status} className="flex gap-10 relative z-10 group">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-700 ${
                            isFailed ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/30' :
                            active ? 'bg-[#6236CC] text-white shadow-xl shadow-[#6236CC]/30 scale-110' : 'bg-white border-2 border-[#f3edff] text-[#f3edff]'
                        }`}>
                          {isFailed ? <ArrowLeft size={18} strokeWidth={3} className="rotate-[135deg]" /> : <CheckCircle2 size={18} strokeWidth={3} className={active ? 'animate-in zoom-in duration-500' : ''} />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className={`font-black text-xl tracking-tight transition-colors duration-500 ${isFailed ? 'text-rose-600' : active ? 'text-slate-900' : 'text-slate-200'}`}>{statusLabels[status]}</p>
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

            {/* GLOBAL RECEIPT section - Premium Call to Action */}
            {currentStatus === 'completed' && !transaction.isBulk && (
              <div className="rounded-[40px] border-2 border-[#eadfff] bg-gradient-to-br from-white to-[#F3EDF7]/50 p-10 sm:p-12 shadow-2xl shadow-[#6236CC]/10 group hover:scale-[1.01] transition-all">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-10">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-[#6236CC] shadow-xl border border-[#eadfff] group-hover:rotate-6 transition-transform">
                      <FileText size={36} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-slate-900 text-2xl tracking-tight">Reçu de transaction</h4>
                      <p className="text-sm text-slate-500 font-bold uppercase tracking-widest opacity-60">Votre document officiel est prêt</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleReceiptDownload()}
                    className="w-full sm:w-auto px-12 py-5 bg-[#6236CC] text-white font-black uppercase text-xs tracking-widest rounded-full shadow-2xl shadow-[#6236CC]/40 hover:translate-y-[-4px] active:scale-95 transition-all flex items-center justify-center gap-4 group"
                  >
                    <Download size={22} className="group-hover:animate-bounce" /> Télécharger
                  </button>
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