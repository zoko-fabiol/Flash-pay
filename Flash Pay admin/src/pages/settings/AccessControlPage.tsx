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
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../lib/firebase';
import type { AdminPermissions, UserProfile } from '../../types';
import {
  ADMIN_ACTION_LABELS,
  ADMIN_SECTION_DEFINITIONS,
  buildPresetPermissions,
  DEFAULT_ADMIN_PERMISSIONS,
  mergeAdminPermissions,
} from '../../lib/adminAccess';
import {
  CheckCircle2,
  Mail,
  Plus,
  UserPlus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCog,
} from 'lucide-react';

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
    if (!selectedAdminId) return;

    const selectedAdmin = admins.find((admin) => admin.id === selectedAdminId);
    if (!selectedAdmin) return;

    setSelectedRole(selectedAdmin.adminRole || 'super');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-[#49454F]">
          <div className="w-12 h-12 border-4 border-[#6750A4] border-t-transparent rounded-full animate-spin" />
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
          <div className="p-3 rounded-2xl bg-white text-[#6750A4] shadow-lg">
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
              className="w-full py-3.5 bg-[#6750A4] text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
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
            <div className="w-12 h-12 bg-[#6750A4] text-white rounded-[16px] flex items-center justify-center shadow-lg">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['super', 'restricted', 'email-only'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => applyPreset(role)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition-all ${selectedRole === role ? 'bg-[#6750A4] text-white border-[#6750A4]' : 'bg-white border-[#E7E0EB] text-[#1D1B20]'}`}
                >
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Profil</div>
                  <div className="font-black text-sm mt-1">
                    {role === 'super' ? 'Complet' : role === 'restricted' ? 'Restreint' : 'Emails seulement'}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#49454F] opacity-60">Onglets visibles</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ADMIN_SECTION_DEFINITIONS.map((section) => {
                const isEnabled = permissions.sections?.[section.key] ?? false;
                return (
                  <label key={section.key} className="flex items-center justify-between gap-3 rounded-[20px] border border-[#E7E0EB] px-4 py-3 bg-white hover:bg-[#F3EDF7] hover:border-[#6750A4]/30 transition-all cursor-pointer group">
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
                  <label key={action} className="flex items-center justify-between gap-3 rounded-[20px] border border-[#E7E0EB] px-4 py-3 bg-[#F3EDF7] hover:bg-[#EADDFF] hover:border-[#6750A4]/30 transition-all cursor-pointer group">
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

          <label className="flex items-center justify-between gap-4 rounded-[24px] border border-[#E7E0EB] px-5 py-4 bg-[#EADDFF]/40 hover:bg-[#EADDFF]/60 hover:border-[#6750A4]/30 transition-all cursor-pointer group">
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

          <button
            onClick={saveAdminAccess}
            disabled={savingAdmin || !selectedAdminId}
            className="w-full py-4 bg-[#6750A4] text-white rounded-[28px] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:scale-[1.01] transition-all disabled:opacity-50"
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
            <button onClick={addEmail} className="p-4 bg-[#6750A4] text-white rounded-full shadow-lg hover:scale-110 transition-transform">
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
                    <div className="p-2 rounded-full bg-[#F3EDF7] text-[#6750A4]">
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
              <SlidersHorizontal className="text-[#6750A4]" size={20} />
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
    </div>
  );
};

export default AccessControlPage;
