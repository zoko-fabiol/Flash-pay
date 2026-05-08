import React, { useState, useEffect } from 'react';
import { MessagesProIcon, HistoryProIcon, TrashProIcon } from '../../components/ui/ProIcons';
import { sendBroadcastDirect } from '../../services/adminNotificationService';
import type { BroadcastOptions } from '../../services/adminNotificationService';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const MessagesToUsers: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendNotification, setSendNotification] = useState(true);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);

  // Load previous broadcasts
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
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce message?')) return;
    
    try {
      await deleteDoc(doc(db, 'admin_broadcasts', id));
      setBroadcasts(broadcasts.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting broadcast:', err);
      alert('Erreur lors de la suppression');
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
      setSuccess('❌ Sélectionnez au moins un type d\'envoi');
      return;
    }

    setSending(true);
    setSuccess(null);
    try {
      const options: BroadcastOptions = {
        sendEmail,
        sendNotification
      };
      const result = await sendBroadcastDirect(title, body, options);
      if (result.sent > 0) {
        setSuccess(`✅ Message envoyé avec succès (${result.sent} destinataires)`);
        setTitle('');
        setBody('');
        setTimeout(() => loadBroadcasts(), 1000);
      } else {
        setSuccess('⚠️ Aucun utilisateur trouvé.');
      }
    } catch (err: any) {
      setSuccess(`❌ Erreur : ${err.message}`);
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessagesProIcon size={24} className="text-purple-600" />
        <h1 className="text-2xl font-bold">Messages aux utilisateurs</h1>
      </div>

      {/* Formulaire d'envoi */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">📤 Envoyer un nouveau message</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Titre du message</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              placeholder="ex: Annonce importante"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Contenu du message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
              rows={6}
              placeholder="Entrez le message à envoyer (HTML supporté)"
              required
            />
          </div>

          {/* Checkboxes for send options */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium text-sm">📧 Par Email</div>
                <div className="text-xs text-gray-500">Aux utilisateurs avec opt-in</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={sendNotification}
                onChange={(e) => setSendNotification(e.target.checked)}
                className="w-4 h-4"
              />
              <div>
                <div className="font-medium text-sm">🔔 En Notification</div>
                <div className="text-xs text-gray-500">À tous les utilisateurs</div>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={sending || !title.trim() || !body.trim() || (!sendEmail && !sendNotification)}
            className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {sending ? '📤 Envoi en cours...' : '📤 Envoyer'}
          </button>
        </form>

        {success && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
            {success}
          </div>
        )}
      </div>

      {/* Historique des messages */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <HistoryProIcon size={20} /> Historique des messages ({broadcasts.length})
        </h2>
        
        {loadingBroadcasts ? (
          <div className="text-center text-gray-500 py-8">Chargement...</div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Aucun message envoyé</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {broadcasts.map((broadcast) => (
              <div key={broadcast.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{broadcast.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{broadcast.body?.replace(/<[^>]*>/g, '') || 'Message'}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                    <span>📅 {formatDate(broadcast.createdAt)}</span>
                    {broadcast.sendEmail && <span>📧 Email ({broadcast.recipientCount || 0})</span>}
                    {broadcast.sendNotification && <span>🔔 Notification ({broadcast.notificationsCreated || 0})</span>}
                    <span className={broadcast.status === 'sent' ? 'text-green-600' : 'text-red-600'}>
                      {broadcast.status === 'sent' ? '✅' : '❌'} {broadcast.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(broadcast.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Supprimer ce message"
                >
                  <TrashProIcon size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesToUsers;
