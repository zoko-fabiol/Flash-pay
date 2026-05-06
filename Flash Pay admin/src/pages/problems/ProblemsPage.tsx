import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { ProblemReport } from '../../types';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  User, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';

const ProblemsPage: React.FC = () => {
  const [problems, setProblems] = useState<ProblemReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    const q = query(collection(db, 'problem_reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProblems(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as ProblemReport[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await updateDoc(doc(db, 'problem_reports', id), {
        status: 'resolved',
        resolvedAt: Timestamp.now()
      });
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la résolution.');
    }
  };

  const filteredProblems = problems.filter(p => filter === 'all' || p.status === filter);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Signalements de Problèmes</h2>
          <p className="text-slate-400 text-sm">Gestion des anomalies et litiges signalés par le système ou les clients</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 rounded-xl p-1">
            {['all', 'pending', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-brand text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : 'Résolus'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-20 text-center text-slate-500">Chargement...</div>
        ) : filteredProblems.length === 0 ? (
          <div className="bg-card-dark border border-border-dark p-20 rounded-3xl text-center">
            <CheckCircle2 className="mx-auto text-emerald-500/20 mb-4" size={64} strokeWidth={1} />
            <p className="text-slate-500 text-lg">Bravo ! Aucun problème non résolu.</p>
          </div>
        ) : (
          filteredProblems.map(problem => (
            <div key={problem.id} className="bg-card-dark border border-border-dark p-6 rounded-3xl hover:border-brand/30 transition-all group flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className={`p-4 rounded-2xl shrink-0 ${
                problem.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500 animate-pulse'
              }`}>
                <AlertTriangle size={24} />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-white font-bold text-lg">{problem.type.replace('_', ' ').toUpperCase()}</h3>
                  <span className="text-slate-600 text-xs font-mono">#{problem.id.substring(0, 8)}</span>
                </div>
                <p className="text-slate-400 text-sm max-w-2xl line-clamp-2">{problem.description}</p>
                
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <User size={14} /> <span>Client: {problem.userId.substring(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock size={14} /> <span>Signalé le {problem.createdAt.toDate().toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-brand font-bold">
                    <ExternalLink size={14} /> <span>Transaction: {problem.transactionId.substring(0, 8)}...</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                {problem.status === 'pending' ? (
                  <button 
                    onClick={() => handleResolve(problem.id)}
                    className="flex-1 md:flex-none px-6 py-2.5 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-all text-sm"
                  >
                    Marquer Résolu
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold">
                    <CheckCircle2 size={18} /> Résolu
                  </div>
                )}
                <button className="p-2.5 bg-slate-800 text-slate-500 hover:text-white rounded-xl transition-all">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProblemsPage;
