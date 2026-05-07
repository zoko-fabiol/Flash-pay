import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { Upload, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Error, Success } from '../components/UI';
import { pickImageNative, isNativeApp } from '../utils/capacitorUtils';

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
  const [departureRegion, setDepartureRegion] = useState<'russia' | 'africa'>('russia');

  const [dailyLimit, setDailyLimit] = useState(150000);
  const [standardLimit, setStandardLimit] = useState(20000);
  const [expertLimit, setExpertLimit] = useState(150000);
  const [rates, setRates] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);

  useEffect(() => {
    const qSettings = query(collection(db, 'settings'));
    const unsubSettings = onSnapshot(qSettings, (snapshot) => {
      if (!snapshot.empty) {
        const settingsDoc = snapshot.docs[0].data();
        if (settingsDoc.dailyLimitRUB) setDailyLimit(settingsDoc.dailyLimitRUB);
        if (settingsDoc.standardLimitRUB) setStandardLimit(settingsDoc.standardLimitRUB);
        if (settingsDoc.expertLimitRUB) setExpertLimit(settingsDoc.expertLimitRUB);
      }
    });

    const qRates = query(collection(db, 'exchange_rates'));
    const unsubRates = onSnapshot(qRates, (snapshot) => {
      setRates(snapshot.docs.map(doc => doc.data()));
    });

    // Charger les pays depuis Firestore
    const unsubCountries = onSnapshot(collection(db, 'countries'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Trier alphabétiquement par nom
      data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setCountries(data);
      // Définir le premier pays comme valeur par défaut seulement si le form n'a pas déjà une valeur
      if (data.length > 0 && !formData.countryOfDeparture) {
        setFormData(prev => ({ ...prev, countryOfDeparture: (data[0] as any).name }));
      }
    });

    return () => {
      unsubSettings();
      unsubRates();
      unsubCountries();
    };
  }, []);

  // Détecter si c'est le corridor russe (code RU ou nom Russie)
  const selectedCountry = countries.find((c: any) => c.name === formData.countryOfDeparture);
  const needsLocalDocument = selectedCountry
    ? (selectedCountry.code || '').toUpperCase() !== 'RU'
    : (formData.countryOfDeparture.trim().toLowerCase() !== 'russie' && formData.countryOfDeparture.trim().toLowerCase() !== 'russia');
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
      setError(t('error_image_only'));
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
      setError(err.message || t('update_error'));
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
        {t(`kyc_${badgeKey.toLowerCase()}`)}
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 pb-10 px-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1">{t('kyc_title')}</h1>
          <p className="text-slate-500 font-medium">{t('kyc_desc')}</p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-900 mb-4">{t('kyc_status')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-700">{t('verification_level')}</span>
              {getStatusBadge()}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-700">{t('daily_transfer_limit')}</span>
              <div className="text-right">
                {(() => {
                  const isExpert = kycStatus === 'approved';
                  const activeLimit = isExpert ? expertLimit : standardLimit;
                  if (kycStatus === 'blocked') return <p className="font-bold text-rose-600">{t('kyc_blocked')}</p>;
                  if (kycStatus === 'pending') return <p className="font-bold text-amber-600">{t('kyc_pending')}</p>;
                  return (
                    <>
                      <p className={`font-black text-lg ${isExpert ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {activeLimit.toLocaleString('fr-FR')} RUB
                        {isExpert && <span className="ml-1.5 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Expert</span>}
                      </p>
                      <p className="text-xs text-slate-500 font-medium">
                        ≈ {(activeLimit * (rates.find(r => r.from === 'RUB' && r.to === 'XAF')?.rate || 7.22)).toLocaleString('fr-FR')} XAF
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {error && <Error message={error} onDismiss={() => setError('')} />}
        {success && <Success message={success} />}

        {/* KYC Form */}
        {(kycStatus === 'not_started' || kycStatus === 'rejected') && (
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-bold text-lg mb-6">{t('personal_details')}</h3>
            {kycStatus === 'rejected' && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
                <p className="font-bold">{t('kyc_rejected')}</p>
                <p className="text-sm">{t('kyc_desc')}</p>
              </div>
            )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('first_name')}
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder={t('first_name')}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('last_name')}
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder={t('last_name')}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3">
                {t('departure_country')}
              </label>

              {/* Step 1: Region selector — premium card style */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Russia */}
                <button
                  type="button"
                  onClick={() => {
                    setDepartureRegion('russia');
                    setFormData(prev => ({ ...prev, countryOfDeparture: 'Russie' }));
                  }}
                  className={`relative flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-2xl border-2 transition-all duration-200 ${
                    departureRegion === 'russia'
                      ? 'border-[#6236CC] bg-gradient-to-b from-[#f7f3ff] to-white shadow-[0_4px_16px_rgba(98,54,204,0.15)]'
                      : 'border-slate-200 bg-white hover:border-[#6236CC]/40 hover:shadow-sm'
                  }`}
                >
                  {/* Active indicator dot */}
                  {departureRegion === 'russia' && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#6236CC]" />
                  )}
                  {/* Russia icon */}
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="rounded-md overflow-hidden">
                    <rect width="32" height="10.67" fill="#FFFFFF"/>
                    <rect y="10.67" width="32" height="10.67" fill="#0039A6"/>
                    <rect y="21.33" width="32" height="10.67" fill="#D52B1E"/>
                  </svg>
                  <span className={`text-sm font-black tracking-tight ${departureRegion === 'russia' ? 'text-[#6236CC]' : 'text-slate-600'}`}>
                    {t('russia')}
                  </span>
                </button>

                {/* Africa */}
                <button
                  type="button"
                  onClick={() => {
                    setDepartureRegion('africa');
                    if (countries.length > 0) {
                      setFormData(prev => ({ ...prev, countryOfDeparture: countries[0].name }));
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-2xl border-2 transition-all duration-200 ${
                    departureRegion === 'africa'
                      ? 'border-[#6236CC] bg-gradient-to-b from-[#f7f3ff] to-white shadow-[0_4px_16px_rgba(98,54,204,0.15)]'
                      : 'border-slate-200 bg-white hover:border-[#6236CC]/40 hover:shadow-sm'
                  }`}
                >
                  {departureRegion === 'africa' && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#6236CC]" />
                  )}
                  {/* Africa map icon */}
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="16" fill="#F0F4FF"/>
                    <path d="M16 6C12.5 6 9 8.5 9 13c0 2.5 1 4.5 1 6.5 0 1.5.5 3 2 4.5.5.5 1.5 1.5 2 2 .5.5 1 1 2 1s1.5-.5 2-1c.5-.5 1.5-1.5 2-2 1.5-1.5 2-3 2-4.5 0-2 1-4 1-6.5C23 8.5 19.5 6 16 6z" fill="#6236CC" opacity="0.7"/>
                    <path d="M18 6.2c1 .5 2 1.2 2.5 2.3.5 1 .5 2-.5 2.5s-2 0-2.5-1-.5-2.5.5-3.8z" fill="#4A1FA0" opacity="0.5"/>
                  </svg>
                  <span className={`text-sm font-black tracking-tight ${departureRegion === 'africa' ? 'text-[#6236CC]' : 'text-slate-600'}`}>
                    {t('africa') || 'Afrique'}
                  </span>
                </button>
              </div>

              {/* Step 2: African countries dropdown */}
              {departureRegion === 'africa' && (
                <div className="relative">
                  <select
                    name="countryOfDeparture"
                    value={formData.countryOfDeparture}
                    onChange={handleInputChange}
                    className="w-full appearance-none px-4 py-3.5 pr-10 border-2 border-[#6236CC]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#6236CC]/20 focus:border-[#6236CC] font-bold text-slate-900 bg-white transition cursor-pointer"
                    required
                  >
                    {countries.length === 0 ? (
                      <option value="">{t('loading')}</option>
                    ) : (
                      countries.map((country: any) => (
                        <option key={country.id} value={country.name}>
                          {country.name}
                        </option>
                      ))
                    )}
                  </select>
                  {/* Custom chevron */}
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 6L8 10L12 6" stroke="#6236CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* DOB and Nationality */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('dob')}
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('nationality')}
                </label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleInputChange}
                  placeholder={t('nationality_placeholder')}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {t('address')}
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder={t('address')}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              />
            </div>

            {/* City and Postal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('address_city')}
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder={t('address_city')}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('postal_code')}
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder={t('postal_code')}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            {/* ID Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('id_type')}
                </label>
                <select
                  name="idType"
                  value={formData.idType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="Passport">{t('passport')}</option>
                  <option value="NationalId">{t('national_id')}</option>
                  <option value="DrivingLicense">{t('driving_license')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('id_number')}
                </label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  placeholder="AB123456"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">{t('required_documents_corridor', { country: formData.countryOfDeparture })}</h4>
              <div className="space-y-4">
                <FileUpload
                  label={t('id_card_photo')}
                  file={documentFile}
                  onChange={(e) => handleFileChange(e, setDocumentFile)}
                  onFileChange={(f) => setDocumentFile(f)}
                />
                <FileUpload
                  label={t('selfie_photo')}
                  file={selfieFile}
                  onChange={(e) => handleFileChange(e, setSelfieFile)}
                  onFileChange={(f) => setSelfieFile(f)}
                />
                <FileUpload
                  label={t('address_proof')}
                  file={addressProofFile}
                  onChange={(e) => handleFileChange(e, setAddressProofFile)}
                  onFileChange={(f) => setAddressProofFile(f)}
                />
                {needsLocalDocument && (
                  <>
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                      <span className="text-amber-500 text-lg shrink-0">⚠️</span>
                      <div>
                        <p className="font-bold text-amber-800 text-sm">{t('local_document_required')}</p>
                        <p className="text-xs text-amber-700 mt-0.5">{t('local_document_desc')}</p>
                      </div>
                    </div>
                    <FileUpload
                      label={t('local_document')}
                      file={localProofFile}
                      onChange={(e) => handleFileChange(e, setLocalProofFile)}
                      onFileChange={(f) => setLocalProofFile(f)}
                    />
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#6236CC] to-[#4A1FA0] disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-[0_8px_24px_rgba(98,54,204,0.25)] hover:shadow-[0_12px_32px_rgba(98,54,204,0.35)] transition active:scale-95 flex items-center justify-center gap-2"
            >
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
  onFileChange?: (file: File) => void; // for native camera
}

const FileUpload: React.FC<FileUploadProps> = ({ label, file, onChange, onFileChange }) => {
  const { t } = useLanguage();
  const inputId = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const [loading, setLoading] = useState(false);

  const handleNativePick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const picked = await pickImageNative('PROMPT');
      if (picked && onFileChange) onFileChange(picked);
    } finally {
      setLoading(false);
    }
  };

  const native = isNativeApp();

  return (
    <div>
      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">{label}</label>
      <div
        className={`relative border-2 border-dashed rounded-2xl transition-all overflow-hidden ${
          file
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-slate-200 bg-white hover:border-[#6236CC]/50 hover:bg-[#f7f3ff]/30'
        }`}
      >
        {/* Hidden input for web fallback */}
        {!native && (
          <input
            type="file"
            onChange={onChange}
            accept="image/*"
            className="hidden"
            id={inputId}
          />
        )}

        {/* Clickable area */}
        {native ? (
          <button
            type="button"
            onClick={handleNativePick}
            disabled={loading}
            className="cursor-pointer flex items-center gap-3 px-4 py-4 w-full text-left"
          >
            <FileUploadContent file={file} loading={loading} t={t} native />
          </button>
        ) : (
          <label htmlFor={inputId} className="cursor-pointer flex items-center gap-3 px-4 py-4 w-full">
            <FileUploadContent file={file} loading={loading} t={t} native={false} />
          </label>
        )}
      </div>
    </div>
  );
};

// Inner content to avoid duplication
const FileUploadContent: React.FC<{
  file: File | null;
  loading: boolean;
  t: (key: string) => string;
  native: boolean;
}> = ({ file, loading, t, native }) => (
  <>
    {/* Icon */}
    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
      file ? 'bg-emerald-100' : 'bg-slate-100'
    }`}>
      {loading ? (
        <div className="w-4 h-4 border-2 border-[#6236CC] border-t-transparent rounded-full animate-spin" />
      ) : file ? (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3.75 9.75L7.5 13.5L14.25 5.25" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : native ? (
        <Camera size={18} className="text-slate-400" />
      ) : (
        <Upload size={18} className="text-slate-400" />
      )}
    </div>

    {/* Text */}
    <div className="flex-1 min-w-0">
      {file ? (
        <>
          <p className="text-sm font-bold text-emerald-700 truncate w-full">{file.name}</p>
          <p className="text-xs text-emerald-500 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-slate-600">
            {native ? t('take_photo') || 'Prendre une photo' : t('upload_click')}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{t('png_jpg_only')}</p>
        </>
      )}
    </div>

    {/* Status badge */}
    {file && (
      <span className="shrink-0 text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg uppercase tracking-wider">
        ✓
      </span>
    )}
  </>
);
