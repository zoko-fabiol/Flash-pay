import React from 'react';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <p className="text-slate-400 text-sm">Vue synthétique des indicateurs clés.</p>
      </div>

      <div className="bg-card-dark border border-border-dark rounded-3xl p-8 text-center">
        <p className="text-slate-400">Les graphiques et agrégations analytics seront branchés ici.</p>
      </div>
    </div>
  );
};

export default AnalyticsPage;
