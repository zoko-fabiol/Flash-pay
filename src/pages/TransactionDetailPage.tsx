import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Clock3, Download, FileText, Info, Send } from 'lucide-react';
import { db } from '../services/firebase';
import { Layout } from '../components/Layout';
import { Loading } from '../components/UI';

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

    const content = [
      'Flash Pay - Reçu de transaction',
      `Transaction: ${transaction.id}`,
      `Statut: ${statusLabels[currentStatus] || currentStatus}`,
      `Montant: ${transaction.amount} ${transaction.currency}`,
      `Destinataire: ${transaction.recipientName || 'N/A'}`,
      `Téléphone: ${transaction.recipientPhone || transaction.recipientAccount || 'N/A'}`,
      `Créé le: ${transaction.createdAt?.toDate ? transaction.createdAt.toDate().toLocaleString('fr-FR') : ''}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flash-pay-recu-${transaction.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
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