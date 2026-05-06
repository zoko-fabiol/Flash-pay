import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';

export const TransferPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/transfer-step1');
  }, [navigate]);

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Redirection en cours...</p>
      </div>
    </Layout>
  );
};
