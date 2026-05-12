import React, { useState } from 'react';
import { ArrowRight, Zap, Info, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [isSendMode, setIsSendMode] = useState(true);
  const [isSenderDropdownOpen, setIsSenderDropdownOpen] = useState(false);
  const [isRecipientDropdownOpen, setIsRecipientDropdownOpen] = useState(false);
  
  const currentSender = senderCountries.find(c => c.code === (transferData.originCountry || 'RU'));
  const currentRecipient = recipientCountries.find(c => c.code === (transferData.destinationCountry || recipientCountries[0]?.code));

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
    updateTransferData({ 
      originCountry: c.code, 
      originCurrency: c.currency || 'XAF',
      // Determine type if recipient exists, or pick default first recipient
      transferType: undefined 
    });
    setIsSenderDropdownOpen(false);
  };

  const handleRecipientSelect = (c: any) => {
    const type = transferData.originCountry === 'RU' ? 'russia-africa' : (c.code === 'RU' ? 'africa-russia' : 'africa-africa');
    updateTransferData({ 
      destinationCountry: c.code, 
      currency: c.currency,
      transferType: type
    });
    setIsRecipientDropdownOpen(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-[0.5mm]">
      <h2 className="text-2xl font-black text-[#1D1B20] tracking-tight mb-6">{t('amount_selection')}</h2>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.06)] p-6 sm:p-10 space-y-8">
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
                        {senderCountries.map(c => (
                          <button
                            key={c.code}
                            onClick={() => handleSenderSelect(c)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-brand/5 transition-colors text-left"
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
                        {recipientCountries.map(c => (
                          <button
                            key={c.code}
                            onClick={() => handleRecipientSelect(c)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-brand/5 transition-colors text-left"
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
            {requiresKYC && (
              <div className="bg-rose-500/10 text-rose-400 px-4 py-2 rounded-xl border border-rose-500/20 text-[10px] font-black uppercase tracking-wider">
                {t('kyc_required')}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col-reverse sm:flex-row gap-4">
        <button onClick={previousStep} className="w-full sm:flex-1 px-8 py-5 rounded-full border-2 border-[#79747E] text-[#49454F] font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-3">
          <ChevronLeft size={24} /> {t('back')}
        </button>
        <button
          onClick={nextStep}
          disabled={!isAmountValid}
          className="w-full sm:flex-[2] px-8 py-5 rounded-full font-black transition-all flex items-center justify-center gap-3 bg-[#661489] text-white shadow-xl shadow-[#661489]/20 disabled:opacity-50"
        >
          {t('next')} <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

