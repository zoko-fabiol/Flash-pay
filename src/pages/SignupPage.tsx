import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, User, Mail, Phone, Lock, Hash } from 'lucide-react';
import { Error } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';

export const SignupPage: React.FC = () => {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [password, setPassword] = useState('');
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup } = useAuth();
  const { t } = useLanguage();

  React.useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setRefCode(ref);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(email, password, nom, tel, refCode);
      navigate('/email-verification');
    } catch (err: any) {
      setError(err.message || t('signup_error'));
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { icon: User,  label: t('full_name'),    type: 'text',     value: nom,      onChange: setNom,      placeholder: t('full_name'),    required: true },
    { icon: Mail,  label: t('email'),         type: 'email',    value: email,    onChange: setEmail,    placeholder: 'votre@email.com', required: true },
    { icon: Phone, label: t('phone_number'), type: 'tel',      value: tel,      onChange: setTel,      placeholder: '+7 / +237',       required: true },
    { icon: Lock,  label: t('password'),     type: 'password', value: password, onChange: setPassword, placeholder: '••••••••',        required: true },
    { icon: Hash,  label: t('referral_code_optional'), type: 'text', value: refCode, onChange: setRefCode, placeholder: t('optional_code'), required: false },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f3eeff] via-[#ede7ff] to-[#f8f5ff] px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white shadow-[0_8px_32px_rgba(98,54,204,0.15)] mb-4 overflow-hidden border border-[#eadfff]">
            <img src="/logo.png" alt="Flash Pay Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Flash Pay</h1>
          <p className="text-slate-500 mt-1 font-medium">{t('signup_desc')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(98,54,204,0.12)] p-8 border border-[#eadfff]">
          {error && <Error message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ icon: Icon, label, type, value, onChange, placeholder, required }) => (
              <div key={label}>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">{label}</label>
                <div className="relative">
                  <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#6236CC]/30 focus:border-[#6236CC] font-medium text-slate-900 transition"
                    required={required}
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#6236CC] to-[#4A1FA0] text-white font-black py-4 rounded-2xl shadow-[0_8px_24px_rgba(98,54,204,0.35)] hover:shadow-[0_12px_32px_rgba(98,54,204,0.45)] transition-all disabled:opacity-50 active:scale-95 mt-2"
            >
              {loading ? t('signing_up') : t('signup')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-400 leading-relaxed px-4">
              En vous inscrivant, vous acceptez nos{' '}
              <button onClick={() => navigate('/terms')} type="button" className="text-[#6236CC] font-bold hover:underline">Conditions d'Utilisation</button>
              {' '}et notre{' '}
              <button onClick={() => navigate('/privacy-policy')} type="button" className="text-[#6236CC] font-bold hover:underline">Politique de Confidentialité</button>.
            </p>
          </div>

          <div className="text-center mt-6 text-sm text-slate-500">
            {t('already_account')}{' '}
            <button onClick={() => navigate('/login')} className="text-[#6236CC] font-black hover:underline">
              {t('login')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
