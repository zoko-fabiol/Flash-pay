import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';

export const TransferPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Rediriger vers le nouveau wizard de transfert
    navigate('/transfer-step1');
  }, [navigate]);

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600">Redirection en cours...</p>
        </div>
      </div>
    </Layout>
  );
};
