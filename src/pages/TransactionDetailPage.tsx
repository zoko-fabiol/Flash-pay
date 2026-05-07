import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Clock3, Download, FileText, Info, Send } from 'lucide-react';
import { db } from '../services/firebase';
import { Layout } from '../components/Layout';
import { Loading } from '../components/UI';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const statusOrder = ['pending', 'proof_received', 'confirmed', 'completed'] as const;

const statusLabels: Record<string, string> = {
  pending: 'Transfert initié',
  proof_received: 'Paiement en cours',
  confirmed: 'Paiement confirmé',
  completed: 'Transfert effectué',
  failed: 'Échec',
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

  const stepIndex = useMemo(() => {
    const index = statusOrder.indexOf(currentStatus as any);
    return index === -1 ? 0 : index;
  }, [currentStatus]);

  const handleReceiptDownload = () => {
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
      pdf.text(transaction.clientName || 'Client Flash Pay', margin, y + 5);
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
      pdf.text((transaction.type || 'Transfert').toUpperCase(), margin + 25, y);
      
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Destination:', margin, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${transaction.toCountry || transaction.destinationCountry || 'N/A'} (${transaction.operator || transaction.recipientOperator || 'N/A'})`, margin + 25, y);
      
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Beneficiaire:', margin, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.recipientName || 'N/A', margin + 25, y);
      
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Telephone:', margin, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(transaction.recipientPhone || transaction.recipientAccount || 'N/A', margin + 25, y);

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
      pdf.text(`${formatNum(transaction.amount)} ${transaction.currency || 'RUB'}`, pageWidth - margin - 4, y, { align: 'right' });
      
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Frais de transfert:', margin + 4, y);
      pdf.text(`${formatNum(transaction.fee || 0)} ${transaction.currency || 'RUB'}`, pageWidth - margin - 4, y, { align: 'right' });
      
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text('Taux de change:', margin + 4, y);
      pdf.text(`1 ${transaction.currency || 'RUB'} = ${transaction.exchangeRate?.toFixed(2) || '1.00'} ${transaction.destinationCurrency || transaction.currency || 'XAF'}`, pageWidth - margin - 4, y, { align: 'right' });
      
      y += 8;
      pdf.setFontSize(10);
      pdf.setTextColor(mainColor[0], mainColor[1], mainColor[2]);
      pdf.text('NET A RECEVOIR:', margin + 4, y);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${formatNum(transaction.receivedAmount || transaction.amount)} ${transaction.destinationCurrency || transaction.currency || 'XAF'}`, pageWidth - margin - 4, y, { align: 'right' });

      // Status
      y += 12;
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('STATUT DE LA TRANSACTION', pageWidth / 2, y, { align: 'center' });
      
      y += 5;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      const statusColor = transaction.status === 'completed' ? [0, 150, 0] : transaction.status === 'rejected' ? [200, 0, 0] : [255, 150, 0];
      pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.text((statusLabels[transaction.status] || transaction.status).toUpperCase(), pageWidth / 2, y, { align: 'center' });

      // Footer
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Merci d\'avoir utilise Flash Pay.', pageWidth / 2, pageHeight - 8, { align: 'center' });
      
      pdf.save(`FlashPay_Recu_${transaction.id}.pdf`);
      toast.success('Reçu téléchargé !', { id: t });
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du téléchargement', { id: t });
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

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-6">
        <button onClick={() => navigate('/transactions')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <ArrowLeft size={18} /> Retour à l’historique
        </button>

        <div className="overflow-hidden rounded-[28px] border border-[#eadfff] bg-white shadow-[0_18px_60px_rgba(98,54,204,0.10)]">
          <div className="bg-gradient-to-br from-[#6f3bd3] via-[#6236CC] to-[#4d259f] px-6 py-10 text-white sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
              <Send size={28} />
            </div>
            <p className="mt-4 text-center text-sm font-semibold uppercase tracking-[0.28em] text-white/75">{statusLabels[currentStatus] || 'Transaction'}</p>
            <h1 className="mt-3 text-center text-3xl font-black sm:text-4xl">{transaction.amount?.toLocaleString('fr-FR')} {transaction.currency}</h1>
            <p className="mt-2 text-center text-white/80">{transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</p>
          </div>

          <div className="space-y-6 p-5 sm:p-8">
            <div className="rounded-[24px] border border-[#eadfff] bg-[#faf7ff] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Montant envoyé</p>
                  <p className="text-2xl font-black text-slate-900">{transaction.amount?.toLocaleString('fr-FR')} {transaction.currency}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[currentStatus] || statusTone.pending}`}>
                  {statusLabels[currentStatus] || currentStatus}
                </span>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-4 shadow-[0_8px_18px_rgba(98,54,204,0.05)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Destinataire</p>
                  <p className="mt-1 font-semibold text-slate-900">{transaction.recipientName || 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-[0_8px_18px_rgba(98,54,204,0.05)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Opérateur</p>
                  <p className="mt-1 font-semibold text-slate-900">{transaction.recipientOperator || transaction.operator || 'Orange Money'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#eadfff] bg-white p-5 shadow-[0_10px_26px_rgba(98,54,204,0.06)]">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#6236CC]">
                <Clock3 size={16} /> Mise à jour du statut
              </div>

              <div className="mt-6 space-y-5">
                {statusOrder.map((status, index) => {
                  const active = index <= stepIndex;
                  const current = index === stepIndex;

                  return (
                    <div key={status} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${active ? 'border-[#6236CC] bg-[#6236CC] text-white' : 'border-slate-200 bg-white text-slate-300'}`}>
                          {active ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                        </div>
                        {index < statusOrder.length - 1 && <div className={`mt-2 h-full w-px flex-1 ${active ? 'bg-[#6236CC]' : 'bg-slate-200'}`} />}
                      </div>
                      <div className="flex-1 pb-6">
                        <p className={`font-semibold ${active ? 'text-slate-900' : 'text-slate-400'}`}>{statusLabels[status]}</p>
                        <p className="text-sm text-slate-500">{status === 'pending' && 'Votre transfert a été créé.'}</p>
                        <p className="text-sm text-slate-500">{status === 'proof_received' && 'Le paiement est en cours de vérification.'}</p>
                        <p className="text-sm text-slate-500">{status === 'confirmed' && 'Le paiement a été confirmé par l’équipe.'}</p>
                        <p className="text-sm text-slate-500">{status === 'completed' && 'Le bénéficiaire a reçu les fonds.'}</p>
                        {current && (
                          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#efe6ff] px-3 py-1 text-xs font-semibold text-[#6236CC]">
                            <Info size={14} /> En attente de la prochaine mise à jour
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {currentStatus === 'completed' && (
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 shadow-[0_10px_24px_rgba(16,185,129,0.08)]">
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 text-emerald-600" size={20} />
                  <div>
                    <p className="font-semibold text-emerald-900">Reçu final disponible</p>
                    <p className="mt-1 text-sm text-emerald-700">Téléchargez le reçu de la transaction une fois le transfert effectué.</p>
                  </div>
                </div>
                <button onClick={handleReceiptDownload} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6236CC] px-5 py-3 font-semibold text-white sm:w-auto">
                  <Download size={16} /> Télécharger le reçu de la transaction
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TransactionDetailPage;