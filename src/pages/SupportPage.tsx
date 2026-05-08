import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supportService } from '../services/firebase';
import { Layout } from '../components/Layout';
import { HelpCircle, Send, AlertCircle, MessageSquare, History, ChevronRight } from 'lucide-react';
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
      <div className="max-w-xl mx-auto space-y-6 pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-1 px-2 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('contact_support')}</h1>
          <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest">{t('support_desc')}</p>
        </div>

        {error && <Error message={error} onDismiss={() => setError('')} />}
        {success && <Success message={success} />}

        <div className="premium-card p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Soumettre un incident</h3>
              <p className="text-slate-400 text-xs font-medium">Réponse rapide garantie</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Type de problème</label>
              <div className="relative group">
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="input-field appearance-none cursor-pointer pr-10 py-3 text-sm"
                >
                  <option value="Transfert">Transfert</option>
                  <option value="KYC">KYC / Vérification</option>
                  <option value="Bonus">Bonus / Parrainage</option>
                  <option value="Compte">Compte / Accès</option>
                  <option value="Autre">Autre</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-primary transition-colors">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">ID Transaction (facultatif)</label>
              <input 
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="#ABC123XYZ"
                className="input-field py-3 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Décrivez votre problème..."
                className="input-field resize-none py-3 text-sm leading-relaxed font-medium"
              />
            </div>

            <div className="p-4 bg-amber-50/50 rounded-xl flex gap-3 text-amber-700 border border-amber-100/50">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle size={18} />
              </div>
              <p className="text-[10px] font-bold leading-relaxed py-0.5">
                Examen manuel de chaque incident. Notification dès résolution.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-4 text-xs uppercase tracking-widest font-bold"
            >
              {loading ? 'Envoi...' : (
                <>
                  <Send size={16} />
                  Envoyer le message
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="bg-slate-900 rounded-2xl p-5 text-white relative overflow-hidden group shadow-xl">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/20 rounded-full blur-[40px] transition-all group-hover:bg-primary/30"></div>
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20">
                <History size={16} />
              </div>
              <h4 className="font-bold text-lg">Temps de réponse</h4>
            </div>
            <p className="text-slate-400 text-xs font-medium leading-relaxed max-w-md">
              Délai moyen de <span className="text-white">2 à 4 heures</span> (jours ouvrables).
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
