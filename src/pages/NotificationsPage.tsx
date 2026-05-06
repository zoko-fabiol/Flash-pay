import React from 'react';
import { Layout } from '../components/Layout';

export const NotificationsPage: React.FC = () => {
  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Notifications</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Notification center coming soon...</p>
        </div>
      </div>
    </Layout>
  );
};
