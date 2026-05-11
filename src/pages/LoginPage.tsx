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
    <div className="min-h-screen flex items-center justify-center bg-gradient-mesh px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] glass-effect shadow-premium mb-6 overflow-hidden border border-white/50">
            <img src="/logo.png" alt="Flash Pay Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Flash Pay</h1>
          <p className="text-slate-500 mt-2 font-medium">{t('welcome_back')}</p>
        </div>

        {/* Card */}
        <div className="premium-card p-10 bg-white/80 backdrop-blur-xl border-white/50">
          {error && <Error message={error} onDismiss={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{t('email')}</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full pl-12 pr-4 py-4 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary font-medium text-slate-900 transition-all bg-white/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">{t('password')}</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary font-medium text-slate-900 transition-all bg-white/50"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-lg shadow-primary/30"
            >
              {loading ? t('connecting') : t('login')}
            </button>
          </form>

          <div className="text-center mt-[3.5mm] text-sm text-slate-500 font-medium">
            {t('no_account')}{' '}
            <button onClick={() => navigate('/signup')} className="text-primary font-bold hover:underline underline-offset-4">
              {t('signup')}
            </button>
          </div>

          <div className="mt-8 text-center opacity-60">
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium uppercase tracking-widest">
              <button onClick={() => navigate('/terms')} type="button" className="hover:text-primary transition">{t('terms_of_use')}</button>
              {' • '}
              <button onClick={() => navigate('/privacy-policy')} type="button" className="hover:text-primary transition">{t('privacy_policy')}</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

