import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, authService, userService, db } from '../services/firebase';
import { translateFirebaseError } from '../utils/errorMessages';
import type { User } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  emailVerificationSent: boolean;
  signup: (email: string, password: string, nom: string, tel: string, countryCode: string, ref?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    const unsubscribeAuth = authService.onAuthStateChanged((fbUser) => {
      setFirebaseUser(fbUser);
      
      // Clean up previous user listener if it exists
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      if (fbUser) {
        // Listen to user document in real-time
        unsubUser = onSnapshot(doc(db, 'users', fbUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const userData = { id: docSnap.id, ...docSnap.data() } as User;
            setUser(prevUser => {
              if (JSON.stringify(prevUser) === JSON.stringify(userData)) return prevUser;
              return userData;
            });
            setLoading(false);
          } else {
            // Check if they are stuck in pending_users (created during the 5-hour window)
            try {
              const pendingRef = doc(db, 'pending_users', fbUser.uid);
              const pendingSnap = await getDoc(pendingRef);
              if (pendingSnap.exists()) {
                // Migrate them to users immediately
                const pendingData = pendingSnap.data();
                await setDoc(doc(db, 'users', fbUser.uid), {
                  ...pendingData,
                  emailVerified: false,
                  updatedAt: new Date()
                });
                await deleteDoc(pendingRef);
                // After migration, the onSnapshot on 'users' will trigger again naturally!
                return;
              }
            } catch (err) {
              console.error('Migration check failed:', err);
            }
            setUser(null);
            setLoading(false);
          }
        }, (err) => {
          console.error('Error listening to user data:', err);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUser) unsubUser();
    };
  }, []);

  const signup = async (email: string, password: string, nom: string, tel: string, countryCode: string, ref?: string) => {
    try {
      setError(null);
      await authService.signup(email, password, { nom, tel, ref });
      
      // Update the country code immediately
      const fbUser = auth.currentUser;
      if (fbUser) {
        await userService.updateUserProfile(fbUser.uid, { 
          countryCode,
          isOnboardingComplete: true 
        });
      }
      
      setEmailVerificationSent(true);
    } catch (err: any) {
      const friendlyError = translateFirebaseError(err);
      setError(friendlyError);
      throw new Error(friendlyError);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const fbUser = await authService.login(email, password);
      const userData = await userService.getUserData(fbUser.uid);
      
      if (userData && userData.emailVerified === false) {
        sessionStorage.setItem('trigger_verification_email', 'true');
      }
      
      setUser(userData as User);
      setFirebaseUser(fbUser);
    } catch (err: any) {
      const friendlyError = translateFirebaseError(err);
      setError(friendlyError);
      throw new Error(friendlyError);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError(null);
      const fbUser = await authService.loginWithGoogle();
      const userData = await userService.getUserData(fbUser.uid);
      
      if (userData && userData.emailVerified === false) {
        sessionStorage.setItem('trigger_verification_email', 'true');
      }
      
      setUser(userData as User);
      setFirebaseUser(fbUser);
    } catch (err: any) {
      const friendlyError = translateFirebaseError(err);
      setError(friendlyError);
      throw new Error(friendlyError);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await authService.logout();
      // Clear referral preference on logout to ensure it reappears on next login
      sessionStorage.removeItem('hide_referral_card');
      setUser(null);
      setFirebaseUser(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await authService.resetPassword(email);
    } catch (err: any) {
      const friendlyError = translateFirebaseError(err);
      setError(friendlyError);
      throw new Error(friendlyError);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      user,
      loading,
      error,
      emailVerificationSent,
      signup,
      login,
      loginWithGoogle,
      logout,
      resetPassword,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
