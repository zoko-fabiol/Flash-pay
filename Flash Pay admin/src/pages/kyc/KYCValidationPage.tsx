import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { KYCRequest } from '../../types';
import { adminService } from '../../services/adminService';
import ImageLightbox from '../../components/ui/ImageLightbox';
import { 
  ShieldCheck, 
  User, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  Eye,
  Search,
  ExternalLink,
  X,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const isPdfDocument = (url?: string) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.startsWith('data:application/pdf') || lowerUrl.includes('.pdf');
};

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
    const t = toast.loading('Traitement du dossier...');
    try {
      if (status === 'approved') {
        await adminService.approveKYC(id);
        toast.success('Dossier approuvé avec succès', { id: t });
      } else {
        await adminService.rejectKYC(id, rejectionReason);
        toast.success('Dossier rejeté', { id: t });
      }

      setSelectedRequest(null);
      setRejectionReason('');
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du traitement', { id: t });
    } finally {
      setIsActionLoading(false);
    }
  };

  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null);
  const [lightboxLabels, setLightboxLabels] = useState<string[]>([]);
  const [lightboxStartIndex, setLightboxStartIndex] = useState<number>(0);

  const DOC_KEYS = [
    { key: 'idProof',      label: "Pièce d'identité" },
    { key: 'selfie',       label: 'Selfie de vérification' },
    { key: 'addressProof', label: 'Preuve de domicile' },
  ];

  const handleOpenDocument = (url: string) => {
    if (isPdfDocument(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!selectedRequest) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const docs = selectedRequest.documents as any;
    const entries = DOC_KEYS
      .map(({ key, label }) => ({ url: docs?.[key]?.url as string | undefined, label }))
      .filter(({ url: u }) => u && !isPdfDocument(u)) as { url: string; label: string }[];

    const images = entries.map(e => e.url);
    const labels = entries.map(e => e.label);
    const idx    = images.findIndex(i => i === url);
    setLightboxImages(images);
    setLightboxLabels(labels);
    setLightboxStartIndex(idx >= 0 ? idx : 0);
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = (req.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (req.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight">Validation KYC</h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Examen des dossiers de conformité client</p>
        </div>
        
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="m3-search flex-1 lg:w-80">
            <Search className="text-[#49454F]" size={18} />
            <input 
              type="text"
              placeholder="Nom, Email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full"
            />
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status as any)}
            className={`
              px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm
              ${statusFilter === status 
                ? 'bg-[#661489] text-white shadow-lg shadow-[#661489]/20' 
                : 'bg-white text-[#49454F] border border-[#E7E0EB] hover:bg-[#F3EDF7]'}
            `}
          >
            {status === 'all' ? 'Tous les dossiers' : status}
          </button>
        ))}
      </div>

      {/* Grid of Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-32 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#661489] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest">Chargement de la base KYC...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="col-span-full m3-card-elevated p-20 text-center bg-[#F3EDF7]/30 border-dashed border-2">
            <ShieldCheck className="mx-auto text-[#661489]/20 mb-6" size={64} />
            <p className="text-[#49454F] font-black uppercase text-[10px] tracking-widest">Aucun dossier trouvé</p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div key={req.id} className="m3-card-elevated group hover:border-[#661489]/30">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#EADDFF] text-[#21005D] rounded-[20px] flex items-center justify-center font-black text-xl shadow-sm border border-[#661489]/10 group-hover:scale-110 transition-transform">
                    {req.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-[#1D1B20] tracking-tight truncate">{req.fullName}</h3>
                    <p className="text-[#49454F] text-[10px] font-bold truncate mt-1 opacity-60">{req.email}</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                  req.status === 'approved' ? 'bg-[#E8DEF8] text-[#1D192B]' :
                  req.status === 'rejected' ? 'bg-[#F9DEDC] text-[#B3261E]' :
                  'bg-[#F3EDF7] text-[#49454F]'
                }`}>
                  {req.status}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#49454F]">
                  <span className="flex items-center gap-2 opacity-50"><Calendar size={14} /> Soumis le</span>
                  <span className="text-[#1D1B20]">{req.submittedAt?.toDate().toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#49454F]">
                  <span className="flex items-center gap-2 opacity-50"><User size={14} /> ID Système</span>
                  <span className="text-[#661489] font-mono">#{req.userId.substring(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedRequest(req)}
                className="w-full m3-btn-tonal !rounded-[20px] group-hover:bg-[#661489] group-hover:text-white transition-all shadow-sm"
              >
                <Eye size={18} /> Examiner le dossier
              </button>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {selectedRequest && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-[#1D1B20]/40 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
          <div className="relative bg-[#FEF7FF] w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-full border border-[#E7E0EB]">
            <div className="p-8 border-b border-[#E7E0EB] flex justify-between items-center bg-[#FEF7FF] sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#661489] text-white rounded-[16px] flex items-center justify-center shadow-lg">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight">Vérification de Conformité</h3>
                  <p className="text-[#49454F] text-[10px] font-black uppercase tracking-widest opacity-60">Dossier : {selectedRequest.fullName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-3 bg-[#F3EDF7] text-[#49454F] rounded-full hover:bg-[#F9DEDC] hover:text-[#B3261E] transition-all">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto scrollbar-hide flex-1 grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Document Previews */}
              <div className="space-y-8">
                <h4 className="text-xs font-black text-[#49454F] uppercase tracking-[0.2em] border-b border-[#E7E0EB] pb-2">Documents Transmis</h4>
                
                {[
                  { label: "Pièce d'Identité", key: 'idProof' },
                  { label: "Selfie de Vérification", key: 'selfie' },
                  { label: "Preuve de Domicile", key: 'addressProof' }
                ].map((docType) => {
                  const docData = (selectedRequest.documents as any)?.[docType.key];
                  return (
                    <div key={docType.key} className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-[#1D1B20] uppercase tracking-widest">{docType.label}</span>
                        <span className="text-[9px] font-bold text-[#661489] uppercase opacity-40">{docData?.type || 'Image'}</span>
                      </div>
                      <div className="relative group rounded-[32px] overflow-hidden border border-[#E7E0EB] bg-[#F3EDF7] shadow-inner">
                        {docData?.url ? (
                          isPdfDocument(docData.url) ? (
                            <>
                              <iframe
                                src={docData.url}
                                title={docType.label}
                                className="w-full aspect-video bg-white"
                              />
                              <div className="absolute inset-0 bg-[#1D1B20]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <button onClick={() => handleOpenDocument(docData.url)} className="p-4 bg-white rounded-full shadow-2xl text-[#661489] hover:scale-110 transition-transform">
                                       <ExternalLink size={24} />
                                 </button>
                              </div>
                            </>
                            ) : (
                            <>
                              <img onClick={() => handleOpenDocument(docData.url)} src={docData.url} alt={docType.label} className="w-full aspect-video object-contain bg-black/5 cursor-pointer" />
                              <div className="absolute inset-0 bg-[#1D1B20]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                 <button onClick={() => handleOpenDocument(docData.url)} className="p-4 bg-white rounded-full shadow-2xl text-[#661489] hover:scale-110 transition-transform">
                                   <ExternalLink size={24} />
                                 </button>
                              </div>
                            </>
                          )
                        ) : (
                          <div className="aspect-video flex items-center justify-center text-[#49454F]/20 italic text-xs">Non fourni</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Controls */}
              <div className="space-y-8">
                <div className="bg-[#F3EDF7] p-8 rounded-[32px] border border-[#E7E0EB] space-y-6">
                   <div className="flex items-center gap-3 border-b border-[#E7E0EB] pb-4">
                     <FileText size={20} className="text-[#661489]" />
                     <h3 className="font-black text-[#1D1B20] text-sm uppercase tracking-widest">Informations Dossier</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-[#49454F] uppercase tracking-widest opacity-40">Email Principal</p>
                        <p className="text-xs font-black text-[#1D1B20] truncate">{selectedRequest.email}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-[#49454F] uppercase tracking-widest opacity-40">ID Utilisateur</p>
                        <p className="text-xs font-mono font-black text-[#661489]">#{selectedRequest.userId.substring(0, 10).toUpperCase()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-[#49454F] uppercase tracking-widest opacity-40">Type de Document</p>
                        <p className="text-xs font-black text-[#1D1B20] uppercase">{selectedRequest.documents.idProof.type}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-[#49454F] uppercase tracking-widest opacity-40">Statut Actuel</p>
                        <p className="text-xs font-black text-[#661489] uppercase">{selectedRequest.status}</p>
                      </div>
                   </div>
                </div>

                {selectedRequest.status === 'pending' ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-[#49454F] uppercase tracking-widest ml-1 block">Motif du rejet (si applicable)</label>
                       <textarea 
                        placeholder="Ex: La pièce d'identité est floue ou expirée..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full bg-[#F3EDF7] border border-[#CAC4D0] rounded-[24px] p-5 text-sm font-medium text-[#1D1B20] focus:ring-4 focus:ring-[#661489]/10 transition-all h-32"
                       />
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleReview(selectedRequest.id, 'rejected')}
                        disabled={isActionLoading}
                        className="flex-1 py-4 bg-[#F9DEDC] text-[#B3261E] font-black uppercase text-[10px] tracking-widest rounded-full hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                      >
                        Rejeter le dossier
                      </button>
                      <button 
                        onClick={() => handleReview(selectedRequest.id, 'approved')}
                        disabled={isActionLoading}
                        className="flex-1 m3-btn-filled py-4 text-[10px] tracking-widest uppercase"
                      >
                        Valider le profil
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`p-8 rounded-[32px] border flex flex-col items-center text-center gap-4 ${
                    selectedRequest.status === 'approved' ? 'bg-[#E8DEF8] border-[#661489]/20' : 'bg-[#F9DEDC] border-[#B3261E]/20'
                  }`}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${
                       selectedRequest.status === 'approved' ? 'bg-white text-emerald-500' : 'bg-white text-[#B3261E]'
                    }`}>
                       {selectedRequest.status === 'approved' ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
                    </div>
                    <div>
                      <p className="text-[#1D1B20] font-black uppercase tracking-widest text-sm">Dossier Traité</p>
                      <p className="text-[10px] font-bold opacity-60 uppercase mt-1">Status : {selectedRequest.status}</p>
                    </div>
                    {selectedRequest.rejectionReason && (
                      <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-white text-[11px] font-medium text-[#B3261E] italic">
                        "{selectedRequest.rejectionReason}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      , document.body)}
      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          labels={lightboxLabels}
          startIndex={lightboxStartIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}
    </div>
  );
};

export default KYCValidationPage;
