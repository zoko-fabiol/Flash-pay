import React from 'react';
import { useTransferWizard } from '../../context/TransferWizardContext';
import { ChevronRight } from 'lucide-react';
import { COUNTRIES } from '../../constants/data';

export const AfricaRussiaStep2: React.FC = () => {
  const { transferData, updateTransferData, nextStep } = useTransferWizard();
  const [country, setCountry] = React.useState(transferData.originCountry || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!country) {
      return;
    }
    updateTransferData({ originCountry: country });
    nextStep();
  };

  const africaCountries = COUNTRIES.filter(c => c.name !== 'Russie');

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Sélectionnez votre Pays</h2>
        <p className="text-slate-600 text-sm mb-4">D'où envoyez-vous l'argent?</p>
      </div>

      <select
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
      >
        <option value="">Choisir un pays...</option>
        {africaCountries.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={!country}
        className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        Continuer <ChevronRight size={20} />
      </button>
    </form>
  );
};

export const RussiaAfricaStep3: React.FC = () => {
  const { transferData, updateTransferData, nextStep } = useTransferWizard();
  const [phone, setPhone] = React.useState(transferData.recipientPhone || '');
  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Le numéro de téléphone est requis');
      return;
    }
    updateTransferData({ recipientPhone: phone });
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Numéro de Téléphone</h2>
        <p className="text-slate-600 text-sm mb-4">Entrez le numéro de téléphone du destinataire</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <input
        type="text"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          setError('');
        }}
        placeholder="+237 6XX XXX XXX"
        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        autoFocus
      />

      <button
        type="submit"
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        Continuer <ChevronRight size={20} />
      </button>
    </form>
  );
};

export const RussiaAfricaStep4: React.FC = () => {
  const { transferData, updateTransferData, nextStep } = useTransferWizard();
  const countryData = COUNTRIES.find(c => c.name === transferData.originCountry);
  const [operator, setOperator] = React.useState(transferData.selectedOperator || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operator) {
      return;
    }
    updateTransferData({ selectedOperator: operator });
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Opérateur Mobile</h2>
        <p className="text-slate-600 text-sm mb-4">L'opérateur a été détecté automatiquement</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-blue-900 text-sm">
          Opérateur détecté: <span className="font-semibold">{transferData.recipientOperator || 'En détection...'}</span>
        </p>
      </div>

      <button
        type="submit"
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        Continuer <ChevronRight size={20} />
      </button>
    </form>
  );
};

export const RussiaAfricaStep5: React.FC = () => {
  const { transferData, nextStep } = useTransferWizard();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Confirmez votre Paiement</h2>
        <p className="text-slate-600 text-sm mb-6">
          Vous avez effectué le paiement de {transferData.amount} {transferData.currency}?
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-900 text-sm">
          Une fois le paiement confirmé, veuillez fournir une capture d'écran ou une preuve de paiement.
        </p>
      </div>

      <button
        onClick={() => nextStep()}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        Continuer <ChevronRight size={20} />
      </button>
    </div>
  );
};
