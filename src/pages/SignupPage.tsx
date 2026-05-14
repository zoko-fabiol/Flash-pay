import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, User, Mail, Phone, Lock, Hash, MapPin } from 'lucide-react';
import { Error } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';
import { CountrySelector } from '../components/CountrySelector';

export const SignupPage: React.FC = () => {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [tel, setTel] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [password, setPassword] = useState('');
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup, loginWithGoogle } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  React.useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setRefCode(ref);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryCode) {
      setError('Veuillez choisir votre pays');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(email, password, nom, tel, countryCode, refCode);
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
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-mesh px-4 py-12 relative">
      {/* Language Selector */}
      <div className="absolute top-6 right-6 flex items-center gap-1 bg-white/30 backdrop-blur-md p-1 rounded-2xl border border-white/50 shadow-sm z-10">
        <button 
          onClick={() => setLanguage('fr')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'fr' ? 'bg-[#661489] text-white shadow-md' : 'text-slate-600 hover:bg-white/40'}`}
        >
          FR
        </button>
        <button 
          onClick={() => setLanguage('en')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'bg-[#661489] text-white shadow-md' : 'text-slate-600 hover:bg-white/40'}`}
        >
          EN
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] glass-effect shadow-premium mb-6 overflow-hidden border border-white/50">
            <img src="/icon.png" alt="Flash Pay Logo" className="w-full h-full object-cover scale-110" />
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

            <CountrySelector 
              value={countryCode} 
              onChange={setCountryCode} 
              label={t('departure_country') || 'Pays de résidence'} 
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{t('password')}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary font-medium text-slate-900 transition-all bg-white/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{t('referral_code_optional')}</label>
              <div className="relative">
                <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  placeholder={t('optional_code')}
                  className="w-full pl-12 pr-4 py-3.5 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary font-medium text-slate-900 transition-all bg-white/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-lg shadow-primary/30 mt-4"
            >
              {loading ? t('signing_up') : t('signup')}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-black">
              <span className="bg-white px-4 text-slate-400">{t('or_separator') || 'OU'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                await loginWithGoogle();
                navigate('/');
              } catch (err: any) {
                setError(err.message || t('login_error'));
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-slate-100 font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            {t('google_signup') || 'Continuer avec Google'}
          </button>

          <div className="text-center mt-6 text-sm text-slate-500 font-medium">
            {t('already_account')}{' '}
            <button onClick={() => navigate('/login')} className="text-primary font-bold hover:underline underline-offset-4">
              {t('login')}
            </button>
          </div>

          <div className="mt-8 text-center px-4 opacity-60">
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-widest">
              {t('by_signing_up')}{' '}
              <button onClick={() => navigate('/terms')} type="button" className="text-primary font-bold hover:underline">{t('terms_of_use')}</button>
              {' '}{t('legal_and')}{' '}
              <button onClick={() => navigate('/privacy-policy')} type="button" className="text-primary font-bold hover:underline">{t('privacy_policy')}</button>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

