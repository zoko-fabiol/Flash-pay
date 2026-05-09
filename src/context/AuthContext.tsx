import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { authService, userService, db } from '../services/firebase';
import type { User } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  emailVerificationSent: boolean;
  signup: (email: string, password: string, nom: string, tel: string, ref?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
        unsubUser = onSnapshot(doc(db, 'users', fbUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = { id: docSnap.id, ...docSnap.data() } as User;
            setUser(prevUser => {
              // Simple check to avoid re-render if data is identical
              // (Comparing stringified versions is a quick way for flat objects)
              if (JSON.stringify(prevUser) === JSON.stringify(userData)) {
                return prevUser;
              }
              return userData;
            });
          }
          setLoading(false);
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

  const signup = async (email: string, password: string, nom: string, tel: string, ref?: string) => {
    try {
      setError(null);
      await authService.signup(email, password, { nom, tel, ref });
      setEmailVerificationSent(true);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const fbUser = await authService.login(email, password);
      const userData = await userService.getUserData(fbUser.uid);
      setUser(userData as User);
      setFirebaseUser(fbUser);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await authService.logout();
      setUser(null);
      setFirebaseUser(null);
    } catch (err: any) {
      setError(err.message);
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
      logout,
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
