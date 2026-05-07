import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Error, Success } from '../components/UI';

const getKycStatus = (user: any) => {
  const blockedUntil = user?.kyc?.nextEligibilityDate?.toMillis?.();
  if (user?.kyc?.status === 'blocked' || (blockedUntil && blockedUntil > Date.now())) {
    return 'blocked';
  }

  return user?.kyc?.status ?? (
    user?.statut_kyc === 'Expert' ? 'approved' :
    user?.statut_kyc === 'Pending' ? 'pending' :
    user?.statut_kyc === 'Rejected' ? 'rejected' :
    'not_started'
  );
};

export const KYCPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    address: '',
    city: '',
    postalCode: '',
    idNumber: '',
    idType: 'Passport',
    countryOfDeparture: 'Russie',
  });

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [localProofFile, setLocalProofFile] = useState<File | null>(null);

  const [dailyLimit, setDailyLimit] = useState(150000);
  const [rates, setRates] = useState<any[]>([]);

  useEffect(() => {
    const qSettings = query(collection(db, 'settings'));
    const unsubSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const settingsDoc = snapshot.docs[0].data();
        if (settingsDoc.dailyLimitRUB) setDailyLimit(settingsDoc.dailyLimitRUB);
      }
    });

    const qRates = query(collection(db, 'exchange_rates'));
    const unsubRates = onSnapshot(qRates, (snapshot) => {
      setRates(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubSettings();
      unsubRates();
    };
  }, []);

  const needsLocalDocument = formData.countryOfDeparture.trim().toLowerCase() !== 'russie' && formData.countryOfDeparture.trim().toLowerCase() !== 'russia';
  const kycStatus = getKycStatus(user);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setFile(file);
      setError('');
    } else if (file) {
      setError('Veuillez téléverser une image JPG ou PNG uniquement.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!user) {
      setError('Vous devez être connecté');
      setLoading(false);
      return;
    }

    try {
      const validation = await userService.validateKYCSubmission({
        formData,
        files: {
          idProof: documentFile,
          selfie: selfieFile,
          addressProof: addressProofFile,
          localProof: localProofFile,
        },
      });

      if (!validation.ok) {
        setError(validation.errors[0]);
        setLoading(false);
        return;
      }

      await userService.uploadKYCDocuments(user.id, {
        formData,
        files: {
          idProof: documentFile,
          selfie: selfieFile,
          addressProof: addressProofFile,
          localProof: localProofFile,
        },
      });

      setSuccess('Vos informations KYC ont été soumises. Nous vérifierons votre dossier dans les 24h.');
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        nationality: '',
        address: '',
        city: '',
        postalCode: '',
        idNumber: '',
        idType: 'Passport',
        countryOfDeparture: 'Russie',
      });
      setDocumentFile(null);
      setSelfieFile(null);
      setAddressProofFile(null);
      setLocalProofFile(null);

    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission KYC');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const statusColors = {
      Standard: 'bg-gray-100 text-gray-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      Expert: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Blocked: 'bg-orange-100 text-orange-800',
    };

    const statusIcons = {
      Standard: <AlertCircle size={16} />,
      Pending: <AlertCircle size={16} />,
      Expert: <CheckCircle size={16} />,
      Rejected: <AlertCircle size={16} />,
      Blocked: <AlertCircle size={16} />,
    };

    const badgeKey = getKycStatus(user) === 'blocked'
      ? 'Blocked'
      : (getKycStatus(user) === 'approved' ? 'Expert' :
      getKycStatus(user) === 'pending' ? 'Pending' :
      getKycStatus(user) === 'rejected' ? 'Rejected' :
      'Standard');

    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${
        statusColors[badgeKey as keyof typeof statusColors] || statusColors.Standard
      }`}>
        {statusIcons[badgeKey as keyof typeof statusIcons]}
        {badgeKey === 'Blocked' ? 'Blocked' : badgeKey}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Vérification KYC</h1>
          <p className="text-slate-600">Complétez votre profil pour augmenter vos limites de transfert</p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-bold text-lg mb-4">Statut Actuel</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Niveau de vérification</span>
              {getStatusBadge()}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">Limite de transfert quotidien</span>
              <div className="text-right">
                <p className="font-bold text-slate-900">
                  {kycStatus === 'blocked' ? 'Vérification bloquée temporairement' :
                   kycStatus === 'pending' ? 'Vérification en cours...' :
                   `${dailyLimit.toLocaleString()} RUB`}
                </p>
                {kycStatus !== 'blocked' && kycStatus !== 'pending' && (
                  <p className="text-xs text-slate-500 font-medium">
                    ≈ {( dailyLimit * (rates.find(r => r.from === 'RUB' && r.to === 'XAF')?.rate || 7.22) ).toLocaleString()} XAF
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && <Error message={error} onDismiss={() => setError('')} />}
        {success && <Success message={success} />}

        {/* KYC Form */}
        {(kycStatus === 'not_started' || kycStatus === 'rejected') && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-bold text-lg mb-6">Informations Personnelles</h3>
            {kycStatus === 'rejected' && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                <p className="font-bold">Votre précédente demande a été rejetée.</p>
                <p className="text-sm">Veuillez vérifier vos informations et soumettre de nouveaux documents clairs.</p>
              </div>
            )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Jean"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Dupont"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Pays de départ
              </label>
              <select
                name="countryOfDeparture"
                value={formData.countryOfDeparture}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              >
                <option value="Russie">Russie</option>
                <option value="Cameroun">Cameroun</option>
                <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                <option value="Sénégal">Sénégal</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            {/* DOB and Nationality */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Date de Naissance
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nationalité
                </label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  placeholder="Française"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Adresse
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="123 Rue de la Paix"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>

            {/* City and Postal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Ville
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Paris"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Code Postal
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder="75001"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            {/* ID Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Type de Pièce d'Identité
                </label>
                <select
                  name="idType"
                  value={formData.idType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="Passport">Passeport</option>
                  <option value="NationalId">Carte Nationale</option>
                  <option value="DrivingLicense">Permis de Conduire</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Numéro de Pièce
                </label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  placeholder="AB123456"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Documents requis pour le corridor Russie</h4>
              <div className="space-y-4">
                <FileUpload
                  label="Passeport / Pièce d'Identité"
                  file={documentFile}
                  onChange={(e) => handleFileChange(e, setDocumentFile)}
                />
                <FileUpload
                  label="Selfie"
                  file={selfieFile}
                  onChange={(e) => handleFileChange(e, setSelfieFile)}
                />
                <FileUpload
                  label="Preuve d'adresse"
                  file={addressProofFile}
                  onChange={(e) => handleFileChange(e, setAddressProofFile)}
                />
                {needsLocalDocument && (
                  <FileUpload
                    label="Document local du pays de départ"
                    file={localProofFile}
                    onChange={(e) => handleFileChange(e, setLocalProofFile)}
                  />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:bg-slate-400 text-white font-bold py-3 rounded-lg transition-colors"
            >
              {loading ? 'Soumission...' : 'Soumettre pour Vérification'}
            </button>
          </form>
          </div>
        )}
      </div>
    </Layout>
  );
};

interface FileUploadProps {
  label: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ label, file, onChange }) => {
  const inputId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
        <input
          type="file"
          onChange={onChange}
          accept="image/*"
          className="hidden"
          id={inputId}
        />
        <label htmlFor={inputId} className="cursor-pointer block">
          <Upload className="mx-auto mb-2 text-slate-500" size={24} />
          <p className="text-sm font-semibold text-slate-700">
            {file ? file.name : 'Cliquez pour uploader'}
          </p>
          <p className="text-xs text-slate-500 mt-1">PNG ou JPG uniquement (Max 5MB)</p>
        </label>
      </div>
    </div>
  );
};
