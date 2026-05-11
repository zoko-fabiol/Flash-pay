import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Mail, 
  Bell, 
  Calendar, 
  History, 
  Trash2, 
  Plus,
  MessageSquare,
  Check
} from 'lucide-react';
import { sendBroadcastDirect } from '../../services/adminNotificationService';
import type { BroadcastOptions } from '../../services/adminNotificationService';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

export const MessagesToUsers: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const loadBroadcasts = async () => {
    try {
      setLoadingBroadcasts(true);
      const broadcastsRef = collection(db, 'admin_broadcasts');
      const q = query(broadcastsRef, orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBroadcasts(data);
    } catch (err) {
      console.error('Error loading broadcasts:', err);
    } finally {
      setLoadingBroadcasts(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce message historique ?')) return;
    
    const t = toast.loading('Suppression...');
    try {
      await deleteDoc(doc(db, 'admin_broadcasts', id));
      setBroadcasts(broadcasts.filter(b => b.id !== id));
      toast.success('Message supprimé de l\'historique', { id: t });
    } catch (err) {
      console.error('Error deleting broadcast:', err);
      toast.error('Erreur lors de la suppression', { id: t });
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('fr-FR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sendEmail && !sendNotification) {
      toast.error('Sélectionnez au moins un type d\'envoi');
      return;
    }

    setSending(true);
    const t = toast.loading('Envoi du message en cours...');
    try {
      const options: BroadcastOptions = {
        sendEmail,
        sendNotification
      };
      const result = await sendBroadcastDirect(title, body, options);
      if (result.sent > 0) {
        toast.success(`Message envoyé à ${result.sent} utilisateurs`, { id: t });
        setTitle('');
        setBody('');
        setTimeout(() => loadBroadcasts(), 1000);
      } else {
        toast.error('Aucun utilisateur trouvé.', { id: t });
      }
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`, { id: t });
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#470B37]/10 flex items-center justify-center text-[#470B37]">
          <MessageSquare size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Messages aux utilisateurs</h1>
          <p className="text-slate-500 font-medium">Communiquez avec l'ensemble de vos clients par mail ou notification.</p>
        </div>
      </div>

      {/* Formulaire d'envoi */}
      <div className="bg-white rounded-[32px] p-8 shadow-[0_20px_50px_rgba(126,80,157,0.05)] border border-slate-100">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
          <div className="w-10 h-10 rounded-xl bg-[#470B37]/5 flex items-center justify-center text-[#470B37]">
            <Plus size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-900">Envoyer un nouveau message</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-3">
              <label className="block text-sm font-black text-slate-700 uppercase tracking-wider ml-1">Titre du message</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:border-[#470B37] focus:bg-white focus:ring-4 focus:ring-[#470B37]/5 outline-none transition-all text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-medium"
                placeholder="ex: Annonce importante sur les nouveaux tarifs"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-black text-slate-700 uppercase tracking-wider ml-1">Contenu du message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:border-[#470B37] focus:bg-white focus:ring-4 focus:ring-[#470B37]/5 outline-none transition-all text-slate-900 font-bold resize-none min-h-[180px] placeholder:text-slate-400 placeholder:font-medium"
                placeholder="Entrez le message à envoyer (Le format HTML est supporté pour les emails)"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div 
              onClick={() => setSendEmail(!sendEmail)}
              className={`p-6 rounded-[24px] border-2 cursor-pointer transition-all flex items-center gap-5 group ${sendEmail ? 'border-[#470B37] bg-[#470B37]/5' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${sendEmail ? 'bg-[#470B37] text-white shadow-lg shadow-[#470B37]/20' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                <Mail size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-black text-base ${sendEmail ? 'text-slate-900' : 'text-slate-500'}`}>Par Email</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${sendEmail ? 'border-[#470B37] bg-[#470B37] text-white' : 'border-slate-200'}`}>
                    {sendEmail && <Check size={14} strokeWidth={4} />}
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-bold mt-1">Aux utilisateurs avec opt-in</p>
              </div>
            </div>
            
            <div 
              onClick={() => setSendNotification(!sendNotification)}
              className={`p-6 rounded-[24px] border-2 cursor-pointer transition-all flex items-center gap-5 group ${sendNotification ? 'border-[#470B37] bg-[#470B37]/5' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${sendNotification ? 'bg-[#470B37] text-white shadow-lg shadow-[#470B37]/20' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                <Bell size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={`font-black text-base ${sendNotification ? 'text-slate-900' : 'text-slate-500'}`}>En Notification</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${sendNotification ? 'border-[#470B37] bg-[#470B37] text-white' : 'border-slate-200'}`}>
                    {sendNotification && <Check size={14} strokeWidth={4} />}
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-bold mt-1">À tous les utilisateurs</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={sending || !title.trim() || !body.trim() || (!sendEmail && !sendNotification)}
            className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {sending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ENVOI EN COURS...
              </>
            ) : (
              <>
                <Send size={20} /> ENVOYER LE MESSAGE
              </>
            )}
          </button>
        </form>
      </div>

      {/* Historique des messages */}
      <div className="bg-white rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900">
              <History size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-900">Historique des messages</h2>
          </div>
          <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
            {broadcasts.length} Messages
          </span>
        </div>
        
        {loadingBroadcasts ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="w-10 h-10 border-4 border-slate-100 border-t-[#470B37] rounded-full animate-spin" />
             <p className="text-slate-500 font-bold">Chargement de l'historique...</p>
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-[24px] border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4">
               <History size={32} />
            </div>
            <p className="text-slate-500 font-bold">Aucun message envoyé pour le moment</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {broadcasts.map((broadcast) => (
              <div key={broadcast.id} className="p-6 bg-white border border-slate-100 rounded-[24px] hover:border-[#470B37]/30 hover:shadow-lg transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex-1 min-w-0 pr-12">
                    <div className="flex items-center gap-3 mb-2">
                       <h3 className="font-black text-slate-900 truncate text-lg">{broadcast.title}</h3>
                       <div className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ${broadcast.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {broadcast.status === 'sent' ? 'Envoyé' : 'Erreur'}
                       </div>
                    </div>
                    <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">
                       {broadcast.body?.replace(/<[^>]*>/g, '') || 'Message'}
                    </p>
                    
                    <div className="flex gap-6 mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <div className="flex items-center gap-2">
                         <Calendar size={12} className="text-slate-300" /> {formatDate(broadcast.createdAt)}
                      </div>
                      {broadcast.sendEmail && (
                        <div className="flex items-center gap-2 text-[#470B37]">
                           <Mail size={12} /> Email ({broadcast.recipientCount || 0})
                        </div>
                      )}
                      {broadcast.sendNotification && (
                        <div className="flex items-center gap-2 text-[#470B37]">
                           <Bell size={12} /> Notification ({broadcast.notificationsCreated || 0})
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDelete(broadcast.id)}
                    className="w-10 h-10 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0 absolute top-0 right-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#470B37]/5 rounded-full -mr-16 -mt-16 group-hover:bg-[#470B37]/10 transition-all"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesToUsers;
