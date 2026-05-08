import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supportService } from '../services/firebase';
import { Layout } from '../components/Layout';
import { HelpCircle, Send, AlertCircle, MessageSquare, History } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Error, Success } from '../components/UI';
import { useNavigate } from 'react-router-dom';

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
      setTimeout(() => navigate('/profile'), 3000);
    } catch (err: any) {
      setError(err.message || t('error_sending_ticket'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8 pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2 px-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter sm:text-5xl">{t('contact_support')}</h1>
          <p className="text-slate-500 font-bold uppercase text-[11px] tracking-[0.2em] opacity-70">{t('support_desc')}</p>
        </div>

        {error && <Error message={error} onDismiss={() => setError('')} />}
        {success && <Success message={success} />}

        <div className="bg-white rounded-[40px] p-6 sm:p-10 border border-[#eadfff] shadow-xl shadow-slate-900/5">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-[#F3EDF7] rounded-2xl flex items-center justify-center text-[#6236CC] shadow-sm">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Soumettre un incident</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Type de problème</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900 appearance-none"
              >
                <option value="Transfert">Problème de transfert</option>
                <option value="KYC">Problème de vérification KYC</option>
                <option value="Bonus">Problème de bonus</option>
                <option value="Compte">Accès au compte</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">ID de la transaction (facultatif)</label>
              <input 
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Ex: #ABC123XYZ"
                className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Description détaillée</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Décrivez votre problème en détail pour que nous puissions vous aider rapidement..."
                className="w-full px-6 py-5 bg-[#F8F9FC] border border-slate-100 rounded-[32px] focus:outline-none focus:border-[#6236CC] font-medium text-slate-900 resize-none"
              />
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl flex gap-3 text-amber-700">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-xs font-bold leading-relaxed">
                Notre équipe examine chaque incident manuellement. Vous recevrez une notification dès qu'une solution sera apportée.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#6236CC] text-white font-black py-6 rounded-[32px] shadow-2xl hover:translate-y-[-4px] active:scale-95 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest mt-12"
            >
              {loading ? 'Envoi en cours...' : (
                <>
                  <Send size={18} />
                  Envoyer mon message
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="bg-slate-900 rounded-[40px] p-8 text-white relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-[#6236CC]/20 rounded-full blur-3xl transition-all group-hover:bg-[#6236CC]/30"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <History size={20} className="text-[#6236CC]" />
              <h4 className="font-black tracking-tight text-lg">Temps de réponse</h4>
            </div>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Nous traitons généralement les demandes sous 2 à 4 heures pendant les jours ouvrables. Merci de votre patience.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
