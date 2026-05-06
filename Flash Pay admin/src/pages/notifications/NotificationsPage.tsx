import React from 'react';

const NotificationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Notifications</h2>
        <p className="text-slate-400 text-sm">Centre de notifications administrateur.</p>
      </div>

      <div className="bg-card-dark border border-border-dark rounded-3xl p-8 text-center">
        <p className="text-slate-400">Cette section est prête pour les notifications système, mais elle n’est pas encore configurée.</p>
      </div>
    </div>
  );
};

export default NotificationsPage;
