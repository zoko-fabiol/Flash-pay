import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTransferWizard } from '../context/TransferWizardContext';
import { AmountSelectionStep } from './transfer/components/AmountSelectionStep';
import { BulkRecipientStep } from './transfer/components/BulkRecipientStep';
import { OperatorSelectionStep } from './transfer/components/OperatorSelectionStep';
import { StepWrapper } from './transfer/components/StepWrapper';
import { SummaryStep } from './transfer/components/SummaryStep';
import { PaymentStep } from './transfer/components/PaymentStep';
import { Layout } from '../components/Layout';
import { Loading } from '../components/UI';
import { ChevronLeft, ChevronRight, Globe, CreditCard, Smartphone, Upload, CheckCircle2, Banknote, Info, ArrowRight, Gift, User, Phone, BookUser, Copy, Clock, Zap, ShieldCheck, CloudUpload, Send, X, Pencil, Plus, Check } from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  Timestamp, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db, auth, calculateTransactionRecap, userService, contactService } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';
import { emailService } from '../services/emailService';
import { notificationService } from '../services/notificationService';

async function fileToBase64(file: File | Blob, maxWidth = 900, quality = 0.5): Promise<string> {
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

// Helper to get small flag image from flagcdn
const flagImageFor = (code?: string) => {
  if (!code) return undefined;
  return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
};



const TransferTypeStep = ({ updateTransferData, transferData, t, nextStep, previousStep }: any) => {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-[0.5mm]">
      <h2 className="text-2xl font-black text-[#1D1B20] tracking-tight mb-6">{t('choose_transfer_method')}</h2>

      <div className="grid gap-6">
        <button
          onClick={() => { updateTransferData({ isBulk: false }); nextStep(); }}
          className={`flex items-center gap-6 p-8 rounded-[32px] border-2 transition-all text-left ${!transferData.isBulk ? 'border-[#661489] bg-[#661489]/5 ring-4 ring-[#661489]/5' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
        >
          <div className={`p-5 rounded-[24px] ${!transferData.isBulk ? 'bg-[#661489] text-white' : 'bg-slate-100 text-[#661489]'}`}>
            <User size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">{t('single_recipient')}</h3>
            <p className="text-sm text-slate-500 font-medium">{t('send_to_one_person')}</p>
          </div>
        </button>

        <button
          onClick={() => { updateTransferData({ isBulk: true }); nextStep(); }}
          className={`flex items-center gap-6 p-8 rounded-[32px] border-2 transition-all text-left ${transferData.isBulk ? 'border-[#661489] bg-[#661489]/5 ring-4 ring-[#661489]/5' : 'border-slate-100 hover:border-slate-300 bg-white'}`}
        >
          <div className={`p-5 rounded-[24px] ${transferData.isBulk ? 'bg-[#661489] text-white' : 'bg-slate-100 text-[#661489]'}`}>
            <Globe size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">{t('bulk_recipients_list')}</h3>
            <p className="text-sm text-slate-500 font-medium">{t('send_to_multiple_people')}</p>
          </div>
        </button>
      </div>

      <div className="mt-12">
        <button onClick={previousStep} className="w-full px-8 py-5 rounded-full border-2 border-[#79747E] text-[#49454F] font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-3">
          <ChevronLeft size={24} /> {t('back')}
        </button>
      </div>
    </div>
  );
};



export const TransferWizardPage: React.FC = () => {
  const { currentStep, transferData, updateTransferData, nextStep, previousStep, resetWizard, setCurrentStep } = useTransferWizard();
  const { t, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [countries, setCountries] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState({ dailyLimitRUB: 150000, standardLimitRUB: 20000, expertLimitRUB: 150000, notificationEmails: [] as string[] });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [payWithBonus, setPayWithBonus] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(20 * 60); // 20 minutes

  const [savedContacts, setSavedContacts] = useState<any[]>([]);
  const [personalContacts, setPersonalContacts] = useState<any[]>([]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', operator: '' });
  const [contactTab, setContactTab] = useState<'recent' | 'personal'>('recent');

  const sortedCountries = useMemo(
    () => [...countries].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })),
    [countries]
  );

  const senderCountries = useMemo(() => {
    // On s'assure que la Russie est présente si elle n'est pas dans la collection Firestore
    const hasRussia = countries.some(c => c.code === 'RU');
    const list = hasRussia ? [...countries] : [...countries, { code: 'RU', name: 'Russie', currency: 'RUB' }];
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' }));
  }, [countries]);

  const recipientCountries = useMemo(() => {
    if (!transferData.originCountry) return [];
    
    const originCode = transferData.originCountry;
    const origin = senderCountries.find(c => c.code === originCode);
    
    let list = [];
    if (originCode === 'RU') {
      // La Russie peut envoyer vers tous les pays africains configurés
      list = countries.filter(c => c.code !== 'RU');
    } else {
      // Un pays africain envoie vers les destinations autorisées + la Russie
      const allowed = origin?.allowedDestinations || [];
      const canSendToRussia = origin?.canSendToRussia !== false;
      
      list = countries.filter(c => c.code !== originCode && allowed.includes(c.code));
      
      // Ajouter la Russie si elle est autorisée et pas déjà dans la liste
      if (canSendToRussia && !list.some(c => c.code === 'RU')) {
        const ruObj = countries.find(c => c.code === 'RU') || { code: 'RU', name: 'Russie', currency: 'RUB' };
        list.push(ruObj);
      }
    }

    // Tri : Russie en tête si l'envoyeur est africain, puis alphabétique
    return [...list].sort((a, b) => {
      if (originCode !== 'RU') {
        if (a.code === 'RU') return -1;
        if (b.code === 'RU') return 1;
      }
      return (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' });
    });
  }, [transferData.originCountry, countries, senderCountries]);

  const sortedBanks = useMemo(
    () => [...banks].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })),
    [banks]
  );

  const isPaymentStep = useMemo(
    () => (transferData.transferType === 'russia-africa' && currentStep === 6) ||
           (transferData.transferType === 'africa-russia' && currentStep === 5) ||
           (transferData.transferType === 'africa-africa' && currentStep === 8),
    [transferData.transferType, currentStep]
  );

  // Timer effect - countdown when on payment step
  useEffect(() => {
    if (!isPaymentStep) return;

    // Set initial time when entering payment step
    const startTime = Date.now();
    setTimerSeconds(20 * 60);

    // Start countdown interval
    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, (20 * 60) - elapsedSeconds);
      
      setTimerSeconds(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        toast.error(t('payment_timeout_msg'));
      }
    }, 500); // Update every 500ms for smooth display
    
    return () => clearInterval(interval);
  }, [isPaymentStep, t]);

  // Scroll to top on step change
  useEffect(() => {
    // Try to scroll the main layout container first (which has overflow-auto)
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      mainContainer.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [currentStep]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsubC = onSnapshot(collection(db, 'countries'), (s) => setCountries(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubB = onSnapshot(collection(db, 'banks'), (s) => setBanks(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubR = onSnapshot(collection(db, 'exchange_rates'), (s) => {
      const globalRates = s.docs.map(d => ({ id: d.id, ...d.data() }));
      // On fusionne avec les taux personnalisés
      onSnapshot(collection(db, 'custom_rates'), (s2) => {
        const customRates = s2.docs.map(d => ({ id: d.id, ...d.data() }));
        setRates([...globalRates, ...customRates]);
      });
    });
    const unsubCom = onSnapshot(collection(db, 'commissions'), (s) => setCommissions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubS = onSnapshot(collection(db, 'settings'), (s) => {
      if (!s.empty) {
        const data = s.docs[0].data();
        setSettings({
          dailyLimitRUB: data.dailyLimitRUB || 150000,
          standardLimitRUB: data.standardLimitRUB || 20000,
          expertLimitRUB: data.expertLimitRUB || 150000,
          notificationEmails: data.notificationEmails || []
        });
      }
    });
    setLoading(false);
    return () => { unsubC(); unsubB(); unsubR(); unsubCom(); unsubS(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const uid = user.id || auth.currentUser?.uid;
    if (!uid) return;

    const loadPersonalContacts = async () => {
      try {
        const contacts = await contactService.getUserContacts(uid);
        setPersonalContacts(contacts);
      } catch (err) {
        console.error('Failed to load personal contacts:', err);
      }
    };
    loadPersonalContacts();
  }, [user, isContactModalOpen]);

  useEffect(() => {
    if (!user) return;
    
    const uid = user.id || auth.currentUser?.uid;
    if (!uid) return;

    const qTransactions = query(
      collection(db, 'transactions'),
      where('userId', '==', uid),
      limit(100)
    );

    const unsub = onSnapshot(qTransactions, (snapshot) => {
      const contactsMap = new Map();
      
      // Sort in memory to avoid requiring a composite index in Firestore
      const sortedDocs = [...snapshot.docs].sort((a, b) => {
        const t1 = a.data().createdAt?.toMillis?.() || 0;
        const t2 = b.data().createdAt?.toMillis?.() || 0;
        return t2 - t1;
      });

      sortedDocs.forEach(doc => {
        const d = doc.data();
        
        // Helper to add to map if not present
        const addToMap = (name: string, phone: string, operator: string, country: string) => {
          const key = (name || '').toLowerCase().trim();
          if (key && !contactsMap.has(key)) {
            contactsMap.set(key, { id: Math.random().toString(), name, phone, operator, countryCode: country });
          }
        };

        // 1. Check main recipient
        if (d.recipientName) {
          addToMap(d.recipientName, d.recipientPhone || d.beneficiaryAccount, d.operator || d.recipientOperator, d.destinationCountry || d.toCountry);
        }

        // 2. Check bulk recipients if applicable
        if (d.isBulk && Array.isArray(d.bulkRecipients)) {
          d.bulkRecipients.forEach((r: any) => {
            if (r.name) {
              addToMap(r.name, r.phone, r.operator, d.destinationCountry);
            }
          });
        }
      });
      setSavedContacts(Array.from(contactsMap.values()));
    });
    return unsub;
  }, [user]);

  // Initialisation des valeurs par défaut pour éviter les problèmes de sélection directe
  useEffect(() => {
    if (!transferData.originCountry) {
      updateTransferData({
        originCountry: 'RU',
        originCurrency: 'RUB',
        transferType: 'russia-africa'
      });
    }
  }, [transferData.originCountry, updateTransferData]);

  // Initialisation automatique du destinataire par défaut
  useEffect(() => {
    if (transferData.originCountry && !transferData.destinationCountry && recipientCountries.length > 0) {
      const firstDest = recipientCountries[0];
      const type = transferData.originCountry === 'RU' ? 'russia-africa' : (firstDest.code === 'RU' ? 'africa-russia' : 'africa-africa');
      updateTransferData({
        destinationCountry: firstDest.code,
        currency: firstDest.currency,
        transferType: type
      });
    }
  }, [transferData.originCountry, transferData.destinationCountry, recipientCountries, updateTransferData]);

  const handleSelectContact = (contact: any) => {
    if (transferData.isBulk) {
       // Handled within BulkRecipientStep
       return;
    }
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
    } else if (transferData.transferType === 'africa-africa') {
      updateTransferData({
        recipientName: contact.name || contact.recipientName,
        recipientPhone: contact.phone || contact.recipientPhone,
        recipientOperator: contact.operator || contact.recipientOperator,
        destinationCountry: contact.countryCode || contact.destinationCountry
      });
    }
    setIsContactModalOpen(false);
    setIsAddingContact(false);
    toast.success(t('contact_selected'));
  };

  const handleAddManualContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast.error(t('fill_all_fields'));
      return;
    }

    const uid = user?.id || auth.currentUser?.uid;
    if (!uid) return;

    const t_toast = toast.loading(t('saving_contact'));
    try {
      await contactService.addContact(uid, {
        ...newContact,
        countryCode: transferData.destinationCountry || 'CM'
      });
      
      // Also update the current transfer data
      handleSelectContact({
        ...newContact,
        countryCode: transferData.destinationCountry || 'CM'
      });

      setIsAddingContact(false);
      setNewContact({ name: '', phone: '', operator: '' });
      toast.success(t('contact_saved'), { id: t_toast });
    } catch (err) {
      console.error(err);
      toast.error(t('save_failed'), { id: t_toast });
    }
  };

  const getCommission = (amount: number, type: string, destinationCountry?: string, operator?: string, currency?: string) => {
    if (!amount) return 0;
    
    // Find rules that match type and amount range
    const rules = commissions.filter(c => 
      (c.transferType === type || (type === 'africa-africa' && c.transferType === 'russia-russia')) && 
      (
        !currency || 
        c.currency === currency || 
        (type === 'africa-africa' && (currency === 'XAF' || currency === 'XOF') && (c.currency === 'XAF' || c.currency === 'XOF'))
      ) &&
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
    const t_toast = toast.loading(t('sending_transaction'));
    try {
      // 1. Handle Proof (Base64) or Bonus Payment
      let proofUrl = '';
      if (proofFile) {
        // If we have a file, it's always the proofUrl, regardless of bonus usage (Hybrid)
        proofUrl = await fileToBase64(proofFile);
      } else if (payWithBonus) {
        // Only set to PAID_WITH_BONUS if no proof was provided (meaning full bonus coverage)
        proofUrl = 'PAID_WITH_BONUS';
      } else {
        throw new Error(t('payment_proof_missing'));
      }

      // 2. Determine input and output currencies based on transfer type
      let inputCurrency = transferData.currency || 'RUB';
      let outputCurrency = transferData.currency || 'RUB';
      
      if (transferData.transferType === 'russia-africa') {
        inputCurrency = 'RUB';
        outputCurrency = transferData.currency || 'XAF';
      } else if (transferData.transferType === 'africa-russia') {
        inputCurrency = transferData.currency || 'XAF';
        outputCurrency = 'RUB';
      } else if (transferData.transferType === 'africa-africa') {
        inputCurrency = transferData.originCurrency || 'XAF';
        outputCurrency = transferData.currency || 'XAF';
      }

      // Calculate total amount if bulk
      const finalAmount = transferData.isBulk 
        ? (transferData.bulkRecipients?.reduce((acc, r) => acc + r.amount, 0) || 0)
        : (transferData.amount || 0);

      // 3. Calculate transaction recap
      const calculation = await calculateTransactionRecap({
        transferType: transferData.transferType || 'africa-africa',
        amount: finalAmount,
        inputCurrency,
        outputCurrency,
        recipientOperator: transferData.recipientOperator,
        recipientName: transferData.isBulk ? 'Multi-destinataires' : transferData.recipientName,
        recipientPhone: transferData.recipientPhone,
        destinationCountry: transferData.destinationCountry,
        narration: transferData.narration,
      });

      if (!calculation.isValid) {
        toast.error(t('calculation_error', { error: calculation.errors.join(', ') }), { id: t_toast });
        return;
      }

      // 4. Create transaction in Firestore
      const txDocRef = await addDoc(collection(db, 'transactions'), {
        ...transferData,
        userId: auth.currentUser?.uid,
        clientName: user?.nom || '',
        clientPhone: user?.tel || '',
        clientEmail: user?.email || auth.currentUser?.email || '',
        type: transferData.transferType,
        proofUrl,
        paymentMethod: payWithBonus ? 'bonus' : 'external',
        status: payWithBonus ? 'pending' : 'pending', // Both pending, but admin sees bonus
        isBulk: transferData.isBulk || false,
        bulkRecipients: transferData.isBulk ? transferData.bulkRecipients : null,
        // Currency fields
        currency: inputCurrency,
        destinationCurrency: outputCurrency,
        // Calculation snapshots
        exchangeRate: calculation.exchangeRate,
        exchangeRateTimestamp: calculation.exchangeRateTimestamp,
        fee: calculation.commissionAmount,
        commissionPercentage: calculation.commissionPercentage,
        receivedAmount: calculation.receivedAmount,
        // Additional fields
        amount: finalAmount,
        fromCountry: transferData.originCountry || 'RU',
        toCountry: transferData.destinationCountry || 'RU',
        operator: transferData.recipientOperator || '',
        createdAt: Timestamp.now(),
        statusHistory: [{
          status: 'pending',
          timestamp: Timestamp.now(),
          notes: transferData.isBulk ? t('bulk_order_initiated') : t('order_initiated_by_client')
        }],
        // Hybrid Payment Details
        payWithBonus,
        bonusUsed: 0, // Will be updated below
        paidByCash: calculation.totalToPay, // Default to full amount
      });

      // 4.0 Notify Admin of new transaction (Background)
      addDoc(collection(db, 'admin_notifications'), {
        title: finalAmount >= 100000 ? '⚠️ GROS TRANSFERT' : 'Nouveau transfert',
        body: `${finalAmount >= 100000 ? 'ALERTE : ' : ''}Un nouveau transfert de ${finalAmount} ${inputCurrency} a été initié par ${user?.nom || 'un client'}.`,
        type: 'transaction',
        priority: finalAmount >= 100000 ? 'high' : 'normal',
        read: false,
        createdAt: Timestamp.now(),
        link: `/admin/queue/${txDocRef.id}`
      }).catch(err => console.error('Failed to notify admin:', err));

      // 4.1 Trigger user notification (Background)
      notificationService.sendNotification({
        userId: auth.currentUser?.uid || '',
        title: t('transfer_initiated_title'),
        body: t('transfer_initiated_body', { 
          amount: finalAmount.toLocaleString(), 
          currency: inputCurrency, 
          recipient: transferData.isBulk ? t('multi_recipients') : transferData.recipientName 
        }),
        type: 'in_app',
        priority: 'normal',
        data: {
          transactionId: txDocRef.id,
          transferType: transferData.transferType,
          amount: finalAmount,
          currency: inputCurrency
        }
      }).catch(err => console.error('User notification failed:', err));

      toast.success(t('transfer_validated'), { id: t_toast });

      const recentContactPayload = {
        name: transferData.recipientName || '',
        phone: transferData.recipientPhone || transferData.beneficiaryAccount || '',
        operator: transferData.recipientOperator || transferData.selectedOperator || '',
        countryCode: transferData.destinationCountry || 'CM',
        transactionId: txDocRef.id,
      };

      if (recentContactPayload.name || recentContactPayload.phone) {
        setSavedContacts(prev => {
          const key = `${recentContactPayload.name}|${recentContactPayload.phone}`.toLowerCase().trim();
          const next = [
            { id: txDocRef.id, ...recentContactPayload, lastUsedAt: Timestamp.now() },
            ...prev.filter(contact => `${contact.name || contact.recipientName || ''}|${contact.phone || contact.recipientPhone || ''}`.toLowerCase().trim() !== key)
          ];
          return next;
        });

        contactService.touchRecentContact(user?.id || auth.currentUser?.uid || '', recentContactPayload)
          .catch(err => console.error('Failed to update recent contact:', err));
      }

      // 4.5 Deduct Bonus (RUB) and Points (Hybrid support)
      if (payWithBonus) {
        let rubNeeded = calculation.totalToPay;
        if (inputCurrency === 'XAF') {
          const rateObj = rates.find(r => r.from === 'XAF' && r.to === 'RUB');
          const rate = rateObj?.rate || 0.1385;
          rubNeeded = calculation.totalToPay * rate;
        }
        
        // 1. Use Referral Bonus (RUB) first
        const availableRUB = user?.solde_bonus || 0;
        const rubUsed = Math.min(availableRUB, rubNeeded);
        let rubRemaining = rubNeeded - rubUsed;
        
        // 2. Use Points if RUB not enough
        let pointsUsed = 0;
        let pointsDeductionInRUB = 0;
        if (rubRemaining > 0) {
           const availablePoints = user?.solde_points || 0;
           const pointsNeeded = Math.ceil(rubRemaining * 1000);
           pointsUsed = Math.min(availablePoints, pointsNeeded);
           pointsDeductionInRUB = pointsUsed / 1000;
           rubRemaining -= pointsDeductionInRUB;
        }

        const totalDeductionInRUB = rubUsed + pointsDeductionInRUB;
        
        // Calculate equivalent cash paid
        let cashPaidInInputCurrency = 0;
        if (rubRemaining > 0) {
           const rubToXafRate = 1 / (rates.find(r => r.from === 'XAF' && r.to === 'RUB')?.rate || 0.1385);
           const coverageInInputCurrency = inputCurrency === 'XAF' 
              ? (totalDeductionInRUB * rubToXafRate)
              : totalDeductionInRUB;
           cashPaidInInputCurrency = Math.max(0, calculation.totalToPay - coverageInInputCurrency);
        }

        await updateDoc(doc(db, 'transactions', txDocRef.id), {
          bonusUsed: rubUsed,
          pointsUsed: pointsUsed,
          totalDiscountRUB: totalDeductionInRUB,
          paidByCash: cashPaidInInputCurrency,
          isHybrid: (rubUsed > 0 || pointsUsed > 0) && cashPaidInInputCurrency > 0
        });
        
        const deductionPromises = [];
        if (rubUsed > 0) {
          deductionPromises.push(userService.deductBonus(user?.id || auth.currentUser?.uid || '', rubUsed, t('transfer_to_recipient', { 
            recipient: (transferData.recipientName || t('recipient'))
          })));
        }
        if (pointsUsed > 0) {
          deductionPromises.push(userService.deductPoints(user?.id || auth.currentUser?.uid || '', pointsUsed, t('transfer_to_recipient', { 
            recipient: (transferData.recipientName || t('recipient'))
          })));
        }
        await Promise.all(deductionPromises);
      }

      // 5. Notify Admins via Google Apps Script (Background)
      if (settings.notificationEmails && settings.notificationEmails.length > 0) {
        try {
          const emailBody = emailService.getAdminTransferTemplate({
            txId: 'TX-' + Date.now().toString().slice(-6),
            amount: transferData.amount,
            currency: inputCurrency,
            clientName: user?.nom || 'Client',
            receiverName: transferData.recipientName || 'Bénéficiaire',
            country: transferData.destinationCountry || 'N/A',
          });

          settings.notificationEmails.forEach(email => {
            emailService.sendEmail(email, 'Nouveau Transfert Flash Pay', emailBody).catch(console.error);
          });
        } catch (mailErr) {
          console.error('Failed to prepare admin email:', mailErr);
        }
      }

      nextStep();
    } catch (e: any) {
      console.error('Erreur détaillée:', e);
      toast.error(t('validation_failed', { error: e.message || 'Erreur inconnue' }), { id: t_toast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Scénarios Logic ---

  if (loading) return <Loading fullScreen />;

  // Étape 1 : Sélection Montant + Pays (Unifiée)
  if (currentStep === 1) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto py-12 px-4">
          <AmountSelectionStep
            transferData={transferData}
            updateTransferData={updateTransferData}
            rates={rates}
            getCommission={getCommission}
            t={t}
            formatNumber={formatNumber}
            nextStep={nextStep}
            previousStep={() => navigate('/dashboard')}
            settings={settings}
            isKycExpert={isKycExpert}
            senderCountries={senderCountries}
            recipientCountries={recipientCountries}
          />
        </div>
      </Layout>
    );
  }

  const { transferType } = transferData;

  // --- SCENARIO: RUSSIE -> AFRIQUE ---
  if (transferType === 'russia-africa') {
    switch (currentStep) {
      case 2: // Nouveau: Choix Type de Transfert (Unique vs Plusieurs)
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <TransferTypeStep
                transferData={transferData}
                updateTransferData={updateTransferData}
                t={t}
                nextStep={nextStep}
                previousStep={previousStep}
              />
            </div>
          </Layout>
        );

      case 3: { // Recipient Info (SI UNIQUE) ou Bulk
        const handleNextFromRecipients = () => {
          const selectedCountry = countries.find(c => c.code === transferData.destinationCountry);
          const hasOperators = (selectedCountry?.operators?.length || 0) > 0;
          const needsOperator = (transferData.isBulk 
            ? transferData.bulkRecipients?.some((r: any) => !r.operator)
            : !transferData.recipientOperator) && hasOperators;
          
          if (needsOperator) {
            setCurrentStep(4);
          } else {
            setCurrentStep(5); // Skip Operator Selection, go to Summary
          }
        };

        if (transferData.isBulk) {
           return (
            <Layout>
              <BulkRecipientStep 
                countries={countries} 
                t={t} 
                previousStep={previousStep} 
                nextStep={handleNextFromRecipients} 
                updateTransferData={updateTransferData} 
                transferData={transferData} 
                formatNumber={formatNumber} 
                savedContacts={savedContacts}
              />
            </Layout>
           );
        }
        const selectedCountry = countries.find(c => c.code === transferData.destinationCountry);
        const isNameValid = (transferData.recipientName?.length || 0) > 3;
        const phoneDigitsOnly = (transferData.recipientPhone || '').replace(/\D/g, '');
        const isPhoneValid = phoneDigitsOnly.length >= 8;
        const isRecipientValid = isNameValid && isPhoneValid;

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper title={t('recipient_info')} onBack={previousStep} onNext={handleNextFromRecipients} isValid={isRecipientValid}>
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.06)] p-6 sm:p-10 space-y-8">
                  {/* Name */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                        <User size={20} />
                      </div>
                      <span className="font-black text-slate-900 uppercase text-xs tracking-widest">{t('recipient_name')}</span>
                    </div>
                    <input
                      type="text"
                      value={transferData.recipientName || ''}
                      onChange={e => updateTransferData({ recipientName: e.target.value })}
                      placeholder={t('recipient_name_placeholder')}
                      className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-brand outline-none text-slate-900 font-bold bg-slate-50 transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                        <Phone size={20} />
                      </div>
                      <span className="font-black text-slate-900 uppercase text-xs tracking-widest">{t('mobile_number')}</span>
                    </div>
                    <div className="flex border-2 border-slate-100 rounded-2xl overflow-hidden focus-within:border-brand bg-slate-50 transition-all">
                      <div className="flex items-center gap-2 px-4 border-r border-slate-200 bg-white font-black text-slate-900">
                        <img src={`https://flagcdn.com/w40/${(transferData.destinationCountry || 'cm').toLowerCase()}.png`} className="w-5 h-5 rounded-full object-cover" alt="" />
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
                        placeholder={t('enter_mobile_number')}
                        className="flex-1 p-5 outline-none text-slate-900 font-bold bg-transparent"
                      />
                    </div>
                    {transferData.recipientOperator && (
                      <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[10px] font-black uppercase tracking-wider">{t('operator')}: {transferData.recipientOperator}</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setIsContactModalOpen(true)}
                    className="w-full p-5 rounded-2xl border-2 border-slate-100 text-slate-500 font-black flex items-center justify-center gap-3 hover:bg-slate-50 transition-all mt-6"
                  >
                    <BookUser size={20} /> {t('choose_recent_recipients')}
                  </button>
                </div>

                {isContactModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <BookUser className="text-[#661489]" size={24} />
                          <h3 className="text-xl font-black text-slate-900">{t('my_contacts')}</h3>
                        </div>
                        <button onClick={() => { setIsContactModalOpen(false); setIsAddingContact(false); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                      </div>

                      {/* Tabs */}
                      {!isAddingContact && (
                        <div className="flex p-1 bg-slate-50 mx-6 mt-6 rounded-2xl border border-slate-100 shrink-0">
                          <button 
                            onClick={() => setContactTab('recent')}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${contactTab === 'recent' ? 'bg-white shadow-sm text-[#661489]' : 'text-slate-400'}`}
                          >
                            {t('recent')}
                          </button>
                          <button 
                            onClick={() => setContactTab('personal')}
                            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${contactTab === 'personal' ? 'bg-white shadow-sm text-[#661489]' : 'text-slate-400'}`}
                          >
                            {t('saved')}
                          </button>
                        </div>
                      )}

                      <div className="overflow-y-auto p-6 space-y-4">
                        {isAddingContact ? (
                          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('recipient_name')}</label>
                              <input 
                                type="text"
                                value={newContact.name}
                                onChange={e => setNewContact({...newContact, name: e.target.value})}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-[#661489] outline-none font-bold text-slate-900 bg-slate-50"
                                placeholder={t('recipient_name_placeholder')}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('phone_number')}</label>
                              <input 
                                type="tel"
                                value={newContact.phone}
                                onChange={e => {
                                  const val = e.target.value;
                                  const op = selectedCountry?.operators?.find((o: any) => o.prefixes?.some((p: string) => val.startsWith(p)));
                                  setNewContact({...newContact, phone: val, operator: op?.name || ''});
                                }}
                                className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-[#661489] outline-none font-bold text-slate-900 bg-slate-50"
                                placeholder="+237 ..."
                              />
                            </div>
                            {newContact.operator && (
                              <div className="mt-1 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-black uppercase">{newContact.operator}</span>
                              </div>
                            )}
                            <div className="flex gap-3 pt-4">
                              <button onClick={() => setIsAddingContact(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest">
                                {t('cancel')}
                              </button>
                              <button onClick={handleAddManualContact} className="flex-1 py-4 rounded-2xl bg-[#661489] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#661489]/20">
                                {t('save_and_select')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Action Button */}
                            <button 
                              onClick={() => setIsAddingContact(true)}
                              className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold flex items-center justify-center gap-2 hover:border-[#661489]/30 hover:text-[#661489] hover:bg-[#661489]/5 transition-all mb-4"
                            >
                              <Plus size={18} /> {t('add_new_contact')}
                            </button>

                            {(() => {
                              const list = contactTab === 'recent' ? savedContacts : personalContacts;
                              const allowedPrefixes = selectedCountry?.operators?.flatMap((o: any) => o.prefixes || []) || [];
                              const filtered = list.filter(c => {
                                const phone = (c.phone || c.recipientPhone || '').toString();
                                // Filter by country prefix if in recent, or by explicit countryCode in personal
                                if (contactTab === 'recent') {
                                  return allowedPrefixes.some((p: string) => phone.startsWith(p));
                                }
                                return c.countryCode === transferData.destinationCountry;
                              });

                              if (filtered.length === 0) {
                                return (
                                  <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                      <BookUser className="text-slate-200" size={40} />
                                    </div>
                                    <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest">{t('no_contacts_found')}</p>
                                  </div>
                                );
                              }

                              return filtered.map(contact => (
                                <button 
                                  key={contact.id} 
                                  onClick={() => handleSelectContact(contact)}
                                  className="w-full p-4 rounded-2xl border border-slate-100 hover:border-[#661489] hover:bg-[#661489]/5 flex items-center gap-4 transition-all text-left group"
                                >
                                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-[#661489]/10 group-hover:text-[#661489] transition-colors font-bold text-lg">
                                    {(contact.name || contact.recipientName || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-900 truncate">{contact.name || contact.recipientName}</p>
                                    <p className="text-xs text-slate-500 font-bold">{contact.phone || contact.beneficiaryAccount || contact.recipientPhone}</p>
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#661489] group-hover:text-white transition-all">
                                    <ChevronRight size={18} />
                                  </div>
                                </button>
                              ));
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </StepWrapper>
            </div>
          </Layout>
        );
      }

      case 4: // Nouveau: Sélection Manuelle d'Opérateur
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <OperatorSelectionStep
                transferData={transferData}
                updateTransferData={updateTransferData}
                countries={countries}
                t={t}
                nextStep={nextStep}
                previousStep={previousStep}
              />
            </div>
          </Layout>
        );

      case 5: { // Verification (Summary)
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <SummaryStep
                transferData={transferData}
                updateTransferData={updateTransferData}
                rates={rates}
                getCommission={getCommission}
                t={t}
                formatNumber={formatNumber}
                nextStep={nextStep}
                previousStep={() => {
                  const currentSelectedCountry = countries.find(c => c.code === transferData.destinationCountry);
                  const hasOperators = (currentSelectedCountry?.operators?.length || 0) > 0;
                  if (!transferData.recipientOperator && hasOperators) {
                    setCurrentStep(4);
                  } else {
                    setCurrentStep(3);
                  }
                }}
                user={user}
              />
            </div>
          </Layout>
        );
      }

      case 6: { // Payment
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <PaymentStep
                transferData={transferData}
                updateTransferData={updateTransferData}
                t={t}
                formatNumber={formatNumber}
                previousStep={previousStep}
                handleSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                banks={banks}
                rates={rates}
                getCommission={getCommission}
                user={user}
                payWithBonus={payWithBonus}
                setPayWithBonus={setPayWithBonus}
                proofFile={proofFile}
                setProofFile={setProofFile}
                timerSeconds={timerSeconds}
                formatTimer={formatTimer}
                countries={countries}
              />
            </div>
          </Layout>
        );
      }

      case 7: { // Success
        const successBaseAmount = transferData.isBulk 
          ? (transferData.bulkRecipients?.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0) || 0)
          : (transferData.amount || 0);

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-8 pt-[0.5mm] px-4 flex flex-col items-center">
              {/* Airplane Illustration Area */}
              <div className="relative w-full h-48 mb-8 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent rounded-[40px]" />
                <div className="relative animate-bounce duration-[3000ms]">
                   <div className="relative z-10 w-24 h-24 bg-brand text-white rounded-[24px] flex items-center justify-center shadow-2xl rotate-12">
                     <Send size={40} className="-rotate-12" />
                   </div>
                   {/* Speed Lines */}
                   <div className="absolute top-1/2 right-full mr-4 w-12 h-1 bg-brand/20 rounded-full" />
                   <div className="absolute top-1/3 right-full mr-8 w-8 h-1 bg-brand/10 rounded-full" />
                   <div className="absolute bottom-1/3 right-full mr-6 w-10 h-1 bg-brand/15 rounded-full" />
                </div>
              </div>

              {/* Success Badge */}
              <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-6 border-2 border-brand/20">
                <Check size={32} strokeWidth={3} />
              </div>

              <h2 className="text-3xl font-black text-slate-900 mb-2">{t('payment_initiated')}</h2>
              <p className="text-slate-500 font-medium text-center mb-8">
                {t('payment_initiated_msg', { amount: successBaseAmount.toLocaleString(), currency: 'RUB' })}
              </p>

              {/* Status Banner */}
              <div className="w-full bg-brand/5 border border-brand/10 rounded-[28px] p-6 mb-10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand shrink-0 shadow-sm">
                  <Clock size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-brand uppercase tracking-wider">{t('payment_in_progress')}</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{t('payment_notification_msg')}</p>
                </div>
              </div>
              
              <div className="w-full space-y-4">
                <button 
                  onClick={() => { resetWizard(); navigate('/transactions'); }}
                  className="w-full py-5 bg-brand text-white font-black rounded-[24px] shadow-xl shadow-brand/20 hover:bg-brand/90 transition-all flex items-center justify-center gap-3"
                >
                  {t('view_transaction')}
                </button>
                <button 
                  onClick={() => { resetWizard(); navigate('/'); }}
                  className="w-full py-5 bg-white text-brand font-black rounded-[24px] border-2 border-brand/10 hover:bg-brand/5 transition-all flex items-center justify-center"
                >
                  {t('back_to_home')}
                </button>
              </div>
            </div>
          </Layout>
        );
      }
      default: return null;
    }
  }

  // --- SCENARIO: AFRIQUE -> RUSSIE ---
  if (transferType === 'africa-russia') {
    switch (currentStep) {
      case 2: // Beneficiary Info (Combined)
        const isNameValidAfRu = (transferData.recipientName?.length || 0) > 2;
        const cleanBeneficiaryAccount = (transferData.beneficiaryAccount || '').replace(/\D/g, '');
        const isAccountValidAfRu = cleanBeneficiaryAccount.length >= 10;
        const isStep2ValidAfRu = isNameValidAfRu && isAccountValidAfRu;

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper title={t('beneficiary_info_title')} onBack={previousStep} onNext={nextStep} isValid={isStep2ValidAfRu}>
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.06)] p-6 sm:p-10 space-y-8">
                  {/* Name */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                        <User size={20} />
                      </div>
                      <span className="font-black text-slate-900 uppercase text-xs tracking-widest">{t('beneficiary_label')}</span>
                    </div>
                    <input
                      type="text"
                      value={transferData.recipientName || ''}
                      onChange={e => updateTransferData({ recipientName: e.target.value })}
                      placeholder={t('beneficiary_name_example')}
                      className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-brand outline-none text-slate-900 font-bold bg-slate-50 transition-all"
                    />
                  </div>

                  {/* Account */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                        <CreditCard size={20} />
                      </div>
                      <span className="font-black text-slate-900 uppercase text-xs tracking-widest">{t('account_sbp_label')}</span>
                    </div>
                    <input
                      type="text"
                      value={transferData.beneficiaryAccount || ''}
                      onChange={e => updateTransferData({ beneficiaryAccount: e.target.value })}
                      placeholder="+7 900 XXX XXXX"
                      className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-brand outline-none text-slate-900 font-bold bg-slate-50 transition-all"
                    />
                  </div>

                  <button 
                    onClick={() => setIsContactModalOpen(true)}
                    className="w-full p-4 rounded-2xl border-2 border-brand/20 text-brand font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-brand/5 transition-all"
                  >
                    <BookUser size={18} /> {t('choose_saved_contact')}
                  </button>
                </div>

                {isContactModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900">{t('my_contacts')}</h3>
                        <button onClick={() => setIsContactModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                        {(() => {
                          const filtered = savedContacts.filter(c => {
                            const phone = (c.phone || c.beneficiaryAccount || '').toString();
                            return phone.startsWith('+7') || phone.startsWith('7') || phone.startsWith('8') || phone.startsWith('9');
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="text-center py-12">
                                <BookUser className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-slate-500 font-medium">{t('no_saved_contacts')}</p>
                              </div>
                            );
                          }

                          return filtered.map(contact => (
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
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </StepWrapper>
            </div>
          </Layout>
        );

      case 3: { // Choix opérateur dépôt
        const sourceCountry = countries.find(c => c.code === transferData.originCountry);
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper title={t('deposit_method')} description={t('deposit_method_desc')} onBack={previousStep} onNext={nextStep} isValid={!!transferData.selectedOperator}>
                <div className="grid gap-3">
                  {sourceCountry?.operators?.map((op: any) => (
                    <button
                      key={op.name}
                      onClick={() => updateTransferData({ selectedOperator: op.name })}
                      className={`p-6 rounded-[24px] border-2 transition-all flex items-center justify-between ${transferData.selectedOperator === op.name ? 'border-brand bg-brand/5' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                          {op.logo ? (
                            <img src={op.logo} alt={op.name} className="w-full h-full object-contain p-1.5" />
                          ) : (
                            <span className="text-brand font-black text-sm">{op.name?.charAt(0)?.toUpperCase()}</span>
                          )}
                        </div>
                        <span className="font-black text-slate-900">{op.name}</span>
                      </div>
                      {transferData.selectedOperator === op.name && <CheckCircle2 className="text-brand" fill="currentColor" />}
                    </button>
                  ))}
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      }
      case 4: { // Verification (Summary)
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <SummaryStep
                transferData={transferData}
                updateTransferData={updateTransferData}
                rates={rates}
                getCommission={getCommission}
                t={t}
                formatNumber={formatNumber}
                nextStep={nextStep}
                previousStep={previousStep}
                user={user}
              />
            </div>
          </Layout>
        );
      }

      case 5: { // Payment
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <PaymentStep
                transferData={transferData}
                updateTransferData={updateTransferData}
                t={t}
                formatNumber={formatNumber}
                previousStep={previousStep}
                handleSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                banks={banks}
                rates={rates}
                getCommission={getCommission}
                user={user}
                payWithBonus={payWithBonus}
                setPayWithBonus={setPayWithBonus}
                proofFile={proofFile}
                setProofFile={setProofFile}
                timerSeconds={timerSeconds}
                formatTimer={formatTimer}
                countries={countries}
              />
            </div>
          </Layout>
        );
      }
      case 6: { // Success
        const successBaseAmount = transferData.amount || 0;

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-8 pt-[0.5mm] px-4 flex flex-col items-center">
              {/* Airplane Illustration Area */}
              <div className="relative w-full h-48 mb-8 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent rounded-[40px]" />
                <div className="relative animate-bounce duration-[3000ms]">
                   <div className="relative z-10 w-24 h-24 bg-brand text-white rounded-[24px] flex items-center justify-center shadow-2xl rotate-12">
                     <Send size={40} className="-rotate-12" />
                   </div>
                   {/* Speed Lines */}
                   <div className="absolute top-1/2 right-full mr-4 w-12 h-1 bg-brand/20 rounded-full" />
                   <div className="absolute top-1/3 right-full mr-8 w-8 h-1 bg-brand/10 rounded-full" />
                   <div className="absolute bottom-1/3 right-full mr-6 w-10 h-1 bg-brand/15 rounded-full" />
                </div>
              </div>

              {/* Success Badge */}
              <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-6 border-2 border-brand/20">
                <Check size={32} strokeWidth={3} />
              </div>

              <h2 className="text-3xl font-black text-slate-900 mb-2">{t('payment_initiated')}</h2>
              <p className="text-slate-500 font-medium text-center mb-8">
                {t('payment_initiated_msg', { amount: successBaseAmount.toLocaleString(), currency: 'XAF' })}
              </p>

              {/* Status Banner */}
              <div className="w-full bg-brand/5 border border-brand/10 rounded-[28px] p-6 mb-10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand shrink-0 shadow-sm">
                  <Clock size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-brand uppercase tracking-wider">{t('payment_in_progress')}</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{t('payment_notification_msg')}</p>
                </div>
              </div>
              
              <div className="w-full space-y-4">
                <button 
                  onClick={() => { resetWizard(); navigate('/transactions'); }}
                  className="w-full py-5 bg-brand text-white font-black rounded-[24px] shadow-xl shadow-brand/20 hover:bg-brand/90 transition-all flex items-center justify-center gap-3"
                >
                  {t('view_transaction')}
                </button>
                <button 
                  onClick={() => { resetWizard(); navigate('/'); }}
                  className="w-full py-5 bg-white text-brand font-black rounded-[24px] border-2 border-brand/10 hover:bg-brand/5 transition-all flex items-center justify-center"
                >
                  {t('back_to_home')}
                </button>
              </div>
            </div>
          </Layout>
        );
      }
      default: return null;
    }
  }

  // --- SCENARIO: AFRIQUE -> AFRIQUE ---
  if (transferType === 'africa-africa') {
    switch (currentStep) {
      case 2: { // Recipient Info
        const destCountry = countries.find(c => c.code === transferData.destinationCountry);
        const isNameValid = (transferData.recipientName?.length || 0) > 3;
        const phoneDigitsOnly = (transferData.recipientPhone || '').replace(/\D/g, '');
        const isPhoneValid = phoneDigitsOnly.length >= 8;
        const isRecipientValid = isNameValid && isPhoneValid;

        const handleNextFromRecipientAfrica = () => {
          const hasDestOperators = (destCountry?.operators?.length || 0) > 0;
          const needsRecipientOperator = !transferData.recipientOperator && hasDestOperators;
          
          if (needsRecipientOperator) {
            setCurrentStep(4); // Manual Recipient Operator Selection
          } else {
            setCurrentStep(3); // Deposit Method (Sender Operator)
          }
        };

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper title={t('recipient_info')} onBack={previousStep} onNext={handleNextFromRecipientAfrica} isValid={isRecipientValid}>
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.06)] p-6 sm:p-10 space-y-8">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                        <User size={20} />
                      </div>
                      <span className="font-black text-slate-900 uppercase text-xs tracking-widest">{t('recipient_name')}</span>
                    </div>
                    <input
                      type="text"
                      value={transferData.recipientName || ''}
                      onChange={e => updateTransferData({ recipientName: e.target.value })}
                      placeholder={t('recipient_name_placeholder')}
                      className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-brand outline-none text-slate-900 font-bold bg-slate-50 transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
                        <Phone size={20} />
                      </div>
                      <span className="font-black text-slate-900 uppercase text-xs tracking-widest">{t('mobile_number')}</span>
                    </div>
                    <div className="flex border-2 border-slate-100 rounded-2xl overflow-hidden focus-within:border-brand bg-slate-50 transition-all">
                      <div className="flex items-center gap-2 px-4 border-r border-slate-200 bg-white font-black text-slate-900">
                        <img src={`https://flagcdn.com/w40/${(transferData.destinationCountry || 'cm').toLowerCase()}.png`} className="w-5 h-5 rounded-full object-cover" alt="" />
                        <span>{destCountry?.dialCode || '+237'}</span>
                      </div>
                      <input
                        type="tel"
                        value={transferData.recipientPhone || ''}
                        onChange={e => {
                          const val = e.target.value;
                          const op = destCountry?.operators?.find((o: any) => o.prefixes?.some((p: string) => val.startsWith(p)));
                          updateTransferData({ recipientPhone: val, recipientOperator: op?.name || '' });
                        }}
                        placeholder={t('enter_mobile_number')}
                        className="flex-1 p-5 outline-none text-slate-900 font-bold bg-transparent"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsContactModalOpen(true)}
                    className="w-full p-5 rounded-2xl border-2 border-slate-100 text-slate-500 font-black flex items-center justify-center gap-3 hover:bg-slate-50 transition-all mt-6"
                  >
                    <BookUser size={20} /> {t('choose_recent_recipients')}
                  </button>
                </div>

                {isContactModalOpen && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-xl font-black text-slate-900">{t('recent_recipients')}</h3>
                        <button onClick={() => setIsContactModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
                      </div>
                      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                        {(() => {
                          const allowedPrefixes = destCountry?.operators?.flatMap((o: any) => o.prefixes || []) || [];
                          const filtered = savedContacts.filter(c => {
                            const phone = (c.phone || c.recipientPhone || '').toString();
                            return allowedPrefixes.some((p: string) => phone.startsWith(p));
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="text-center py-12">
                                <BookUser className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-slate-500 font-medium">{t('no_recent_recipients')}</p>
                              </div>
                            );
                          }

                          return filtered.map(contact => (
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
                              <ArrowRight size={16} className="text-slate-300 group-hover:text-brand group-hover:translate-x-1 transition-all" />
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </StepWrapper>
            </div>
          </Layout>
        );
      }

      case 3: { // Choix opérateur dépôt (Paiement FROM)
        const sourceCountry = countries.find(c => c.code === transferData.originCountry);
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <StepWrapper 
                title={t('deposit_method') || 'Méthode de dépôt'} 
                description={t('deposit_method_desc') || 'Choisissez l\'opérateur avec lequel vous allez payer.'} 
                onBack={previousStep} 
                onNext={nextStep} 
                isValid={!!transferData.selectedOperator}
              >
                <div className="grid gap-4">
                  {sourceCountry?.operators?.map((op: any) => (
                    <button
                      key={op.name}
                      onClick={() => updateTransferData({ selectedOperator: op.name })}
                      className={`p-6 rounded-[32px] border-2 transition-all flex items-center justify-between ${transferData.selectedOperator === op.name ? 'border-brand bg-brand/5 ring-4 ring-brand/5' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                          {op.logo ? (
                            <img src={op.logo} alt={op.name} className="w-full h-full object-contain p-2" />
                          ) : (
                            <Smartphone className="text-slate-300" />
                          )}
                        </div>
                        <span className="font-black text-slate-900 text-lg">{op.name}</span>
                      </div>
                      {transferData.selectedOperator === op.name && (
                        <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/20">
                          <Check size={20} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </StepWrapper>
            </div>
          </Layout>
        );
      }

      case 7: { // Verification (Summary)
        const handleBackFromSummaryAfrica = () => {
          setCurrentStep(6);
        };

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <SummaryStep
                transferData={transferData}
                updateTransferData={updateTransferData}
                rates={rates}
                getCommission={getCommission}
                t={t}
                formatNumber={formatNumber}
                nextStep={nextStep}
                previousStep={handleBackFromSummaryAfrica}
                user={user}
              />
            </div>
          </Layout>
        );
      }

      case 8: { // Payment
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <PaymentStep
                transferData={transferData}
                updateTransferData={updateTransferData}
                t={t}
                formatNumber={formatNumber}
                previousStep={previousStep}
                handleSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                banks={banks}
                rates={rates}
                getCommission={getCommission}
                user={user}
                payWithBonus={payWithBonus}
                setPayWithBonus={setPayWithBonus}
                proofFile={proofFile}
                setProofFile={setProofFile}
                timerSeconds={timerSeconds}
                formatTimer={formatTimer}
                countries={countries}
              />
            </div>
          </Layout>
        );
      }

      case 9: { // Success
        const successBaseAmount = transferData.isBulk 
          ? (transferData.bulkRecipients?.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0) || 0)
          : (transferData.amount || 0);
        const successCurrency = transferData.transferType === 'africa-russia' ? 'XAF' : (transferData.originCurrency || 'XAF');

        return (
          <Layout>
            <div className="max-w-xl mx-auto py-8 pt-[0.5mm] px-4 flex flex-col items-center">
              {/* Airplane Illustration Area */}
              <div className="relative w-full h-48 mb-8 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-brand/5 to-transparent rounded-[40px]" />
                <div className="relative animate-bounce duration-[3000ms]">
                   <div className="relative z-10 w-24 h-24 bg-brand text-white rounded-[24px] flex items-center justify-center shadow-2xl rotate-12">
                     <Send size={40} className="-rotate-12" />
                   </div>
                   {/* Speed Lines */}
                   <div className="absolute top-1/2 right-full mr-4 w-12 h-1 bg-brand/20 rounded-full" />
                   <div className="absolute top-1/3 right-full mr-8 w-8 h-1 bg-brand/10 rounded-full" />
                   <div className="absolute bottom-1/3 right-full mr-6 w-10 h-1 bg-brand/15 rounded-full" />
                </div>
              </div>

              {/* Success Badge */}
              <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-6 border-2 border-brand/20">
                <Check size={32} strokeWidth={3} />
              </div>

              <h2 className="text-3xl font-black text-slate-900 mb-2">{t('payment_initiated')}</h2>
              <p className="text-slate-500 font-medium text-center mb-8">
                {t('payment_initiated_msg', { amount: successBaseAmount.toLocaleString(), currency: successCurrency })}
              </p>

              {/* Status Banner */}
              <div className="w-full bg-brand/5 border border-brand/10 rounded-[28px] p-6 mb-10 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand shrink-0 shadow-sm">
                  <Clock size={20} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-brand uppercase tracking-wider">{t('payment_in_progress')}</p>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{t('payment_notification_msg')}</p>
                </div>
              </div>
              
              <div className="w-full space-y-4">
                <button 
                  onClick={() => { resetWizard(); navigate('/transactions'); }}
                  className="w-full py-5 bg-brand text-white font-black rounded-[24px] shadow-xl shadow-brand/20 hover:bg-brand/90 transition-all flex items-center justify-center gap-3"
                >
                  {t('view_transaction')}
                </button>
                <button 
                  onClick={() => { resetWizard(); navigate('/'); }}
                  className="w-full py-5 bg-white text-brand font-black rounded-[24px] border-2 border-brand/10 hover:bg-brand/5 transition-all flex items-center justify-center"
                >
                  {t('back_to_home')}
                </button>
              </div>
            </div>
          </Layout>
        );
      }

      case 4: { // Manual Recipient Operator Selection (Afrique-Afrique)
        const destCountry = countries.find(c => c.code === transferData.destinationCountry);
        return (
          <Layout>
            <div className="max-w-xl mx-auto py-12 px-4">
              <OperatorSelectionStep
                transferData={transferData}
                updateTransferData={updateTransferData}
                countries={countries}
                t={t}
                nextStep={() => setCurrentStep(3)}
                previousStep={() => setCurrentStep(2)}
              />
            </div>
          </Layout>
        );
      }

      default: return null;
    }
  }

  return <Layout><div className="py-20 text-center">Redirection...</div></Layout>;
};

export default TransferWizardPage;

