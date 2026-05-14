import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, deleteField, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../types';
import { buildPresetPermissions } from '../../lib/adminAccess';
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
  TrendingUp,
  Copy,
  Trash2,
  User as UserIcon,
  UserCog
} from 'lucide-react';
import toast from 'react-hot-toast';
import { emailService } from '../../services/emailService';

const UsersListPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [updatingAdminId, setUpdatingAdminId] = useState('');
  const [adminRoleDraft, setAdminRoleDraft] = useState<UserProfile['adminRole']>('restricted');
  
  // Email Manual State
  const [emailUser, setEmailUser] = useState<any | null>(null);
  const [emailSubject, setEmailSubject] = useState('Message de Flash Pay');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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

  const openUserDetails = (user: any) => {
    setSelectedUser(user);
    setAdminRoleDraft(user.adminRole || 'restricted');
  };

  const handleSendManualEmail = async () => {
    if (!emailUser?.email || !emailMessage) return;
    
    setIsSendingEmail(true);
    const t = toast.loading('Envoi de l\'email...');
    try {
      const htmlBody = emailService.getCustomMessageTemplate(emailMessage);
      await emailService.sendEmail(emailUser.email, emailSubject, htmlBody);
      toast.success('Email envoyé avec succès !', { id: t });
      setEmailUser(null);
      setEmailMessage('');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'envoi de l\'email', { id: t });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const toggleAdminPrivilege = async (user: any, nextRole?: UserProfile['adminRole']) => {
    if (!user?.id) return;

    const enabling = !user.isAdmin;
    const roleToApply = nextRole || adminRoleDraft || 'restricted';
    const toastId = toast.loading(enabling ? 'Attribution des privilèges admin...' : 'Retrait des privilèges admin...');
    setUpdatingAdminId(user.id);

    try {
      if (enabling) {
        await updateDoc(doc(db, 'users', user.id), {
          isAdmin: true,
          adminRole: roleToApply,
          adminPermissions: buildPresetPermissions(roleToApply),
          updatedAt: Timestamp.now(),
        });

        setSelectedUser((current: any) =>
          current?.id === user.id
            ? {
                ...current,
                isAdmin: true,
                adminRole: roleToApply,
                adminPermissions: buildPresetPermissions(roleToApply),
              }
            : current
        );

        toast.success('Privilèges admin accordés', { id: toastId });
      } else {
        await updateDoc(doc(db, 'users', user.id), {
          isAdmin: false,
          adminRole: deleteField(),
          adminPermissions: deleteField(),
          updatedAt: Timestamp.now(),
        });

        setSelectedUser((current: any) =>
          current?.id === user.id
            ? {
                ...current,
                isAdmin: false,
                adminRole: undefined,
                adminPermissions: undefined,
              }
            : current
        );

        toast.success('Privilèges admin retirés', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour des privilèges', { id: toastId });
    } finally {
      setUpdatingAdminId('');
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!user?.id) return;
    
    const confirmDelete = window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${user.nom || user.email} ? Cette action est irréversible.`);
    if (!confirmDelete) return;

    const toastId = toast.loading('Suppression de l\'utilisateur...');
    try {
      await deleteDoc(doc(db, 'users', user.id));
      toast.success('Utilisateur supprimé avec succès', { id: toastId });
      if (selectedUser?.id === user.id) setSelectedUser(null);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la suppression', { id: toastId });
    }
  };

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    return (user.nom?.toLowerCase().includes(term) || 
            user.email?.toLowerCase().includes(term) ||
            user.tel?.includes(term) ||
            user.referralCode?.toLowerCase().includes(term));
  });

  const { profile } = useAuth();
  const isSuperAdmin = profile?.adminRole === 'super';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-[#661489] text-white rounded-[16px] flex items-center justify-center shadow-lg"><Users size={24} /></div>
            Gestion des Utilisateurs
          </h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Base de données clients et suivi de fidélité</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="m3-search flex-1 lg:w-80">
            <Search className="text-[#49454F]" size={18} />
            <input 
              type="text"
              placeholder="Rechercher nom, email, tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full"
            />
          </div>
        </div>
      </div>

      {/* Users Container */}
      <div className="m3-card-elevated !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F3EDF7]/50 text-[#49454F] text-[10px] uppercase font-black tracking-[0.2em] border-b border-[#E7E0EB]">
                <th className="px-8 py-5">Utilisateur</th>
                <th className="px-8 py-5">Contact & Identité</th>
                <th className="px-8 py-5">Niveau KYC</th>
                <th className="px-8 py-5">Fidélité & Parrainage</th>
                <th className="px-8 py-5">Inscription</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E0EB]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-[#661489] border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[#49454F] text-[10px] font-black uppercase tracking-widest">Initialisation des profils...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-[#49454F]/30">
                      <Search size={64} strokeWidth={1} />
                      <span className="text-sm font-black uppercase tracking-widest">Aucun client trouvé</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#F3EDF7]/30 transition-all group cursor-pointer" onClick={() => openUserDetails(user)}>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-[14px] bg-[#EADDFF] text-[#21005D] flex items-center justify-center font-black text-xs border border-[#661489]/10 shadow-sm group-hover:scale-110 transition-transform">
                          {user.nom?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[#1D1B20] font-black tracking-tight">{user.nom || 'Client Anonyme'}</span>
                          <span className="text-[#661489] text-[9px] font-black uppercase tracking-widest mt-0.5">ID: {user.id.substring(0, 8).toUpperCase()}</span>
                          {user.isAdmin && (
                            <span className="text-[9px] font-black uppercase tracking-widest mt-1 text-[#0B6E4F]">
                              Admin {user.adminRole ? `(${user.adminRole})` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 text-xs text-[#1D1B20] font-bold group/mailitem">
                          <Mail size={12} className="text-[#661489]" /> 
                          {user.email ? (
                            <>
                              <a href={`mailto:${user.email}`} className="hover:underline">{user.email}</a>
                              {user.emailVerified === false && (
                                <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-md text-[8px] uppercase tracking-wider ml-2">Non vérifié</span>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(user.email);
                                  toast.success('Email copié !');
                                }}
                                className="p-1 opacity-0 group-hover/mailitem:opacity-100 hover:bg-[#EADDFF] rounded text-[#661489] transition-all"
                                title="Copier l'email"
                              >
                                <Copy size={10} />
                              </button>
                            </>
                          ) : 'Pas d\'email'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#49454F] font-medium opacity-60">
                          <Phone size={12} className="text-[#661489]/40" /> 
                          {user.tel ? <a href={`tel:${user.tel}`} className="hover:underline">{user.tel}</a> : 'Sans numéro'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                        user.statut_kyc === 'Expert' ? 'bg-[#E8DEF8] text-[#1D192B]' :
                        user.statut_kyc === 'Pending' ? 'bg-[#F3EDF7] text-[#49454F] border border-[#E7E0EB]' :
                        user.statut_kyc === 'Rejected' ? 'bg-[#F9DEDC] text-[#B3261E]' :
                        'bg-white text-[#49454F] border border-[#E7E0EB]'
                      }`}>
                        {user.statut_kyc || 'Standard'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1">
                          {user.referralCode && (
                            <span className="font-mono text-[10px] font-black text-[#661489] tracking-widest">{user.referralCode}</span>
                          )}
                          <div className="flex items-center gap-2">
                             <TrendingUp size={12} className="text-emerald-500" />
                             <span className="text-[10px] font-black text-[#1D1B20]">{user.solde_bonus || 0} RUB</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-[#49454F]">
                        <Calendar size={14} className="opacity-40"/>
                        <span className="text-[10px] font-black uppercase">{user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString('fr-FR') : new Date(user.createdAt).toLocaleDateString('fr-FR')) : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEmailUser(user)}
                          className="p-2.5 bg-white border border-[#EADDFF] text-[#661489] hover:bg-[#661489] hover:text-white rounded-xl transition-all shadow-sm"
                          title="Envoyer un email"
                        >
                          <Mail size={18} />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2.5 bg-white border border-[#F2B8B5] text-[#B3261E] hover:bg-[#B3261E] hover:text-white rounded-xl transition-all shadow-sm"
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => toggleAdminPrivilege(user, user.adminRole || 'restricted')}
                            disabled={updatingAdminId === user.id}
                            className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${user.isAdmin ? 'bg-[#F9DEDC] text-[#B3261E] border-[#F2B8B5]' : 'bg-[#E8DEF8] text-[#21005D] border-[#D0BCFF]'} disabled:opacity-50`}
                          >
                            {updatingAdminId === user.id ? '...' : user.isAdmin ? 'Retirer admin' : 'Rendre admin'}
                          </button>
                        )}
                        <button 
                          onClick={() => openUserDetails(user)}
                          className="p-2.5 bg-white border border-[#E7E0EB] text-[#49454F] hover:bg-[#661489] hover:text-white rounded-xl transition-all shadow-sm group-hover:shadow-md"
                        >
                          <Eye size={18} />
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

      {/* Manual Email Modal */}
      {emailUser && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/40 backdrop-blur-sm" onClick={() => setEmailUser(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-[#E7E0EB]" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-[#E7E0EB] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#EADDFF] text-[#21005D] rounded-xl flex items-center justify-center">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Envoyer un mail</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#49454F] opacity-60">À: {emailUser.email}</p>
                </div>
              </div>
              <button onClick={() => setEmailUser(null)} className="p-2 hover:bg-[#F3EDF7] rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F] px-1">Sujet du message</label>
                <input 
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-[#F3EDF7] border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-[#1D1B20] focus:border-[#661489] outline-none transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F] px-1">Contenu du mail</label>
                <textarea 
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  placeholder="Écrivez votre message ici..."
                  className="w-full bg-[#F3EDF7] border border-transparent rounded-[24px] px-5 py-4 text-sm font-bold text-[#1D1B20] focus:border-[#661489] outline-none transition-all h-48 resize-none"
                />
                <p className="text-[9px] text-[#49454F] opacity-60 px-1 font-medium italic">
                  * L'email sera envoyé même si l'utilisateur a désactivé les notifications.
                </p>
              </div>
            </div>
            
            <div className="p-8 bg-[#F3EDF7]/30 border-t border-[#E7E0EB] flex gap-4">
              <button 
                onClick={() => setEmailUser(null)}
                className="flex-1 py-4 rounded-full text-[10px] font-black uppercase tracking-widest text-[#49454F] hover:bg-white transition-all border border-transparent hover:border-[#CAC4D0]"
              >
                Annuler
              </button>
              <button 
                onClick={handleSendManualEmail}
                disabled={isSendingEmail || !emailMessage}
                className="flex-[2] py-4 bg-[#661489] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#661489]/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {isSendingEmail ? 'Envoi en cours...' : 'Envoyer le mail'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* User Details Modal */}
      {selectedUser && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/40 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative bg-[#FEF7FF] w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-full border border-[#E7E0EB]" onClick={e => e.stopPropagation()}>
            
            <div className="p-8 border-b border-[#E7E0EB] flex justify-between items-center bg-[#FEF7FF] sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#661489] text-white rounded-[16px] flex items-center justify-center shadow-lg font-black text-xl">
                  {selectedUser.nom?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight">{selectedUser.nom || 'Profil Utilisateur'}</h3>
                  <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest opacity-60">ID: {selectedUser.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { setEmailUser(selectedUser); setSelectedUser(null); }}
                  className="p-3 bg-[#EADDFF] text-[#21005D] rounded-full hover:shadow-md transition-all"
                  title="Envoyer un mail"
                >
                  <Mail size={24} />
                </button>
                <button onClick={() => setSelectedUser(null)} className="p-3 bg-[#F3EDF7] text-[#49454F] rounded-full hover:bg-[#F9DEDC] hover:text-[#B3261E] transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto scrollbar-hide flex-1 grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Identity & Contact */}
              <div className="space-y-8">
                 <div className="m3-card bg-white border-[#E7E0EB] space-y-6">
                    <h4 className="text-[10px] font-black text-[#661489] uppercase tracking-[0.2em] flex items-center gap-2">
                       <UserIcon size={16} /> Informations Personnelles
                    </h4>
                    <div className="space-y-6">
                       <div className="bg-[#F3EDF7] p-5 rounded-[24px]">
                          <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Nom Complet</p>
                          <p className="text-[#1D1B20] font-black text-lg tracking-tight">{selectedUser.nom || 'N/A'}</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#F3EDF7] p-5 rounded-[24px]">
                          <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Téléphone</p>
                          <p className="text-[#1D1B20] font-black text-sm tracking-tight">
                            {selectedUser.tel ? <a href={`tel:${selectedUser.tel}`} className="text-[#661489] hover:underline">{selectedUser.tel}</a> : 'Non renseigné'}
                          </p>
                        </div>
                          <div className="bg-[#F3EDF7] p-5 rounded-[24px]">
                            <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Inscription</p>
                            <p className="text-[#1D1B20] font-black text-sm tracking-tight">
                              {selectedUser.createdAt ? (selectedUser.createdAt.toDate ? selectedUser.createdAt.toDate().toLocaleDateString('fr-FR') : new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')) : 'N/A'}
                            </p>
                          </div>
                       </div>
                       <div className="bg-[#F3EDF7] p-5 rounded-[24px] flex justify-between items-center group/mail">
                          <div>
                            <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Adresse Email</p>
                            <p className="text-[#1D1B20] font-black text-sm tracking-tight">
                              <a href={`mailto:${selectedUser.email}`} className="text-[#661489] hover:underline">{selectedUser.email}</a>
                            </p>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(selectedUser.email); toast.success('Copié'); }} className="p-2 bg-white text-[#661489] rounded-full shadow-sm opacity-0 group-hover/mail:opacity-100 transition-all active:scale-90"><Copy size={14} /></button>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Status & Wallet */}
              <div className="space-y-8">
                 <div className="bg-[#661489] p-8 rounded-[32px] shadow-2xl shadow-[#661489]/20 text-white space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 flex items-center gap-2">
                       <ShieldCheck size={16} /> Conformité KYC
                    </h4>
                    <div className="flex justify-between items-center bg-white/10 p-5 rounded-[24px] border border-white/20">
                       <div>
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Niveau Actuel</p>
                          <p className="text-xl font-black tracking-tight">{selectedUser.statut_kyc || 'Standard'}</p>
                       </div>
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#661489] shadow-lg">
                          <ShieldCheck size={24} />
                       </div>
                    </div>
                    <p className="text-[10px] font-medium leading-relaxed opacity-60 italic">
                       {selectedUser.statut_kyc === 'Expert' 
                         ? 'Ce client est entièrement vérifié et autorisé à effectuer des transactions sans limites restrictives.' 
                         : 'Vérification de niveau intermédiaire. Les transactions peuvent être limitées.'}
                    </p>
                 </div>

                 <div className="m3-card bg-white border-[#E7E0EB] space-y-6">
                    <h4 className="text-[10px] font-black text-[#661489] uppercase tracking-[0.2em] flex items-center gap-2">
                       <Award size={16} /> Fidélité & Récompenses
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-[#F3EDF7] p-5 rounded-[24px] border border-[#E7E0EB] text-center">
                          <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-2 opacity-60">Solde Bonus</p>
                          <p className="text-2xl font-black text-[#661489] tracking-tighter">{selectedUser.solde_bonus || 0} <span className="text-[10px] opacity-40">RUB</span></p>
                       </div>
                       <div className="bg-[#F3EDF7] p-5 rounded-[24px] border border-[#E7E0EB] text-center">
                          <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest mb-2 opacity-60">Invités</p>
                          <p className="text-2xl font-black text-[#1D1B20] tracking-tighter">{selectedUser.referralStats?.invited || selectedUser.referredUsers?.length || 0}</p>
                       </div>
                    </div>
                    <div className="bg-[#EADDFF] p-5 rounded-[24px] border border-[#661489]/10 flex justify-between items-center group/ref">
                       <div>
                          <p className="text-[#661489] text-[9px] font-black uppercase tracking-widest mb-1">Code Parrainage</p>
                          <p className="text-[#21005D] font-mono font-black text-xl tracking-[0.2em]">{selectedUser.referralCode || 'NÉANT'}</p>
                       </div>
                       <button onClick={() => { navigator.clipboard.writeText(selectedUser.referralCode || ''); toast.success('Code Copié'); }} className="p-3 bg-white text-[#661489] rounded-full shadow-sm opacity-0 group-hover/ref:opacity-100 transition-all"><Copy size={18} /></button>
                    </div>
                 </div>

                 {isSuperAdmin && (
                   <div className="m3-card bg-white border-[#E7E0EB] space-y-6">
                      <h4 className="text-[10px] font-black text-[#661489] uppercase tracking-[0.2em] flex items-center gap-2">
                        <UserCog size={16} /> Privilèges Admin
                      </h4>

                      <div className="bg-[#F3EDF7] p-5 rounded-[24px] border border-[#E7E0EB] space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#49454F]">Statut actuel</p>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedUser.isAdmin ? 'bg-[#E8DEF8] text-[#21005D]' : 'bg-white text-[#49454F] border border-[#E7E0EB]'}`}>
                            {selectedUser.isAdmin ? `Admin ${selectedUser.adminRole ? `(${selectedUser.adminRole})` : ''}` : 'Utilisateur standard'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F]">Rôle admin à appliquer</label>
                          <select
                            value={adminRoleDraft || 'restricted'}
                            onChange={(e) => setAdminRoleDraft(e.target.value as UserProfile['adminRole'])}
                            className="w-full bg-white border border-[#CAC4D0] rounded-[16px] px-4 py-3 text-xs font-bold text-[#1D1B20] outline-none"
                          >
                            <option value="super">Administrateur complet</option>
                            <option value="restricted">Accès restreint</option>
                            <option value="email-only">Notifications seulement</option>
                          </select>
                        </div>

                        <button
                          onClick={() => toggleAdminPrivilege(selectedUser, adminRoleDraft || 'restricted')}
                          disabled={updatingAdminId === selectedUser.id}
                          className={`w-full py-3.5 rounded-[18px] font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50 ${selectedUser.isAdmin ? 'bg-[#B3261E] text-white' : 'bg-[#661489] text-white'}`}
                        >
                          {updatingAdminId === selectedUser.id
                            ? 'Mise à jour...'
                            : selectedUser.isAdmin
                              ? 'Retirer les privilèges admin'
                              : 'Accorder les privilèges admin'}
                        </button>
                      </div>
                   </div>
                 )}
              </div>
            </div>
            
            <div className="p-8 bg-[#F3EDF7]/30 border-t border-[#E7E0EB] flex justify-end">
               <button onClick={() => setSelectedUser(null)} className="m3-btn-tonal !px-10 py-4 !rounded-full text-[10px] tracking-widest uppercase">Fermer le Profil</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UsersListPage;

