import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supportService, db } from '../services/firebase';
import { Layout } from '../components/Layout';
import { HelpCircle, Send, AlertCircle, MessageSquare, History, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Error, Success } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Autre');
  const [transactionId, setTransactionId] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    // Use problem_reports for consistency with supportService.submitTicket
    const q = query(
      collection(db, 'problem_reports'),
      where('userId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid requiring a composite index
      setTickets(docs.sort((a, b) => {
        const t1 = (a as any).createdAt?.toMillis?.() || 0;
        const t2 = (b as any).createdAt?.toMillis?.() || 0;
        return t2 - t1;
      }));
      setLoadingTickets(false);
    }, (err) => {
      console.error('Error listening to tickets:', err);
      setLoadingTickets(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(t('error_description_required') || 'Veuillez décrire votre problème');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await supportService.submitTicket(user!.id, {
        description,
        type,
        transactionId: transactionId.trim() || 'N/A'
      });
      setSuccess(t('support_ticket_sent') || 'Votre message a été envoyé avec succès');
      setDescription('');
      setTransactionId('');
    } catch (err: any) {
      setError(err.message || t('error_sending_ticket'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'in_progress': return <Clock size={14} className="text-amber-500" />;
      default: return <AlertCircle size={14} className="text-slate-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved': return t('status_resolved') || 'Résolu';
      case 'in_progress': return t('status_in_progress') || 'En cours';
      default: return t('status_open') || 'Ouvert';
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-8 pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-1 px-2 text-center sm:text-left">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t('contact_support')}</h1>
          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">{t('support_desc')}</p>
        </div>

        {error && <Error message={error} onDismiss={() => setError('')} />}
        {success && <Success message={success} />}

        <div className="premium-card p-5 sm:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('new_incident')}</h3>
              <p className="text-slate-400 text-xs font-medium">{t('nouvel_incident_desc')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('issue_type')}</label>
              <div className="relative group">
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="input-field appearance-none cursor-pointer pr-10 py-4 text-sm font-bold"
                >
                  <option value="Transfert">{t('type_transfer')}</option>
                  <option value="KYC">{t('type_kyc')}</option>
                  <option value="Bonus">{t('type_bonus')}</option>
                  <option value="Compte">{t('type_account')}</option>
                  <option value="Autre">{t('type_other')}</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-primary transition-colors">
                  <ChevronRight size={18} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('transaction_id_optional')}</label>
              <input 
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="#ABC123XYZ"
                className="input-field py-4 text-sm font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('description_label')}</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder={t('description_placeholder')}
                className="input-field resize-none py-4 text-sm leading-relaxed font-bold"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-5 text-sm uppercase tracking-widest font-black shadow-xl shadow-primary/20"
            >
              {loading ? t('sending') : (
                <>
                  <Send size={18} />
                  {t('send_request')}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Tickets History List */}
        {!loadingTickets && tickets.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">{t('recent_incidents')}</h3>
            <div className="grid gap-3">
              {tickets.map(ticket => (
                <div key={ticket.id} className="premium-card p-5 flex items-center justify-between group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      ticket.status === 'resolved' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {ticket.type === 'Transfert' ? <History size={18} /> : <MessageSquare size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{ticket.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest">{t(`type_${ticket.type.toLowerCase()}`)}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-200" />
                        <div className="flex items-center gap-1">
                          {getStatusIcon(ticket.status)}
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{getStatusLabel(ticket.status)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-200 group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-2xl">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-primary/20 rounded-full blur-[60px] transition-all group-hover:bg-primary/30"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <History size={20} />
              </div>
              <h4 className="font-black text-xl">{t('response_time')}</h4>
            </div>
            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-md">
              {t('response_time_desc')}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
