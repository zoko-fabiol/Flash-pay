import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTransferWizard } from '../context/TransferWizardContext';
import { Layout } from '../components/Layout';
import { ChevronLeft, ChevronRight, Globe, CreditCard, Smartphone, Upload, CheckCircle2, Banknote, Info, ArrowRight, Gift, User, Phone, BookUser, Copy, Clock, Zap, ShieldCheck, CloudUpload, Send, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth, calculateTransactionRecap } from '../services/firebase';

async function fileToBase64(file: File | Blob, maxWidth = 800, quality = 0.65): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const blob = file instanceof File ? file : new File([file], 'image.jpg', { type: 'image/jpeg' });
    reader.readAsDataURL(blob);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// --- Helper Components for Steps ---

const StepWrapper = ({ title, description, children, onNext, onBack, nextLabel = "Suivant", backLabel = "Précédent", isValid = true }: any) => (
  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
    <div className="mb-10 text-center">
      <h2 className="text-4xl font-black text-[#1D1B20] tracking-tight">{title}</h2>
      {description && <p className="text-[#49454F] mt-3 font-medium text-lg">{description}</p>}
    </div>
    <div className="space-y-6">
      {children}
    </div>
    <div className="mt-12 flex gap-4">
      {onBack && (
        <button onClick={onBack} className="flex-1 px-8 py-5 rounded-full border-2 border-[#79747E] text-[#49454F] font-black hover:bg-[#E7E0EB] transition-all flex items-center justify-center gap-3 active:scale-95">
          <ChevronLeft size={24} /> {backLabel}
        </button>
      )}
      <button
        onClick={onNext}
        disabled={!isValid}
        className="flex-[2] px-8 py-5 rounded-full font-black transition-all flex items-center justify-center gap-3 bg-[#6750A4] text-white shadow-xl hover:shadow-[#6750A4]/30 disabled:bg-[#E7E0EB] disabled:text-[#49454F]/40 disabled:shadow-none disabled:cursor-not-allowed active:scale-95"
      >
        {nextLabel} <ChevronRight size={24} />
      </button>
    </div>
  </div>
);

export const TransferWizardPage: React.FC = () => {
  const { currentStep, transferData, updateTransferData, nextStep, previousStep, resetWizard } = useTransferWizard();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [countries, setCountries] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState({ dailyLimitRUB: 150000, standardLimitRUB: 20000, expertLimitRUB: 150000 });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(20 * 60); // 20 minutes
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const [savedContacts, setSavedContacts] = useState<any[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const sortedCountries = useMemo(
    () => [...countries].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })),
    [countries]
  );

  const sortedBanks = useMemo(
    () => [...banks].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })),
    [banks]
  );

  // Payment timer - starts/resets when entering a payment step
  useEffect(() => {
    const isPaymentStep = 
      (transferData.transferType === 'russia-africa' && currentStep === 5) ||
      (transferData.transferType === 'africa-russia' && currentStep === 6) ||
      (transferData.transferType === 'russia-russia' && currentStep === 6);

    if (isPaymentStep) {
      setTimerSeconds(20 * 60);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            toast.error('Le délai de paiement a expiré. Veuillez recommencer.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, transferData.transferType]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsubC = onSnapshot(collection(db, 'countries'), (s) => setCountries(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'banks'), (s) => setBanks(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubR = onSnapshot(collection(db, 'exchange_rates'), (s) => setRates(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubCom = onSnapshot(collection(db, 'commissions'), (s) => setCommissions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubS = onSnapshot(collection(db, 'settings'), (s) => {
      if (!s.empty) {
        const data = s.docs[0].data();
        setSettings({
          dailyLimitRUB: data.dailyLimitRUB || 150000,
          standardLimitRUB: data.standardLimitRUB || 20000,
          expertLimitRUB: data.expertLimitRUB || 150000
        });
      }
    });
    setLoading(false);
    return () => { unsubC(); unsubB(); unsubR(); unsubCom(); unsubS(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubContacts = onSnapshot(collection(db, `users/${user.id}/saved_contacts`), (snapshot) => {
      setSavedContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubContacts();
  }, [user]);

  const handleSelectContact = (contact: any) => {
    if (transferData.transferType === 'russia-africa') {
      updateTransferData({
        recipientName: contact.name || contact.recipientName,
        recipientPhone: contact.phone || contact.recipientPhone,
        recipientOperator: contact.operator || contact.recipientOperator,
        destinationCountry: contact.countryCode || contact.destinationCountry || 'CM'
      });
    } else if (transferData.transferType === 'africa-russia') {
      updateTransferData({
        recipientName: contact.name || contact.recipientName,
        beneficiaryAccount: contact.accountNumber || contact.beneficiaryAccount || contact.phone,
        selectedOperator: contact.operator || contact.selectedOperator || 'SBP'
      });
    }
    setIsContactModalOpen(false);
    toast.success('Contact sélectionné');
  };

  const getCommission = (amount: number, type: string, destinationCountry?: string, operator?: string) => {
    if (!amount) return 0;
    
    // Find rules that match type and amount range
    const rules = commissions.filter(c => 
      c.transferType === type && 
      amount >= c.minAmount && 
      amount <= c.maxAmount
    );

    if (rules.length === 0) return 0;

    // Specificity matching
    let applicable = rules.find(c => c.destinationCountry === destinationCountry && c.destinationOperator === operator);
    if (!applicable) applicable = rules.find(c => c.destinationCountry === destinationCountry && !c.destinationOperator);
    if (!applicable) applicable = rules.find(c => !c.destinationCountry && !c.destinationOperator);

    if (!applicable) return 0;

    if (applicable.feeType === 'fixed') {
      return applicable.fixedAmount || 0;
    }
    return amount * ((applicable.percentage || 0) / 100);
  };

  const isKycExpert = user?.statut_kyc === 'Expert' || user?.kyc?.status === 'approved';

  const handleSubmit = async () => {
    if (!proofFile) {
      toast.error('Veuillez télécharger la preuve de paiement.');
      return;
    }
    setIsSubmitting(true);
    toast.dismiss();
    const t = toast.loading('Envoi de la transaction...');
    try {
      // 1. Convert the proof file to base64
      const proofUrl = await fileToBase64(proofFile);

      // 2. Determine input and output currencies based on transfer type
      let inputCurrency = transferData.currency || 'RUB';
      let outputCurrency = transferData.currency || 'RUB';
      
      if (transferData.transferType === 'russia-africa') {
        inputCurrency = 'RUB';
        outputCurrency = transferData.currency || 'XAF';
      } else if (transferData.transferType === 'africa-russia') {
        inputCurrency = transferData.currency || 'XAF';
        outputCurrency = 'RUB';
      }
      // russia-russia: both stay the same (RUB)

      // 3. Calculate transaction recap with exchange rate snapshot and fees
      const calculation = await calculateTransactionRecap({
        transferType: transferData.transferType || 'russia-russia',
        amount: transferData.amount,
        inputCurrency,
        outputCurrency,
        recipientOperator: transferData.recipientOperator,
        recipientName: transferData.recipientName,
        recipientPhone: transferData.recipientPhone,
        destinationCountry: transferData.destinationCountry,
        narration: transferData.narration,
      });

      if (!calculation.isValid) {
        toast.error(`Erreur de calcul: ${calculation.errors.join(', ')}`, { id: t });
        return;
      }

      // 4. Create transaction in Firestore with complete calculation snapshot
      await addDoc(collection(db, 'transactions'), {
        ...transferData,
        userId: auth.currentUser?.uid,
        clientName: user?.nom || '',
        clientPhone: user?.tel || '',
        clientEmail: user?.email || auth.currentUser?.email || '',
        type: transferData.transferType,
        proofUrl,
        status: 'pending',
        // Currency fields
        currency: inputCurrency,
        destinationCurrency: outputCurrency,
        // Calculation snapshots (stored at transaction time)
        exchangeRate: calculation.exchangeRate,
        exchangeRateTimestamp: calculation.exchangeRateTimestamp,
        fee: calculation.commissionAmount,
        commissionPercentage: calculation.commissionPercentage,
        receivedAmount: calculation.receivedAmount,
        // Additional fields
        amount: transferData.amount,
        fromCountry: transferData.originCountry || 'RU',
        toCountry: transferData.destinationCountry || 'RU',
        operator: transferData.recipientOperator || '',
        createdAt: Timestamp.now(),
        statusHistory: [{
          status: 'pending',
          timestamp: Timestamp.now(),
          notes: 'Commande initiée par le client'
        }]
      });

      toast.success('Transfert validé !', { id: t });
      nextStep();
    } catch (e: any) {
      console.error('Erreur détaillée:', e);
      toast.error(`Échec de validation: ${e.message || 'Erreur inconnue'}`, { id: t });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Scénarios Logic ---

  if (loading) return <Layout><div className="py-20 text-center">Chargement...</div></Layout>;

  // Étape 1 : Choix du Mode
  if (currentStep === 1) {
    const modes = [
      { id: 'russia-africa', title: 'Russie → Afrique', icon: <Globe size={32} />, desc: 'Envoyer vers Mobile Money', data: { originCountry: 'RU' } },
      { id: 'africa-russia', title: 'Afrique → Russie', icon: <CreditCard size={32} />, desc: 'Virement vers banque Russe', data: { destinationCountry: 'RU' } },
      { id: 'russia-russia', title: 'Russie → Russie', icon: <Banknote size={32} />, desc: 'Transfert local en RUB', data: { originCountry: 'RU', destinationCountry: 'RU' } }
    ];
    return (
      <Layout>
        <div className="max-w-xl mx-auto py-12 px-4">
          <div className="flex items-center mb-8">
            <button onClick={() => navigate('/dashboard')} className="w-12 h-12 rounded-full bg-[#EADDFF] text-[#21005D] flex items-center justify-center hover:scale-110 transition-all shadow-sm">
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1 text-center pr-12">
               <span className="text-[10px] font-black text-[#6750A4] uppercase tracking-widest">Nouveau Transfert</span>
               <h1 className="text-2xl font-black text-[#1D1B20]">Destination</h1>
            </div>
          </div>

          <div className="grid gap-5">
            {modes.map(m => (
              <button
                key={m.id}
                onClick={() => { 
                  updateTransferData({ 
                    transferType: m.id as any,
                    ...m.data
                  }); 
                  nextStep(); 
                }}
                className="flex items-center gap-8 p-8 bg-[#FEF7FF] border-2 border-[#E7E0EB] rounded-[32px] hover:border-[#6750A4] hover:bg-[#EADDFF]/20 transition-all text-left group shadow-sm hover:shadow-xl"
              >
                <div className="p-6 bg-[#E7E0EB] rounded-[24px] group-hover:bg-[#6750A4] group-hover:text-white transition-all text-[#6750A4]">
                  {m.icon}
                </div>
                <div>
                   <h3 className="text-2xl font-black text-[#1D1B20] mb-1">{m.title}</h3>
                   <p className="text-sm font-bold text-[#49454F]">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Rendu selon le mode
  const { transferType } = transferData;

  // --- SCENARIO: RUSSIE -> AFRIQUE ---
  if (transferType === 'russia-africa') {
    switch (currentStep) {
      case 2: // Choix du pays
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12">
              <StepWrapper
                title="Destination"
                description="Vers quel pays envoyez-vous l'argent ?"
                onBack={previousStep}
                onNext={nextStep}
                isValid={!!transferData.destinationCountry}
              >
                <div className="grid grid-cols-2 gap-4">
                  {sortedCountries.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => updateTransferData({ destinationCountry: c.code, currency: c.currency })}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${transferData.destinationCountry === c.code ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-white shadow-sm">
                        <img src={`https://flagcdn.com/w40/${(c.code || 'cm').toLowerCase()}.png`} alt={`${c.name} flag`} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-bold">{c.name}</span>
                    </button>
                  ))}
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 3: // Destinataire (Nom + Téléphone combinés)
        const selectedCountry = countries.find(c => c.code === transferData.destinationCountry);
        const phoneDigitsOnly = (transferData.recipientPhone || '').replace(/\D/g, '');
        const isPhoneValid = !!transferData.recipientOperator && phoneDigitsOnly.length >= 8;
        const isNameValid = (transferData.recipientName?.length || 0) > 3;
        const isValid = isNameValid && isPhoneValid;

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12">
              <StepWrapper title="Veuillez saisir les informations du destinataire" onBack={previousStep} onNext={nextStep} isValid={isValid}>
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_14px_40px_rgba(15,23,42,0.04)] p-4 sm:p-6 mb-6">
                  
                  {/* Name Block */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                        <User size={20} />
                      </div>
                      <span className="font-semibold text-slate-900">Nom du bénéficiaire</span>
                    </div>
                    <input
                      type="text"
                      value={transferData.recipientName || ''}
                      onChange={e => updateTransferData({ recipientName: e.target.value })}
                      placeholder="Entrez le nom complet du bénéficiaire"
                      className="w-full p-4 rounded-2xl border-2 border-slate-400 focus:ring-2 focus:ring-brand focus:border-brand outline-none text-slate-900 placeholder:text-slate-400 bg-white font-bold shadow-sm"
                    />
                  </div>

                  <hr className="border-slate-100 my-6" />

                  {/* Phone Block */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                        <Phone size={20} />
                      </div>
                      <span className="font-semibold text-slate-900">Numéro de téléphone</span>
                    </div>
                    
                    <div className="flex border-2 border-slate-400 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-brand focus-within:border-brand shadow-sm">
                      <div className="flex items-center gap-2 bg-slate-50 px-4 border-r border-slate-200 font-semibold text-slate-900">
                        <span className="text-xl">🇨🇲</span> {/* Placeholder for flag */}
                        <span>{selectedCountry?.dialCode || '+237'}</span>
                      </div>
                      <input
                        type="tel"
                        value={transferData.recipientPhone || ''}
                        onChange={e => {
                          const val = e.target.value;
                          const op = selectedCountry?.operators?.find((o: any) => o.prefixes?.some((p: string) => val.startsWith(p)));
                          updateTransferData({ recipientPhone: val, recipientOperator: op?.name || '' });
                        }}
                        placeholder="Entrez le numéro de téléphone"
                        className="flex-1 p-4 outline-none text-slate-900 placeholder:text-slate-400 font-bold w-full bg-white"
                      />
                    </div>
                    {transferData.recipientOperator && (
                      <p className="text-xs text-emerald-600 font-semibold mt-2 ml-1">Opérateur: {transferData.recipientOperator}</p>
                    )}
                  </div>
                </div>

                <div className="text-center relative my-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                  <span className="relative bg-[radial-gradient(circle_at_top_left,_#f5efff_0%,_#fbf9ff_42%,_#f7f3ff_100%)] px-4 text-xs text-slate-400 uppercase font-bold tracking-widest">Où ?</span>
                </div>

                <button 
                  onClick={() => setIsContactModalOpen(true)}
                  className="w-full p-4 rounded-2xl border border-brand text-brand font-bold flex items-center justify-center gap-3 hover:bg-brand/5 transition-colors"
                >
                  <BookUser size={20} /> Choisir parmi les contacts enregistrés
                </button>

                {isContactModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900">Mes contacts</h3>
                        <button onClick={() => setIsContactModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                        {savedContacts.length === 0 ? (
                          <div className="text-center py-12">
                            <BookUser className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-slate-500 font-medium">Aucun contact enregistré</p>
                          </div>
                        ) : (
                          savedContacts.map(contact => (
                            <button 
                              key={contact.id} 
                              onClick={() => handleSelectContact(contact)}
                              className="w-full p-4 rounded-2xl border border-slate-100 hover:border-brand hover:bg-brand/5 flex items-center gap-4 transition-all text-left group"
                            >
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-brand/10 group-hover:text-brand transition-colors font-bold">
                                {(contact.name || contact.recipientName || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 truncate">{contact.name || contact.recipientName}</p>
                                <p className="text-xs text-slate-500 font-medium">{contact.phone || contact.beneficiaryAccount || contact.recipientPhone}</p>
                              </div>
                              <ChevronRight size={18} className="text-slate-300 group-hover:text-brand transition-colors" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </StepWrapper>
            </div>
          </Layout>
        );
      case 4: // Montant & Bilan
        const targetCurrency = transferData.currency || 'XAF';
        const foundRate = rates.find(r => 
          r.from?.toString().toUpperCase().trim() === 'RUB' && 
          r.to?.toString().toUpperCase().trim() === targetCurrency.toUpperCase().trim()
        );
        const rate = foundRate?.rate || foundRate?.rateFixed || 7.22;
        const commissionFee = getCommission(
          transferData.amount || 0, 
          'russia-africa', 
          transferData.destinationCountry, 
          transferData.recipientOperator
        );
        const convertedAmount = (transferData.amount || 0) * rate;
        const currentLimit = settings.dailyLimitRUB || 150000;
        const requiresKYC = (transferData.amount || 0) > currentLimit;
        const isAmountValid = (transferData.amount || 0) > 0 && !requiresKYC;
        const bonusPoints = Math.floor(convertedAmount / 6.55);

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper title="Vérifier les détails" onBack={previousStep} onNext={nextStep} isValid={isAmountValid}>
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-8">
                  
                  {/* Flags & Summary */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-6 mb-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-slate-50 shadow-sm">
                        <img src="https://flagcdn.com/ru.svg" alt="Russia" className="w-full h-full object-cover" />
                      </div>
                      <ArrowRight className="text-brand" size={24} />
                      <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-slate-50 shadow-sm">
                        <img src={`https://flagcdn.com/${transferData.destinationCountry?.toLowerCase() || 'cm'}.svg`} alt="Dest" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <p className="text-slate-500 font-medium">Vous envoyez</p>
                    <div className="relative mt-2 mb-2">
                       <input
                        type="number"
                        value={transferData.amount || ''}
                        onChange={e => updateTransferData({ amount: parseFloat(e.target.value) })}
                        placeholder="0"
                        className="text-4xl font-black text-slate-900 text-center w-full py-6 px-4 rounded-[32px] border-2 border-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none bg-white transition-all shadow-sm"
                      />
                    </div>
                    <p className="text-3xl font-black text-slate-900 mb-2">roubles</p>
                    <p className="text-slate-500 font-bold">à {transferData.recipientName}</p>
                  </div>

                  {/* Detailed Table */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Opérateur</span>
                      <span className="font-bold text-slate-900">{transferData.recipientOperator}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Numéro de mobile</span>
                      <span className="font-bold text-slate-900">{transferData.recipientPhone}</span>
                    </div>
                    
                    <hr className="border-slate-50" />
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Montant envoyé</span>
                      <span className="font-bold text-slate-900">{transferData.amount?.toLocaleString()} roubles</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Frais de transfert</span>
                      <span className="font-bold text-slate-900">+{commissionFee.toLocaleString()} RUB</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-900 font-bold uppercase text-xs">Total à Payer</span>
                      <span className="text-xl font-black text-slate-900">{( (transferData.amount || 0) + commissionFee ).toLocaleString()} RUB</span>
                    </div>

                    <hr className="border-slate-50" />

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Le destinataire reçoit</span>
                      <span className="font-black text-brand-dark">{convertedAmount.toLocaleString()} {transferData.currency === 'XAF' ? 'francs CFA' : transferData.currency}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Taux de change</span>
                      <span className="font-bold text-slate-900">1 rouble = {rate} {transferData.currency === 'XAF' ? 'francs CFA' : transferData.currency}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-brand font-bold uppercase tracking-wider text-xs">Bonus</span>
                      <span className="font-bold text-brand">{bonusPoints.toLocaleString()} points</span>
                    </div>
                  </div>

                  {/* Narration Block */}
                  <div className="pt-6 border-t border-slate-100">
                    <label className="block text-brand font-bold text-sm mb-2">Narration (facultatif)</label>
                    <p className="text-xs text-slate-400 mb-3 font-medium">Ajoutez une note pour le destinataire (cadeau, scolarité, anniversaire, etc.)</p>
                    <input 
                      type="text"
                      value={transferData.notes || ''}
                      onChange={e => updateTransferData({ notes: e.target.value })}
                      placeholder="Ex: Cadeau d'anniversaire"
                      className="w-full p-5 rounded-2xl border-2 border-slate-400 focus:ring-2 focus:ring-brand focus:border-brand outline-none font-bold text-slate-900 bg-white shadow-sm"
                    />
                  </div>

                  {/* Delivery Note */}
                  <div className="flex items-center justify-center gap-2 py-3 bg-[#f7f3ff] rounded-2xl text-brand">
                    <Zap size={18} fill="currentColor" />
                    <span className="text-sm font-bold">Généralement livré en moins de 10 minutes</span>
                  </div>

                  {requiresKYC && (
                     <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex gap-3 text-sm font-semibold border border-red-200">
                       <Info size={20} className="shrink-0" />
                       Vérification KYC Expert requise pour ce montant.
                     </div>
                  )}
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 5: // Dépôt Info
        const adminBank = banks.find(b => b.type === 'phone' || b.type === 'card');
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper 
                title="Effectuer le paiement" 
                onBack={previousStep} 
                onNext={handleSubmit}
                nextLabel={isSubmitting ? "Traitement..." : "Continuer"}
                isValid={!!proofFile && !isSubmitting}
              >
                
                {/* Timer Alert */}
                <div className="bg-[#f7f3ff] rounded-[24px] p-5 border border-brand/10 mb-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand shrink-0">
                    <Info size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-brand font-bold text-sm leading-tight mb-1">
                      Effectuez le paiement sur l'un des numéros ci-dessous et envoyez la capture d'écran du reçu.
                    </p>
                    <p className="text-xs text-brand/70 font-semibold italic">Vous avez 20 minutes pour effectuer le paiement.</p>
                  </div>
                  <div className="flex items-center gap-2 text-brand font-black">
                    <Clock size={18} />
                    <span className={timerSeconds < 120 ? 'text-red-500' : ''}>{formatTimer(timerSeconds)}</span>
                  </div>
                </div>

                <p className="text-sm font-bold text-slate-900 mb-4">Effectuez le paiement sur le numéro ci-dessous</p>

                {/* Operator Deposit Info */}
                <div className="space-y-4 mb-8">
                  {(() => {
                    const destCountry = countries.find(c => c.code === transferData.destinationCountry);
                    const selectedOp = destCountry?.operators?.find((o: any) => o.name === transferData.recipientOperator);
                    console.log('[DEBUG] Operator data:', JSON.stringify(selectedOp));
                    const holderName = selectedOp?.depositHolder || selectedOp?.holder || selectedOp?.accountHolder || selectedOp?.details || '';
                    
                    if (!selectedOp?.depositNumber) {
                      return (
                        <div className="bg-amber-50 rounded-[24px] p-6 border border-amber-200 text-center">
                          <p className="text-amber-700 font-bold text-sm">Aucun numéro de dépôt configuré pour cet opérateur.</p>
                          <p className="text-amber-600 text-xs mt-1">Contactez le support pour assistance.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="mb-3">
                          <span className="bg-brand text-white text-[10px] font-black px-3 py-1 rounded-full">Option 1</span>
                        </div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-50 flex items-center justify-center">
                              {selectedOp.logo ? (
                                <img src={selectedOp.logo} alt={selectedOp.name} className="w-10 h-10 rounded-full object-contain" />
                              ) : (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs bg-brand">
                                  {selectedOp.name?.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Compte de dépôt</p>
                              <p className="text-lg font-black text-slate-900">{selectedOp.depositNumber}</p>
                              
                              <div className="mt-3">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Opérateur</p>
                                <p className="text-sm font-bold text-slate-900">{selectedOp.name}</p>
                              </div>
                              
                              <div className="mt-3">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Titulaire du compte</p>
                                <p className="text-sm font-bold text-slate-900">{holderName || 'Non renseigné'}</p>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => { navigator.clipboard.writeText(selectedOp.depositNumber); toast.success('Copié !'); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand/20 text-brand font-bold text-xs hover:bg-brand/5 transition-all"
                          >
                            <Copy size={14} /> Copier
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Security Note */}
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 mb-8 border border-slate-100">
                  <ShieldCheck className="text-brand shrink-0" size={20} />
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide leading-tight">
                    Ces numéros sont mis à jour quotidiennement pour votre sécurité. Utilisez uniquement les numéros affichés ici.
                  </p>
                </div>

                {/* Proof Section */}
                <div>
                  <p className="text-brand font-black text-sm mb-4">Après le paiement</p>
                  <div className="bg-slate-50 rounded-2xl p-4 flex items-start gap-4 mb-4">
                     <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-brand shrink-0">
                        <Upload size={20} />
                     </div>
                     <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Effectuez le paiement sur l'un des numéros ci-dessus, puis téléchargez la preuve (capture d'écran du reçu).
                     </p>
                  </div>
                  
                  <label className="block w-full cursor-pointer group">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      accept="image/*"
                    />
                    <div className={`w-full py-6 rounded-[24px] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${proofFile ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-brand/40 hover:bg-brand/5'}`}>
                      {proofFile ? (
                        <>
                          <CheckCircle2 className="text-emerald-500" size={32} />
                          <p className="text-emerald-700 font-bold">{proofFile.name}</p>
                          <p className="text-xs text-emerald-600">Cliquer pour changer</p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 text-brand">
                             <CloudUpload size={28} />
                             <p className="font-black">Télécharger la preuve de paiement</p>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">Formats acceptés : JPG, PNG • Taille max : 5 Mo</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 6: // Preuve (This step is now integrated into 5, but we can keep it as a blank or remove it later if logic allows. For now I will merge the handleSumbit trigger into Step 5's Next button)
        return null; // Logic will skip or we can just redirect step 5 to success directly after submit.

      case 7: // Success (Paiement initié)
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-10 px-4">
              <div className="relative mb-12 flex justify-center">
                {/* Illustration placeholder - could use an image if available */}
                <div className="w-64 h-48 bg-brand/5 rounded-3xl flex items-center justify-center overflow-hidden">
                   <Send size={120} className="text-brand/20 -rotate-12 translate-x-4 translate-y-4" />
                   <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center text-brand">
                        <CheckCircle2 size={40} />
                     </div>
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-50 text-center">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Paiement initié</h2>
                <p className="text-slate-500 mb-8 font-medium">Votre paiement de {((transferData.amount || 0) + (getCommission(transferData.amount || 0, transferData.transferType || 'russia-russia', transferData.destinationCountry, transferData.recipientOperator))).toLocaleString()} roubles a été initié.</p>

                <div className="bg-[#f7f3ff] rounded-2xl p-5 mb-8 flex items-start gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand shrink-0 shadow-sm">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Votre paiement est en cours.</p>
                    <p className="text-sm text-slate-500 mt-1">Nous vous avertirons quand il sera terminé.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => { resetWizard(); navigate(`/transactions`); }}
                    className="w-full py-5 bg-brand text-white font-black rounded-3xl shadow-xl shadow-brand/25 hover:bg-brand-dark transition-all"
                  >
                    Voir la transaction
                  </button>
                  <button 
                    onClick={() => { resetWizard(); navigate('/'); }}
                    className="w-full py-5 bg-white text-slate-900 font-black rounded-3xl border-2 border-slate-100 hover:bg-slate-50 transition-all"
                  >
                    Retour à la page d'accueil
                  </button>
                </div>
              </div>
            </div>
          </Layout>
        );
    }
  }

  // --- SCENARIO: AFRIQUE -> RUSSIE ---
  if (transferType === 'africa-russia') {
    switch (currentStep) {
      case 2: // Pays source
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12">
              <StepWrapper title="Origine" description="Depuis quel pays envoyez-vous l'argent ?" onBack={previousStep} onNext={nextStep} isValid={!!transferData.originCountry}>
                <div className="grid grid-cols-2 gap-4">
                  {sortedCountries.filter(c => c.canSendToRussia !== false).map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => updateTransferData({ originCountry: c.code, currency: c.currency })}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${transferData.originCountry === c.code ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0 bg-white shadow-sm">
                        <img src={`https://flagcdn.com/w40/${(c.code || 'cm').toLowerCase()}.png`} alt={`${c.name} flag`} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-bold">{c.name}</span>
                    </button>
                  ))}
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 3: // Compte bénéficiaire en Russie
        const cleanBeneficiaryAccount = (transferData.beneficiaryAccount || '').replace(/\D/g, '');
        const isAccountValid = cleanBeneficiaryAccount.length >= 10;
        
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper title="Veuillez saisir les informations du destinataire" onBack={previousStep} onNext={nextStep} isValid={isAccountValid}>
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_14px_40px_rgba(15,23,42,0.04)] p-4 sm:p-6 mb-6">
                  
                  {/* Account Block */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                        <User size={20} />
                      </div>
                      <span className="font-semibold text-slate-900">Bénéficiaire en Russie</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 font-medium">Entrez le numéro de compte ou le téléphone SBP</p>
                    <input
                      type="text"
                      value={transferData.beneficiaryAccount || ''}
                      onChange={e => updateTransferData({ beneficiaryAccount: e.target.value })}
                      placeholder="+7 XXX XXX XXXX"
                      className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand outline-none text-slate-900 font-bold"
                    />
                  </div>

                  <hr className="border-slate-100 my-6" />

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                     <ShieldCheck className="text-emerald-500" size={20} />
                     <p className="text-xs text-emerald-700 font-bold">Transfert sécurisé via le système SBP</p>
                  </div>
                </div>

                <div className="text-center relative my-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                  <span className="relative bg-[radial-gradient(circle_at_top_left,_#f5efff_0%,_#fbf9ff_42%,_#f7f3ff_100%)] px-4 text-xs text-slate-400 uppercase font-bold tracking-widest">Ou ?</span>
                </div>

                <button 
                  onClick={() => setIsContactModalOpen(true)}
                  className="w-full p-4 rounded-2xl border border-brand text-brand font-bold flex items-center justify-center gap-3 hover:bg-brand/5 transition-colors"
                >
                  <BookUser size={20} /> Choisir parmi les contacts enregistrés
                </button>

                {isContactModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900">Mes contacts</h3>
                        <button onClick={() => setIsContactModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                        {savedContacts.length === 0 ? (
                          <div className="text-center py-12">
                            <BookUser className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-slate-500 font-medium">Aucun contact enregistré</p>
                          </div>
                        ) : (
                          savedContacts.map(contact => (
                            <button 
                              key={contact.id} 
                              onClick={() => handleSelectContact(contact)}
                              className="w-full p-4 rounded-2xl border border-slate-100 hover:border-brand hover:bg-brand/5 flex items-center gap-4 transition-all text-left group"
                            >
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-brand/10 group-hover:text-brand transition-colors font-bold">
                                {(contact.name || contact.recipientName || '?').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-900 truncate">{contact.name || contact.recipientName}</p>
                                <p className="text-xs text-slate-500 font-medium">{contact.phone || contact.beneficiaryAccount || contact.recipientPhone}</p>
                              </div>
                              <ChevronRight size={18} className="text-slate-300 group-hover:text-brand transition-colors" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </StepWrapper>
            </div>
          </Layout>
        );
      case 4: // Montant & Bilan
        const sourceCurrency = transferData.currency || 'XAF';
        // Get the RUB to XAF rate first
        const rubToXafRateObj = rates.find(r => 
          r.from?.toString().toUpperCase().trim() === 'RUB' && 
          r.to?.toString().toUpperCase().trim() === sourceCurrency.toUpperCase().trim()
        );
        const rubToXafRate = rubToXafRateObj?.rate || rubToXafRateObj?.rateFixed || 7.22;
        
        // Calculate inverse rate for XAF -> RUB
        const rateAfRu = parseFloat((1 / rubToXafRate).toFixed(2));
        const commissionFeeAfRu = getCommission(
          transferData.amount || 0, 
          'africa-russia', 
          transferData.originCountry, 
          transferData.selectedOperator
        );
        const totalAfRuToPay = (transferData.amount || 0) + commissionFeeAfRu;
        const convertedAmountAfRu = (transferData.amount || 0) * rateAfRu;
        
        // Check limit against RUB equivalent
        const amountInRUB = convertedAmountAfRu;
        const currentLimitAfRu = settings.dailyLimitRUB || 150000;
        const requiresKYCAfRu = amountInRUB > currentLimitAfRu;
        
        const isAmountValidAfRu = (transferData.amount || 0) > 0 && !requiresKYCAfRu;
        const bonusPointsAfRu = Math.floor((transferData.amount || 0) / 6.55);

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper title="Vérifier les détails" onBack={previousStep} onNext={nextStep} isValid={isAmountValidAfRu}>
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-8">
                  
                  {/* Flags & Summary */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-6 mb-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-slate-50 shadow-sm">
                        <img src={`https://flagcdn.com/${transferData.originCountry?.toLowerCase() || 'cm'}.svg`} alt="Origine" className="w-full h-full object-cover" />
                      </div>
                      <ArrowRight className="text-brand" size={24} />
                      <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-slate-50 shadow-sm">
                        <img src="https://flagcdn.com/ru.svg" alt="Russia" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <p className="text-slate-500 font-medium">Vous envoyez</p>
                    <div className="relative mt-2 mb-2">
                       <input
                        type="number"
                        value={transferData.amount || ''}
                        onChange={e => updateTransferData({ amount: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="text-4xl font-black text-slate-900 text-center w-full py-6 px-4 rounded-[32px] border-2 border-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none bg-white transition-all shadow-sm"
                      />
                    </div>
                    <p className="text-3xl font-black text-slate-900 mb-2">{transferData.currency === 'XAF' ? 'francs CFA' : transferData.currency}</p>
                    <p className="text-slate-500 font-bold">vers la Russie</p>
                  </div>

                  {/* Detailed Table */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Origine</span>
                      <span className="font-bold text-slate-900">{transferData.originCountry}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Destination</span>
                      <span className="font-bold text-slate-900">Russie (SBP)</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Compte Bénéficiaire</span>
                      <span className="font-bold text-slate-900">{transferData.beneficiaryAccount}</span>
                    </div>
                    
                    <hr className="border-slate-50" />
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Taux de change</span>
                      <span className="font-bold text-slate-900">1 {transferData.currency} = {rateAfRu} RUB</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Frais de transfert</span>
                      <span className="font-bold text-slate-900">{commissionFeeAfRu} {transferData.currency}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-900 font-bold uppercase text-xs">Total à Payer</span>
                      <span className="text-xl font-black text-slate-900">{totalAfRuToPay.toLocaleString()} {transferData.currency}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-brand font-bold uppercase tracking-wider text-xs">Bonus</span>
                      <span className="font-bold text-brand">{bonusPointsAfRu.toLocaleString()} points</span>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 flex justify-between items-center">
                    <span className="text-slate-500 font-bold uppercase text-xs">Le destinataire reçoit</span>
                    <span className="text-2xl font-black text-brand">{convertedAmountAfRu.toLocaleString()} RUB</span>
                  </div>

                  {/* Narration Block */}
                  <div className="pt-6 border-t border-slate-100">
                    <label className="block text-brand font-bold text-sm mb-2">Narration (facultatif)</label>
                    <p className="text-xs text-slate-400 mb-3 font-medium">Ajoutez une note pour le destinataire (cadeau, scolarité, anniversaire, etc.)</p>
                    <input 
                      type="text"
                      value={transferData.notes || ''}
                      onChange={e => updateTransferData({ notes: e.target.value })}
                      placeholder=""
                      className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand outline-none font-medium"
                    />
                  </div>


                  {/* Delivery Note */}
                  <div className="flex items-center justify-center gap-2 py-3 bg-[#f7f3ff] rounded-2xl text-brand">
                    <Zap size={18} fill="currentColor" />
                    <span className="text-sm font-bold">Généralement livré en moins de 10 minutes</span>
                  </div>

                  {requiresKYCAfRu && (
                     <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex gap-3 text-sm font-semibold border border-red-200">
                       <Info size={20} className="shrink-0" />
                       Limite de transfert quotidienne dépassée ({currentLimitAfRu.toLocaleString()} RUB équivalent). {isKycExpert ? "Plafond maximum atteint." : "Passez au statut Expert pour augmenter votre limite."}
                     </div>
                  )}
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 5: // Choix opérateur dépôt
        const sourceCountry = countries.find(c => c.code === transferData.originCountry);
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12">
              <StepWrapper title="Moyen de dépôt" description="Par quel opérateur allez-vous payer ?" onBack={previousStep} onNext={nextStep} isValid={!!transferData.selectedOperator}>
                <div className="grid gap-3">
                  {sourceCountry?.operators?.map((op: any) => (
                    <button
                      key={op.name}
                      onClick={() => updateTransferData({ selectedOperator: op.name })}
                      className={`p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${transferData.selectedOperator === op.name ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <span className="font-bold text-slate-900">{op.name}</span>
                      {transferData.selectedOperator === op.name && <CheckCircle2 className="text-brand" />}
                    </button>
                  ))}
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 6: // Dépôt Info + Proof (Integrated)
        const countryData = countries.find(c => c.code === transferData.originCountry);
        const depAccount = countryData?.operators?.find((a: any) => a.name === transferData.selectedOperator);
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper 
                title="Effectuer le paiement" 
                onBack={previousStep} 
                onNext={handleSubmit}
                nextLabel={isSubmitting ? "Traitement..." : "Continuer"}
                isValid={!!proofFile && !isSubmitting}
              >
                
                {/* Timer Alert */}
                <div className="bg-[#f7f3ff] rounded-[24px] p-5 border border-brand/10 mb-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand shrink-0">
                    <Info size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-brand font-bold text-sm leading-tight mb-1">
                      Effectuez le paiement vers ce compte {transferData.selectedOperator} et envoyez le reçu.
                    </p>
                    <p className="text-xs text-brand/70 font-semibold italic">Vous avez 20 minutes pour effectuer le paiement.</p>
                  </div>
                  <div className="flex items-center gap-2 text-brand font-black">
                    <Clock size={18} />
                    <span className={timerSeconds < 120 ? 'text-red-500' : ''}>{formatTimer(timerSeconds)}</span>
                  </div>
                </div>

                {/* Account Details Card */}
                <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm mb-8 relative overflow-hidden">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand font-black">
                         {transferData.selectedOperator?.charAt(0)}
                      </div>
                      <div>
                         <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Compte de dépôt</p>
                         <p className="text-lg font-black text-slate-900">{depAccount?.number || depAccount?.depositNumber || 'Numéro non configuré'}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                      <div>
                         <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Opérateur</p>
                         <p className="text-sm font-bold text-slate-900">{transferData.selectedOperator}</p>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(depAccount?.number || depAccount?.depositNumber || ''); toast.success('Copié !'); }}
                        className="px-4 py-2 rounded-xl bg-brand/5 text-brand font-bold text-xs"
                      >
                         Copier
                      </button>
                   </div>
                </div>

                {/* Security Note */}
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 mb-8 border border-slate-100">
                  <ShieldCheck className="text-brand shrink-0" size={20} />
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide leading-tight">
                    Utilisez uniquement le numéro affiché ci-dessus. Les comptes sont mis à jour régulièrement.
                  </p>
                </div>

                {/* Proof Section */}
                <div>
                  <p className="text-brand font-black text-sm mb-4">Preuve de paiement</p>
                  <label className="block w-full cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      accept="image/*"
                    />
                    <div className={`w-full py-6 rounded-[24px] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${proofFile ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-brand/40 hover:bg-brand/5'}`}>
                      {proofFile ? (
                        <>
                          <CheckCircle2 className="text-emerald-500" size={32} />
                          <p className="text-emerald-700 font-bold text-sm">{proofFile.name}</p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 text-brand">
                             <CloudUpload size={28} />
                             <p className="font-black">Télécharger le reçu</p>
                          </div>
                          <p className="text-xs text-slate-400">JPG ou PNG (Max 5Mo)</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 7: // Success (Paiement initié)
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-10 px-4">
              <div className="relative mb-12 flex justify-center">
                <div className="w-64 h-48 bg-brand/5 rounded-3xl flex items-center justify-center overflow-hidden">
                   <Send size={120} className="text-brand/20 -rotate-12 translate-x-4 translate-y-4" />
                   <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center text-brand">
                        <CheckCircle2 size={40} />
                     </div>
                   </div>
                </div>
              </div>

              <div className="bg-white rounded-[32px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-50 text-center">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Paiement initié</h2>
                <p className="text-slate-500 mb-8 font-medium">Votre demande de transfert vers la Russie a été initiée.</p>

                <div className="bg-[#f7f3ff] rounded-2xl p-5 mb-8 flex items-start gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand shrink-0 shadow-sm">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 leading-tight">Traitement en cours.</p>
                    <p className="text-sm text-slate-500 mt-1">Nous vous avertirons dès que le transfert SBP sera effectué.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <button onClick={() => { resetWizard(); navigate(`/transactions`); }} className="w-full py-5 bg-brand text-white font-black rounded-3xl shadow-xl shadow-brand/25 transition-all">
                    Voir la transaction
                  </button>
                  <button onClick={() => { resetWizard(); navigate('/'); }} className="w-full py-5 bg-white text-slate-900 font-black rounded-3xl border-2 border-slate-100 transition-all">
                    Retour à l'accueil
                  </button>
                </div>
              </div>
            </div>
          </Layout>
        );
      default: return null;
    }
  }

  // --- SCENARIO: RUSSIE -> RUSSIE ---
  if (transferType === 'russia-russia') {
    switch (currentStep) {
      case 2: // Type dest (Bank or Op)
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12">
              <StepWrapper title="Type de destination" description="Où voulez-vous envoyer les RUB ?" onBack={previousStep} onNext={nextStep} isValid={!!transferData.recipientType}>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => updateTransferData({ recipientType: 'bank' })} className={`p-8 rounded-3xl border-2 flex flex-col items-center gap-4 transition-all ${transferData.recipientType === 'bank' ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300'}`}>
                    <Banknote size={32} /><span className="font-bold">Banque / Carte</span>
                  </button>
                  <button onClick={() => updateTransferData({ recipientType: 'operator' })} className={`p-8 rounded-3xl border-2 flex flex-col items-center gap-4 transition-all ${transferData.recipientType === 'operator' ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300'}`}>
                    <Smartphone size={32} /><span className="font-bold">Mobile / SBP</span>
                  </button>
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 3: // Nom destinataire
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12">
              <StepWrapper title="Bénéficiaire" description="Nom complet de la personne" onBack={previousStep} onNext={nextStep} isValid={transferData.recipientName?.length > 3}>
                <input type="text" value={transferData.recipientName || ''} onChange={e => updateTransferData({ recipientName: e.target.value })} placeholder="Ex: Ivan Ivanov" className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand focus:outline-none text-lg font-medium" autoComplete="off" />
              </StepWrapper>
            </div>
          </Layout>
        );
      case 4: // Compte / Tel
        const cleanRuRuAccount = (transferData.recipientAccount || '').replace(/\D/g, '');
        const isRuRuAccountValid = cleanRuRuAccount.length >= 10;
        const isStep4Valid = isRuRuAccountValid;

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12">
              <StepWrapper 
                title={transferData.recipientType === 'bank' ? "Numéro de Compte" : "Numéro SBP"} 
                description="Où les fonds seront crédités" 
                onBack={previousStep} 
                onNext={nextStep} 
                isValid={isStep4Valid}
              >
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Compte / Téléphone</label>
                    <input 
                      type="text" 
                      value={transferData.recipientAccount || ''} 
                      onChange={e => {
                        const numericValue = e.target.value.replace(/[^\d\s+]/g, '');
                        updateTransferData({ recipientAccount: numericValue });
                      }} 
                      placeholder={transferData.recipientType === 'bank' ? "2200 XXXX XXXX XXXX" : "+7 900 XXX XX XX"} 
                      className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand focus:outline-none text-lg font-bold" 
                      autoComplete="off" 
                    />
                  </div>
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 5: // Récapitulatif
        const commissionRuRuRecap = getCommission(transferData.amount || 0, 'russia-russia');
        const totalRuRu = (transferData.amount || 0) + commissionRuRuRecap;
        const bonusPointsRuRu = Math.floor((transferData.amount || 0) / 6.55);
        
        const currentLimitRuRu = settings.dailyLimitRUB || 150000;
        const requiresKYCRuRu = (transferData.amount || 0) > currentLimitRuRu;

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper title="Vérifier les détails" onBack={previousStep} onNext={nextStep} isValid={(transferData.amount || 0) > 0 && !requiresKYCRuRu}>
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-6 sm:p-8 space-y-8">
                  
                  {/* Flags & Summary */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-6 mb-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-slate-50 shadow-sm">
                        <img src="https://flagcdn.com/ru.svg" alt="Russia" className="w-full h-full object-cover" />
                      </div>
                      <ArrowRight className="text-brand" size={24} />
                      <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-slate-50 shadow-sm">
                        <img src="https://flagcdn.com/ru.svg" alt="Russia" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <p className="text-slate-500 font-medium">Vous envoyez</p>
                    <div className="relative mt-2 mb-2">
                       <input
                        type="number"
                        value={transferData.amount || ''}
                        onChange={e => updateTransferData({ amount: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="text-4xl font-black text-slate-900 text-center w-full py-6 px-4 rounded-[32px] border-2 border-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none bg-white transition-all shadow-sm"
                      />
                    </div>
                    <p className="text-3xl font-black text-slate-900 mb-2">roubles</p>
                    <p className="text-slate-500 font-bold">à {transferData.recipientName}</p>
                  </div>

                  {/* Detailed Table */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Type</span>
                      <span className="font-bold text-slate-900">{transferData.recipientType === 'bank' ? 'Banque / Carte' : 'Mobile / SBP'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">{transferData.recipientType === 'bank' ? 'Numéro de compte' : 'Numéro SBP'}</span>
                      <span className="font-bold text-slate-900">{transferData.recipientAccount}</span>
                    </div>
                    
                    <hr className="border-slate-50" />
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Vous payez</span>
                      <span className="font-bold text-slate-900">{(transferData.amount || 0).toLocaleString()} roubles</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Le destinataire reçoit</span>
                      <span className="font-black text-brand-dark">{(transferData.amount || 0).toLocaleString()} roubles</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Frais de transfert</span>
                      <span className="font-bold text-slate-900">{commissionRuRuRecap.toLocaleString()} roubles</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Total à payer</span>
                      <span className="font-black text-slate-900">{totalRuRu.toLocaleString()} roubles</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-brand font-bold uppercase tracking-wider text-xs">Bonus</span>
                      <span className="font-bold text-brand">{bonusPointsRuRu.toLocaleString()} points</span>
                    </div>
                  </div>

                  {/* Narration Block */}
                  <div className="pt-6 border-t border-slate-100">
                    <label className="block text-brand font-bold text-sm mb-2">Narration (facultatif)</label>
                    <p className="text-xs text-slate-400 mb-3 font-medium">Ajoutez une note pour le destinataire</p>
                    <input 
                      type="text"
                      value={transferData.notes || ''}
                      onChange={e => updateTransferData({ notes: e.target.value })}
                      placeholder="Ex: Cadeau d'anniversaire"
                      className="w-full p-5 rounded-2xl border-2 border-slate-400 focus:ring-2 focus:ring-brand focus:border-brand outline-none font-bold text-slate-900 bg-white shadow-sm"
                    />
                  </div>

                  {requiresKYCRuRu && (
                     <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex gap-3 text-sm font-semibold border border-red-200">
                       <Info size={20} className="shrink-0" />
                       Limite de transfert quotidienne dépassée ({currentLimitRuRu.toLocaleString()} RUB). {isKycExpert ? "Plafond maximum atteint." : "Passez au statut Expert pour augmenter votre limite."}
                     </div>
                  )}

                  {/* Delivery Note */}
                  <div className="flex items-center justify-center gap-2 py-3 bg-[#f7f3ff] rounded-2xl text-brand">
                    <Zap size={18} fill="currentColor" />
                    <span className="text-sm font-bold">Généralement livré en moins de 10 minutes</span>
                  </div>
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 6: // Dépôt + Preuve (Combined)
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper 
                title="Effectuer le paiement" 
                onBack={previousStep} 
                onNext={handleSubmit}
                nextLabel={isSubmitting ? "Traitement..." : "Continuer"}
                isValid={!!proofFile && !isSubmitting}
              >
                
                {/* Timer Alert */}
                <div className="bg-[#f7f3ff] rounded-[24px] p-5 border border-brand/10 mb-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand shrink-0">
                    <Info size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-brand font-bold text-sm leading-tight mb-1">
                      Effectuez le paiement sur l'un des numéros ci-dessous et envoyez la capture d'écran du reçu.
                    </p>
                    <p className="text-xs text-brand/70 font-semibold italic">Vous avez 20 minutes pour effectuer le paiement.</p>
                  </div>
                  <div className="flex items-center gap-2 text-brand font-black">
                    <Clock size={18} />
                    <span className={timerSeconds < 120 ? 'text-red-500' : ''}>{formatTimer(timerSeconds)}</span>
                  </div>
                </div>

                <p className="text-sm font-bold text-slate-900 mb-4">Choisissez un numéro pour effectuer le paiement</p>

                {/* Bank Options */}
                <div className="space-y-4 mb-8">
                  {banks.filter(b => b.type === 'card' || b.type === 'phone').map((b, i) => (
                    <div key={b.id} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
                      <div className="mb-3">
                        <span className="bg-brand text-white text-[10px] font-black px-3 py-1 rounded-full">Option {i+1}</span>
                      </div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
                            {b.logo ? (
                              <img src={b.logo} alt={b.name} className="w-10 h-10 rounded-full object-contain" />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs ${b.name?.includes('Sber') ? 'bg-emerald-600' : b.name?.includes('Tink') ? 'bg-amber-400' : 'bg-brand'}`}>
                                {b.name?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Numéro de compte</p>
                            <p className="text-lg font-black text-slate-900">{b.number}</p>
                            
                            <div className="mt-3">
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Banque</p>
                              <p className="text-sm font-bold text-slate-900">{b.name}</p>
                            </div>
                            
                            <div className="mt-3">
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Titulaire du compte</p>
                              <p className="text-sm font-bold text-slate-900">{b.holder || b.details || '—'}</p>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => { navigator.clipboard.writeText(b.number); toast.success('Copié !'); }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand/20 text-brand font-bold text-xs hover:bg-brand/5 transition-all shrink-0"
                        >
                          <Copy size={14} /> Copier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Security Note */}
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 mb-8 border border-slate-100">
                  <ShieldCheck className="text-brand shrink-0" size={20} />
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide leading-tight">
                    Ces numéros sont mis à jour quotidiennement pour votre sécurité. Utilisez uniquement les numéros affichés ici.
                  </p>
                </div>

                {/* Proof Section */}
                <div>
                  <p className="text-brand font-black text-sm mb-4">Après le paiement</p>
                  <div className="bg-slate-50 rounded-2xl p-4 flex items-start gap-4 mb-4">
                     <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-brand shrink-0">
                        <Upload size={20} />
                     </div>
                     <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Effectuez le paiement sur l'un des numéros ci-dessus, puis téléchargez la preuve (capture d'écran du reçu).
                     </p>
                  </div>
                  
                  <label className="block w-full cursor-pointer group">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      accept="image/*"
                    />
                    <div className={`w-full py-6 rounded-[24px] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${proofFile ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 hover:border-brand/40 hover:bg-brand/5'}`}>
                      {proofFile ? (
                        <>
                          <CheckCircle2 className="text-emerald-500" size={32} />
                          <p className="text-emerald-700 font-bold">{proofFile.name}</p>
                          <p className="text-xs text-emerald-600">Cliquer pour changer</p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 text-brand">
                             <CloudUpload size={28} />
                             <p className="font-black">Télécharger la preuve de paiement</p>
                          </div>
                          <p className="text-xs text-slate-400 font-medium">Formats acceptés : JPG, PNG • Taille max : 5 Mo</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      case 7: // Success
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-20 text-center">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8"><CheckCircle2 size={48} /></div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">C'est fait !</h2>
              <button onClick={() => { resetWizard(); navigate('/transactions'); }} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all">Voir mes transactions</button>
            </div>
          </Layout>
        );
      default: return null;
    }
  }

  return <Layout><div className="py-20 text-center">Redirection...</div></Layout>;
};

export default TransferWizardPage;
