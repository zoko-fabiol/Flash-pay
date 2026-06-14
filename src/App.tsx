import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { TransferWizardProvider } from './context/TransferWizardContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { useLocation } from 'react-router-dom';
import { deviceService } from './services/deviceService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, userService } from './services/firebase';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// --- Scroll To Top Handler ---
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Pages
import { WelcomePage } from './pages/WelcomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { EmailVerificationPage } from './pages/EmailVerificationPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransferWizardPage } from './pages/TransferWizardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { KYCPage } from './pages/KYCPage';
import { ReferralPage } from './pages/ReferralPage';
import { ProfilePage } from './pages/ProfilePage';
import { SupportPage } from './pages/SupportPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { ExportsPage } from './pages/ExportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { Security2FAPage } from './pages/Security2FAPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { AdminExchangeRatesPage } from './pages/admin/AdminExchangeRatesPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';

import { Loading } from './components/UI';
import { initializePushNotifications } from './utils/pushNotifications';
import { BiometricGuard } from './components/BiometricGuard';
import { UpdateGuard } from './components/UpdateGuard';

// ─── Android Back Button Handler ────────────────────────────────────────────
const AndroidBackHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let appPlugin: any = null;

    const initCapacitor = async () => {
      try {
        // Dynamic import to avoid crashing on web
        const { App } = await import('@capacitor/app');
        appPlugin = App;

        // Handle Android back button
        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            navigate(-1);
          } else {
            App.exitApp();
          }
        });
      } catch {
        // Running on web — Capacitor not available
      }
    };

    initCapacitor();

    return () => {
      if (appPlugin) {
        appPlugin.removeAllListeners();
      }
    };
  }, [navigate]);

  return null;
};

// ─── Status Bar Theme Handler ───────────────────────────────────────────────
const StatusBarHandler: React.FC = () => {
  const { theme } = useLanguage();

  useEffect(() => {
    const applyStatusBarStyle = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        const isDarkMode = 
          theme === 'dark' || 
          (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        // 1. Force the status bar style first (controlling text/icon color: LIGHT = dark text, DARK = light text)
        try {
          await StatusBar.setStyle({ style: isDarkMode ? Style.Dark : Style.Light });
        } catch (e) {
          console.warn('[StatusBar] setStyle failed:', e);
        }

        // 2. Set background color (ignored on Android 15/16 but important for Android <15 and iOS)
        try {
          await StatusBar.setBackgroundColor({ color: isDarkMode ? '#0D0B14' : '#FFFFFF' });
        } catch (e) {
          console.warn('[StatusBar] setBackgroundColor failed:', e);
        }

        // 3. Set overlay to false (WebView starts below status bar on older Androids/iOS)
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });
        } catch (e) {
          console.warn('[StatusBar] setOverlaysWebView failed:', e);
        }
      } catch (err) {
        console.warn('[StatusBar] Error in applyStatusBarStyle:', err);
      }
    };

    applyStatusBarStyle();
    
    // Add timeouts to ensure it applies after splash screen hides and native view transitions complete
    const t1 = setTimeout(applyStatusBarStyle, 500);
    const t2 = setTimeout(applyStatusBarStyle, 1000);
    const t3 = setTimeout(applyStatusBarStyle, 2500);
    const t4 = setTimeout(applyStatusBarStyle, 5000);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [theme]);

  return null;
};

// ─── Push Notification Handler ───────────────────────────────────────────────
const PushNotificationHandler: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      initializePushNotifications(user.id);
    }
  }, [user?.id]);

  return null;
};

// ─── Preference Sync Handler ───────────────────────────────────────────────
const PreferenceSyncHandler: React.FC = () => {
  const { user } = useAuth();
  const { setLanguage, setFontSize, setTheme, language, fontSize, theme } = useLanguage();
  const lastDbLangRef = React.useRef<string | null>(null);
  const lastDbFontSizeRef = React.useRef<string | null>(null);
  const lastDbThemeRef = React.useRef<string | null>(null);
  const lastLocalPreferenceWriteRef = React.useRef(0);
  const latestLangRef = React.useRef(language);
  const latestFontSizeRef = React.useRef(fontSize);
  const latestThemeRef = React.useRef(theme);

  const getPreferenceUpdatedAtMs = (value: unknown) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
      return (value as { toMillis: () => number }).toMillis();
    }
    return 0;
  };

  // Keep refs in sync with latest local state
  useEffect(() => {
    latestLangRef.current = language;
  }, [language]);

  useEffect(() => {
    latestFontSizeRef.current = fontSize;
  }, [fontSize]);

  useEffect(() => {
    latestThemeRef.current = theme;
  }, [theme]);

  // 1. Listen to Firestore changes (Incoming remote changes)
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.id), (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        if (userData.preferences) {
          const dbLang = userData.preferences.language;
          const dbFontSize = userData.preferences.fontSize;
          const dbTheme = userData.preferences.theme;
          const dbUpdatedAt = getPreferenceUpdatedAtMs(userData.preferences.updatedAt);

          if (
            lastLocalPreferenceWriteRef.current > 0 &&
            (dbUpdatedAt === 0 || dbUpdatedAt <= lastLocalPreferenceWriteRef.current)
          ) {
            return;
          }

          lastDbLangRef.current = dbLang || null;
          lastDbFontSizeRef.current = dbFontSize || null;
          lastDbThemeRef.current = dbTheme || null;

          if (dbLang && dbLang !== latestLangRef.current) {
            setLanguage(dbLang as any);
          }
          if (dbFontSize && dbFontSize !== latestFontSizeRef.current) {
            setFontSize(dbFontSize as any);
          }
          if (dbTheme && dbTheme !== latestThemeRef.current) {
            setTheme(dbTheme as any);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user?.id, setLanguage, setFontSize, setTheme]);

  // 2. Propagate local changes to Firestore (Outgoing local changes)
  useEffect(() => {
    if (!user?.id) return;

    const syncLocalPreferences = async () => {
      const isLangChanged = language !== lastDbLangRef.current;
      const isFontSizeChanged = fontSize !== lastDbFontSizeRef.current;
      const isThemeChanged = theme !== lastDbThemeRef.current;

      if (isLangChanged || isFontSizeChanged || isThemeChanged) {
        try {
          const updatedAt = Date.now();
          lastLocalPreferenceWriteRef.current = updatedAt;

          await userService.updateUserProfile(user.id, {
            preferences: {
              language,
              fontSize,
              theme,
              updatedAt: new Date(updatedAt)
            }
          });

          lastDbLangRef.current = language;
          lastDbFontSizeRef.current = fontSize;
          lastDbThemeRef.current = theme;
        } catch (error) {
          console.error('Error syncing local preferences to Firestore:', error);
        }
      }
    };

    syncLocalPreferences();
  }, [user?.id, language, fontSize, theme]);

  return null;
};

// ─── Protected Route ─────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!user) {
    const isMobile = deviceService.getMobileOperatingSystem() !== 'unknown';
    return <Navigate to={isMobile ? "/welcome" : "/login"} />;
  }

  if ((user as any).isPending || user.emailVerified === false) {
    return <Navigate to="/email-verification" />;
  }

  const isProfileIncomplete = user.isOnboardingComplete === false || !user.countryCode || !user.tel;

  if (isProfileIncomplete) {
    return <Navigate to="/onboarding" />;
  }

  return <>{children}</>;
};

// ─── Routes ──────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { loading, user } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <>
      <ScrollToTop />
      <AndroidBackHandler />
      <StatusBarHandler />
      <PushNotificationHandler />
      <PreferenceSyncHandler />
      <UpdateGuard />
      <Routes>
        {/* Auth Routes */}
        <Route path="/welcome" element={user ? <Navigate to="/" /> : <WelcomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={
          user ? <OnboardingPage /> : <Navigate to="/login" />
        } />
        <Route path="/email-verification" element={<EmailVerificationPage />} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/transfer" element={<ProtectedRoute><TransferWizardPage /></ProtectedRoute>} />
        <Route path="/transfer-step1" element={<Navigate to="/transfer" replace />} />
        <Route path="/transfer-wizard" element={<Navigate to="/transfer" replace />} />
        <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
        <Route path="/transactions/:transactionId" element={<ProtectedRoute><TransactionDetailPage /></ProtectedRoute>} />
        <Route path="/kyc" element={<ProtectedRoute><KYCPage /></ProtectedRoute>} />
        <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/preferences" element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
        <Route path="/exports" element={<ProtectedRoute><ExportsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/security-2fa" element={<ProtectedRoute><Security2FAPage /></ProtectedRoute>} />
        <Route path="/webhooks" element={<ProtectedRoute><WebhooksPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
        <Route path="/admin/rates" element={<ProtectedRoute><AdminExchangeRatesPage /></ProtectedRoute>} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

import { PWAInstallProvider } from './context/PWAInstallContext';

// ─── App ─────────────────────────────────────────────────────────────────────
function App() {
  // --- Check if opened inside Standalone PWA Mode ---
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;

  if (isStandalone) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      // iOS Standalone PWA Block Page
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] via-[#31105e] to-[#0f051d] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[#661489]/20 border border-[#d946ef]/30 flex items-center justify-center mb-8 shadow-lg shadow-[#661489]/20 animate-pulse">
            <span className="text-4xl">🌐</span>
          </div>
          <h1 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-[#d946ef]">
            Version Web Recommandée
          </h1>
          <p className="text-gray-300 text-sm max-w-sm mb-8 leading-relaxed">
            Cette version de l'application n'est plus supportée. Pour continuer à envoyer de l'argent de manière sécurisée et rapide, veuillez ouvrir Flash Pay dans votre navigateur Safari habituel.
          </p>
          <a
            href="https://flash-pay.site"
            className="w-full max-w-xs py-4 px-6 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#db2777] hover:from-[#6d28d9] hover:to-[#be185d] text-white font-semibold flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#7c3aed]/20"
          >
            👉 Accéder au site Flash Pay
          </a>
          <p className="text-xs text-gray-500 mt-8">
            Flash Pay • Sécurité et Rapidité
          </p>
        </div>
      );
    } else {
      // Android/Other Standalone PWA Block Page
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#1a0b2e] via-[#31105e] to-[#0f051d] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[#661489]/20 border border-[#d946ef]/30 flex items-center justify-center mb-8 shadow-lg shadow-[#661489]/20 animate-pulse">
            <span className="text-4xl">📲</span>
          </div>
          <h1 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-[#d946ef]">
            Version PWA Obsolète
          </h1>
          <p className="text-gray-300 text-sm max-w-sm mb-8 leading-relaxed">
            Cette version n'est plus supportée. Veuillez télécharger notre application mobile officielle Android (APK) pour une expérience optimale, fluide et 100% sécurisée.
          </p>
          <a
            href="https://github.com/zoko-fabiol/Flash-pay/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-xs py-4 px-6 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#db2777] hover:from-[#6d28d9] hover:to-[#be185d] text-white font-semibold flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#7c3aed]/20"
          >
            📥 Télécharger l'APK Officielle
          </a>
          <p className="text-xs text-gray-500 mt-8">
            Flash Pay • Sécurité et Rapidité
          </p>
        </div>
      );
    }
  }

  return (
    <Router>
      <Toaster position="top-center" />
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <PWAInstallProvider>
              <AppProvider>
                <TransferWizardProvider>
                  <BiometricGuard>
                    <AppRoutes />
                  </BiometricGuard>
                </TransferWizardProvider>
              </AppProvider>
            </PWAInstallProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;

