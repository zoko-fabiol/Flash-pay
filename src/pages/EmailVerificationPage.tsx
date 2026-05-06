import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Check, Zap } from 'lucide-react';
import { Loading } from '../components/UI';

export const EmailVerificationPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [verificationChecked, setVerificationChecked] = useState(false);

  // If user is already verified or no user, redirect
  useEffect(() => {
    if (!firebaseUser) {
      navigate('/signup');
    }
  }, [firebaseUser, navigate]);

  const checkEmailVerification = async () => {
    if (!firebaseUser) return;
    
    setChecking(true);
    try {
      // Refresh the user to get the latest emailVerified status
      await firebaseUser.reload();
      
      if (firebaseUser.emailVerified) {
        setVerificationChecked(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setVerificationChecked(false);
      }
    } catch (err) {
      console.error('Error checking verification:', err);
    } finally {
      setChecking(false);
    }
  };

  if (!firebaseUser) {
    return <Loading />;
  }

  if (verificationChecked && firebaseUser.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full">
                <Check className="text-green-600" size={40} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Email Vérifié!</h1>
            <p className="text-slate-600 mb-6">Votre adresse email a été vérifiée avec succès.</p>
            <p className="text-sm text-slate-500">Redirection vers la connexion...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <Mail className="text-primary" size={40} />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Vérifiez votre email</h1>
            <p className="text-slate-600 mt-2">Un lien de vérification a été envoyé à</p>
            <p className="text-primary font-semibold mt-1">{firebaseUser.email}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900 flex items-center gap-2">
              <Mail size={18} className="text-blue-600" />
              Veuillez cliquer sur le lien dans l'email pour vérifier votre adresse.
              Vérifiez votre dossier spam si vous ne voyez pas l'email.
            </p>
          </div>

          {checking && <Loading />}

          <button
            onClick={checkEmailVerification}
            disabled={checking}
            className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <div className="animate-spin">
                  <Zap size={20} />
                </div>
                Vérification...
              </>
            ) : (
              <>
                <Check size={20} />
                Vérification Effectuée
              </>
            )}
          </button>

          <p className="text-center text-sm text-slate-600 mt-6">
            N'avez pas reçu d'email?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-primary font-semibold hover:underline"
            >
              Réessayer
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
