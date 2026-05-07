import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, Lock } from 'lucide-react';
import { Error } from '../components/UI';
import { useLanguage } from '../context/LanguageContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || t('login_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f3eeff] via-[#ede7ff] to-[#f8f5ff] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white shadow-[0_8px_32px_rgba(98,54,204,0.15)] mb-4 overflow-hidden border border-[#eadfff]">
            <img src="/logo.png" alt="Flash Pay Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Flash Pay</h1>
          <p className="text-slate-500 mt-1 font-medium">{t('welcome_back')}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[28px] shadow-[0_20px_60px_rgba(98,54,204,0.12)] p-8 border border-[#eadfff]">
          {error && <Error message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">{t('email')}</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#6236CC]/30 focus:border-[#6236CC] font-medium text-slate-900 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">{t('password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#6236CC]/30 focus:border-[#6236CC] font-medium text-slate-900 transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#6236CC] to-[#4A1FA0] text-white font-black py-4 rounded-2xl shadow-[0_8px_24px_rgba(98,54,204,0.35)] hover:shadow-[0_12px_32px_rgba(98,54,204,0.45)] transition-all disabled:opacity-50 active:scale-95"
            >
              {loading ? t('connecting') : t('login')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[10px] text-slate-400 leading-relaxed px-4">
              <button onClick={() => navigate('/terms')} type="button" className="hover:text-[#6236CC] hover:underline transition">Conditions d'Utilisation</button>
              {' • '}
              <button onClick={() => navigate('/privacy-policy')} type="button" className="hover:text-[#6236CC] hover:underline transition">Politique de Confidentialité</button>
            </p>
          </div>

          <div className="text-center mt-6 text-sm text-slate-500">
            {t('no_account')}{' '}
            <button onClick={() => navigate('/signup')} className="text-[#6236CC] font-black hover:underline">
              {t('signup')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
