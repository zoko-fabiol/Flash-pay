import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc, deleteDoc, setDoc, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ShieldCheck, RefreshCcw, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { emailService } from '../services/emailService';

export const EmailVerificationPage: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const { user, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleResendCode = async () => {
    if (!firebaseUser?.email) return;
    
    const toastId = toast.loading('Envoi du nouveau code en cours...');
    try {
      setLoading(true);
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await setDoc(doc(db, 'verification_codes', firebaseUser.uid), {
        code: verificationCode,
        email: firebaseUser.email,
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000)),
        createdAt: Timestamp.now()
      });

      const htmlBody = emailService.getVerificationTemplate(verificationCode);
      await emailService.sendEmail(firebaseUser.email, 'Code de vérification Flash Pay', htmlBody);
      
      toast.success('Un nouveau code vous a été envoyé !', { id: toastId });
    } catch (error) {
      console.error('Erreur lors du renvoi:', error);
      toast.error('Impossible d\'envoyer le code. Veuillez réessayer.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

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
        
        // 1. Fetch data from pending_users
        const pendingRef = doc(db, 'pending_users', firebaseUser.uid);
        const pendingSnap = await getDoc(pendingRef);
        
        if (pendingSnap.exists()) {
          const userData = pendingSnap.data();
          // 2. Create official user document
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            ...userData,
            emailVerified: true,
            updatedAt: new Date()
          });
          // 3. Delete from pending_users
          await deleteDoc(pendingRef);
        } else {
          // Fallback if already moved or created elsewhere
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            emailVerified: true
          });
        }

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
    <div className="min-h-screen bg-gradient-to-br from-[#f3eeff] via-[#FDF2F7] to-[#f8f5ff] flex items-center justify-center p-6">
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
          <p className="text-slate-500 font-medium leading-relaxed">
            Nous avons envoyé un code à 6 chiffres à l'adresse <br/>
            <span className="text-brand font-bold">{firebaseUser?.email}</span>
          </p>
          <p className="text-[11px] text-slate-400 font-bold mt-4 uppercase tracking-wider animate-pulse">
            {t('check_spam_notice')}
          </p>
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
          onClick={handleResendCode}
          disabled={loading}
          className="w-full py-4 flex items-center justify-center gap-2 text-slate-400 font-bold hover:text-brand transition-all border-t border-slate-100 disabled:opacity-50"
        >
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} /> 
          {loading ? 'Envoi en cours...' : 'Renvoyer le code'}
        </button>

        <button
          onClick={async () => {
            if (!firebaseUser) return;
            if (window.confirm('Voulez-vous vraiment annuler votre inscription ? Votre compte sera supprimé et vous pourrez recommencer.')) {
              try {
                const userRef = doc(db, 'users', firebaseUser.uid);
                const verifRef = doc(db, 'verification_codes', firebaseUser.uid);
                await deleteDoc(userRef);
                await deleteDoc(verifRef);
                await firebaseUser.delete();
                toast.success('Compte supprimé. Vous pouvez vous réinscrire.');
                navigate('/signup');
              } catch (err) {
                console.error('Failed to delete unverified user:', err);
                toast.error('Erreur lors de la suppression du compte.');
              }
            }
          }}
          className="w-full py-3 text-rose-400 font-bold text-[10px] uppercase tracking-widest hover:text-rose-600 transition-all opacity-60"
        >
          Annuler et recommencer
        </button>
      </div>
    </div>
  );
};
