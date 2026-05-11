import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from 'firebase/firestore';
import { LockProIcon, MessagesProIcon, LoaderProIcon, ArrowRightProIcon, ShieldProIcon, CreditCardProIcon } from '../../components/ui/ProIcons';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const normalizedEmail = (user.email || email).toLowerCase();

      // Primary check: canonical document by uid.
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data()?.isAdmin) {
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
      setError('Accès refusé. Privilèges insuffisants.');
    } catch (err: any) {
      console.error(err);
      setError('Identifiants invalides ou erreur système.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF7FF] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[#EADDFF] rounded-full blur-[100px] opacity-40"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-[#470B37] rounded-full blur-[120px] opacity-10"></div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="w-20 h-20 bg-[#470B37] rounded-[28px] flex items-center justify-center shadow-2xl shadow-[#470B37]/30 mb-6 group hover:scale-110 transition-transform">
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

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1 opacity-60">Email professionnel</label>
              <div className="relative group">
                <MessagesProIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-[#49454F] group-focus-within:text-[#470B37] transition-colors" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] py-4 pl-14 pr-6 text-[#1D1B20] font-bold text-sm focus:ring-4 focus:ring-[#470B37]/10 focus:border-[#470B37] transition-all outline-none"
                  placeholder="admin@flashpay.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1 opacity-60">Mot de passe</label>
              <div className="relative group">
                <LockProIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-[#49454F] group-focus-within:text-[#470B37] transition-colors" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] py-4 pl-14 pr-6 text-[#1D1B20] font-bold text-sm focus:ring-4 focus:ring-[#470B37]/10 focus:border-[#470B37] transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#470B37] hover:bg-[#21005D] text-white font-black py-5 rounded-full shadow-2xl shadow-[#470B37]/40 flex items-center justify-center gap-3 transition-all transform active:scale-95 disabled:opacity-50 text-[11px] uppercase tracking-widest"
              >
                {loading ? (
                  <LoaderProIcon className="animate-spin" size={20} />
                ) : (
                  <>
                    Accéder au portail <ArrowRightProIcon size={18} />
                  </>
                )}
              </button>
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
