import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/firebase';
import { Layout } from '../components/Layout';
import { User as UserIcon, Mail, Phone, Calendar } from 'lucide-react';
import { Error, Success } from '../components/UI';
import { SeedCountries } from '../components/SeedCountries';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    nom: user?.nom || '',
    tel: user?.tel || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await userService.updateUserProfile(user.id, formData);
      setSuccess('Profil mis à jour avec succès!');
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mon Compte</h1>
          <p className="text-slate-600">Gérez vos informations personnelles</p>
        </div>

        {error && <Error message={error} onDismiss={() => setError('')} />}
        {success && <Success message={success} />}

        {/* Profile Info */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-deep rounded-full flex items-center justify-center">
                <UserIcon className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{user?.nom}</h2>
                <p className="text-slate-600">{user?.email}</p>
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-semibold"
              >
                Modifier
              </button>
            )}
          </div>

          {/* Account Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <Mail className="text-slate-500" size={20} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600">Email</p>
                <p className="text-slate-900 font-semibold">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <Phone className="text-slate-500" size={20} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600">Téléphone</p>
                {editing ? (
                  <input
                    type="tel"
                    name="tel"
                    value={formData.tel}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 mt-1"
                  />
                ) : (
                  <p className="text-slate-900 font-semibold">{user?.tel}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <Calendar className="text-slate-500" size={20} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-600">Créé le</p>
                <p className="text-slate-900 font-semibold">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {editing && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-slate-400 transition-colors font-semibold"
              >
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
              >
                Annuler
              </button>
            </div>
          )}
        </div>

        {/* Account Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <p className="text-sm font-semibold text-slate-600 mb-2">Statut KYC</p>
            <p className={`text-lg font-bold ${
              (user?.kyc?.status === 'blocked' || (user?.kyc?.nextEligibilityDate?.toMillis?.() || 0) > Date.now()) ? 'text-orange-600' :
              (user?.kyc?.status === 'approved' || user?.statut_kyc === 'Expert') ? 'text-green-600' :
              (user?.kyc?.status === 'pending' || user?.statut_kyc === 'Pending') ? 'text-yellow-600' :
              (user?.kyc?.status === 'rejected' || user?.statut_kyc === 'Rejected') ? 'text-red-600' :
              'text-slate-600'
            }`}>
                {user?.kyc?.status || user?.statut_kyc}
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <p className="text-sm font-semibold text-slate-600 mb-2">Bonus Disponible</p>
            <p className="text-lg font-bold text-primary">{user?.solde_bonus} XAF</p>
          </div>
        </div>

        {/* Security */}
        {/* Preferences */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-bold text-lg mb-4">Préférences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-semibold text-slate-900">Langue de l'interface</p>
                <p className="text-sm text-slate-500">Choisissez votre langue préférée</p>
              </div>
              <select className="px-4 py-2 bg-white border border-slate-300 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-semibold text-slate-900">Notifications Push & Pop-ups</p>
                <p className="text-sm text-slate-500">Recevoir des alertes sur votre appareil</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-semibold text-slate-900">Emails promotionnels</p>
                <p className="text-sm text-slate-500">Recevoir nos offres par mail</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-bold text-lg mb-4">Sécurité & Confidentialité</h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold text-left border border-slate-200">
              Modifier le mot de passe
            </button>
            <button className="w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold text-left border border-slate-200">
              Authentification à deux facteurs (2FA)
            </button>
            <button className="w-full px-4 py-3 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-semibold text-left border border-slate-200">
              Gérer la confidentialité
            </button>
          </div>
        </div>

        {/* Developer Tools */}
        <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-200">
          <h3 className="font-bold text-lg text-indigo-900 mb-4">Paramètres Développeur</h3>
          <p className="text-sm text-indigo-700 mb-4">Utilisez cet outil pour synchroniser la liste des pays et les restrictions d'opérateurs (MTN, Wave, etc.) avec la base de données.</p>
          <SeedCountries />
        </div>

        {/* Assistance */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-bold text-lg mb-4">Assistance</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-center border border-slate-200">
              <p className="font-bold text-slate-900">Contacter le Support</p>
              <p className="text-xs text-slate-500 mt-1">Chat ou Email</p>
            </button>
            <button className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-center border border-slate-200">
              <p className="font-bold text-slate-900">À propos</p>
              <p className="text-xs text-slate-500 mt-1">Conditions & Légal</p>
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <h3 className="font-bold text-lg text-red-900 mb-4">Déconnexion</h3>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </Layout>
  );
};
