import React from 'react';
import { 
  ChevronLeft, 
  Info, 
  Clock, 
  Copy, 
  Smartphone, 
  CreditCard, 
  ShieldCheck, 
  Gift, 
  Upload, 
  CloudUpload, 
  CheckCircle2,
  Zap,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentStepProps {
  transferData: any;
  updateTransferData: (data: any) => void;
  t: (key: string, vars?: any) => string;
  formatNumber: (num: number, currency?: string) => string;
  previousStep: () => void;
  handleSubmit: () => Promise<void>;
  isSubmitting: boolean;
  banks: any[];
  rates: any[];
  getCommission: (amount: number, type: string, country: string, operator: string, currency?: string) => number;
  user: any;
  payWithBonus: boolean;
  setPayWithBonus: (val: boolean) => void;
  proofFile: File | null;
  setProofFile: (file: File | null) => void;
  timerSeconds: number;
  formatTimer: (seconds: number) => string;
  countries: any[];
}

export const PaymentStep: React.FC<PaymentStepProps> = ({
  transferData,
  updateTransferData,
  t,
  formatNumber,
  previousStep,
  handleSubmit,
  isSubmitting,
  banks,
  rates,
  getCommission,
  user,
  payWithBonus,
  setPayWithBonus,
  proofFile,
  setProofFile,
  timerSeconds,
  formatTimer,
  countries
}) => {
  const transferType = transferData.transferType;
  
  // Calculate amounts
  const currentSender = (transferType === 'russia-africa' || transferData.originCountry === 'RU')
    ? { code: 'RU', currency: 'RUB', name: 'Russie' }
    : countries.find(c => c.code === transferData.originCountry);

  const currentRecipient = (transferType === 'africa-russia' || transferData.destinationCountry === 'RU')
    ? { code: 'RU', currency: 'RUB', name: 'Russie' }
    : countries.find(c => c.code === transferData.destinationCountry);

  const fromCurrency = currentSender?.currency || (transferData.originCountry === 'RU' ? 'RUB' : 'XAF');
  const toCurrency = currentRecipient?.currency || (transferData.destinationCountry === 'RU' ? 'RUB' : 'XAF');

  const foundRate = rates.find((r: any) => 
    r.from?.toString().toUpperCase().trim() === fromCurrency.toUpperCase().trim() && 
    r.to?.toString().toUpperCase().trim() === toCurrency.toUpperCase().trim()
  );

  const inverseRate = !foundRate ? rates.find((r: any) => 
    r.from?.toString().toUpperCase().trim() === toCurrency.toUpperCase().trim() && 
    r.to?.toString().toUpperCase().trim() === fromCurrency.toUpperCase().trim()
  ) : null;
  
  const rawRate = foundRate?.rate || foundRate?.rateFixed || (inverseRate ? (1 / (inverseRate.rate || inverseRate.rateFixed)) : 1.0);
  const rate = parseFloat(rawRate.toFixed(6));

  const baseAmount = transferData.isBulk 
    ? (transferData.bulkRecipients?.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0) || 0)
    : (transferData.amount || 0);

  const commissionFee = transferData.isBulk
    ? (transferData.bulkRecipients?.reduce((acc: number, r: any) => {
        return acc + getCommission(
          Number(r.amount), 
          transferType, 
          transferData.destinationCountry || transferData.originCountry, 
          r.operator || transferData.selectedOperator,
          fromCurrency
        );
      }, 0) || 0)
    : getCommission(
        baseAmount, 
        transferType, 
        transferData.destinationCountry || transferData.originCountry, 
        transferData.recipientOperator || transferData.selectedOperator,
        fromCurrency
      );

  const totalToPay = baseAmount + commissionFee;
  const bonusAvailableRUB = user?.solde_bonus || 0;
  const pointsAvailable = user?.solde_points || 0;
  const pointsValueInRUB = pointsAvailable / 1000;
  const totalDiscountAvailableRUB = bonusAvailableRUB + pointsValueInRUB;
  
  // Hybrid payment logic
  let totalDiscountInOriginCurrency = totalDiscountAvailableRUB;
  if (fromCurrency !== 'RUB') {
    const directRubRate = rates.find(r => 
      r.from?.toString().toUpperCase().trim() === 'RUB' && 
      r.to?.toString().toUpperCase().trim() === fromCurrency.toUpperCase().trim()
    );
    const inverseRubRate = !directRubRate ? rates.find(r => 
      r.from?.toString().toUpperCase().trim() === fromCurrency.toUpperCase().trim() && 
      r.to?.toString().toUpperCase().trim() === 'RUB'
    ) : null;
    
    const rubToOriginRate = directRubRate?.rate || directRubRate?.rateFixed || (inverseRubRate ? (1 / (inverseRubRate.rate || inverseRubRate.rateFixed)) : 1.0);
    totalDiscountInOriginCurrency = totalDiscountAvailableRUB * rubToOriginRate;
  }

  const bonusFullyCovers = totalDiscountInOriginCurrency >= totalToPay;
  const remainder = Math.max(0, totalToPay - totalDiscountInOriginCurrency);
  const needsProof = !payWithBonus || !bonusFullyCovers;

  const isStepValid = ((payWithBonus && bonusFullyCovers) || (needsProof && !!proofFile)) && !isSubmitting;

  // Deposit details
  const sourceCountry = countries.find(c => c.code === (transferType === 'russia-africa' ? 'RU' : transferData.originCountry));
  const depAccount = sourceCountry?.operators?.find((a: any) => a.name === transferData.selectedOperator);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-[0.5mm]">
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-2xl font-black text-[#1D1B20] tracking-tight">{t('make_payment_title') || 'Effectuer le paiement'}</h2>
        <div className="flex items-center gap-3 text-[#661489] font-black bg-[#F5E8FF] px-5 py-2 rounded-full text-lg border-2 border-[#661489]/20 shadow-md">
          <Clock size={24} />
          <span className={timerSeconds < 120 ? 'text-rose-600 animate-pulse' : ''}>{formatTimer(timerSeconds)}</span>
        </div>
      </div>

      {/* Payment Information */}
      <div className="space-y-6 mb-8">
        <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('payment_coordinates') || 'Coordonnées de paiement'}</p>
        
        {transferType === 'russia-africa' ? (
          <div className="space-y-4">
            {banks.length === 0 ? (
              <div className="bg-amber-50 rounded-[32px] p-8 border border-amber-200 text-center">
                <p className="text-amber-700 font-bold">{t('no_banks_configured') || 'Aucune banque configurée.'}</p>
              </div>
            ) : (
              banks.map((bank, idx) => (
                <div key={bank.id || idx} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
                  <div className="mb-4 flex justify-between items-center">
                    <span className="bg-[#661489] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                      {bank.type === 'phone' ? 'SBP / TÉLÉPHONE' : 'CARTE BANCAIRE'}
                    </span>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(bank.number || bank.phone || ''); toast.success(t('copied')); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#661489]/5 text-[#661489] font-black text-[10px] uppercase tracking-widest hover:bg-[#661489]/10 transition-all"
                    >
                      <Copy size={12} /> {t('copy')}
                    </button>
                  </div>
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-[#661489] shrink-0 overflow-hidden border border-slate-100">
                      {bank.logo ? (
                        <img src={bank.logo} alt={bank.name} className="w-full h-full object-contain p-2" />
                      ) : bank.type === 'phone' ? (
                        <Smartphone size={32} />
                      ) : (
                        <CreditCard size={32} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{t('deposit_number') || 'Numéro de dépôt'}</p>
                      <p className="text-2xl font-black text-slate-900 truncate">{bank.number || bank.phone}</p>
                      <div className="flex items-center gap-6 mt-3">
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">{t('bank') || 'Banque'}</p>
                          <p className="text-xs font-black text-slate-900">{bank.name}</p>
                        </div>
                        {bank.holder && (
                          <div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">{t('holder') || 'Titulaire'}</p>
                            <p className="text-xs font-black text-slate-900">{bank.holder}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="mb-4 flex justify-between items-center">
              <span className="bg-[#661489] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                {t('mobile_deposit') || 'DÉPÔT MOBILE'}
              </span>
              <button 
                onClick={() => { navigator.clipboard.writeText(depAccount?.depositNumber || depAccount?.number || ''); toast.success(t('copied')); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#661489]/5 text-[#661489] font-black text-[10px] uppercase tracking-widest hover:bg-[#661489]/10 transition-all"
              >
                <Copy size={12} /> {t('copy')}
              </button>
            </div>
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-[#661489] shrink-0 overflow-hidden border border-slate-100">
                {depAccount?.logo ? (
                  <img src={depAccount.logo} alt={transferData.selectedOperator} className="w-full h-full object-contain p-2" />
                ) : (
                  <Smartphone size={32} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{t('deposit_number') || 'Numéro de dépôt'}</p>
                <p className="text-2xl font-black text-slate-900 truncate">{depAccount?.depositNumber || depAccount?.number || t('not_configured')}</p>
                <div className="flex items-center gap-6 mt-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">{t('operator') || 'Opérateur'}</p>
                    <p className="text-xs font-black text-slate-900">{transferData.selectedOperator || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">{t('holder') || 'Titulaire'}</p>
                    <p className="text-xs font-black text-slate-900">{depAccount?.depositHolder || depAccount?.holder || 'FLASH PAY'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Security Note */}
      <div className="bg-slate-50 rounded-[24px] p-5 flex items-center gap-4 mb-8 border border-slate-100">
        <ShieldCheck className="text-emerald-500 shrink-0" size={24} />
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide leading-snug">
          {t('security_note_msg') || 'Ces numéros sont mis à jour quotidiennement pour votre sécurité. Utilisez uniquement les coordonnées affichées ici.'}
        </p>
      </div>

      {/* Bonus & Points Payment Option */}
      {totalDiscountAvailableRUB > 0 && (
        <div className={`p-8 rounded-[32px] border-2 transition-all mb-8 ${payWithBonus ? 'border-brand bg-brand/5 ring-4 ring-brand/5' : 'border-slate-100 bg-white hover:border-brand/30'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-brand/10 rounded-2xl text-brand">
                <Gift size={28} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{t('use_bonuses_and_points') || 'Utiliser mes Bonus & Points'}</p>
                <div className="flex flex-col gap-0.5">
                   <p className="text-[11px] text-[#661489] font-black uppercase tracking-widest">
                      {t('referral_bonus') || 'Bonus'}: {formatNumber(bonusAvailableRUB, 'RUB')}
                   </p>
                   <p className="text-[11px] text-brand font-black uppercase tracking-widest">
                      {t('loyalty_points') || 'Points'}: {pointsAvailable} ({formatNumber(pointsValueInRUB, 'RUB')})
                   </p>
                </div>
                {user?.kyc?.status !== 'approved' && (
                  <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                    <Info size={10} /> {t('kyc_required_to_use_points') || 'Validation KYC requise pour utiliser vos points/bonus'}
                  </p>
                )}
              </div>
            </div>
            <button 
              onClick={() => {
                if (user?.kyc?.status !== 'approved') {
                  toast.error(t('kyc_required_points_toast') || 'Veuillez valider votre KYC pour utiliser vos points.');
                  return;
                }
                setPayWithBonus(!payWithBonus);
              }}
              className={`w-14 h-8 rounded-full relative transition-all ${payWithBonus ? 'bg-brand' : 'bg-slate-200'} ${user?.kyc?.status !== 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`absolute top-1.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm ${payWithBonus ? 'left-7.5' : 'left-1.5'}`} />
            </button>
          </div>
          {payWithBonus && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              {bonusFullyCovers ? (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                   <CheckCircle2 className="text-emerald-500" size={20} />
                   <p className="text-[11px] text-emerald-700 font-black uppercase tracking-widest">
                     {t('bonus_covers_all') || '✨ Le bonus couvre la totalité du transfert. Aucune preuve requise.'}
                   </p>
                </div>
              ) : (
                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                   <p className="text-[11px] text-amber-700 font-black uppercase tracking-widest mb-1">
                      {t('bonus_insufficient_generic') || '⚠️ Solde bonus insuffisant pour couvrir le total'}
                   </p>
                   <p className="text-2xl font-black text-amber-800">
                      {t('remaining_to_pay') || 'Reste à payer'} : {formatNumber(remainder, fromCurrency)}
                   </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Proof Section */}
      {needsProof && (
        <div className="space-y-6">
          <p className="text-brand font-black text-sm uppercase tracking-widest">{payWithBonus ? t('after_paying_remainder') || 'Après le paiement du reste' : t('after_payment') || 'Après le paiement'}</p>
          <div className="bg-slate-50 rounded-[32px] p-6 flex items-start gap-4 mb-6 border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-brand shrink-0">
                <Upload size={24} />
            </div>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
                {payWithBonus 
                  ? t('pay_remainder_and_upload_generic', { amount: formatNumber(remainder, fromCurrency) }) || `Effectuez le paiement du complément de ${formatNumber(remainder, fromCurrency)}, puis téléchargez la preuve.`
                  : t('pay_amount_and_upload_generic', { amount: formatNumber(totalToPay, fromCurrency) }) || `Effectuez le paiement de ${formatNumber(totalToPay, fromCurrency)}, puis téléchargez la preuve (capture d'écran du reçu).`}
            </p>
          </div>
          
          <label className="block w-full cursor-pointer group">
            <input
              type="file"
              className="hidden"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              accept="image/*"
            />
            <div className={`w-full py-6 rounded-[32px] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${proofFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white hover:border-brand hover:bg-brand/5'}`}>
              {proofFile ? (
                <>
                  <CheckCircle2 className="text-emerald-500" size={32} />
                  <p className="text-emerald-700 font-black text-sm">{proofFile.name}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Cliquer pour changer</p>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-1 text-brand">
                     <CloudUpload size={32} />
                     <p className="font-black text-lg">{t('download_receipt') || 'Télécharger le reçu'}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{t('max_5mo') || 'Formats JPG, PNG • Max 5 Mo'}</p>
                </>
              )}
            </div>
          </label>
        </div>
      )}

      <div className="mt-12 flex flex-col-reverse sm:flex-row gap-4">
        <button onClick={previousStep} className="w-full sm:flex-1 px-8 py-5 rounded-full border-2 border-slate-200 text-slate-500 font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
          <ChevronLeft size={24} /> {t('back')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isStepValid}
          className="w-full sm:flex-[2] px-8 py-5 rounded-full font-black transition-all flex items-center justify-center gap-3 bg-slate-900 text-white shadow-xl hover:bg-black disabled:opacity-40 disabled:bg-slate-400"
        >
          {isSubmitting ? <><Zap className="animate-pulse" size={24} /> {t('processing') || 'Traitement...'}</> : <>{t('confirm_payment') || 'Confirmer le paiement'} <ArrowRight size={24} /></>}
        </button>
      </div>
    </div>
  );
};


