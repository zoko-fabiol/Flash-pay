import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addDoc, collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Copy, Globe, MapPinned, Paperclip, Send, ShieldCheck, Smartphone, Upload, X } from 'lucide-react';
import { useTransferWizard } from '../context/TransferWizardContext';
import { Layout } from '../components/Layout';
import { auth, db, calculateTransactionRecap } from '../services/firebase';

type CountryRecord = {
  id: string;
  name: string;
  code?: string;
  dialCode?: string;
  currency?: string;
  flag?: string;
  emoji?: string;
  operators?: Array<{ name: string; logo?: string; prefixes?: string[]; depositNumber?: string; depositHolder?: string }>;
};

type RateRecord = {
  id: string;
  from: string;
  to: string;
  rate: number;
};

type BankRecord = {
  id: string;
  name: string;
  number: string;
  details?: string;
  logo?: string;
};

type BankAccountView = {
  title: string;
  name: string;
  number: string;
  holder: string;
  logo?: string;
};

async function fileToBase64(file: File | Blob, maxWidth = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const blob = file instanceof File ? file : new File([file], 'image.jpg', { type: 'image/jpeg' });

    reader.readAsDataURL(blob);
    reader.onload = (event) => {
      const image = new Image();
      image.src = event.target?.result as string;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        let width = image.width;
        let height = image.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Impossible de préparer l’image.'));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// Prefer flag images from flagcdn when country code is available.
const flagImageFor = (code?: string) => {
  if (!code) return undefined;
  return `https://flagcdn.com/w20/${code.toLowerCase()}.png`;
};

const bankFallbacks = [
  {
    name: 'Sberbank',
    number: '+7 926 123 45 67',
    holder: 'Ivan Petrovich Smirnov',
  },
  {
    name: 'Tinkoff',
    number: '+7 985 765 43 21',
    holder: 'Sergey Aleksandrovich Volkov',
  },
];

const TransferJourneyPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentStep, transferData, updateTransferData, nextStep, previousStep, resetWizard } = useTransferWizard();
  const { user } = useAuth();

  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [rates, setRates] = useState<RateRecord[]>([]);
  const [banks, setBanks] = useState<BankRecord[]>([]);
  const [countryQuery, setCountryQuery] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTransactionId, setCreatedTransactionId] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);

  const sortedCountries = useMemo(
    () => [...countries].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })),
    [countries]
  );

  const sortedBanks = useMemo(
    () => [...banks].sort((left, right) => left.name.localeCompare(right.name, 'fr', { sensitivity: 'base' })),
    [banks]
  );

  useEffect(() => {
    const unsubCountries = onSnapshot(collection(db, 'countries'), (snapshot) => {
      setCountries(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })));
    });
    const unsubRates = onSnapshot(collection(db, 'exchange_rates'), (snapshot) => {
      setRates(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })));
    });
    const unsubBanks = onSnapshot(collection(db, 'banks'), (snapshot) => {
      setBanks(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) })));
    });

    return () => {
      unsubCountries();
      unsubRates();
      unsubBanks();
    };
  }, []);

  useEffect(() => {
    if (!transferData.transferType) {
      navigate('/transfer-step1', { replace: true });
    }
  }, [navigate, transferData.transferType]);

  useEffect(() => {
    if (currentStep !== 4) return;

    setSecondsLeft(20 * 60);
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentStep]);

  const destinationCountry = sortedCountries.find((country) => country.code === transferData.destinationCountry);
  const selectedRate = rates.find((rate) => rate.from === 'RUB' && rate.to === (destinationCountry?.currency || transferData.currency || 'XAF'))?.rate ?? 7.22;
  const receivedAmount = useMemo(() => (transferData.amount || 0) * selectedRate, [selectedRate, transferData.amount]);

  const bankAccounts: BankAccountView[] = sortedBanks.length > 0
    ? sortedBanks.slice(0, 2).map((bank, index) => ({
        title: `Option ${index + 1}`,
        name: bank.name,
        number: bank.number,
        holder: bank.details || bankFallbacks[index]?.holder || 'Flash Pay',
        logo: bank.logo,
      }))
    : bankFallbacks.map((bank, index) => ({
        title: `Option ${index + 1}`,
        name: bank.name,
        number: bank.number,
        holder: bank.holder,
      }));

  const normalizePhonePrefix = (value: string) => value.replace(/\s+/g, '').replace(/\D/g, '');

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success('Copié');
  };

  const handlePaymentSubmit = async () => {
    if (!proofFile) {
      toast.error('Ajoutez la preuve de paiement avant de continuer.');
      return;
    }

    if (secondsLeft <= 0) {
      toast.error('Le délai de paiement est expiré.');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Création du transfert...');

    try {
      const proofUrl = await fileToBase64(proofFile);
      
      // Calculate transaction with exchange rate snapshot and fees
      const calculation = await calculateTransactionRecap({
        transferType: 'russia-africa',
        amount: transferData.amount,
        inputCurrency: 'RUB',
        outputCurrency: destinationCountry?.currency || 'XAF',
        recipientOperator: transferData.recipientOperator,
        recipientName: transferData.recipientName,
        recipientPhone: transferData.recipientPhone,
        destinationCountry: transferData.destinationCountry,
        narration: transferData.narration,
      });

      if (!calculation.isValid) {
        toast.error(`Erreur de calcul: ${calculation.errors.join(', ')}`, { id: loadingToast });
        return;
      }

      const created = await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser?.uid || '',
        clientName: user?.nom || '',
        clientPhone: user?.tel || '',
        clientEmail: user?.email || auth.currentUser?.email || '',
        transferType: 'russia-africa',
        type: 'russia-africa',
        recipientName: transferData.recipientName,
        recipientPhone: transferData.recipientPhone || '',
        recipientOperator: transferData.recipientOperator || 'Orange Money',
        destinationCountry: transferData.destinationCountry,
        amount: transferData.amount,
        currency: 'RUB',
        destinationCurrency: destinationCountry?.currency || 'XAF',
        // Store calculation snapshots
        exchangeRate: calculation.exchangeRate,
        exchangeRateTimestamp: calculation.exchangeRateTimestamp,
        fee: calculation.commissionAmount,
        commissionPercentage: calculation.commissionPercentage,
        receivedAmount: calculation.receivedAmount,
        points: Math.round(transferData.amount || 0),
        narration: transferData.narration || '',
        proofUrl,
        status: 'pending',
        route: 'russia-africa',
        country: destinationCountry?.name || 'Afrique',
        fromCountry: 'RU',
        toCountry: transferData.destinationCountry || '',
        operator: transferData.recipientOperator || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        statusHistory: [
          {
            status: 'pending',
            timestamp: Timestamp.now(),
            notes: 'Transfert initié par le client',
          },
        ],
      });

      // Notify Admin of new transaction
      try {
        const isLarge = (transferData.amount || 0) >= 100000;
        await addDoc(collection(db, 'admin_notifications'), {
          title: isLarge ? '⚠️ GROS TRANSFERT' : 'Nouveau transfert',
          body: `${isLarge ? 'ALERTE : ' : ''}Un nouveau transfert de ${transferData.amount} RUB a été initié par ${user?.nom || 'un client'}.`,
          type: 'transaction',
          priority: isLarge ? 'high' : 'normal',
          read: false,
          createdAt: Timestamp.now(),
          link: `/admin/queue/${created.id}`
        });
      } catch (err) {
        console.error('Failed to notify admin of transaction:', err);
      }

      setCreatedTransactionId(created.id);
      nextStep();
      toast.success('Transfert initié', { id: loadingToast });
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Erreur lors de la création du transfert', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transferData.transferType) {
    return null;
  }

  const renderSidebarSummary = () => (
    <aside className="hidden lg:flex lg:flex-col lg:gap-5">
      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-gradient-to-br from-[#7b47de] via-[#6236CC] to-[#4a239c] p-7 text-white shadow-[0_28px_60px_rgba(98,54,204,0.22)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Flash Pay</p>
        <h1 className="mt-3 text-3xl font-black leading-tight">Envoyez en quelques étapes, suivez en temps réel.</h1>
        <p className="mt-3 text-sm text-white/80">Flux desktop et mobile alignés avec le back-office Firebase.</p>
      </div>

      <div className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6236CC]">Aperçu</p>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span>Destinataire</span>
            <span className="font-semibold text-slate-900">{transferData.recipientName || 'En attente'}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span>Montant</span>
            <span className="font-semibold text-slate-900">{transferData.amount || 0} RUB</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span>Reçu estimé</span>
            <span className="font-semibold text-slate-900">{receivedAmount.toLocaleString('fr-FR')} XAF</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
            <span>Statut</span>
            <span className="font-semibold text-emerald-600">Paiement manuel</span>
          </div>
        </div>
      </div>
    </aside>
  );

  const currentCountryList = countries.filter((country) => {
    const search = countryQuery.trim().toLowerCase();
    if (!search) return true;
    return [country.name, country.code, country.dialCode, country.currency].some((value) => String(value || '').toLowerCase().includes(search));
  });

  const detectOperator = (country: CountryRecord | undefined, phoneValue: string) => {
    if (!country?.operators?.length || !phoneValue) return '';

    const normalizedPhone = phoneValue.replace(/\D/g, '');
    const dialDigits = (country.dialCode || '').replace(/\D/g, '');
    const localPhone = dialDigits && normalizedPhone.startsWith(dialDigits)
      ? normalizedPhone.slice(dialDigits.length)
      : normalizedPhone;

    const matchedOperator = country.operators.find((operator) =>
      operator.prefixes?.some((prefix) => localPhone.startsWith(prefix.replace(/\D/g, '')))
    );

    return matchedOperator?.name || '';
  };

  if (currentStep === 2) {
    const selected = countries.find((country) => country.code === transferData.destinationCountry);

    return (
      <Layout>
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          {renderSidebarSummary()}

          <section className="space-y-5">
            <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_16px_50px_rgba(98,54,204,0.08)] sm:p-7">
              <button onClick={previousStep} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                <ArrowLeft size={16} /> Retour
              </button>

              <div className="mt-5 text-center lg:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6236CC]">Veuillez saisir les informations du destinataire</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Nom du bénéficiaire et numéro de téléphone</h2>
              </div>

              <div className="mt-6 space-y-4 rounded-[24px] border border-slate-100 bg-slate-50 p-4 sm:p-6">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Nom du bénéficiaire</span>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <input
                      value={transferData.recipientName}
                      onChange={(event) => updateTransferData({ recipientName: event.target.value })}
                      placeholder="Entrez le nom complet du bénéficiaire"
                      className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Numéro de téléphone</span>
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:grid-cols-[180px_1fr]">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      {selected?.code ? (
                        <img
                          src={flagImageFor(selected.code)}
                          alt={`${selected.name} flag`}
                          className="w-5 h-5 rounded-sm object-cover"
                        />
                      ) : (
                        <Globe size={20} className="text-slate-600" />
                      )}
                      <select
                        value={transferData.destinationCountry || ''}
                        onChange={(event) => {
                          const nextCountry = countries.find((country) => country.code === event.target.value);
                          updateTransferData({
                            destinationCountry: nextCountry?.code || '',
                            currency: nextCountry?.currency || 'XAF',
                            recipientOperator: detectOperator(nextCountry, transferData.recipientPhone || '') || nextCountry?.operators?.[0]?.name || '',
                          });
                        }}
                        className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
                      >
                        <option value="">Pays</option>
                        {countries.map((country) => (
                          <option key={country.id} value={country.code}>
                            {country.name} {country.dialCode ? `(${country.dialCode})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      value={transferData.recipientPhone}
                      onChange={(event) => {
                        const nextPhone = event.target.value;
                        updateTransferData({
                          recipientPhone: nextPhone,
                          recipientOperator: detectOperator(selected, nextPhone),
                        });
                      }}
                      placeholder={selected?.dialCode ? `Entrez le numéro de téléphone ${selected.dialCode}` : 'Entrez le numéro de téléphone'}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </label>

                {selected?.operators?.length ? (
                  <div>
                    <span className="mb-2 block text-sm font-medium text-slate-700">Opérateur détecté automatiquement</span>
                    <div className="rounded-2xl border border-[#eadfff] bg-[#f7f3ff] px-4 py-3 text-sm font-semibold text-[#6236CC] shadow-sm">
                      {transferData.recipientOperator || 'En attente de détection'}
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                onClick={() => nextStep()}
                disabled={!transferData.recipientName || !transferData.recipientPhone || !transferData.destinationCountry}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6236CC] px-6 py-4 text-base font-bold text-white shadow-[0_14px_30px_rgba(98,54,204,0.24)] transition-all disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 lg:w-auto"
              >
                Continuer <ArrowRight size={18} />
              </button>

              <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#6236CC]/20 bg-white px-6 py-4 text-sm font-semibold text-[#6236CC] lg:w-auto">
                <Smartphone size={16} /> Choisir parmi les contacts enregistrés
              </button>
            </div>
          </section>
        </div>
      </Layout>
    );
  }

  if (currentStep === 3) {
    const senderCountry = { name: 'Russie', code: 'ru' };
    const recipientFlagImg = destinationCountry?.code ? flagImageFor(destinationCountry.code) : undefined;

    return (
      <Layout>
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          {renderSidebarSummary()}

          <section className="space-y-5">
            <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_16px_50px_rgba(98,54,204,0.08)] sm:p-7">
              <button onClick={previousStep} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                <ArrowLeft size={16} /> Retour
              </button>

              <div className="mt-5 text-center lg:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6236CC]">Vérifier les détails</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">Tout est prêt avant le paiement</h2>
              </div>

              <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-100 bg-slate-50 p-5 sm:p-7">
                <div className="flex items-center justify-center gap-4 text-4xl sm:text-5xl">
                  {senderCountry.code ? (
                    <img src={flagImageFor(senderCountry.code)} alt="Russia flag" className="w-8 h-8" />
                  ) : (
                    <span />
                  )}
                  <ArrowRight className="text-[#6236CC]" size={28} />
                  {recipientFlagImg ? (
                    <img src={recipientFlagImg} alt="Destination flag" className="w-8 h-8" />
                  ) : (
                    <Globe size={28} className="text-[#6236CC]" />
                  )}
                </div>
                <p className="mt-4 text-center text-sm text-slate-500">Vous envoyez</p>
                <h3 className="text-center text-4xl font-black text-slate-900">{(transferData.amount || 0).toLocaleString('fr-FR')} roubles</h3>
                <p className="mt-2 text-center text-sm font-semibold text-slate-700">à {transferData.recipientName}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Opérateur</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{transferData.recipientOperator || 'Orange Money'}</p>
                </div>
                <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">Numéro de mobile</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{transferData.recipientPhone || '—'}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
                <SummaryRow label="Vous payez" value={`${(transferData.amount || 0).toLocaleString('fr-FR')} roubles`} />
                <SummaryRow label="Le destinataire reçoit" value={`${receivedAmount.toLocaleString('fr-FR')} ${destinationCountry?.currency || 'XAF'}`} accent />
                <SummaryRow label="Taux de change" value={`1 rouble = ${selectedRate.toLocaleString('fr-FR')} ${destinationCountry?.currency || 'XAF'}`} />
                <SummaryRow label="Frais de transfert" value="0 rouble" />
                <SummaryRow label="Bonus" value={`${Math.round(transferData.amount || 0)} points`} accent />
              </div>

              <div className="mt-4 rounded-[24px] border border-slate-100 bg-[#f7f3ff] p-4 text-sm text-slate-700 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 text-[#6236CC]" size={18} />
                  <div>
                    <p className="font-semibold text-slate-900">Généralement livré en moins de 10 minutes</p>
                    <p className="mt-1 text-slate-600">Ajoutez une narration optionnelle si vous le souhaitez avant de continuer.</p>
                  </div>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Narration (facultatif)</span>
                <input
                  value={transferData.narration || ''}
                  onChange={(event) => updateTransferData({ narration: event.target.value })}
                  placeholder="Cadeau, scolarité, anniversaire..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none placeholder:text-slate-400"
                />
              </label>

              <button onClick={() => nextStep()} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6236CC] px-6 py-4 text-base font-bold text-white shadow-[0_14px_30px_rgba(98,54,204,0.24)] lg:w-auto">
                Continuer <ArrowRight size={18} />
              </button>
            </div>
          </section>
        </div>
      </Layout>
    );
  }

  if (currentStep === 4) {
    const timerLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;

    return (
      <Layout>
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          {renderSidebarSummary()}

          <section className="space-y-5">
            <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_16px_50px_rgba(98,54,204,0.08)] sm:p-7">
              <button onClick={previousStep} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                <ArrowLeft size={16} /> Retour
              </button>

              <div className="mt-5 flex items-start justify-between gap-4 rounded-[24px] border border-[#6236CC]/15 bg-[#f7f3ff] p-5">
                <div>
                  <p className="text-sm font-semibold text-[#6236CC]">Effectuez le paiement sur l’un des numéros ci-dessous et envoyez la capture d’écran du reçu.</p>
                  <p className="mt-2 text-sm text-slate-600">Vous avez 20 minutes pour effectuer le paiement.</p>
                </div>
                <div className="rounded-full bg-white px-4 py-2 text-xl font-black text-[#6236CC] shadow-sm">{timerLabel}</div>
              </div>

              <div className="mt-6 space-y-4">
                {bankAccounts.map((bank, index) => (
                  <div key={`${bank.name}-${index}`} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 shadow-sm sm:p-5">
                    <div className="mb-3 inline-flex rounded-full bg-[#6236CC] px-3 py-1 text-xs font-bold text-white">{bank.title}</div>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                          {bank.logo ? <img src={bank.logo} alt={bank.name} className="h-full w-full object-contain p-2" /> : <span className="text-xl font-black text-[#6236CC]">{bank.name.charAt(0)}</span>}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Numéro de compte</p>
                          <p className="mt-1 text-xl font-black text-slate-900">{bank.number}</p>
                          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">Banque</p>
                          <p className="text-lg font-bold text-slate-900">{bank.name}</p>
                          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">Titulaire du compte</p>
                          <p className="font-semibold text-slate-900">{bank.holder}</p>
                        </div>
                      </div>

                      <button onClick={() => handleCopy(bank.number)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#6236CC]/30 bg-white px-4 py-3 text-sm font-semibold text-[#6236CC] transition-all hover:bg-[#6236CC] hover:text-white">
                        <Copy size={16} /> Copier
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[24px] border border-[#6236CC]/15 bg-[#f7f3ff] p-4 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <MapPinned className="mt-0.5 text-[#6236CC]" size={18} />
                  <p>Ces numéros sont mis à jour quotidiennement pour votre sécurité. Utilisez uniquement les numéros affichés ici.</p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <Upload size={16} className="text-[#6236CC]" /> Téléchargez la preuve de paiement
                </div>
                <p className="mt-1 text-sm text-slate-500">Formats acceptés : JPG, PNG - Taille max : 5 Mo</p>

                <label className="mt-4 block cursor-pointer rounded-[24px] border-2 border-dashed border-[#6236CC]/25 bg-[#faf8ff] p-6 text-center transition-all hover:border-[#6236CC]">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      if (!file) {
                        setProofFile(null);
                        return;
                      }

                      const isValidType = ['image/png', 'image/jpeg'].includes(file.type);
                      const isValidSize = file.size <= 5 * 1024 * 1024;

                      if (!isValidType) {
                        toast.error('Formats acceptés : JPG ou PNG.');
                        return;
                      }

                      if (!isValidSize) {
                        toast.error('La preuve de paiement doit faire moins de 5 Mo.');
                        return;
                      }

                      setProofFile(file);
                    }}
                  />
                  {proofFile ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="mx-auto text-emerald-500" size={42} />
                      <p className="font-semibold text-slate-900">{proofFile.name}</p>
                      <button type="button" onClick={(event) => { event.preventDefault(); setProofFile(null); }} className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600">
                        <X size={14} /> Retirer le fichier
                      </button>
                    </div>
                  ) : (
                    <>
                      <Paperclip className="mx-auto text-[#6236CC]" size={40} />
                      <p className="mt-3 font-semibold text-slate-900">Glissez votre reçu ici ou cliquez pour sélectionner</p>
                      <p className="mt-1 text-sm text-slate-500">JPG ou PNG uniquement</p>
                    </>
                  )}
                </label>
              </div>

              <button
                onClick={handlePaymentSubmit}
                disabled={!proofFile || isSubmitting || secondsLeft <= 0}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6236CC] px-6 py-4 text-base font-bold text-white shadow-[0_14px_30px_rgba(98,54,204,0.24)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 lg:w-auto"
              >
                Continuer
              </button>
            </div>
          </section>
        </div>
      </Layout>
    );
  }

  if (currentStep === 5) {
    return (
      <Layout>
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="hidden lg:block">
            <div className="rounded-[32px] bg-gradient-to-br from-[#efe7ff] to-white p-10 shadow-[0_18px_50px_rgba(98,54,204,0.12)]">
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-full bg-white shadow-inner">
                <Send size={72} className="text-[#6236CC]" />
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white p-6 text-center shadow-[0_16px_50px_rgba(98,54,204,0.08)] sm:p-10">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#efe7ff] text-[#6236CC]">
              <CheckCircle2 size={42} />
            </div>
            <h2 className="mt-6 text-3xl font-black text-slate-900">Paiement initié</h2>
            <p className="mt-3 text-slate-600">Votre paiement de {transferData.amount?.toLocaleString('fr-FR') || '0'} roubles a été initié.</p>

            <div className="mt-6 rounded-[24px] bg-[#f7f3ff] p-4 text-left text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 text-[#6236CC]" size={18} />
                <p>Votre paiement est en cours. Nous vous avertirons quand il sera terminé.</p>
              </div>
            </div>

            <button onClick={() => navigate(`/transactions/${createdTransactionId}`)} disabled={!createdTransactionId} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#6236CC] px-6 py-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
              Voir la transaction
            </button>

            <button onClick={() => { resetWizard(); navigate('/'); }} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#6236CC]/25 bg-white px-6 py-4 text-base font-bold text-[#6236CC]">
              Retour à la page d'accueil
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-20 text-center text-slate-600">Redirection...</div>
    </Layout>
  );
};

const SummaryRow = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-0 last:pb-0">
    <span className="text-sm text-slate-600">{label}</span>
    <span className={`text-sm font-bold ${accent ? 'text-[#6236CC]' : 'text-slate-900'}`}>{value}</span>
  </div>
);

export default TransferJourneyPage;