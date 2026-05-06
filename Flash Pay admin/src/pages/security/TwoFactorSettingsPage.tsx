import React from 'react';

const TwoFactorSettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Sécurité 2FA</h2>
        <p className="text-slate-400 text-sm">Paramètres de double authentification administrateur.</p>
      </div>

      <div className="bg-card-dark border border-border-dark rounded-3xl p-8 text-center">
        <p className="text-slate-400">La configuration TOTP et les codes de secours seront ajoutés ici.</p>
      </div>
    </div>
  );
};

export default TwoFactorSettingsPage;
