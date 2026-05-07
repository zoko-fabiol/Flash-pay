import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white p-6 md:p-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-slate-800 transition"
      >
        <ChevronLeft size={20} /> Retour
      </button>

      <div className="max-w-3xl mx-auto prose prose-slate">
        <h1 className="text-3xl font-black text-slate-900 mb-6">Conditions d'Utilisation</h1>
        <p className="text-slate-500 mb-4 italic">Dernière mise à jour : 7 Mai 2026</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">1. Acceptation des conditions</h2>
          <p className="text-slate-600 leading-relaxed">
            En utilisant l'application Flash Pay, vous acceptez sans réserve les présentes conditions d'utilisation.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">2. Services de transfert</h2>
          <p className="text-slate-600 leading-relaxed">
            Flash Pay facilite les transferts d'argent entre la Russie et l'Afrique. Les taux de change et les frais de service sont affichés avant chaque transaction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">3. Vérification d'identité (KYC)</h2>
          <p className="text-slate-600 leading-relaxed">
            L'utilisateur s'engage à fournir des informations exactes et véridiques. Toute tentative de fraude ou d'utilisation de faux documents entraînera le blocage immédiat du compte.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">4. Limites de transaction</h2>
          <p className="text-slate-600 leading-relaxed">
            Des plafonds journaliers sont appliqués en fonction du statut de votre compte (Standard ou Expert). Ces limites sont configurables par l'administrateur de la plateforme.
          </p>
        </section>
      </div>
    </div>
  );
};
