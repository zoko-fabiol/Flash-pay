import React, { useState } from 'react';
import { sendBroadcastDirect } from '../../services/adminNotificationService';

export const MessagesToUsers: React.FC = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSuccess(null);
    try {
      const result = await sendBroadcastDirect(title, body, { sendEmail: true });
      setSuccess(result.sent > 0 ? `Message envoyé à ${result.sent} utilisateurs` : 'Aucun destinataire trouvé');
      setTitle('');
      setBody('');
    } catch (err) {
      setSuccess('Erreur lors de l envoi');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Envoyer un message aux utilisateurs</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm">Titre</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border" />
        </div>
        <div>
          <label className="block text-sm">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full p-2 border h-28" />
        </div>
        <div>
          <button disabled={sending} className="btn btn-primary">{sending ? 'Envoi...' : 'Envoyer à tous'}</button>
        </div>
        {success && <div className="mt-2 text-sm">{success}</div>}
      </form>
    </div>
  );
};

export default MessagesToUsers;
