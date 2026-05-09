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
    <div className="min-h-screen flex items-center justify-center bg-gradient-mesh px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] glass-effect shadow-premium mb-6 overflow-hidden border border-white/50">
            <img src="/logo.png" alt="Flash Pay Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Flash Pay</h1>
          <p className="text-slate-500 mt-2 font-medium">{t('signup_desc')}</p>
        </div>

        {/* Card */}
        <div className="premium-card p-10 bg-white/80 backdrop-blur-xl border-white/50">
          {error && <Error message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map(({ icon: Icon, label, type, value, onChange, placeholder, required }) => (
              <div key={label} className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</label>
                <div className="relative">
                  <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-4 py-3.5 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary font-medium text-slate-900 transition-all bg-white/50"
                    required={required}
                  />
                </div>
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-lg shadow-primary/30 mt-4"
            >
              {loading ? t('signing_up') : t('signup')}
            </button>
          </form>

          <div className="mt-8 text-center px-4">
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-widest">
              {t('by_signing_up')}{' '}
              <button onClick={() => navigate('/terms')} type="button" className="text-primary font-bold hover:underline">{t('terms_of_use')}</button>
              {' '}{t('legal_and')}{' '}
              <button onClick={() => navigate('/privacy-policy')} type="button" className="text-primary font-bold hover:underline">{t('privacy_policy')}</button>.
            </p>
          </div>

          <div className="text-center mt-8 pt-8 border-t border-slate-50 text-sm text-slate-500 font-medium">
            {t('already_account')}{' '}
            <button onClick={() => navigate('/login')} className="text-primary font-bold hover:underline underline-offset-4">
              {t('login')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

