import React from 'react';

const WebhooksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Webhooks</h2>
        <p className="text-slate-400 text-sm">Gestion des callbacks et intégrations externes.</p>
      </div>

      <div className="bg-card-dark border border-border-dark rounded-3xl p-8 text-center">
        <p className="text-slate-400">La configuration des webhooks sera disponible ici.</p>
      </div>
    </div>
  );
};

export default WebhooksPage;
