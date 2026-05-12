import React from 'react';
import { Toaster } from 'react-hot-toast';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/login/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import TransactionQueuePage from './pages/queue/TransactionQueuePage';
import TransactionDetailsPage from './pages/queue/TransactionDetailsPage';
import ExchangeRatesPage from './pages/settings/ExchangeRatesPage';
import KYCValidationPage from './pages/kyc/KYCValidationPage';
import CountriesListPage from './pages/countries/CountriesListPage';
import CommissionsPage from './pages/settings/CommissionsPage';
import ProblemsPage from './pages/problems/ProblemsPage';
import PartnersPage from './pages/partners/PartnersPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import TwoFactorSettingsPage from './pages/security/TwoFactorSettingsPage';
import WebhooksPage from './pages/webhooks/WebhooksPage';
import UsersListPage from './pages/users/UsersListPage';
import AccessControlPage from './pages/settings/AccessControlPage';
import { canAccessAdminSection } from './lib/adminAccess';
import MessagesToUsers from './pages/messages/MessagesToUsers';
import type { AdminSectionKey } from './types';

import { Loading } from './components/ui/Loading';
import { AdminNotificationProvider } from './context/AdminNotificationContext';
import { BiometricGuard } from './components/BiometricGuard';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const SectionRoute: React.FC<{ section?: AdminSectionKey; children: React.ReactNode }> = ({ section, children }: { section?: AdminSectionKey; children: React.ReactNode }) => {
  const { user, isAdmin, profile, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  if (section && !canAccessAdminSection(profile, section)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <AdminNotificationProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#FEF7FF',
            color: '#1D1B20',
            border: '1px solid #E7E0EB',
            borderRadius: '24px',
            fontSize: '12px',
            fontWeight: '800',
            boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
          },
        }}
      />
      <HashRouter>
        <BiometricGuard>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<SectionRoute section="dashboard"><DashboardPage /></SectionRoute>} />
              <Route path="queue" element={<SectionRoute section="queue"><TransactionQueuePage /></SectionRoute>} />
              <Route path="queue/:transactionId" element={<SectionRoute section="queue"><TransactionDetailsPage /></SectionRoute>} />
              <Route path="kyc" element={<SectionRoute section="kyc"><KYCValidationPage /></SectionRoute>} />
              <Route path="users" element={<SectionRoute section="users"><UsersListPage /></SectionRoute>} />
              <Route path="countries" element={<SectionRoute section="countries"><CountriesListPage /></SectionRoute>} />
              <Route path="partners" element={<SectionRoute section="countries"><PartnersPage /></SectionRoute>} />
              <Route path="settings/exchange-rates" element={<SectionRoute section="settings"><ExchangeRatesPage /></SectionRoute>} />
              <Route path="settings/commissions" element={<SectionRoute section="settings"><CommissionsPage /></SectionRoute>} />
              <Route path="settings/access-control" element={<SectionRoute section="settings"><AccessControlPage /></SectionRoute>} />
              <Route path="problems" element={<SectionRoute section="problems"><ProblemsPage /></SectionRoute>} />
              <Route path="notifications" element={<SectionRoute section="notifications"><NotificationsPage /></SectionRoute>} />
              <Route path="messages" element={<SectionRoute section="notifications"><MessagesToUsers /></SectionRoute>} />
              <Route path="analytics" element={<SectionRoute section="analytics"><AnalyticsPage /></SectionRoute>} />
              <Route path="security/2fa" element={<SectionRoute section="security"><TwoFactorSettingsPage /></SectionRoute>} />
              <Route path="webhooks" element={<SectionRoute section="webhooks"><WebhooksPage /></SectionRoute>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BiometricGuard>
      </HashRouter>
      </AdminNotificationProvider>
    </AuthProvider>
  );
}

export default App;
