import React, { useState } from 'react';
import { ArrowRight, Zap, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AmountSelectionStepProps {
  transferData: any;
  updateTransferData: (data: any) => void;
  rates: any[];
  getCommission: (amount: number, type: string, country: string, operator: string, currency?: string) => number;
  t: (key: string) => string;
  formatNumber: (num: number, currency: string) => string;
  nextStep: () => void;
  previousStep: () => void;
  settings: any;
  isKycExpert: boolean;
  senderCountries: any[];
  recipientCountries: any[];
}

export const AmountSelectionStep: React.FC<AmountSelectionStepProps> = ({
  transferData,
  updateTransferData,
  rates,
  getCommission,
  t,
  formatNumber,
  nextStep,
  previousStep,
  settings,
  isKycExpert,
  senderCountries,
  recipientCountries
}) => {
  const navigate = useNavigate();
  const [isSendMode, setIsSendMode] = useState(true);
  const [isSenderDropdownOpen, setIsSenderDropdownOpen] = useState(false);
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
  
  const currentSender = senderCountries.find(c => c.code === (transferData.originCountry || 'RU'));
  const currentRecipient = recipientCountries.find(c => c.code === (transferData.destinationCountry || recipientCountries[0]?.code));

  const fromCurrency = currentSender?.currency || transferData.originCurrency || (transferData.originCountry === 'RU' ? 'RUB' : 'XAF');
  const toCurrency = currentRecipient?.currency || transferData.currency || (transferData.destinationCountry === 'RU' ? 'RUB' : 'XAF');
  
  const foundRate = rates.find((r: any) => 
    r.from?.toString().toUpperCase().trim() === fromCurrency.toUpperCase().trim() && 
    r.to?.toString().toUpperCase().trim() === toCurrency.toUpperCase().trim()
  );

  // Filter recipient countries based on available rates from current sender
  const availableRecipientCountries = recipientCountries.filter(c => {
    const targetCurrency = c.currency || (c.code === 'RU' ? 'RUB' : 'XAF');
    return rates.some(r => 
      r.from?.toString().toUpperCase().trim() === fromCurrency.toUpperCase().trim() && 
      r.to?.toString().toUpperCase().trim() === targetCurrency.toUpperCase().trim()
    );
  });

  // Filter sender countries based on available rates to current recipient
  const availableSenderCountries = senderCountries.filter(c => {
    const sourceCurrency = c.currency || (c.code === 'RU' ? 'RUB' : 'XAF');
    return rates.some(r => 
      r.from?.toString().toUpperCase().trim() === sourceCurrency.toUpperCase().trim() && 
      r.to?.toString().toUpperCase().trim() === toCurrency.toUpperCase().trim()
    );
  });

  const inverseRate = !foundRate ? rates.find((r: any) => 
    r.from?.toString().toUpperCase().trim() === toCurrency.toUpperCase().trim() && 
    r.to?.toString().toUpperCase().trim() === fromCurrency.toUpperCase().trim()
  ) : null;
  
  const rawRate = foundRate?.rate || foundRate?.rateFixed || (inverseRate ? (1 / (inverseRate.rate || inverseRate.rateFixed)) : 1.0);
  const rate = parseFloat(rawRate.toFixed(6));

  const sendAmount = transferData.amount || 0;
  const receiveAmount = sendAmount * rate;
  
  const commissionFee = getCommission(
    sendAmount, 
    transferData.transferType, 
    transferData.destinationCountry || transferData.originCountry, 
    transferData.recipientOperator || transferData.selectedOperator,
    fromCurrency
  );

  const totalToPay = sendAmount + commissionFee;

  const currentLimit = isKycExpert
    ? (settings.expertLimitRUB || 150000)
    : (settings.standardLimitRUB || 20000);
  
  const amountInRUB = transferData.transferType === 'africa-russia' ? receiveAmount : sendAmount;
  const requiresKYC = amountInRUB > currentLimit && !isKycExpert;
  const isAmountValid = sendAmount > 0 && !requiresKYC;

  const handleSendChange = (val: string) => {
    const num = parseFloat(val) || 0;
    updateTransferData({ amount: num });
  };

  const handleReceiveChange = (val: string) => {
    const num = parseFloat(val) || 0;
    updateTransferData({ amount: num / rate });
  };

  const handleSenderSelect = (c: any) => {
    const sourceCurrency = c.currency || (c.code === 'RU' ? 'RUB' : 'XAF');
    
    // Find valid recipients for this new sender based on rates
    const validRecipients = recipientCountries.filter(rc => {
      const targetCurrency = rc.currency || (rc.code === 'RU' ? 'RUB' : 'XAF');
      return rates.some(r => 
        r.from?.toString().toUpperCase().trim() === sourceCurrency.toUpperCase().trim() && 
        r.to?.toString().toUpperCase().trim() === targetCurrency.toUpperCase().trim()
      );
    });

    let newDest = transferData.destinationCountry;
    let newCurrency = transferData.currency;
    let newType = transferData.transferType;

    // If current destination is invalid for new sender, pick first valid one
    if (!validRecipients.some(r => r.code === newDest)) {
      const firstValid = validRecipients[0];
      newDest = firstValid?.code;
      newCurrency = firstValid?.currency;
    }

    // Determine transfer type
    if (c.code === 'RU') newType = 'russia-africa';
    else if (newDest === 'RU') newType = 'africa-russia';
    else newType = 'africa-africa';

    updateTransferData({ 
      originCountry: c.code, 
      originCurrency: sourceCurrency,
      destinationCountry: newDest,
      currency: newCurrency,
      transferType: newType
    });
    setIsSenderDropdownOpen(false);
  };

  const handleRecipientSelect = (c: any) => {
    const targetCurrency = c.currency || (c.code === 'RU' ? 'RUB' : 'XAF');

    // Find valid senders for this new recipient based on rates
    const validSenders = senderCountries.filter(sc => {
      const sourceCurrency = sc.currency || (sc.code === 'RU' ? 'RUB' : 'XAF');
      return rates.some(r => 
        r.from?.toString().toUpperCase().trim() === sourceCurrency.toUpperCase().trim() && 
        r.to?.toString().toUpperCase().trim() === targetCurrency.toUpperCase().trim()
      );
    });

    let newOrigin = transferData.originCountry;
    let newOriginCurrency = transferData.originCurrency;
    let newType = transferData.transferType;

    // If current origin is invalid for new recipient, pick first valid one
    if (!validSenders.some(s => s.code === newOrigin)) {
      const firstValid = validSenders[0];
      newOrigin = firstValid?.code;
      newOriginCurrency = firstValid?.currency;
    }

    // Determine transfer type
    if (newOrigin === 'RU') newType = 'russia-africa';
    else if (c.code === 'RU') newType = 'africa-russia';
    else newType = 'africa-africa';

    updateTransferData({ 
      destinationCountry: c.code, 
      currency: targetCurrency,
      originCountry: newOrigin,
      originCurrency: newOriginCurrency,
      transferType: newType
    });
    setIsRecipientDropdownOpen(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-[0.5mm]">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={previousStep}
          className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-600 hover:text-brand hover:border-brand transition-all active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-[#1D1B20] tracking-tight">{t('amount_selection')}</h2>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.06)] p-6 sm:p-6 space-y-4">
        <div className="space-y-4">
          {/* You Send */}
          <div className={`p-6 rounded-[32px] transition-all border-2 ${isSendMode ? 'border-[#661489] bg-[#661489]/5 ring-4 ring-[#661489]/5' : 'border-slate-100 bg-slate-50'}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('you_send')}</span>
              
              {/* Sender Country Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsSenderDropdownOpen(!isSenderDropdownOpen)}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border-2 border-slate-100 hover:border-brand transition-all"
                >
                   <img src={`https://flagcdn.com/w40/${(currentSender?.code || 'ru').toLowerCase()}.png`} className="w-5 h-5 rounded-full object-cover" alt="" />
                   <span className="font-black text-slate-900 text-xs">{currentSender?.name || 'Russie'}</span>
                   <ChevronRight size={14} className={`transition-transform ${isSenderDropdownOpen ? 'rotate-90' : ''}`} />
                </button>
                
                {isSenderDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSenderDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                      <div className="max-h-60 overflow-y-auto">
                        {availableSenderCountries.map(c => (
                          <button
                            key={c.code}
                            onClick={() => handleSenderSelect(c)}
                            className={`w-full flex items-center gap-3 p-3 hover:bg-brand/5 transition-colors text-left ${transferData.originCountry === c.code ? 'bg-brand/10' : ''}`}
                          >
                            <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} className="w-5 h-5 rounded-full object-cover" alt="" />
                            <span className="font-bold text-slate-700 text-sm">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <input 
                type="number" 
                value={sendAmount || ''}
                onFocus={() => setIsSendMode(true)}
                onChange={(e) => handleSendChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent border-none outline-none text-[34px] font-black text-slate-900 placeholder:text-slate-300"
              />
              <span className="text-xl font-black text-slate-400">{fromCurrency}</span>
            </div>
          </div>

          <div className="flex justify-center -my-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#661489] text-white shadow-lg shadow-[#661489]/30 flex items-center justify-center rotate-45">
              <ArrowRight className="-rotate-45" size={24} />
            </div>
          </div>

          {/* They Receive */}
          <div className={`p-6 rounded-[32px] transition-all border-2 ${!isSendMode ? 'border-[#661489] bg-[#661489]/5 ring-4 ring-[#661489]/5' : 'border-slate-100 bg-slate-50'}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('recipient_receives')}</span>
              
              {/* Recipient Country Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsRecipientDropdownOpen(!isRecipientDropdownOpen)}
                  className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border-2 border-slate-100 hover:border-brand transition-all"
                >
                   <img src={`https://flagcdn.com/w40/${(currentRecipient?.code || 'cm').toLowerCase()}.png`} className="w-5 h-5 rounded-full object-cover" alt="" />
                   <span className="font-black text-slate-900 text-xs">{currentRecipient?.name || 'Cameroun'}</span>
                   <ChevronRight size={14} className={`transition-transform ${isRecipientDropdownOpen ? 'rotate-90' : ''}`} />
                </button>
                
                {isRecipientDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsRecipientDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in zoom-in-95 duration-200">
                      <div className="max-h-60 overflow-y-auto">
                        {availableRecipientCountries.map(c => (
                          <button
                            key={c.code}
                            onClick={() => handleRecipientSelect(c)}
                            className={`w-full flex items-center gap-3 p-3 hover:bg-brand/5 transition-colors text-left ${transferData.destinationCountry === c.code ? 'bg-brand/10' : ''}`}
                          >
                            <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} className="w-5 h-5 rounded-full object-cover" alt="" />
                            <span className="font-bold text-slate-700 text-sm">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <input 
                type="number" 
                value={receiveAmount ? parseFloat(receiveAmount.toFixed(2)) : ''}
                onFocus={() => setIsSendMode(false)}
                onChange={(e) => handleReceiveChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent border-none outline-none text-[34px] font-black text-slate-900 placeholder:text-slate-300"
              />
              <span className="text-xl font-black text-slate-400">{toCurrency}</span>
            </div>
          </div>
        </div>

        {requiresKYC && (
          <div 
            onClick={() => navigate('/kyc')}
            className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 p-4 rounded-[24px] flex items-center gap-4 cursor-pointer hover:shadow-md transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-110 transition-transform">
              <Info size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-black text-rose-600 uppercase tracking-tight leading-none mb-1">
                {t('kyc_required')}
              </p>
              <p className="text-[11px] font-bold text-rose-400 leading-tight">
                {t('kyc_limit_warning') || "Le montant dépasse votre limite actuelle. Cliquez ici pour vérifier votre compte."}
              </p>
            </div>
            <ChevronRight size={18} className="text-rose-300 group-hover:translate-x-1 transition-transform" />
          </div>
        )}

        <div className="bg-slate-900 rounded-[32px] p-6 text-white space-y-4 shadow-xl">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-white/60 font-bold">
              <Zap size={16} className="text-amber-400" />
              {t('exchange_rate_label')}
            </div>
            <span className="font-black">1 {fromCurrency} = {rate} {toCurrency}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 text-white/60 font-bold">
              <Info size={16} />
              {t('transfer_fee')}
            </div>
            <span className="font-black">{formatNumber(commissionFee, fromCurrency)}</span>
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{t('total_to_pay')}</p>
              <p className="text-3xl font-black">{formatNumber(totalToPay, fromCurrency)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <button
          onClick={nextStep}
          disabled={!isAmountValid}
          className="w-full px-8 py-5 rounded-full font-black transition-all flex items-center justify-center gap-3 bg-[#661489] text-white shadow-xl shadow-[#661489]/20 disabled:opacity-50"
        >
          {t('next')} <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

