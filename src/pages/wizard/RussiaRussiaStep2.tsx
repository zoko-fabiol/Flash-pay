import React from 'react';
import { useTransferWizard, type RecipientType } from '../../context/TransferWizardContext';
import { ChevronRight, Building2, Smartphone } from 'lucide-react';

export const RussiaRussiaStep2: React.FC = () => {
  const { updateTransferData, nextStep } = useTransferWizard();
  const [recipientType, setRecipientType] = React.useState<RecipientType>(null);

  const handleSubmit = (type: RecipientType) => {
    updateTransferData({ recipientType: type });
    nextStep();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Type de Destinataire</h2>
        <p className="text-slate-600 text-sm mb-6">Sélectionnez comment vous souhaitez envoyer l'argent</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleSubmit('bank')}
          className="p-4 border-2 border-slate-200 rounded-lg hover:border-violet-500 hover:bg-violet-50 transition-all text-left"
        >
          <div className="mb-2"><Building2 size={28} className="text-slate-700" /></div>
          <h3 className="font-semibold text-slate-900">Compte Bancaire</h3>
          <p className="text-sm text-slate-600">Virement vers un compte</p>
        </button>

        <button
          onClick={() => handleSubmit('operator')}
          className="p-4 border-2 border-slate-200 rounded-lg hover:border-violet-500 hover:bg-violet-50 transition-all text-left"
        >
          <div className="mb-2"><Smartphone size={28} className="text-slate-700" /></div>
          <h3 className="font-semibold text-slate-900">Opérateur Mobile</h3>
          <p className="text-sm text-slate-600">Envoi par téléphone</p>
        </button>
      </div>
    </div>
  );
};

export const RussiaRussiaStep3: React.FC = () => {
  const { transferData, updateTransferData, nextStep } = useTransferWizard();
  const [input, setInput] = React.useState(transferData.recipientAccount || '');
  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      setError(
        transferData.recipientType === 'bank'
          ? 'Le numéro de compte est requis'
          : 'Le numéro de téléphone est requis'
      );
      return;
    }
    updateTransferData({ recipientAccount: input });
    nextStep();
  };

  const label =
    transferData.recipientType === 'bank' ? 'Numéro de Compte' : 'Numéro de Téléphone';
  const placeholder =
    transferData.recipientType === 'bank' ? '40817 123 4567' : '+7 (999) 999-99-99';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">{label}</h2>
        <p className="text-slate-600 text-sm mb-4">Entrez le {label.toLowerCase()} du destinataire</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <input
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setError('');
        }}
        placeholder={placeholder}
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

export const RussiaRussiaStep4: React.FC = () => {
  const { transferData, nextStep } = useTransferWizard();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Résumé</h2>
        <p className="text-slate-600 text-sm mb-6">Vérifiez les informations avant de continuer</p>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-slate-600">Destinataire</span>
          <span className="font-semibold text-slate-900">{transferData.recipientName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Type</span>
          <span className="font-semibold text-slate-900 capitalize">
            {transferData.recipientType === 'bank' ? 'Compte Bancaire' : 'Opérateur Mobile'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">{transferData.recipientType === 'bank' ? 'Compte' : 'Téléphone'}</span>
          <span className="font-semibold text-slate-900">{transferData.recipientAccount}</span>
        </div>
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

export const RussiaRussiaStep5: React.FC = () => {
  const { transferData, nextStep } = useTransferWizard();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Confirmez votre Dépôt</h2>
        <p className="text-slate-600 text-sm mb-6">
          Vous avez effectué le dépôt de {transferData.amount} {transferData.currency}?
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-900 text-sm">
          Une fois le dépôt confirmé, veuillez fournir une capture d'écran ou une preuve de paiement.
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
