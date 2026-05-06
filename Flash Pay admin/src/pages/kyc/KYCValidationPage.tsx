import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { KYCRequest } from '../../types';
import { adminService } from '../../services/adminService';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Eye,
  Search,
  ExternalLink,
  X
} from 'lucide-react';

const KYCValidationPage: React.FC = () => {
  const [requests, setRequests] = useState<KYCRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<KYCRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'kyc_requests'), orderBy('submittedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as KYCRequest[];
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    setIsActionLoading(true);
    try {
      if (status === 'approved') {
        await adminService.approveKYC(id);
      } else {
        await adminService.rejectKYC(id, rejectionReason);
      }

      setSelectedRequest(null);
      setRejectionReason('');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour du dossier.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleViewImage = (url: string) => {
    const win = window.open();
    if (win) {
      win.document.write(`<img src="${url}" style="max-width: 100%; height: auto;" />`);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         req.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Validation KYC</h2>
          <p className="text-slate-400 text-sm">Vérification des documents d'identité et conformité</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Rechercher par nom, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as any)}
            className={`
              px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all
              ${statusFilter === status 
                ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
            `}
          >
            {status === 'all' ? 'Tous les dossiers' : status.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card-dark border border-border-dark rounded-3xl col-span-full">
            <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500">Chargement des dossiers KYC...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-card-dark border border-border-dark p-20 rounded-3xl text-center col-span-full">
            <ShieldCheck className="mx-auto text-slate-700 mb-4" size={64} strokeWidth={1} />
            <p className="text-slate-500">Aucun dossier KYC ne correspond à votre recherche.</p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div key={req.id} className="bg-card-dark border border-border-dark p-6 rounded-3xl hover:border-brand/30 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-brand font-bold text-lg border border-slate-700">
                    {req.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{req.fullName}</h3>
                    <p className="text-slate-500 text-xs flex items-center gap-1"><Mail size={12} /> {req.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                  req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  req.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                  'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  {req.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Calendar size={14} /> Soumis le</span>
                  <span className="text-slate-300 font-medium">{req.submittedAt.toDate().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1"><User size={14} /> ID Utilisateur</span>
                  <span className="text-slate-300 font-mono">#{req.userId.substring(0, 8)}</span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedRequest(req)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Eye size={18} /> Examiner le dossier
              </button>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-bg-dark/90 backdrop-blur-md">
          <div className="bg-card-dark border border-border-dark w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border-dark flex justify-between items-center bg-slate-800/30">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-brand" size={24} />
                Examen du dossier : {selectedRequest.fullName}
              </h3>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-500 hover:text-white p-1">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
              {/* Documents */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pièce d'Identité</h4>
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={selectedRequest.documents.idProof.url} alt="ID Proof" className="w-full object-contain aspect-video" />
                    <button onClick={() => handleViewImage(selectedRequest.documents.idProof.url)} className="absolute top-4 right-4 p-2 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Selfie de Vérification</h4>
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={selectedRequest.documents.selfie.url} alt="Selfie" className="w-full object-contain aspect-video" />
                    <button onClick={() => handleViewImage(selectedRequest.documents.selfie.url)} className="absolute top-4 right-4 p-2 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Preuve d'Adresse</h4>
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={selectedRequest.documents.addressProof.url} alt="Address" className="w-full object-contain aspect-video" />
                    <button onClick={() => handleViewImage(selectedRequest.documents.addressProof.url)} className="absolute top-4 right-4 p-2 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Sidebar */}
              <div className="space-y-8">
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 space-y-4">
                  <h4 className="text-white font-bold">Informations Client</h4>
                  <div className="space-y-2">
                    <p className="text-slate-400 text-sm flex justify-between"><span>Email:</span> <span className="text-white font-medium">{selectedRequest.email}</span></p>
                    <p className="text-slate-400 text-sm flex justify-between"><span>ID:</span> <span className="text-white font-mono">{selectedRequest.userId}</span></p>
                    <p className="text-slate-400 text-sm flex justify-between"><span>Type ID:</span> <span className="text-white">{selectedRequest.documents.idProof.type}</span></p>
                  </div>
                </div>

                {selectedRequest.status === 'pending' ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Note / Raison du rejet</label>
                      <textarea 
                        placeholder="Ex: Document flou, date expirée..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand h-32"
                      />
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleReview(selectedRequest.id, 'rejected')}
                        disabled={isActionLoading}
                        className="flex-1 px-6 py-4 bg-rose-500/10 text-rose-500 font-bold rounded-2xl hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle size={20} /> Rejeter le dossier
                      </button>
                      <button 
                        onClick={() => handleReview(selectedRequest.id, 'approved')}
                        disabled={isActionLoading}
                        className="flex-1 px-6 py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={20} /> Approuver
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`p-6 rounded-2xl border ${
                    selectedRequest.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                  }`}>
                    <p className="text-center font-bold">Dossier déjà traité : {selectedRequest.status.toUpperCase()}</p>
                    {selectedRequest.rejectionReason && (
                      <p className="mt-2 text-xs text-center opacity-80 italic">Raison: {selectedRequest.rejectionReason}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCValidationPage;
