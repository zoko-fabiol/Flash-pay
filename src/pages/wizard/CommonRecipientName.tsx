import React from 'react';
import { useTransferWizard } from '../../context/TransferWizardContext';
import { ChevronRight } from 'lucide-react';

export const CommonRecipientName: React.FC = () => {
  const { transferData, updateTransferData, nextStep } = useTransferWizard();
  const [name, setName] = React.useState(transferData.recipientName);
  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom est requis');
      return;
    }
    updateTransferData({ recipientName: name });
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Nom du Destinataire</h2>
        <p className="text-slate-600 text-sm mb-4">Entrez le nom complet du destinataire</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <input
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError('');
        }}
        placeholder="Jean Dupont"
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

export const CommonAmount: React.FC = () => {
  const { transferData, updateTransferData, nextStep } = useTransferWizard();
  const [amount, setAmount] = React.useState(transferData.amount || '');
  const [error, setError] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(String(amount));
    if (!amount || numAmount <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }
    updateTransferData({ amount: numAmount });
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Montant du Transfert</h2>
        <p className="text-slate-600 text-sm mb-4">Entrez le montant à envoyer</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError('');
          }}
          placeholder="100"
          className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          autoFocus
        />
        <select
          value={transferData.currency}
          onChange={(e) => updateTransferData({ currency: e.target.value })}
          className="px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        >
          <option value="XAF">XAF</option>
          <option value="EUR">EUR</option>
          <option value="RUB">RUB</option>
        </select>
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
