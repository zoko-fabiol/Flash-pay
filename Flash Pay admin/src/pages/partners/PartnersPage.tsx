import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  doc,
  updateDoc,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Users, 
  Gift, 
  ArrowUpRight, 
  Search
} from 'lucide-react';

const PartnersPage: React.FC = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // In a real app, you might have a flag 'isPartner' on users
    const q = query(collection(db, 'users'), where('isPartner', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });
    return () => unsubscribe();
  }, []);

  const handlePayout = async (partner: any) => {
    const amount = partner.earnings || 0;
    if (amount <= 0) return alert('Solde insuffisant.');
    
    if (confirm(`Confirmer le paiement de ${amount} RUB à ${partner.displayName} ?`)) {
       try {
         // Reset earnings and log payout
         await updateDoc(doc(db, 'users', partner.id), {
           earnings: 0,
           totalPaidOut: (partner.totalPaidOut || 0) + amount,
           lastPayoutAt: Timestamp.now()
         });

         await addDoc(collection(db, 'payout_logs'), {
           partnerId: partner.id,
           amount,
           timestamp: Timestamp.now(),
           status: 'completed'
         });

         alert('Paiement enregistré avec succès.');
       } catch (e) {
         console.error(e);
         alert('Erreur lors du paiement.');
       }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestion des Partenaires</h2>
          <p className="text-slate-400 text-sm">Suivi des parrainages et reversements des commissions</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-card-dark border border-border-dark px-4 py-2 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-brand/10 text-brand rounded-lg">
                <Gift size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Total Partenaires</p>
                <p className="text-white font-bold">{partners.length}</p>
              </div>
           </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un partenaire (Nom, Code...)" 
            className="w-full bg-card-dark border border-border-dark rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-brand transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Partners List */}
      <div className="bg-card-dark border border-border-dark rounded-3xl overflow-hidden shadow-xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-800/30 border-b border-border-dark text-slate-500 text-[10px] uppercase font-black tracking-widest">
              <th className="px-6 py-4">Partenaire</th>
              <th className="px-6 py-4">Code de Parrainage</th>
              <th className="px-6 py-4">Filleuls Actifs</th>
              <th className="px-6 py-4">Gains Actuels</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {partners.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                  Aucun partenaire trouvé.
                </td>
              </tr>
            ) : (
              partners.map((partner) => (
                <tr key={partner.id} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 font-bold border border-slate-700">
                        {partner.displayName?.charAt(0) || <Users size={18} />}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{partner.displayName || 'Utilisateur'}</p>
                        <p className="text-slate-500 text-xs">{partner.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="bg-brand/10 text-brand px-3 py-1 rounded-lg font-mono text-xs font-bold border border-brand/20">
                      {partner.referralCode || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-white font-medium">
                    {partner.referralCount || 0}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-emerald-500 font-black text-lg">{(partner.earnings || 0).toLocaleString()} RUB</p>
                    <p className="text-slate-500 text-[10px]">Total payé : {(partner.totalPaidOut || 0).toLocaleString()} RUB</p>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => handlePayout(partner)}
                      disabled={!partner.earnings || partner.earnings <= 0}
                      className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-20 flex items-center gap-2 ml-auto"
                    >
                      <ArrowUpRight size={14} /> Payer le partenaire
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PartnersPage;
