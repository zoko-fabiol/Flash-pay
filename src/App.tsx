import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { TransferWizardProvider } from './context/TransferWizardContext';

// Pages
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { EmailVerificationPage } from './pages/EmailVerificationPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransferWizardPage } from './pages/TransferWizardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { KYCPage } from './pages/KYCPage';
import { ReferralPage } from './pages/ReferralPage';
import { ProfilePage } from './pages/ProfilePage';
import { PreferencesPage } from './pages/PreferencesPage';
import { ExportsPage } from './pages/ExportsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { Security2FAPage } from './pages/Security2FAPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { Loading } from './components/UI';

// Protected Route
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

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/email-verification" element={<EmailVerificationPage />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfer"
        element={
          <ProtectedRoute>
            <TransferWizardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transfer-step1"
        element={<Navigate to="/transfer" replace />}
      />
      <Route
        path="/transfer-wizard"
        element={<Navigate to="/transfer" replace />}
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <TransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions/:transactionId"
        element={
          <ProtectedRoute>
            <TransactionDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kyc"
        element={
          <ProtectedRoute>
            <KYCPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/referral"
        element={
          <ProtectedRoute>
            <ReferralPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences"
        element={
          <ProtectedRoute>
            <PreferencesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exports"
        element={
          <ProtectedRoute>
            <ExportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/security-2fa"
        element={
          <ProtectedRoute>
            <Security2FAPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/webhooks"
        element={
          <ProtectedRoute>
            <WebhooksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <Toaster position="top-center" />
      <AuthProvider>
        <AppProvider>
          <TransferWizardProvider>
            <AppRoutes />
          </TransferWizardProvider>
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
