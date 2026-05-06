import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { authService, userService } from '../services/firebase';
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
    const unsubscribe = authService.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const userData = await userService.getUserData(fbUser.uid);
          setUser(userData as User);
          setFirebaseUser(fbUser);
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
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
