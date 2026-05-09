import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { TransferWizardProvider } from './context/TransferWizardContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { useEffect } from 'react';

// Pages (Lazy Loaded for better mobile performance)
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = React.lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const EmailVerificationPage = React.lazy(() => import('./pages/EmailVerificationPage').then(m => ({ default: m.EmailVerificationPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TransferWizardPage = React.lazy(() => import('./pages/TransferWizardPage').then(m => ({ default: m.TransferWizardPage })));
const TransactionsPage = React.lazy(() => import('./pages/TransactionsPage').then(m => ({ default: m.TransactionsPage })));
const KYCPage = React.lazy(() => import('./pages/KYCPage').then(m => ({ default: m.KYCPage })));
const ReferralPage = React.lazy(() => import('./pages/ReferralPage').then(m => ({ default: m.ReferralPage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SupportPage = React.lazy(() => import('./pages/SupportPage').then(m => ({ default: m.SupportPage })));
const PreferencesPage = React.lazy(() => import('./pages/PreferencesPage').then(m => ({ default: m.PreferencesPage })));
const ExportsPage = React.lazy(() => import('./pages/ExportsPage').then(m => ({ default: m.ExportsPage })));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const Security2FAPage = React.lazy(() => import('./pages/Security2FAPage').then(m => ({ default: m.Security2FAPage })));
const WebhooksPage = React.lazy(() => import('./pages/WebhooksPage').then(m => ({ default: m.WebhooksPage })));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const TransactionDetailPage = React.lazy(() => import('./pages/TransactionDetailPage').then(m => ({ default: m.TransactionDetailPage })));
const AdminExchangeRatesPage = React.lazy(() => import('./pages/admin/AdminExchangeRatesPage').then(m => ({ default: m.AdminExchangeRatesPage })));
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = React.lazy(() => import('./pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));

import { Loading } from './components/UI';
import { initializePushNotifications } from './utils/pushNotifications';

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
          await StatusBar.setBackgroundColor({ color: '#6236CC' });
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
    if (user) {
      initializePushNotifications(user.id);
    }
  }, [user]);

  return null;
};

// ─── Protected Route ─────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

// ─── Routes ──────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <>
      <AndroidBackHandler />
      <PushNotificationHandler />
      <React.Suspense fallback={<Loading fullScreen />}>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
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
      </React.Suspense>
    </>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Router>
      <Toaster position="top-center" />
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppProvider>
              <TransferWizardProvider>
                <AppRoutes />
              </TransferWizardProvider>
            </AppProvider>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;
