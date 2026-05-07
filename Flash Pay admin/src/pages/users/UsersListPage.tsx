import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Users, 
  Search, 
  Eye, 
  X,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  Award,
  Link as LinkIcon
} from 'lucide-react';

const UsersListPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    return (user.nom?.toLowerCase().includes(term) || 
            user.email?.toLowerCase().includes(term) ||
            user.tel?.includes(term) ||
            user.referralCode?.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-brand" /> Gestion des Utilisateurs
          </h2>
          <p className="text-slate-400 text-sm">Consultez et gérez la base de données clients</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Rechercher (nom, email, tel, code...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      <div className="bg-card-dark border border-border-dark rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Statut KYC</th>
                <th className="px-6 py-4">Code Parrainage</th>
                <th className="px-6 py-4">Date d'inscription</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Chargement des utilisateurs...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold">
                          {user.nom?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <button onClick={() => setSelectedUser(user)} className="font-bold text-white hover:text-brand transition-colors text-left">
                            {user.nom || 'Sans Nom'}
                          </button>
                          <p className="text-xs text-slate-500">ID: {user.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail size={12} className="text-slate-500"/> 
                        <a href={`mailto:${user.email}`} className="hover:text-brand transition-colors">{user.email}</a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-slate-500"/> 
                        {user.tel ? (
                          <a href={`tel:${user.tel}`} className="hover:text-brand transition-colors">{user.tel}</a>
                        ) : (
                          'N/A'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        user.statut_kyc === 'Expert' ? 'bg-emerald-500/10 text-emerald-500' :
                        user.statut_kyc === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                        user.statut_kyc === 'Rejected' ? 'bg-rose-500/10 text-rose-500' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                        {user.statut_kyc || 'Standard'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.referralCode ? (
                        <span className="font-mono text-brand bg-brand/10 px-2 py-1 rounded text-xs border border-brand/20">
                          {user.referralCode}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-xs">Aucun</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-500"/>
                        {user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString() : new Date(user.createdAt).toLocaleDateString()) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="p-2 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-bg-dark/90 backdrop-blur-md">
          <div className="bg-card-dark border border-border-dark w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-border-dark flex justify-between items-center bg-slate-800/30">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-white">
                  {selectedUser.nom?.charAt(0).toUpperCase() || '?'}
                </div>
                Détails du profil
              </h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-500 hover:text-white p-1">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto scrollbar-hide flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Informations Principales */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-brand uppercase tracking-widest flex items-center gap-2">
                    <Users size={16} /> Identité
                  </h4>
                  <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Nom Complet</p>
                      <p className="text-white font-medium text-lg">{selectedUser.nom || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">ID Utilisateur</p>
                      <p className="text-slate-300 font-mono text-sm">{selectedUser.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Date d'inscription</p>
                      <p className="text-slate-300">
                        {selectedUser.createdAt ? (selectedUser.createdAt.toDate ? selectedUser.createdAt.toDate().toLocaleString() : new Date(selectedUser.createdAt).toLocaleString()) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-brand uppercase tracking-widest flex items-center gap-2 pt-4">
                    <Phone size={16} /> Contact
                  </h4>
                  <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="text-slate-500" size={18} />
                      <div>
                        <p className="text-xs text-slate-500">Email</p>
                        <a href={`mailto:${selectedUser.email}`} className="text-white hover:text-brand transition-colors">{selectedUser.email}</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="text-slate-500" size={18} />
                      <div>
                        <p className="text-xs text-slate-500">Téléphone</p>
                        {selectedUser.tel ? (
                          <a href={`tel:${selectedUser.tel}`} className="text-white hover:text-brand transition-colors">{selectedUser.tel}</a>
                        ) : (
                          <p className="text-slate-500 italic">Non renseigné</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statut & Finances */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-brand uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={16} /> Statut KYC
                  </h4>
                  <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400">Niveau actuel</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedUser.statut_kyc === 'Expert' ? 'bg-emerald-500/10 text-emerald-500' :
                        selectedUser.statut_kyc === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                        selectedUser.statut_kyc === 'Rejected' ? 'bg-rose-500/10 text-rose-500' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                        {selectedUser.statut_kyc || 'Standard'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      {selectedUser.statut_kyc === 'Expert' 
                        ? 'Le compte est entièrement vérifié et bénéficie des limites de transfert maximales.' 
                        : 'Vérification incomplète. Limites réduites.'}
                    </p>
                  </div>

                  <h4 className="text-sm font-bold text-brand uppercase tracking-widest flex items-center gap-2 pt-4">
                    <Award size={16} /> Parrainage & Bonus
                  </h4>
                  <div className="bg-gradient-to-br from-brand/10 to-transparent border border-brand/20 rounded-2xl p-5 space-y-4">
                    <div>
                      <p className="text-xs text-brand mb-1 font-bold">Code Parrainage Personnel</p>
                      <div className="flex items-center justify-between bg-slate-900 rounded-lg p-3 border border-slate-700">
                        <span className="font-mono text-xl text-white font-bold tracking-widest">
                          {selectedUser.referralCode || 'Aucun'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Solde Bonus</p>
                        <p className="text-lg font-bold text-emerald-400">{selectedUser.solde_bonus || 0} XAF</p>
                      </div>
                      <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 text-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Parrainés</p>
                        <p className="text-lg font-bold text-blue-400">{selectedUser.referralStats?.invited || selectedUser.referredUsers?.length || 0}</p>
                      </div>
                    </div>

                    {selectedUser.referredBy && (
                      <div className="pt-2 border-t border-brand/10 mt-2">
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <LinkIcon size={12} /> Parrainé par: <span className="text-white font-mono">{selectedUser.referredBy}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
            
            <div className="p-6 border-t border-border-dark bg-slate-800/30 flex justify-end">
              <button 
                onClick={() => setSelectedUser(null)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersListPage;
