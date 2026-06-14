import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { Upload, AlertCircle, CheckCircle, Camera, Shield, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Error, Success } from '../components/UI';
import { pickImageNative, isNativeApp } from '../utils/capacitorUtils';

const isPdfFile = (file: File | null) => file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf') || false;

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
  const { t } = useLanguage();
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
  const [standardLimit, setStandardLimit] = useState(20000);
  const [expertLimit, setExpertLimit] = useState(150000);
  const [rates, setRates] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);

  useEffect(() => {
    const unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      if (!snapshot.empty) {
        const settingsDoc = snapshot.docs[0].data();
        if (settingsDoc.dailyLimitRUB) setDailyLimit(settingsDoc.dailyLimitRUB);
        if (settingsDoc.standardLimitRUB) setStandardLimit(settingsDoc.standardLimitRUB);
        if (settingsDoc.expertLimitRUB) setExpertLimit(settingsDoc.expertLimitRUB);
      }
    });

    const unsubRates = onSnapshot(collection(db, 'exchange_rates'), (snapshot) => {
      setRates(snapshot.docs.map(doc => doc.data()));
    });

    const unsubCountries = onSnapshot(collection(db, 'countries'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setCountries(data);
      if (data.length > 0 && !formData.countryOfDeparture) {
        setFormData(prev => ({ ...prev, countryOfDeparture: (data[0] as any).name }));
      }
    });

    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || user.nom?.split(' ')[0] || prev.firstName,
        lastName: user.lastName || user.nom?.split(' ').slice(1).join(' ') || prev.lastName,
        nationality: user.nationality || prev.nationality,
        address: user.address || prev.address,
        city: user.city || prev.city,
        postalCode: user.postalCode || prev.postalCode,
      }));
    }

    return () => {
      unsubSettings();
      unsubRates();
      unsubCountries();
    };
  }, [user]);

  const kycStatus = getKycStatus(user);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setFile(file);
      setError('');
    } else if (file) {
      setError('Veuillez sélectionner une image ou un PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!user) {
      setError(t('error_login_required'));
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

      setSuccess(t('kyc_submitted'));
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
      setError(err.message || t('update_error'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const statusColors = {
      Standard: 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-300',
      Pending: 'bg-yellow-100 text-yellow-800 dark:bg-amber-900/40 dark:text-amber-300',
      Expert: 'bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-300',
      Rejected: 'bg-red-100 text-red-800 dark:bg-rose-900/40 dark:text-rose-300',
      Blocked: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    };

    const statusIcons = {
      Standard: <AlertCircle size={16} />,
      Pending: <AlertCircle size={16} />,
      Expert: <CheckCircle size={16} />,
      Rejected: <AlertCircle size={16} />,
      Blocked: <AlertCircle size={16} />,
    };

    const badgeKey = kycStatus === 'blocked' ? 'Blocked' : 
                   (kycStatus === 'approved' ? 'Expert' :
                    kycStatus === 'pending' ? 'Pending' :
                    kycStatus === 'rejected' ? 'Rejected' : 'Standard');

    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold ${statusColors[badgeKey as keyof typeof statusColors]}`}>
        {statusIcons[badgeKey as keyof typeof statusIcons]}
        {t(`kyc_${badgeKey.toLowerCase()}`)}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8 pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2 px-2">
          <h1 className="text-5xl font-bold text-slate-900 tracking-tight">{t('kyc_title')}</h1>
          <p className="text-slate-500 font-medium text-sm tracking-wide">{t('kyc_desc')}</p>
        </div>

        {/* Current Status */}
        <div className="premium-card p-8 group relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8 relative z-10">{t('kyc_status')}</h3>
          <div className="space-y-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-50">
              <span className="text-slate-900 font-bold text-lg tracking-tight">{t('verification_level')}</span>
              {getStatusBadge()}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <span className="text-slate-900 font-bold text-lg tracking-tight">{t('daily_transfer_limit')}</span>
              <div className="text-left sm:text-right">
                {(() => {
                  const isExpert = kycStatus === 'approved';
                  const activeLimit = isExpert ? expertLimit : standardLimit;
                  if (kycStatus === 'blocked') return <p className="font-bold text-rose-500">{t('kyc_blocked')}</p>;
                  if (kycStatus === 'pending') return <p className="font-bold text-amber-500">{t('kyc_pending')}</p>;
                  return (
                    <p className={`text-3xl font-bold tracking-tight ${isExpert ? 'text-primary' : 'text-slate-900'}`}>
                      {activeLimit.toLocaleString('fr-FR')} <span className="text-sm font-medium opacity-40 uppercase">RUB</span>
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {error && <Error message={error} onDismiss={() => setError('')} />}
        {success && <Success message={success} />}

        {(kycStatus === 'not_started' || kycStatus === 'rejected') && (
          <div className="premium-card p-8 lg:p-12">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
                <Shield size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{t('personal_details')}</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t('first_name')}</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t('last_name')}</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="input-field" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t('birth_date')}</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t('nationality')}</label>
                  <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="input-field" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t('address')}</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="input-field" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t('city')}</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="input-field" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t('postal_code')}</label>
                  <input type="text" name="postalCode" value={formData.postalCode} onChange={handleInputChange} className="input-field" />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
                    <Globe size={20} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">{t('identity_document')}</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t('document_type')}</label>
                    <select name="idType" value={formData.idType} onChange={handleInputChange} className="input-field">
                      <option value="Passport">Passport</option>
                      <option value="ID Card">Carte d'Identité</option>
                      <option value="Driver License">Permis de conduire</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t('id_number')}</label>
                    <input type="text" name="idNumber" value={formData.idNumber} onChange={handleInputChange} className="input-field" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                   <FileUpload label={t('id_proof')} file={documentFile} onChange={(e) => handleFileChange(e, setDocumentFile)} />
                   <FileUpload label={t('selfie_with_id')} file={selfieFile} onChange={(e) => handleFileChange(e, setSelfieFile)} />
                   
                   {/* Missing Fields Added */}
                   <FileUpload label={t('address_proof')} file={addressProofFile} onChange={(e) => handleFileChange(e, setAddressProofFile)} />
                   
                   {/* Dynamic Local Document Field */}
                   {(() => {
                     const departure = (formData.countryOfDeparture || '').toLowerCase();
                     const nationality = (formData.nationality || '').toLowerCase();
                     const isRussian = ['russie', 'russia', 'ru'].some(n => departure.includes(n)) || 
                                      ['russe', 'russian'].some(n => nationality.includes(n));
                     
                     return !isRussian && (
                       <FileUpload label={t('local_document')} file={localProofFile} onChange={(e) => handleFileChange(e, setLocalProofFile)} />
                     );
                   })()}
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-5 text-lg mt-12">
                {loading ? t('saving') : t('submit_kyc')}
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
  const { t } = useLanguage();
  const inputId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const previewUrl = React.useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{label}</p>
      <label htmlFor={inputId} className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-3xl cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 bg-slate-50 hover:border-primary/50 hover:bg-primary/5'}`}>
        {file ? (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center gap-3">
            {isPdfFile(file) ? (
              <div className="w-full h-full rounded-2xl overflow-hidden bg-white border border-slate-100">
                <iframe src={previewUrl} title={label} className="w-full h-40" />
              </div>
            ) : (
              <img src={previewUrl} alt={label} className="max-h-32 rounded-2xl object-contain shadow-sm" />
            )}
            <CheckCircle className="text-emerald-500" size={28} />
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">{t('file_selected')}</p>
            <p className="text-[10px] text-emerald-600/60 truncate max-w-[150px] font-medium">{file.name}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center p-4">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 text-slate-300 group-hover:text-primary transition-colors">
              <Upload size={24} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('choose_file')}</p>
          </div>
        )}
        <input id={inputId} type="file" className="hidden" accept="image/*,application/pdf" onChange={onChange} />
      </label>
    </div>
  );
};


