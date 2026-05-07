import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
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
        <h1 className="text-3xl font-black text-slate-900 mb-6">Politique de Confidentialité</h1>
        <p className="text-slate-500 mb-4 italic">Dernière mise à jour : 7 Mai 2026</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">1. Introduction</h2>
          <p className="text-slate-600 leading-relaxed">
            Flash Pay s'engage à protéger la vie privée de ses utilisateurs. Cette politique explique comment nous collectons, utilisons et protégeons vos données personnelles.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">2. Données collectées</h2>
          <p className="text-slate-600 leading-relaxed">
            Nous collectons les données suivantes nécessaires au fonctionnement du service et à la conformité légale :
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2 text-slate-600">
            <li>Informations d'identité (Nom, Prénom, Email, Téléphone).</li>
            <li>Documents de vérification (KYC) : Photos de pièces d'identité et selfies.</li>
            <li>Données de transaction (Montants, bénéficiaires, dates).</li>
            <li>Informations sur l'appareil (pour la sécurité et les notifications push).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">3. Utilisation des données</h2>
          <p className="text-slate-600 leading-relaxed">
            Vos données sont utilisées exclusivement pour :
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-2 text-slate-600">
            <li>Exécuter vos transferts d'argent.</li>
            <li>Vérifier votre identité (Lutte contre la fraude et le blanchiment).</li>
            <li>Vous envoyer des notifications de statut de transaction.</li>
            <li>Assurer le support client.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">4. Suppression des données</h2>
          <p className="text-slate-600 leading-relaxed">
            Conformément aux règles du Google Play Store, vous pouvez demander la suppression de votre compte et de vos données personnelles à tout moment via les paramètres de votre profil dans l'application.
          </p>
        </section>
      </div>
    </div>
  );
};
