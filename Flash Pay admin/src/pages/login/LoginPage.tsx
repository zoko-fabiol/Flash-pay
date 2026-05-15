import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { LockProIcon, MessagesProIcon, LoaderProIcon, ArrowRightProIcon, ShieldProIcon, CreditCardProIcon } from '../../components/ui/ProIcons';
import { Fingerprint } from 'lucide-react';
import { biometricService } from '../../services/biometricService';
import { translateFirebaseError } from '../../utils/errorMessages';
import { useConfirm } from '../../context/ConfirmContext';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const { confirm } = useConfirm();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled] = useState(localStorage.getItem('admin_biometric_enabled') === 'true');
  const navigate = useNavigate();

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometricService.isAvailable();
      setBiometricAvailable(available);
      
      if (available && biometricEnabled) {
        handleBiometricLogin();
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricLogin = async () => {
    const creds = await biometricService.getCredentials();
    if (creds) {
      setLoading(true);
      setError('');
      try {
        await executeLogin(creds.email, creds.password);
      } catch (err: any) {
        setError(translateFirebaseError(err));
      } finally {
        setLoading(false);
      }
    }
  };

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPass);
    const user = userCredential.user;
    const normalizedEmail = (user.email || loginEmail).toLowerCase();

    // Primary check: canonical document by uid.
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists() && userDoc.data()?.isAdmin) {
      // If successful manual login and biometric available but not set, ask to save
      if (biometricAvailable && !biometricEnabled) {
        const wantSave = await confirm({
          title: 'Sécurité Biométrique',
          message: "Souhaitez-vous activer l'empreinte digitale pour vos prochaines connexions au portail admin ?",
          confirmLabel: 'Activer maintenant',
          cancelLabel: 'Plus tard',
          type: 'info'
        });
        if (wantSave) {
          await biometricService.saveCredentials({ email: loginEmail, password: loginPass });
          localStorage.setItem('admin_biometric_enabled', 'true');
        }
      }
      navigate('/dashboard');
      return;
    }

    // Fallback for legacy records created by email instead of uid.
    const byEmailQuery = query(
      collection(db, 'users'),
      where('email', '==', normalizedEmail),
      limit(1)
    );
    const byEmailSnapshot = await getDocs(byEmailQuery);
    const byEmailData = byEmailSnapshot.empty ? null : byEmailSnapshot.docs[0].data();

    if (byEmailData?.isAdmin) {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          email: normalizedEmail,
          isAdmin: true,
          adminRole: byEmailData.adminRole || 'restricted',
          adminPermissions: byEmailData.adminPermissions,
          updatedAt: byEmailData.updatedAt || byEmailData.createdAt,
        },
        { merge: true }
      );
      navigate('/dashboard');
      return;
    }

    await auth.signOut();
    throw { code: 'auth/permission-denied', message: 'Accès refusé. Privilèges insuffisants.' };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await executeLogin(email, password);
    } catch (err: any) {
      console.error(err);
      setError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Veuillez entrer votre email professionnel.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      toast.success('Lien de réinitialisation envoyé !');
    } catch (err: any) {
      setError(translateFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF7FF] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[#EADDFF] rounded-full blur-[100px] opacity-40"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-[#661489] rounded-full blur-[120px] opacity-10"></div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="w-20 h-20 bg-[#661489] rounded-[28px] flex items-center justify-center shadow-2xl shadow-[#661489]/30 mb-6 group hover:scale-110 transition-transform">
            <CreditCardProIcon className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-black text-[#1D1B20] tracking-tighter">FLASH PAY</h1>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.4em] mt-3 opacity-60">Admin Security Console</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl border border-[#E7E0EB] p-10 rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-700">
          <div className="mb-10 text-center">
             <h2 className="text-xl font-black text-[#1D1B20] tracking-tight">Authentification</h2>
             <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest mt-1 opacity-40">Accès sécurisé réservé au personnel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-[#F9DEDC] border border-[#B3261E]/20 text-[#B3261E] px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center animate-shake">
                {error}
              </div>
            )}

            {resetSent && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
                Vérifiez votre boîte mail pour le lien.
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1 opacity-60">Email professionnel</label>
              <div className="relative group">
                <MessagesProIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-[#49454F] group-focus-within:text-[#661489] transition-colors" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] py-4 pl-14 pr-6 text-[#1D1B20] font-bold text-sm focus:ring-4 focus:ring-[#661489]/10 focus:border-[#661489] transition-all outline-none"
                  placeholder="admin@flashpay.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest opacity-60">Mot de passe</label>
                <button 
                  type="button" 
                  onClick={handleForgotPassword}
                  className="text-[9px] font-black text-[#661489] uppercase tracking-wider hover:underline"
                >
                  Oublié ?
                </button>
              </div>
              <div className="relative group">
                <LockProIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-[#49454F] group-focus-within:text-[#661489] transition-colors" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] py-4 pl-14 pr-6 text-[#1D1B20] font-bold text-sm focus:ring-4 focus:ring-[#661489]/10 focus:border-[#661489] transition-all outline-none"
                  placeholder="••••••••"
                  required={!resetSent}
                />
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#661489] hover:bg-[#21005D] text-white font-black py-5 rounded-full shadow-2xl shadow-[#661489]/40 flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 text-[11px] uppercase tracking-widest"
              >
                {loading ? (
                  <LoaderProIcon className="animate-spin" size={20} />
                ) : (
                  <>
                    Accéder au portail <ArrowRightProIcon size={18} />
                  </>
                )}
              </button>

              {biometricAvailable && biometricEnabled && (
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={loading}
                  className="w-full bg-white border-2 border-[#661489]/20 text-[#661489] font-black py-4 rounded-full flex items-center justify-center gap-3 transition-all transform active:scale-95 hover:bg-[#661489]/5 text-[10px] uppercase tracking-widest"
                >
                  <Fingerprint size={20} />
                  Utiliser l'empreinte
                </button>
              )}
            </div>
          </form>

          <div className="mt-10 flex items-center justify-center gap-2 opacity-30">
             <ShieldProIcon size={14} />
             <span className="text-[9px] font-black uppercase tracking-widest">End-to-End Encryption Active</span>
          </div>
        </div>

        <p className="text-center text-[#49454F] text-[10px] font-bold uppercase tracking-[0.2em] mt-12 opacity-40">
          &copy; 2026 Flash Pay Global. Système d'exploitation sécurisé.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
