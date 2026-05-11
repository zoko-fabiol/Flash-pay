import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userService, authService } from '../services/firebase';
import { Layout } from '../components/Layout';
import { Mail, Phone, Calendar, ChevronRight, Shield, Gift, Settings, HelpCircle, LogOut, Check, X, Pencil, Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Error, Success } from '../components/UI';
import { notificationService } from '../services/notificationService';


export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, formatDate } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    setApiError('');
    setSuccess('');
    setLoading(true);
    try {
      await userService.updateUserProfile(user.id, formData);
      setSuccess(t('profile_updated'));
      setEditing(false);
    } catch (err: any) {
      setApiError(err.message || t('update_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      setApiError('Veuillez entrer votre mot de passe actuel');
      return;
    }
    if (newPassword !== confirmPassword) {
      setApiError(t('passwords_dont_match'));
      return;
    }
    if (newPassword.length < 6) {
      setApiError(t('password_too_short'));
      return;
    }
    if (currentPassword === newPassword) {
      setApiError('Le nouveau mot de passe doit être différent du mot de passe actuel');
      return;
    }

    setLoading(true);
    setApiError('');
    try {
      await authService.updatePasswordWithReauth(currentPassword, newPassword);
      setSuccess(t('password_updated_success'));
      
      // Trigger notification
      if (user) {
        await notificationService.sendNotification({
          userId: user.id,
          title: 'Sécurité : Mot de passe modifié',
          body: 'Votre mot de passe a été mis à jour avec succès.',
          type: 'in_app',
          priority: 'high'
        });
      }

      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setApiError(err.message || t('update_error'));
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

  // Normalize KYC status — handles 'Standard', 'Expert', 'approved', 'pending', etc.
  const getRawKycStatus = (): string => {
    const status = user?.kyc?.status || user?.statut_kyc || 'not_started';
    return String(status).toLowerCase();
  };

  const getKycLabel = (): string => {
    const raw = getRawKycStatus();
    const key = `kyc_${raw}`;
    const translated = t(key);
    return translated === key ? raw.charAt(0).toUpperCase() + raw.slice(1) : translated;
  };

  const getKycColor = () => {
    const raw = getRawKycStatus();
    if (raw === 'approved' || raw === 'expert') return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' };
    if (raw === 'pending')  return { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700' };
    if (raw === 'rejected') return { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700' };
    if (raw === 'blocked')  return { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-700' };
    if (raw === 'standard') return { bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700' };
    return                         { bg: 'bg-slate-50',   text: 'text-slate-600',   dot: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600' };
  };

  const kycColor = getKycColor();
  const initials = (user?.nom || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 pb-10 px-4">

        {apiError && <Error message={apiError} onDismiss={() => setApiError('')} />}
        {success && <Success message={success} />}

        {/* ── Hero Card ── */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#661489] via-[#4D0F67] to-[#2A083B] p-6 text-white shadow-[0_16px_40px_rgba(42,8,59,0.28)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black backdrop-blur-sm shrink-0">
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">{user?.nom || '—'}</h1>
                <p className="mt-0.5 text-sm text-white/70 truncate max-w-[180px]">{user?.email}</p>
                <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${kycColor.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${kycColor.dot}`} />
                  KYC {getKycLabel()}
                </div>
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-2xl bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/25 transition shrink-0"
              >
                <Pencil size={13} /> {t('edit')}
              </button>
            )}
          </div>

          <div className="relative mt-4 flex items-center gap-2 text-xs text-white/60">
            <Calendar size={13} />
            <span>{t('created_at')} : {user?.createdAt ? formatDate(user.createdAt) : '—'}</span>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`flex flex-col gap-2 rounded-[24px] ${kycColor.bg} border border-slate-200 p-5`}>
            <div className="flex items-center gap-2">
              <Shield size={16} className={kycColor.text} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('kyc_status')}</span>
            </div>
            <p className={`text-lg font-black ${kycColor.text}`}>{getKycLabel()}</p>
            <button
              onClick={() => navigate('/kyc')}
              className={`mt-auto text-[11px] font-bold ${kycColor.text} opacity-70 hover:opacity-100 text-left transition`}
            >
              {t('menu_profile_kyc')} →
            </button>
          </div>

          <div className="flex flex-col gap-2 rounded-[24px] bg-gradient-to-br from-[#F5E8FF] to-[#FDF2F7] border border-[#F5E6F0] p-5">
            <div className="flex items-center gap-2">
              <Gift size={16} className="text-[#661489]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('available_bonus')}</span>
            </div>
            <p className="text-lg font-black text-[#661489]">
              {user?.solde_bonus ?? 0} <span className="text-sm font-bold">RUB</span>
            </p>
            <button
              onClick={() => navigate('/referral')}
              className="mt-auto text-[11px] font-bold text-[#661489] opacity-70 hover:opacity-100 text-left transition"
            >
              {t('menu_referral')} →
            </button>
          </div>
        </div>

        {/* ── Personal Info ── */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100">
            <h2 className="font-black text-slate-900">{t('personal_info')}</h2>
          </div>

          <div className="divide-y divide-slate-50">
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                <Mail size={16} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('email')}</p>
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                <Phone size={16} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('phone_number')}</p>
                {editing ? (
                  <input
                    type="tel"
                    name="tel"
                    value={formData.tel}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#661489]/40"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900">{user?.tel || '—'}</p>
                )}
              </div>
            </div>
          </div>

          {editing && (
            <div className="flex gap-3 px-6 pb-5 pt-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#661489] text-white font-bold text-sm hover:bg-[#2D0723] transition disabled:opacity-50"
              >
                <Check size={16} /> {loading ? t('saving') : t('save')}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition"
              >
                <X size={16} /> {t('cancel')}
              </button>
            </div>
          )}
        </div>

        {/* ── Security / Password ── */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-black text-slate-900">{t('security')}</h2>
            <button 
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="text-xs font-bold text-[#661489] hover:underline"
            >
              {showPasswordForm ? t('cancel') : t('change_password')}
            </button>
          </div>
          
          {showPasswordForm ? (
            <div className="p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('current_password_label')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#661489]/40"
                  placeholder={t('placeholder_current_password')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('new_password_label')}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#661489]/40"
                  placeholder={t('placeholder_new_password')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('confirm_password_label')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#661489]/40"
                  placeholder={t('placeholder_confirm_password')}
                />
              </div>
              <button
                onClick={handleUpdatePassword}
                disabled={loading || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full py-4 rounded-2xl bg-[#661489] text-white font-bold text-sm shadow-lg shadow-[#661489]/20 hover:bg-[#2D0723] transition disabled:opacity-50"
              >
                {loading ? t('updating_password') : t('update_password_btn')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Shield size={16} className="text-emerald-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{t('password_display_label')}</p>
                <p className="text-xs text-slate-400">{t('last_modification_label')} : {t('recently_label')}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Quick Links ── */}
        <div className="rounded-[24px] bg-white border border-slate-100 shadow-sm overflow-hidden">
          {[
            { icon: Settings, label: t('manage_preferences'), to: '/preferences' },
            { icon: Shield, label: t('menu_profile_kyc'), to: '/kyc' },
          ].map(({ icon: Icon, label, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition border-b border-slate-50 last:border-0"
            >
              <div className="w-9 h-9 rounded-xl bg-[#F5E8FF] flex items-center justify-center shrink-0">
                <Icon size={16} className="text-[#661489]" />
              </div>
              <span className="flex-1 text-sm font-semibold text-slate-800 text-left">{label}</span>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/support')}
            className="flex flex-col items-start gap-2 p-5 rounded-[24px] bg-white border border-slate-100 shadow-sm hover:shadow-md transition text-left"
          >
            <HelpCircle size={20} className="text-[#661489]" />
            <p className="font-bold text-slate-900 text-sm">{t('contact_support')}</p>
            <p className="text-xs text-slate-400">{t('support_desc')}</p>
          </button>
          <button className="flex flex-col items-start gap-2 p-5 rounded-[24px] bg-white border border-slate-100 shadow-sm hover:shadow-md transition text-left">
            <Star size={20} className="text-[#661489]" />
            <p className="font-bold text-slate-900 text-sm">{t('about')}</p>
            <p className="text-xs text-slate-400">{t('legal_desc')}</p>
          </button>
        </div>

        {/* ── Logout ── */}
        <div className="pt-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-[24px] border-2 border-slate-100 bg-white text-slate-600 font-bold hover:bg-slate-50 transition"
          >
            <LogOut size={18} />
            {t('logout')}
          </button>
        </div>
      </div>
    </Layout>
  );
};


