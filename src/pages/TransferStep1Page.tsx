import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransferWizard, type TransferType } from '../context/TransferWizardContext';
import { ArrowRight, Globe, Zap, Building2 } from 'lucide-react';
import { Layout } from '../components/Layout';

export const TransferStep1Page: React.FC = () => {
  const navigate = useNavigate();
  const { updateTransferData, nextStep } = useTransferWizard();

  const handleTransferType = (type: TransferType) => {
    updateTransferData({ transferType: type });
    nextStep();
    navigate('/transfer-wizard');
  };

  const transferOptions = [
    {
      type: 'russia-africa' as TransferType,
      title: 'Russie → Afrique',
      description: 'Envoyer de l\'argent en Afrique depuis la Russie',
      component: Globe,
    },
    {
      type: 'africa-russia' as TransferType,
      title: 'Afrique → Russie',
      description: 'Envoyer de l\'argent en Russie depuis l\'Afrique',
      component: Zap,
    },
    {
      type: 'africa-africa' as TransferType,
      title: 'Afrique → Afrique',
      description: 'Envoyer de l\'argent entre pays africains',
      component: Building2,
    },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Type de Transfert</h1>
          <p className="text-slate-600">Sélectionnez le type de transfert que vous souhaitez effectuer</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {transferOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => handleTransferType(option.type)}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:shadow-lg hover:border-violet-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mb-3"><option.component size={40} className="text-slate-700" /></div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">{option.title}</h3>
                <p className="text-sm text-slate-600 mb-4">{option.description}</p>
                <div className="flex items-center text-violet-600 font-semibold text-sm">
                  Continuer <ArrowRight size={16} className="ml-2" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
};
