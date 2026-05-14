import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { userService, authService, db } from '../services/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { Layout } from '../components/Layout';
import { Mail, Phone, Calendar, ChevronRight, Shield, Gift, Settings, HelpCircle, LogOut, Check, X, Pencil, Star, User, Zap, ShieldCheck, Fingerprint, Lock, Key } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Error, Success } from '../components/UI';
import { notificationService } from '../services/notificationService';
import { biometricService } from '../services/biometricService';
import { CountrySelector } from '../components/CountrySelector';
import { MapPin } from 'lucide-react';

import { Capacitor } from '@capacitor/core';
import { pinService } from '../services/pinService';
import { PinModal } from '../components/PinModal';


export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, formatDate, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(localStorage.getItem('biometric_enabled') === 'true');
  const [showBiometricConfirm, setShowBiometricConfirm] = useState(false);
  const [referralReward, setReferralReward] = useState(500);
  const [appLockEnabled, setAppLockEnabled] = useState(localStorage.getItem('app_lock_enabled') === 'true');
  const [pinEnabled, setPinEnabled] = useState(pinService.isEnabled());
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'set' | 'verify'>('set');
  const isNative = Capacitor.isNativePlatform();

  const [pointsCurrency, setPointsCurrency] = useState('RUB');
  const [pointsRedemptionRate, setPointsRedemptionRate] = useState(1000);

  useEffect(() => {
    const unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        if (data.referralBonusRUB) setReferralReward(data.referralBonusRUB);
        if (data.pointsCurrency) setPointsCurrency(data.pointsCurrency);
        if (data.pointsRedemptionRate) setPointsRedemptionRate(data.pointsRedemptionRate);
      }
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (location.hash === '#points') {
      const pointsSection = document.getElementById('points');
      pointsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  const [confirmPasswordForBiometric, setConfirmPasswordForBiometric] = useState('');

  const [formData, setFormData] = useState({
    nom: user?.nom || '',
    tel: user?.tel || '',
    countryCode: user?.countryCode || '',
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
      setApiError(t('current_password_required'));
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
      setApiError(t('current_password_must_differ'));
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
          title: t('password_updated_notification_title'),
          body: t('password_updated_notification_body'),
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
  
  const [settings, setSettings] = useState({ standardLimitRUB: 20000, expertLimitRUB: 150000, pointsCurrency: 'RUB', pointsRedemptionRate: 1000 });
  const [spentToday, setSpentToday] = useState(0);

  useEffect(() => {
    const checkBio = async () => {
      const avail = await biometricService.isAvailable();
      setBiometricAvailable(avail);
    };
    checkBio();
  }, []);

  const handleEnableBiometric = async () => {
    if (!user?.email || !confirmPasswordForBiometric) return;
    
    setLoading(true);
    setApiError('');
    try {
      // We could verify password here with reauth if needed, but for now we assume user knows it
      // or we just save it. Secure practice: verify it first.
      const success = await biometricService.saveCredentials({
        email: user.email,
        password: confirmPasswordForBiometric
      });

      if (success) {
        setBiometricEnabled(true);
        setSuccess('Authentification biométrique activée !');
        setShowBiometricConfirm(false);
        setConfirmPasswordForBiometric('');
      } else {
        setApiError('Échec de la configuration biométrique.');
      }
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableBiometric = async () => {
    await biometricService.removeCredentials();
    setBiometricEnabled(false);
    setSuccess('Authentification biométrique désactivée.');
  };

  const handlePinSuccess = (pin?: string) => {
    if (pinModalMode === 'set' && pin) {
      pinService.setPin(pin);
      setPinEnabled(true);
      setSuccess('Code PIN activé !');
    } else if (pinModalMode === 'verify') {
      // Logic for changing PIN or disabling
      pinService.removePin();
      setPinEnabled(false);
      setAppLockEnabled(false);
      setSuccess('Code PIN désactivé.');
    }
    setShowPinModal(false);
  };

  useEffect(() => {
    const unsubS = onSnapshot(collection(db, 'settings'), (s) => {
      if (!s.empty) {
        const data = s.docs[0].data();
        setSettings({
          standardLimitRUB: data.standardLimitRUB || 20000,
          expertLimitRUB: data.expertLimitRUB || 150000,
          pointsCurrency: data.pointsCurrency || 'RUB',
          pointsRedemptionRate: data.pointsRedemptionRate || 1000,
        });
      }
    });

    if (user) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.id)
      );

      const unsubT = onSnapshot(q, (snapshot) => {
        let total = 0;
        const todayStart = today.getTime();
        
        snapshot.docs.forEach(doc => {
          const d = doc.data();
          const txDate = d.createdAt?.toMillis?.() || 0;
          
          if (txDate >= todayStart && d.status !== 'failed' && d.status !== 'cancelled') {
             let amountRUB = 0;
             if (d.type === 'russia-africa') {
               amountRUB = d.amount || 0;
             } else if (d.type === 'africa-russia') {
               amountRUB = d.receivedAmount || 0;
             } else {
               // Default fallback or for africa-africa (might need conversion but usually limits are RUB based)
               amountRUB = d.amountRUB || d.amount || 0;
             }
             total += amountRUB;
          }
        });
        setSpentToday(total);
      });

      return () => { unsubS(); unsubT(); };
    }

    return () => unsubS();
  }, [user]);

  const totalLimit = getRawKycStatus() === 'approved' || getRawKycStatus() === 'expert'
    ? settings.expertLimitRUB
    : settings.standardLimitRUB;
  
  const remainingLimit = Math.max(0, totalLimit - spentToday);

  const [showTerms, setShowTerms] = useState(false);

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

          <div className="relative mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <Calendar size={13} />
              <span>{t('created_at')} : {user?.createdAt ? formatDate(user.createdAt) : '—'}</span>
            </div>

            <div className="bg-white/15 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/10 flex flex-col items-end">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 mb-0.5">{t('daily_limit') || 'Limite Journalière'}</p>
              <p className="text-sm font-black flex items-baseline gap-1">
                {remainingLimit.toLocaleString()} 
                <span className="text-[10px] opacity-60">RUB</span>
              </p>
            </div>
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('referral_reward_label') || 'Parrainage'}</span>
            </div>
            <p className="text-lg font-black text-[#661489]">
              {user?.solde_bonus ?? 0} <span className="text-sm font-bold uppercase tracking-wider opacity-60">RUB</span>
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              +{formatNumber(referralReward, 'RUB')} / parrainage
            </p>
            <button
              onClick={() => navigate('/referral')}
              className="mt-auto text-[11px] font-bold text-[#661489] opacity-70 hover:opacity-100 text-left transition"
            >
              {t('view_details') || 'Voir détails'} →
            </button>
          </div>
        </div>

        {/* ── Points Loyalty Card ── */}
        <div id="points" className="mt-4 rounded-[28px] bg-white border-2 border-slate-100 p-6 shadow-sm overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <Zap size={80} strokeWidth={3} className="text-brand" />
           </div>
           
           <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                 <Zap size={24} strokeWidth={3} />
              </div>
              <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('loyalty_points')}</h3>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{settings.pointsRedemptionRate} pts = 1 {settings.pointsCurrency}</p>
              </div>
           </div>

           <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-brand tracking-tight">{user?.solde_points ?? 0}</span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('points_accumulated')}</span>
           </div>

           <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                 <ShieldCheck size={14} className="text-emerald-500" />
                 {t('points_safe')}
              </div>
              <p className="text-[10px] text-slate-400 font-bold italic">
                {t('points_earned_desc')}
              </p>
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
                <User size={16} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('full_name')}</p>
                {editing ? (
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#661489]/40"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900">{user?.nom || '—'}</p>
                )}
              </div>
            </div>

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
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('departure_country') || 'Pays de résidence'}</p>
                {editing ? (
                  <div className="mt-1">
                    <CountrySelector 
                      value={formData.countryCode} 
                      onChange={(code) => setFormData(prev => ({ ...prev, countryCode: code }))} 
                    />
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-900">{formData.countryCode || '—'}</p>
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

          {/* Security Toggles (Biometric for APK, PIN for PWA) */}
          {isNative ? (
            <>
              {biometricAvailable && (
                <div className="border-t border-slate-50 px-6 py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${biometricEnabled ? 'bg-[#661489]/10 text-[#661489]' : 'bg-slate-50 text-slate-400'}`}>
                        <Fingerprint size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{t('biometric_login')}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                          {biometricEnabled ? t('enabled') : t('disabled')}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => biometricEnabled ? handleDisableBiometric() : setShowBiometricConfirm(true)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${biometricEnabled ? 'bg-[#661489]' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${biometricEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {showBiometricConfirm && (
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in duration-300">
                      <p className="text-xs font-bold text-slate-600">{t('confirm_password_to_activate')}</p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={confirmPasswordForBiometric}
                          onChange={(e) => setConfirmPasswordForBiometric(e.target.value)}
                          placeholder={t('password_placeholder_generic')}
                          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#661489]/40"
                        />
                        <button
                          onClick={handleEnableBiometric}
                          disabled={!confirmPasswordForBiometric || loading}
                          className="px-4 py-2 rounded-xl bg-[#661489] text-white text-xs font-bold disabled:opacity-50"
                        >
                          {loading ? '...' : t('activate')}
                        </button>
                        <button
                          onClick={() => { setShowBiometricConfirm(false); setConfirmPasswordForBiometric(''); }}
                          className="px-4 py-2 rounded-xl bg-slate-200 text-slate-600 text-xs font-bold"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {biometricAvailable && (
                <div className="border-t border-slate-50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${appLockEnabled ? 'bg-[#661489]/10 text-[#661489]' : 'bg-slate-50 text-slate-400'}`}>
                        <Lock size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{t('app_lock_title')}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                          {appLockEnabled ? t('enabled') : t('disabled')}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        const newValue = !appLockEnabled;
                        setAppLockEnabled(newValue);
                        localStorage.setItem('app_lock_enabled', String(newValue));
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${appLockEnabled ? 'bg-[#661489]' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${appLockEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* PIN Code Settings for PWA */}
              <div className="border-t border-slate-50 px-6 py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${pinEnabled ? 'bg-[#661489]/10 text-[#661489]' : 'bg-slate-50 text-slate-400'}`}>
                      <Key size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t('pin_login')}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                        {pinEnabled ? t('enabled') : t('disabled')}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (pinEnabled) {
                        setPinModalMode('verify');
                        setShowPinModal(true);
                      } else {
                        setPinModalMode('set');
                        setShowPinModal(true);
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${pinEnabled ? 'bg-[#661489]' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pinEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {pinEnabled && (
                <div className="border-t border-slate-50 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${appLockEnabled ? 'bg-[#661489]/10 text-[#661489]' : 'bg-slate-50 text-slate-400'}`}>
                        <Lock size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{t('app_lock_pin_title')}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                          {appLockEnabled ? t('enabled') : t('disabled')}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        const newValue = !appLockEnabled;
                        setAppLockEnabled(newValue);
                        pinService.setAppLockEnabled(newValue);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${appLockEnabled ? 'bg-[#661489]' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${appLockEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              )}
            </>
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
          <button 
            onClick={() => setShowTerms(true)}
            className="flex flex-col items-start gap-2 p-5 rounded-[24px] bg-white border border-slate-100 shadow-sm hover:shadow-md transition text-left"
          >
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

      {/* ── Terms of Service Popup ── */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setShowTerms(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-white rounded-[32px] shadow-2xl flex flex-col animate-in zoom-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900">{t('terms_of_use')}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t('last_updated')}</p>
              </div>
              <button 
                onClick={() => setShowTerms(false)}
                className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="prose prose-slate max-w-none">
                <section className="mb-8">
                  <h3 className="text-lg font-black text-slate-800 mb-3">{t('terms_section1_title')}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {t('terms_section1_content')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-black text-slate-800 mb-3">{t('terms_section2_title')}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {t('terms_section2_content')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-black text-slate-800 mb-3">{t('terms_section3_title')}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {t('terms_section3_content')}
                  </p>
                </section>

                <section className="mb-8">
                  <h3 className="text-lg font-black text-slate-800 mb-3">{t('terms_section4_title')}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {t('terms_section4_content')}
                  </p>
                </section>
                
                <section className="mb-8 pt-6 border-t border-slate-100">
                  <h3 className="text-lg font-black text-slate-800 mb-3">{t('privacy_policy')}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm mb-4">
                    {t('privacy_section1_content')}
                  </p>
                  <h4 className="text-sm font-bold text-slate-800 mb-2">{t('privacy_section2_title')}</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                    <li>{t('privacy_section2_item1')}</li>
                    <li>{t('privacy_section2_item2')}</li>
                    <li>{t('privacy_section2_item3')}</li>
                    <li>{t('privacy_section2_item4')}</li>
                  </ul>
                </section>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={() => setShowTerms(false)}
                className="px-8 py-3 rounded-2xl bg-[#661489] text-white font-bold text-sm shadow-lg shadow-[#661489]/20 hover:bg-[#2D0723] transition"
              >
                {t('close') || 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PIN Modal */}
      {showPinModal && (
        <PinModal 
          mode={pinModalMode} 
          onSuccess={handlePinSuccess} 
          onCancel={() => setShowPinModal(false)} 
        />
      )}
    </Layout>
  );
};


