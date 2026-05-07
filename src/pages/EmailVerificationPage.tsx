import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ShieldCheck, RefreshCcw, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const EmailVerificationPage: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const { user, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Redirection si déjà vérifié
  useEffect(() => {
    if (user?.emailVerified) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Uniquement des chiffres

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Focus prochain input
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Si c'est le dernier chiffre, on lance la vérification automatique
    if (newCode.every(digit => digit !== '') && index === 5) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newCode[index] = char;
    });
    setCode(newCode);

    // Focus le dernier ou le prochain vide
    const nextIndex = Math.min(pastedData.length, 5);
    inputs.current[nextIndex]?.focus();

    // Vérification automatique si complet
    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (finalCode: string) => {
    if (!firebaseUser) return;
    setLoading(true);
    const toastId = toast.loading('Vérification du code...');

    try {
      const verifRef = doc(db, 'verification_codes', firebaseUser.uid);
      const verifSnap = await getDoc(verifRef);

      if (!verifSnap.exists()) {
        toast.error('Code expiré ou inexistant. Veuillez en renvoyer un.', { id: toastId });
        setLoading(false);
        return;
      }

      const data = verifSnap.data();
      if (data.code === finalCode) {
        // Code correct !
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          emailVerified: true
        });
        await deleteDoc(verifRef); // Supprimer le code utilisé
        
        toast.success('Compte vérifié avec succès !', { id: toastId });
        navigate('/dashboard');
      } else {
        toast.error('Code incorrect. Veuillez réessayer.', { id: toastId });
        setCode(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
      }
    } catch (error) {
      console.error(error);
      toast.error('Une erreur est survenue.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f3eeff] via-[#ede7ff] to-[#f8f5ff] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-[0_20px_60px_rgba(98,54,204,0.12)] p-8 border border-[#eadfff]">
        <button 
          onClick={() => navigate('/signup')} 
          className="flex items-center gap-2 text-slate-500 mb-8 hover:text-brand transition-colors font-bold"
        >
          <ArrowLeft size={20} /> {t('back')}
        </button>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand/10 text-brand rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Vérification</h1>
          <p className="text-slate-500 font-medium leading-relaxed">Nous avons envoyé un code à 6 chiffres à l'adresse <br/><span className="text-brand font-bold">{firebaseUser?.email}</span></p>
        </div>

        <div className="flex justify-between gap-2 mb-10">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-black text-brand bg-slate-50 border-2 border-slate-100 rounded-2xl focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all"
              disabled={loading}
            />
          ))}
        </div>

        <button
          onClick={() => {/* Logique de renvoi */}}
          className="w-full py-4 flex items-center justify-center gap-2 text-slate-400 font-bold hover:text-brand transition-all border-t border-slate-100"
        >
          <RefreshCcw size={18} /> Renvoyer le code
        </button>
      </div>
    </div>
  );
};
