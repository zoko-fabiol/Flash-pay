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
  Search,
  Award,
  TrendingUp,
  Mail,
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

const PartnersPage: React.FC = () => {
  const [partners, setPartners] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('isPartner', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPartners(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handlePayout = async (partner: any) => {
    const amount = partner.earnings || 0;
    if (amount <= 0) return toast.error('Solde insuffisant pour un virement.');
    
    if (window.confirm(`Confirmer le virement de ${amount} RUB à ${partner.displayName || 'ce partenaire'} ?`)) {
       const t = toast.loading('Traitement du paiement...');
       try {
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

         toast.success('Paiement validé avec succès', { id: t });
       } catch (e) {
         console.error(e);
         toast.error('Erreur lors du traitement', { id: t });
       }
    }
  };

  const filteredPartners = partners.filter(p => 
    (p.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.referralCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-[#661489] text-white rounded-[16px] flex items-center justify-center shadow-lg"><Award size={24} /></div>
            Gestion des Partenaires
          </h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Suivi des parrainages et reversements de commissions</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="m3-search flex-1 lg:w-80">
            <Search className="text-[#49454F]" size={18} />
            <input 
              type="text"
              placeholder="Rechercher nom, code, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="m3-card-elevated bg-[#F3EDF7]/50 flex items-center gap-5 border-[#E7E0EB]">
           <div className="w-14 h-14 bg-white text-[#661489] rounded-2xl flex items-center justify-center shadow-sm"><Gift size={28} /></div>
           <div>
              <p className="text-[#49454F] text-[9px] font-black uppercase tracking-[0.2em] mb-1">Partenaires Actifs</p>
              <p className="text-2xl font-black text-[#1D1B20]">{partners.length}</p>
           </div>
        </div>
        <div className="m3-card-elevated bg-[#F3EDF7]/50 flex items-center gap-5 border-[#E7E0EB]">
           <div className="w-14 h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm"><TrendingUp size={28} /></div>
           <div>
              <p className="text-[#49454F] text-[9px] font-black uppercase tracking-[0.2em] mb-1">Gains en Attente</p>
              <p className="text-2xl font-black text-[#1D1B20]">{partners.reduce((acc, p) => acc + (p.earnings || 0), 0).toLocaleString()} <span className="text-[10px] opacity-40">RUB</span></p>
           </div>
        </div>
        <div className="m3-card-elevated bg-[#661489] text-white flex items-center gap-5 shadow-xl shadow-[#661489]/20">
           <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"><Users size={28} /></div>
           <div>
              <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em] mb-1">Filleuls Totaux</p>
              <p className="text-2xl font-black text-white">{partners.reduce((acc, p) => acc + (p.referralCount || 0), 0)}</p>
           </div>
        </div>
      </div>

      {/* Partners List */}
      <div className="m3-card-elevated !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F3EDF7]/50 text-[#49454F] text-[10px] uppercase font-black tracking-[0.2em] border-b border-[#E7E0EB]">
                <th className="px-8 py-5">Partenaire</th>
                <th className="px-8 py-5">Code & Filleuls</th>
                <th className="px-8 py-5">Finances & Gains</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0EB]">
              {loading ? (
                <tr>
                   <td colSpan={4} className="px-8 py-32 text-center text-[#49454F]/30 italic text-sm">Chargement des données partenaires...</td>
                </tr>
              ) : filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center text-[#49454F]/30 italic text-sm">Aucun partenaire trouvé</td>
                </tr>
              ) : (
                filteredPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-[#F3EDF7]/30 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#EADDFF] text-[#21005D] rounded-[18px] flex items-center justify-center font-black text-lg border border-[#661489]/10 shadow-sm group-hover:scale-110 transition-transform">
                          {partner.displayName?.charAt(0) || <Users size={20} />}
                        </div>
                        <div>
                          <p className="text-[#1D1B20] font-black tracking-tight">{partner.displayName || 'Ambassadeur'}</p>
                          <div className="flex items-center gap-2 mt-1 text-[#49454F] opacity-60">
                             <Mail size={12} className="text-[#661489]" />
                             <span className="text-[10px] font-bold">{partner.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-2">
                          <span className="inline-flex items-center bg-[#F3EDF7] text-[#661489] px-3 py-1 rounded-full text-[10px] font-mono font-black tracking-widest border border-[#E7E0EB] shadow-sm w-fit">
                            {partner.referralCode || 'N/A'}
                          </span>
                          <p className="text-[9px] font-black text-[#49454F] uppercase tracking-[0.2em] opacity-40 ml-1">{partner.referralCount || 0} Clients recrutés</p>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="flex flex-col">
                            <p className="text-xl font-black text-emerald-600 tracking-tighter">{(partner.earnings || 0).toLocaleString()} <span className="text-[10px] opacity-40">RUB</span></p>
                            <p className="text-[9px] font-black text-[#49454F] uppercase tracking-widest opacity-40 mt-0.5">Cumul payé : {(partner.totalPaidOut || 0).toLocaleString()} RUB</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-3">
                         <button 
                          onClick={() => handlePayout(partner)}
                          disabled={!partner.earnings || partner.earnings <= 0}
                          className="m3-btn-filled !py-2.5 !px-5 text-[9px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-20 shadow-lg"
                        >
                          <ArrowUpRight size={14} /> Payer
                        </button>
                        <button className="p-2.5 bg-white border border-[#E7E0EB] text-[#49454F] hover:bg-[#F3EDF7] rounded-xl transition-all shadow-sm">
                           <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PartnersPage;

