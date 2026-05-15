import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  limit,
  collection,
  addDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import type { AdminPermissions, UserProfile } from '../../types';
import {
  ADMIN_ACTION_LABELS,
  ADMIN_SECTION_DEFINITIONS,
  buildPresetPermissions,
  DEFAULT_ADMIN_PERMISSIONS,
  mergeAdminPermissions,
} from '../../lib/adminAccess';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle2,
  Mail,
  Plus,
  UserPlus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCog,
  AlertTriangle,
  Lock,
  Database,
  RefreshCw,
  X,
} from 'lucide-react';
import { writeBatch } from 'firebase/firestore';

const AccessControlPage: React.FC = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserProfile['adminRole']>('super');
  const [permissions, setPermissions] = useState<AdminPermissions>(DEFAULT_ADMIN_PERMISSIONS);
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [savingEmails, setSavingEmails] = useState(false);
  const [settingsId, setSettingsId] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<UserProfile['adminRole']>('restricted');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [resettingPassword, setResettingPassword] = useState('');
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  
  // Wipe State
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipePassword, setWipePassword] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  
  const { profile } = useAuth();
  const isSuperAdmin = profile?.adminRole === 'super';

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snapshot) => {
      const data = snapshot.docs
        .map((entry) => ({ id: entry.id, ...(entry.data() as UserProfile) }))
        .filter((entry) => entry.isAdmin);

      // Deduplicate by email to avoid showing the same account twice
      const uniqueAdmins = Array.from(new Map(data.map(admin => [admin.email, admin])).values());
      setAdmins(uniqueAdmins);

      if (!selectedAdminId && data.length > 0) {
        const firstAdmin = data[0];
        setSelectedAdminId(firstAdmin.id);
        setSelectedRole(firstAdmin.adminRole || 'super');
        setPermissions(mergeAdminPermissions(firstAdmin.adminPermissions));
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedAdminId]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'countries'), (snap) => {
      setCountries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedAdminId) return;

    const selectedAdmin = admins.find((admin) => admin.id === selectedAdminId);
    if (!selectedAdmin) return;

    setSelectedRole(selectedAdmin.adminRole || 'super');
    setSelectedCountry(selectedAdmin.assignedCountry || '');
    setPermissions(mergeAdminPermissions(selectedAdmin.adminPermissions));
  }, [admins, selectedAdminId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'settings'), (snapshot) => {
      if (!snapshot.empty) {
        const settingsDoc = snapshot.docs[0].data();
        setSettingsId(snapshot.docs[0].id);
        setNotificationEmails(settingsDoc.notificationEmails || []);
      }
    });

    return () => unsubscribe();
  }, []);

  const selectedAdmin = useMemo(
    () => admins.find((admin) => admin.id === selectedAdminId) || null,
    [admins, selectedAdminId]
  );

  const applyPreset = (role: UserProfile['adminRole']) => {
    setSelectedRole(role);
    setPermissions(buildPresetPermissions(role));
  };

  const saveAdminAccess = async () => {
    if (!selectedAdminId) return;

    setSavingAdmin(true);
    const toastId = toast.loading('Mise à jour des droits...');
    try {
      await updateDoc(doc(db, 'users', selectedAdminId), {
        isAdmin: true,
        adminRole: selectedRole,
        assignedCountry: (selectedRole as any) === 'agent' ? selectedCountry : null,
        adminPermissions: permissions,
        updatedAt: Timestamp.now(),
      });
      toast.success('Droits admin mis à jour', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour', { id: toastId });
    } finally {
      setSavingAdmin(false);
    }
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      toast.error('Adresse email invalide');
      return;
    }
    if (notificationEmails.includes(email)) {
      toast.error('Email déjà présent');
      return;
    }

    setNotificationEmails([...notificationEmails, email]);
    setNewEmail('');
  };

  const saveEmails = async () => {
    setSavingEmails(true);
    const toastId = toast.loading('Mise à jour des emails...');
    try {
      if (!settingsId) {
        await addDoc(collection(db, 'settings'), {
          notificationEmails,
          updatedAt: Timestamp.now(),
        });
      } else {
        await setDoc(
          doc(db, 'settings', settingsId),
          {
            notificationEmails,
            updatedAt: Timestamp.now(),
          },
          { merge: true }
        );
      }

      toast.success('Liste des emails mise à jour', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la sauvegarde', { id: toastId });
    } finally {
      setSavingEmails(false);
    }
  };

  const resetAdminPassword = async (email: string) => {
    setResettingPassword(email);
    const toastId = toast.loading('Envoi du lien de réinitialisation...');
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success(`Lien de réinitialisation envoyé à ${email}`, { id: toastId });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erreur lors de l\'envoi du lien', { id: toastId });
    } finally {
      setResettingPassword('');
    }
  };

  const handleNuclearWipe = async () => {
    if (!isSuperAdmin) {
      toast.error('Accès refusé. Seul un Super Admin peut effectuer cette action.');
      return;
    }

    if (!wipePassword) {
      toast.error('Veuillez saisir votre mot de passe pour confirmer.');
      return;
    }

    setIsWiping(true);
    const toastId = toast.loading('Vérification de l\'identité...');

    try {
      // 1. Re-authenticate
      const credential = EmailAuthProvider.credential(auth.currentUser?.email || '', wipePassword);
      if (auth.currentUser) {
        await reauthenticateWithCredential(auth.currentUser, credential);
      } else {
        throw new Error('Utilisateur non connecté');
      }

      toast.loading('Nettoyage de la base de données...', { id: toastId });

      // 2. Perform Wipe
      const collectionsToWipe = ['transactions', 'kyc', 'notifications'];
      
      for (const colName of collectionsToWipe) {
        const snap = await getDocs(collection(db, colName));
        const chunks = [];
        const batchSize = 500;
        
        for (let i = 0; i < snap.docs.length; i += batchSize) {
          chunks.push(snap.docs.slice(i, i + batchSize));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
      }

      // 3. Reset User KYC Statuses
      const usersSnap = await getDocs(collection(db, 'users'));
      const userChunks = [];
      for (let i = 0; i < usersSnap.docs.length; i += 500) {
        userChunks.push(usersSnap.docs.slice(i, i + 500));
      }

      for (const chunk of userChunks) {
        const batch = writeBatch(db);
        chunk.forEach(d => {
          batch.update(d.ref, {
            kycStatus: 'none',
            kycDocuments: {},
            kycSubmittedAt: null,
            totalSpentRUB: 0,
            solde_bonus: 0,
            updatedAt: Timestamp.now()
          });
        });
        await batch.commit();
      }

      // 4. Log the action
      await addDoc(collection(db, 'admin_logs'), {
        action: 'NUCLEAR_WIPE_BEFORE_LAUNCH',
        adminEmail: auth.currentUser?.email,
        timestamp: Timestamp.now(),
        details: 'Suppression complète des transactions, KYC et notifications. Réinitialisation des statuts utilisateurs.'
      });

      toast.success('La base de données a été nettoyée avec succès !', { id: toastId });
      setIsWipeModalOpen(false);
      setWipePassword('');
    } catch (error: any) {
      console.error(error);
      const msg = error.code === 'auth/wrong-password' ? 'Mot de passe incorrect.' : 'Erreur lors du nettoyage.';
      toast.error(msg, { id: toastId });
    } finally {
      setIsWiping(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-[#49454F]">
          <div className="w-12 h-12 border-4 border-[#661489] border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest">Chargement des accès...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* CREATE ADMIN SECTION */}
      <div className="m3-card-elevated !bg-gradient-to-br !from-[#EADDFF] !to-[#F3EDF7] border border-[#CAC4D0]/30 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-white text-[#661489] shadow-lg">
            <UserPlus size={22} />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Créer un compte admin</h3>
            <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest opacity-60">
              Inviter un nouvel administrateur avec ses permissions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F]">Email du nouvel admin</label>
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="admin@flashpay.com"
              className="w-full bg-white border border-[#CAC4D0] rounded-[20px] px-5 py-3.5 text-sm font-bold text-[#1D1B20] outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F]">Rôle</label>
            <select
              value={newAdminRole || 'restricted'}
              onChange={(e) => setNewAdminRole(e.target.value as UserProfile['adminRole'])}
              className="w-full bg-white border border-[#CAC4D0] rounded-[20px] px-5 py-3.5 text-sm font-bold text-[#1D1B20] outline-none"
            >
               <option value="super">Administrateur complet</option>
               <option value="agent">Agent par pays</option>
               <option value="restricted">Accès restreint</option>
               <option value="email-only">Notifications seulement</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={async () => {
                if (!newAdminEmail.includes('@')) {
                  toast.error('Email invalide');
                  return;
                }
                setCreatingAdmin(true);
                const toastId = toast.loading('Création du compte...');
                try {
                  const normalizedEmail = newAdminEmail.trim().toLowerCase();
                  const adminPermissions = buildPresetPermissions(newAdminRole);

                  const existingUserQuery = query(
                    collection(db, 'users'),
                    where('email', '==', normalizedEmail),
                    limit(1)
                  );
                  const existingUserSnapshot = await getDocs(existingUserQuery);

                  if (existingUserSnapshot.empty) {
                    toast.error('Aucun utilisateur trouvé avec cet email. Le compte doit exister avant attribution admin.', { id: toastId });
                    return;
                  }

                  const targetUserDoc = existingUserSnapshot.docs[0];
                  await setDoc(doc(db, 'users', targetUserDoc.id), {
                    email: normalizedEmail,
                    isAdmin: true,
                    adminRole: newAdminRole,
                    adminPermissions,
                    updatedAt: Timestamp.now(),
                    emailVerified: false,
                  }, { merge: true });
                  toast.success(`Privilèges admin accordés: ${normalizedEmail}`, { id: toastId });
                  setNewAdminEmail('');
                  setNewAdminRole('restricted');
                } catch (error) {
                  console.error(error);
                  toast.error('Erreur lors de la création', { id: toastId });
                } finally {
                  setCreatingAdmin(false);
                }
              }}
              disabled={creatingAdmin || !newAdminEmail}
              className="w-full py-3.5 bg-[#661489] text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {creatingAdmin ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-[#49454F] font-medium italic opacity-60 bg-white/50 rounded-[16px] px-4 py-3 border border-white/60">
          💡 Conseil: Le nouvel admin reçoit les droits initiaux selon son rôle. Modifiez-les ensuite dans la section ci-dessous.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-[#661489] text-white rounded-[16px] flex items-center justify-center shadow-lg">
              <UserCog size={24} />
            </div>
            Accès Admin & Notifications
          </h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">
            Contrôle des onglets visibles, des actions autorisées et des emails de commande
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="m3-card-elevated space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#EADDFF] text-[#21005D]">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Comptes admin</h3>
              <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest opacity-60">
                Choisir les onglets, ajouter/modifier/supprimer et le niveau d’accès
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#49454F] ml-1">Compte à configurer</label>
            <select
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
              className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] px-5 py-4 text-[#1D1B20] font-bold outline-none"
            >
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.email} {admin.adminRole ? `(${admin.adminRole})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedAdmin && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['super', 'restricted', 'email-only'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => applyPreset(role as any)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition-all ${(selectedRole as any) === role ? 'bg-[#661489] text-white border-[#661489]' : 'bg-white border-[#E7E0EB] text-[#1D1B20]'}`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Profil</div>
                    <div className="font-black text-sm mt-1">
                      {role === 'super' ? 'Complet' : role === 'restricted' ? 'Restreint' : 'Emails seulement'}
                    </div>
                  </button>
                ))}
                <button
                  key="agent"
                  onClick={() => applyPreset('agent' as any)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition-all ${(selectedRole as any) === 'agent' ? 'bg-[#661489] text-white border-[#661489]' : 'bg-white border-[#E7E0EB] text-[#1D1B20]'}`}
                >
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Profil</div>
                  <div className="font-black text-sm mt-1">Agent Pays</div>
                </button>
              </div>

              {(selectedRole as any) === 'agent' && (
            <div className="space-y-4 p-6 bg-[#F3EDF7] rounded-[24px] border border-[#EADDFF] animate-in slide-in-from-top duration-500">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#661489]">Assignation du Pays (Max 1 par pays)</label>
              <select
                value={selectedCountry}
                onChange={(e) => {
                  const countryCode = e.target.value;
                  // Check if another agent is already assigned to this country
                  const existingAgent = admins.find(a => a.adminRole === 'agent' && a.assignedCountry === countryCode && a.id !== selectedAdminId);
                  if (existingAgent) {
                    toast.error(`Un agent (${existingAgent.email}) est déjà assigné à ce pays.`);
                    return;
                  }
                  setSelectedCountry(countryCode);
                }}
                className="w-full bg-white border border-[#EADDFF] rounded-[20px] px-5 py-4 text-[#1D1B20] font-bold outline-none"
              >
                <option value="">Choisir un pays...</option>
                {countries.map(c => (
                  <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
              <p className="text-[9px] font-bold text-[#661489] opacity-60 uppercase tracking-widest italic">
                Note: L'agent ne verra que les transactions et stats de ce pays.
              </p>
            </div>
          )}
            </>
          )}

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#49454F] opacity-60">Onglets visibles</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ADMIN_SECTION_DEFINITIONS.map((section) => {
                const isEnabled = permissions.sections?.[section.key] ?? false;
                return (
                  <label key={section.key} className="flex items-center justify-between gap-3 rounded-[20px] border border-[#E7E0EB] px-4 py-3 bg-white hover:bg-[#F3EDF7] hover:border-[#661489]/30 transition-all cursor-pointer group">
                    <span className="text-sm font-bold text-[#1D1B20]">{section.label}</span>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) =>
                        setPermissions((current) => ({
                          ...current,
                          sections: {
                            ...(current.sections || {}),
                            [section.key]: e.target.checked,
                          },
                        }))
                      }
                      className="m3-checkbox"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#49454F] opacity-60">Actions autorisées</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['add', 'edit', 'delete'] as const).map((action) => {
                const checked = permissions.actions?.[action] ?? false;
                return (
                  <label key={action} className="flex items-center justify-between gap-3 rounded-[20px] border border-[#E7E0EB] px-4 py-3 bg-[#F3EDF7] hover:bg-[#EADDFF] hover:border-[#661489]/30 transition-all cursor-pointer group">
                    <span className="text-sm font-bold text-[#1D1B20]">{ADMIN_ACTION_LABELS[action]}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setPermissions((current) => ({
                          ...current,
                          actions: {
                            ...(current.actions || {}),
                            [action]: e.target.checked,
                          },
                        }))
                      }
                      className="m3-checkbox"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex items-center justify-between gap-4 rounded-[24px] border border-[#E7E0EB] px-5 py-4 bg-[#EADDFF]/40 hover:bg-[#EADDFF]/60 hover:border-[#661489]/30 transition-all cursor-pointer group">
            <div>
              <p className="text-sm font-black text-[#1D1B20]">Recevoir les emails de commande</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#49454F] opacity-60">Liste des destinataires lorsqu’une commande arrive</p>
            </div>
            <input
              type="checkbox"
              checked={permissions.receiveOrderEmails ?? false}
              onChange={(e) => setPermissions((current) => ({ ...current, receiveOrderEmails: e.target.checked }))}
              className="m3-checkbox h-7 w-7"
            />
          </label>

          {(selectedRole as any) === 'agent' && (
            <label className="flex items-center justify-between gap-4 rounded-[24px] border border-[#E7E0EB] px-5 py-4 bg-[#F3EDF7] hover:bg-[#EADDFF] hover:border-[#661489]/30 transition-all cursor-pointer group">
              <div>
                <p className="text-sm font-black text-[#1D1B20]">Recevoir les emails de son pays</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#49454F] opacity-60">L'agent sera notifié par mail pour chaque transaction de son pays</p>
              </div>
              <input
                type="checkbox"
                checked={permissions.receiveCountryEmails ?? false}
                onChange={(e) => setPermissions((current) => ({ ...current, receiveCountryEmails: e.target.checked }))}
                className="m3-checkbox h-7 w-7"
              />
            </label>
          )}

          <button
            onClick={saveAdminAccess}
            disabled={savingAdmin || !selectedAdminId}
            className="w-full py-4 bg-[#661489] text-white rounded-[28px] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {savingAdmin ? 'Sauvegarde...' : 'Enregistrer les droits'}
          </button>

          {selectedAdmin && (
            <button
              onClick={() => resetAdminPassword(selectedAdmin.email)}
              disabled={resettingPassword === selectedAdmin.email}
              className="w-full py-4 bg-[#B3261E] text-white rounded-[28px] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {resettingPassword === selectedAdmin.email ? 'Envoi en cours...' : 'Réinitialiser mot de passe'}
            </button>
          )}
        </div>

        <div className="m3-card-elevated space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#E8DEF8] text-[#1D192B]">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Emails de notification</h3>
              <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest opacity-60">
                Comptes qui reçoivent un email à chaque nouvelle commande
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="admin@flashpay.com"
              className="flex-1 bg-[#F3EDF7] border border-[#CAC4D0] rounded-full px-5 py-4 text-sm font-bold text-[#1D1B20] outline-none"
            />
            <button onClick={addEmail} className="p-4 bg-[#661489] text-white rounded-full shadow-lg hover:scale-110 transition-transform">
              <Plus size={18} />
            </button>
          </div>

          <div className="space-y-3">
            {notificationEmails.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#E7E0EB] p-6 text-center text-[#49454F] text-sm font-medium">
                Aucun email de notification configuré
              </div>
            ) : (
              notificationEmails.map((email) => (
                <div key={email} className="flex items-center justify-between rounded-[22px] border border-[#E7E0EB] px-4 py-3 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-[#F3EDF7] text-[#661489]">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-sm font-bold text-[#1D1B20]">{email}</span>
                  </div>
                  <button onClick={() => setNotificationEmails((current) => current.filter((value) => value !== email))} className="p-2 text-[#B3261E] hover:bg-[#F9DEDC] rounded-full transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            onClick={saveEmails}
            disabled={savingEmails}
            className="w-full py-4 bg-[#1D1B20] text-white rounded-[28px] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:scale-[1.01] transition-all disabled:opacity-50"
          >
            {savingEmails ? 'Sauvegarde...' : 'Enregistrer les emails'}
          </button>

          <div className="rounded-[28px] bg-[#F3EDF7] border border-[#E7E0EB] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <SlidersHorizontal className="text-[#661489]" size={20} />
              <p className="text-sm font-black text-[#1D1B20]">Aperçu du profil sélectionné</p>
            </div>
            {selectedAdmin ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[#49454F]">Compte</span>
                  <span className="font-bold text-[#1D1B20]">{selectedAdmin.email}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#49454F]">Rôle</span>
                  <span className="font-bold text-[#1D1B20]">{selectedRole || 'super'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[#49454F]">Sections actives</span>
                  <span className="font-bold text-[#1D1B20]">
                    {Object.entries(permissions.sections || {}).filter(([, enabled]) => enabled).length}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#49454F]">Sélectionnez un compte admin pour modifier ses permissions.</div>
            )}
          </div>
        </div>
      </div>

      {/* SYSTEM MAINTENANCE SECTION */}
      {isSuperAdmin && (
        <div className="mt-16 pt-16 border-t-4 border-rose-500/20">
          <div className="m3-card-elevated !bg-[#FFF8F8] border-rose-500/30 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-rose-500 text-white rounded-[24px] flex items-center justify-center shadow-xl animate-pulse">
                  <Database size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight flex items-center gap-3">
                    Maintenance Critique <AlertTriangle className="text-rose-500" size={24} />
                  </h3>
                  <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.15em] mt-1">
                    Réinitialisation totale avant lancement officiel
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsWipeModalOpen(true)}
                className="px-8 py-4 bg-rose-500 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-rose-600 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                <Trash2 size={20} /> Réinitialiser la plateforme
              </button>
            </div>

            <div className="mt-8 p-6 bg-rose-50 rounded-[28px] border border-rose-200 flex gap-5 items-start">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-rose-500"><Lock size={24} /></div>
              <div className="space-y-2">
                <p className="text-[11px] text-rose-900 font-black uppercase tracking-widest">Zone de danger</p>
                <p className="text-xs text-rose-700 font-bold leading-relaxed">
                  Cette action supprimera **définitivement** toutes les transactions, les documents KYC (pièces d'identité, selfies) et les notifications. Les comptes clients sont conservés mais leurs compteurs sont remis à zéro. **Action irréversible.**
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WIPE CONFIRMATION MODAL */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/80 backdrop-blur-md" onClick={() => !isWiping && setIsWipeModalOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border-4 border-rose-500/20 p-10 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-24 h-24 bg-rose-100 text-rose-500 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <RefreshCw size={48} className={isWiping ? 'animate-spin' : ''} />
            </div>
            
            <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight mb-4">Confirmation de Identité</h3>
            <p className="text-[#49454F] text-sm font-bold leading-relaxed mb-8">
              Pour des raisons de sécurité, veuillez saisir votre mot de passe administrateur pour confirmer la suppression totale des données.
            </p>

            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1">Mot de passe Super Admin</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-rose-500/40" size={18} />
                  <input 
                    type="password"
                    value={wipePassword}
                    onChange={(e) => setWipePassword(e.target.value)}
                    disabled={isWiping}
                    placeholder="••••••••"
                    className="w-full bg-rose-50 border border-rose-100 rounded-2xl py-4 pl-14 pr-6 font-black text-[#1D1B20] outline-none focus:ring-4 focus:ring-rose-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setIsWipeModalOpen(false)}
                  disabled={isWiping}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-[#49454F] hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleNuclearWipe}
                  disabled={isWiping || !wipePassword}
                  className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isWiping ? 'Nettoyage...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControlPage;

