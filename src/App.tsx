import React from 'react';
import { Toaster } from 'react-hot-toast';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { TransferWizardProvider } from './context/TransferWizardContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { deviceService } from './services/deviceService';

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
    let statusBarPlugin: any = null;

    const initCapacitor = async () => {
      try {
        // Dynamic import to avoid crashing on web
        const { App } = await import('@capacitor/app');
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        appPlugin = App;
        statusBarPlugin = StatusBar;

        // Set branded status bar
        try {
          await StatusBar.setBackgroundColor({ color: '#661489' });
          await StatusBar.setStyle({ style: Style.Dark });
        } catch {
          // Not on native — ignore
        }

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
      <PushNotificationHandler />
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

