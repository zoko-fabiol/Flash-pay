import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            borderRadius: '16px',
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<LoginPage />} />
          
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="queue" element={<TransactionQueuePage />} />
            <Route path="queue/:transactionId" element={<TransactionDetailsPage />} />
            <Route path="kyc" element={<KYCValidationPage />} />
            <Route path="users" element={<UsersListPage />} />
            <Route path="countries" element={<CountriesListPage />} />
            <Route path="partners" element={<PartnersPage />} />
            <Route path="settings/exchange-rates" element={<ExchangeRatesPage />} />
            <Route path="settings/commissions" element={<CommissionsPage />} />
            <Route path="problems" element={<ProblemsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="security/2fa" element={<TwoFactorSettingsPage />} />
            <Route path="webhooks" element={<WebhooksPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
