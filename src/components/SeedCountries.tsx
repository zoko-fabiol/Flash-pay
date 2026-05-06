import React from 'react';
import { db } from '../services/firebase';
import { collection, setDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const countriesData = [
  { name: 'Bénin', code: 'BJ', currency: 'XOF', dialCode: '+229', canSendToRussia: true, canReceiveFromRussia: true, operators: [{ name: 'MTN Money' }] },
  { name: 'Burkina Faso', code: 'BF', currency: 'XOF', dialCode: '+226', canSendToRussia: true, canReceiveFromRussia: true, operators: [{ name: 'Wave' }] },
  { name: 'Mali', code: 'ML', currency: 'XOF', dialCode: '+223', canSendToRussia: true, canReceiveFromRussia: true, operators: [{ name: 'Wave' }] },
  { name: 'Togo', code: 'TG', currency: 'XOF', dialCode: '+228', canSendToRussia: true, canReceiveFromRussia: true, operators: [{ name: 'TMoney' }] },
  { name: 'Côte d\'Ivoire', code: 'CI', currency: 'XOF', dialCode: '+225', canSendToRussia: true, canReceiveFromRussia: true, operators: [{ name: 'Wave' }] },
  { name: 'Sénégal', code: 'SN', currency: 'XOF', dialCode: '+221', canSendToRussia: true, canReceiveFromRussia: true, operators: [{ name: 'Wave' }] },
  { name: 'Cameroun', code: 'CM', currency: 'XAF', dialCode: '+237', canSendToRussia: true, canReceiveFromRussia: true, operators: [{ name: 'MTN Money' }, { name: 'Orange Money' }] },
  { name: 'Congo Brazzaville', code: 'CG', currency: 'XAF', dialCode: '+242', canSendToRussia: false, canReceiveFromRussia: true, operators: [{ name: 'MTN' }, { name: 'Airtel' }] },
  { name: 'RDC', code: 'CD', currency: 'XAF', dialCode: '+243', canSendToRussia: true, canReceiveFromRussia: true, operators: [{ name: 'M-Pesa' }, { name: 'Airtel' }, { name: 'Orange' }] },
  { name: 'Gabon', code: 'GA', currency: 'XAF', dialCode: '+241', canSendToRussia: true, canReceiveFromRussia: true, operators: [{ name: 'Airtel' }] },
  { name: 'Gambie', code: 'GM', currency: 'GMD', dialCode: '+220', canSendToRussia: false, canReceiveFromRussia: true, operators: [{ name: 'Wave' }] },
];

export const SeedCountries: React.FC = () => {
  const seed = async () => {
    const loadingToast = toast.loading('Configuration des pays...');
    try {
      for (const country of countriesData) {
        await setDoc(doc(db, 'countries', country.code), country);
      }
      toast.success('Pays configurés avec succès !', { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la configuration', { id: loadingToast });
    }
  };

  return (
    <button 
      onClick={seed}
      className="p-4 bg-brand text-white rounded-xl font-bold shadow-lg"
    >
      Seed Database Countries
    </button>
  );
};
