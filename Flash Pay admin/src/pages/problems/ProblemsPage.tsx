import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import type { ProblemReport } from '../../types';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  User, 
  ChevronRight,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

import { adminService } from '../../services/adminService';
import { Modal } from '../../components/ui/Modal';

const ProblemsPage: React.FC = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<ProblemReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const [selectedProblem, setSelectedProblem] = useState<ProblemReport | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolutionText, setResolutionText] = useState('Incident résolu et traité par l\'administration.');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'problem_reports'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProblems(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as ProblemReport[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleResolve = async () => {
    if (!resolvingId) return;
    
    const t = toast.loading('Mise à jour...');
    try {
      await adminService.resolveProblemReport(resolvingId, resolutionText);
      toast.success('Incident résolu', { id: t });
      setIsResolveModalOpen(false);
      setResolvingId(null);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la résolution', { id: t });
    }
  };

  const openResolveModal = (id: string) => {
    setResolvingId(id);
    setResolutionText('Incident résolu et traité par l\'administration.');
    setIsResolveModalOpen(true);
  };

  const filteredProblems = problems.filter(p => filter === 'all' || p.status === filter);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight flex items-center gap-4">
            <div className="w-12 h-12 bg-[#B3261E] text-white rounded-[16px] flex items-center justify-center shadow-lg"><AlertTriangle size={24} /></div>
            Gestion des Incidents
          </h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Suivi et résolution des litiges clients</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="flex bg-[#F3EDF7] p-1.5 rounded-full shadow-sm">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'pending', label: 'En attente' },
              { id: 'resolved', label: 'Résolus' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`
                  px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                  ${filter === f.id ? 'bg-[#661489] text-white shadow-md' : 'text-[#49454F] hover:bg-[#EADDFF] hover:text-[#21005D]'}
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="py-32 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#661489] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest">Scan des anomalies en cours...</p>
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="m3-card-elevated p-24 text-center bg-[#F3EDF7]/30 border-2 border-dashed">
            <div className="w-20 h-20 bg-white text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
               <CheckCircle2 size={40} />
            </div>
            <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Système Impeccable</h3>
            <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">Aucun incident non résolu à signaler</p>
          </div>
        ) : (
          filteredProblems.map(problem => (
            <div key={problem.id} className="m3-card-elevated group flex flex-col lg:flex-row gap-8 items-start lg:items-center relative overflow-hidden">
              {problem.status === 'pending' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-[#B3261E]"></div>
              )}
              
              <div className={`p-5 rounded-[24px] shrink-0 shadow-sm border ${
                problem.status === 'resolved' ? 'bg-[#E8DEF8] text-[#1D192B] border-[#E7E0EB]' : 'bg-[#F9DEDC] text-[#B3261E] border-[#F9DEDC] animate-pulse'
              }`}>
                <AlertTriangle size={32} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-[#1D1B20] font-black text-xl tracking-tight uppercase truncate">{(problem.type || 'Anomalie').replace('_', ' ')}</h3>
                  <span className="text-[#661489] text-[9px] font-black tracking-widest bg-[#EADDFF] px-2.5 py-1 rounded-md">ID: {problem.id.substring(0, 10).toUpperCase()}</span>
                </div>
                <p className="text-[#49454F] text-sm font-medium leading-relaxed line-clamp-2">{problem.description}</p>
                
                <div className="flex flex-wrap gap-6 mt-6">
                  <div className="flex items-center gap-2 text-[9px] font-black text-[#49454F] uppercase tracking-widest opacity-60">
                    <User size={14} className="text-[#661489]" /> Client: {problem.userId.substring(0, 8)}...
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black text-[#49454F] uppercase tracking-widest opacity-60">
                    <Clock size={14} className="text-[#661489]" /> Signalé le {problem.createdAt.toDate().toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex items-center gap-2 text-[9px] font-black text-[#661489] uppercase tracking-widest">
                    <Activity size={14} /> Transaction: #{problem.transactionId.substring(0, 8)}...
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-4 w-full lg:w-auto border-t lg:border-t-0 pt-6 lg:pt-0">
                {problem.status === 'pending' ? (
                  <button 
                    onClick={() => openResolveModal(problem.id)}
                    className="flex-1 lg:flex-none m3-btn-filled !py-3 !px-8 text-[10px] tracking-widest uppercase"
                  >
                    Résoudre
                  </button>
                ) : (
                  <button 
                    onClick={() => setSelectedProblem(problem)}
                    className="flex items-center gap-2 text-emerald-600 text-xs font-black uppercase tracking-widest bg-[#E8DEF8] px-5 py-3 rounded-full shadow-sm hover:bg-[#D0BCFF] transition-colors"
                  >
                    <CheckCircle2 size={18} /> Incident Résolu
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (problem.type?.toLowerCase() === 'kyc') {
                      navigate('/kyc');
                    } else if (problem.transactionId && problem.transactionId !== 'N/A') {
                      navigate(`/queue/${problem.transactionId}`);
                    } else {
                      setSelectedProblem(problem);
                    }
                  }}
                  className="p-4 bg-white border border-[#E7E0EB] text-[#49454F] hover:bg-[#F3EDF7] rounded-full transition-all shadow-sm active:scale-90"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Resolution Modal */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Résoudre l'incident"
      >
        <div className="space-y-6">
          <p className="text-xs font-bold text-[#49454F] uppercase tracking-widest">Détails de la résolution</p>
          <textarea
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] p-5 text-sm font-medium text-[#1D1B20] focus:ring-4 focus:ring-[#661489]/10 transition-all h-32"
            placeholder="Décrivez les actions menées..."
          />
          <div className="flex gap-4">
            <button 
              onClick={() => setIsResolveModalOpen(false)}
              className="flex-1 py-4 bg-white border border-[#E7E0EB] text-[#49454F] font-black uppercase text-[10px] tracking-widest rounded-full"
            >
              Annuler
            </button>
            <button 
              onClick={handleResolve}
              className="flex-1 m3-btn-filled py-4 text-[10px] tracking-widest uppercase"
            >
              Confirmer la résolution
            </button>
          </div>
        </div>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={!!selectedProblem}
        onClose={() => setSelectedProblem(null)}
        title="Détails de l'incident"
      >
        {selectedProblem && (
          <div className="space-y-8">
            <div className="flex items-center gap-4 p-5 bg-[#F3EDF7] rounded-[24px] border border-[#E7E0EB]">
              <div className="w-12 h-12 bg-[#B3261E] text-white rounded-[16px] flex items-center justify-center shadow-md">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-black text-[#1D1B20] text-lg uppercase tracking-tight">{selectedProblem.type}</h4>
                <p className="text-[9px] font-black text-[#661489] uppercase tracking-widest opacity-60">ID: {selectedProblem.id}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-[#49454F] uppercase tracking-widest px-1">Description du problème</p>
              <div className="bg-white border border-[#E7E0EB] p-6 rounded-[24px] text-sm font-medium leading-relaxed text-[#1D1B20]">
                {selectedProblem.description}
              </div>
            </div>

            {selectedProblem.status === 'resolved' && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Résolution apportée</p>
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[24px] text-sm font-bold leading-relaxed text-emerald-900 shadow-sm">
                  {selectedProblem.resolutionNote || "Aucune note de résolution fournie."}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white border border-[#E7E0EB] rounded-2xl">
                <p className="text-[8px] font-black text-[#49454F] uppercase tracking-widest opacity-40 mb-1">Signalé par (UserID)</p>
                <p className="text-[10px] font-mono font-black text-[#661489]">{selectedProblem.userId}</p>
              </div>
              <div className="p-4 bg-white border border-[#E7E0EB] rounded-2xl">
                <p className="text-[8px] font-black text-[#49454F] uppercase tracking-widest opacity-40 mb-1">Transaction associée</p>
                <p className="text-[10px] font-mono font-black text-[#661489]">#{selectedProblem.transactionId}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setSelectedProblem(null)}
                className="flex-1 py-4 bg-[#F3EDF7] text-[#1D192B] font-black uppercase text-[10px] tracking-widest rounded-full hover:bg-[#EADDFF] transition-all"
              >
                Fermer
              </button>
              {selectedProblem.transactionId && selectedProblem.transactionId !== 'N/A' && (
                <button 
                  onClick={() => {
                    navigate(`/queue/${selectedProblem.transactionId}`);
                    setSelectedProblem(null);
                  }}
                  className="flex-1 m3-btn-filled py-4 text-[10px] tracking-widest uppercase"
                >
                  Voir Transaction
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProblemsPage;

