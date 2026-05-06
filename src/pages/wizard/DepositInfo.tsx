import React from 'react';
import { useTransferWizard } from '../../context/TransferWizardContext';
import { ChevronRight, Camera, CheckCircle2 } from 'lucide-react';

export const DepositInfo: React.FC = () => {
  const { updateTransferData, nextStep } = useTransferWizard();

  const depositAccounts = [
    {
      accountNumber: '40817 123 4567',
      bankName: 'Sberbank',
      accountHolder: 'Flash Pay Trading LLC',
    },
    {
      accountNumber: '40817 987 6543',
      bankName: 'VTB Bank',
      accountHolder: 'Flash Pay Trading LLC',
    },
  ];

  const handleSelectAccount = (account: any) => {
    updateTransferData({ depositInfo: account });
    nextStep();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Compte de Dépôt</h2>
        <p className="text-slate-600 text-sm mb-6">Sélectionnez un compte pour effectuer le dépôt</p>
      </div>

      <div className="space-y-3">
        {depositAccounts.map((account, index) => (
          <button
            key={index}
            onClick={() => handleSelectAccount(account)}
            className="w-full text-left p-4 border border-slate-200 rounded-lg hover:border-violet-500 hover:bg-violet-50 transition-all"
          >
            <div className="font-semibold text-slate-900">{account.bankName}</div>
            <div className="text-sm text-slate-600 mt-1">{account.accountHolder}</div>
            <div className="text-sm font-mono text-slate-700 mt-2">{account.accountNumber}</div>
          </button>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
        <p className="text-amber-900 text-sm">
          ⚠️ Important: Vérifiez bien les informations du compte avant d'effectuer le dépôt
        </p>
      </div>
    </div>
  );
};

export const ProofOfPayment: React.FC = () => {
  const { updateTransferData, nextStep } = useTransferWizard();
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setFile(selectedFile);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Veuillez sélectionner une image');
      return;
    }
    updateTransferData({ proofOfPayment: file });
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Preuve de Paiement</h2>
        <p className="text-slate-600 text-sm mb-6">Uploadez une capture d'écran ou une preuve de paiement</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-violet-500 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="proof-input"
        />
        <label htmlFor="proof-input" className="cursor-pointer">
          <div className="mb-3 flex justify-center"><Camera size={40} className="text-slate-700" /></div>
          {file ? (
            <>
              <p className="font-semibold text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-600 mt-1">Cliquer pour changer</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-900">Cliquez ou glissez une image</p>
              <p className="text-sm text-slate-600 mt-1">PNG, JPG jusqu'à 5MB</p>
            </>
          )}
        </label>
      </div>

      <button
        type="submit"
        disabled={!file}
        className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        Valider et Terminer <ChevronRight size={20} />
      </button>
    </form>
  );
};

export const SuccessPage: React.FC = () => {
  const { transferData, resetWizard } = useTransferWizard();

  return (
    <div className="space-y-6 text-center py-8">
      <div className="flex justify-center"><CheckCircle2 size={60} className="text-green-500" /></div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Transfert en cours de traitement</h2>
        <p className="text-slate-600">Votre transfert a été reçu et sera traité dans 24 à 48 heures</p>
      </div>

      <div className="bg-slate-50 rounded-lg p-6 text-left space-y-3">
        <div className="flex justify-between">
          <span className="text-slate-600">Destinataire</span>
          <span className="font-semibold text-slate-900">{transferData.recipientName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Montant</span>
          <span className="font-semibold text-slate-900">
            {transferData.amount} {transferData.currency}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Référence</span>
          <span className="font-semibold text-slate-900 font-mono">TXN{Date.now()}</span>
        </div>
      </div>

      <button
        onClick={() => {
          resetWizard();
          window.location.href = '/transfer';
        }}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        Nouveau Transfert
      </button>
    </div>
  );
};
