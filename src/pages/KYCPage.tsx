import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService, db } from '../services/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { Upload, AlertCircle, CheckCircle, Camera, Shield, Globe } from 'lucide-react';
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

    return () => {
      unsubSettings();
      unsubRates();
      unsubCountries();
    };
  }, []);

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
      <div className="max-w-2xl mx-auto space-y-8 pb-20 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="space-y-2 px-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter sm:text-5xl">{t('kyc_title')}</h1>
          <p className="text-slate-500 font-bold uppercase text-[11px] tracking-[0.2em] opacity-70">{t('kyc_desc')}</p>
        </div>

        {/* Current Status */}
        <div className="bg-white rounded-[40px] p-10 border border-[#eadfff] shadow-xl shadow-slate-900/5 relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-[#6236CC]/5 rounded-full blur-3xl group-hover:bg-[#6236CC]/10 transition-colors"></div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8 relative z-10">{t('kyc_status')}</h3>
          <div className="space-y-8 relative z-10">
            <div className="flex items-center justify-between pb-6 border-b border-slate-50">
              <div className="space-y-1">
                <span className="text-slate-900 font-black text-lg tracking-tight">{t('verification_level')}</span>
              </div>
              {getStatusBadge()}
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-slate-900 font-black text-lg tracking-tight">{t('daily_transfer_limit')}</span>
              </div>
              <div className="text-right">
                {(() => {
                  const isExpert = kycStatus === 'approved';
                  const activeLimit = isExpert ? expertLimit : standardLimit;
                  if (kycStatus === 'blocked') return <p className="font-black text-rose-500">{t('kyc_blocked')}</p>;
                  if (kycStatus === 'pending') return <p className="font-black text-amber-500">{t('kyc_pending')}</p>;
                  return (
                    <div className="space-y-1">
                      <p className={`text-3xl font-black tracking-tighter ${isExpert ? 'text-[#6236CC]' : 'text-slate-900'}`}>
                        {activeLimit.toLocaleString('fr-FR')} <span className="text-sm font-bold opacity-40">RUB</span>
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {error && <Error message={error} onDismiss={() => setError('')} />}
        {success && <Success message={success} />}

        {(kycStatus === 'not_started' || kycStatus === 'rejected') && (
          <div className="bg-white rounded-[40px] p-10 border border-[#eadfff] shadow-2xl shadow-slate-900/5">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 bg-[#F3EDF7] rounded-2xl flex items-center justify-center text-[#6236CC] shadow-sm">
                <Shield size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('personal_details')}</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t('first_name')}</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t('last_name')}</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t('birth_date')}</label>
                  <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t('nationality')}</label>
                  <input type="text" name="nationality" value={formData.nationality} onChange={handleInputChange} className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t('address')}</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t('city')}</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t('postal_code')}</label>
                  <input type="text" name="postalCode" value={formData.postalCode} onChange={handleInputChange} className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900" />
                </div>
              </div>

              <div className="pt-8 border-t border-slate-50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-10 h-10 bg-[#F3EDF7] rounded-xl flex items-center justify-center text-[#6236CC]">
                    <Globe size={20} />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">{t('identity_document')}</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t('document_type')}</label>
                    <select name="idType" value={formData.idType} onChange={handleInputChange} className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900">
                      <option value="Passport">Passport</option>
                      <option value="ID Card">Carte d'Identité</option>
                      <option value="Driver License">Permis de conduire</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{t('id_number')}</label>
                    <input type="text" name="idNumber" value={formData.idNumber} onChange={handleInputChange} className="w-full px-6 py-4 bg-[#F8F9FC] border border-slate-100 rounded-2xl focus:outline-none focus:border-[#6236CC] font-black text-slate-900" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                   <FileUpload label={t('id_proof')} file={documentFile} onChange={(e) => handleFileChange(e, setDocumentFile)} />
                   <FileUpload label={t('selfie_with_id')} file={selfieFile} onChange={(e) => handleFileChange(e, setSelfieFile)} />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[#6236CC] text-white font-black py-6 rounded-[32px] shadow-2xl hover:translate-y-[-4px] transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest mt-12">
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

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">{label}</p>
      <label htmlFor={inputId} className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-[32px] cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-50/30' : 'border-[#eadfff] bg-[#F8F9FC] hover:border-[#6236CC]/50 hover:bg-[#F3EDF7]/20'}`}>
        {file ? (
          <div className="flex flex-col items-center p-4">
            <CheckCircle className="text-emerald-500 mb-3" size={32} />
            <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">{t('file_selected')}</p>
            <p className="text-[10px] text-emerald-600 mt-1 opacity-60 truncate max-w-[150px]">{file.name}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center p-4">
            <Upload className="text-slate-300 mb-3" size={32} />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('choose_file')}</p>
          </div>
        )}
        <input id={inputId} type="file" className="hidden" accept="image/*" onChange={onChange} />
      </label>
    </div>
  );
};

