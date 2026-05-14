import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Zap, 
  User, 
  Phone, 
  Smartphone,
  Pencil,
  Clock,
  ArrowRight
} from 'lucide-react';

interface SummaryStepProps {
  transferData: any;
  updateTransferData: (data: any) => void;
  rates: any[];
  getCommission: (amount: number, type: string, country: string, operator: string, currency?: string) => number;
  t: (key: string, vars?: any) => string;
  formatNumber: (num: number, currency?: string) => string;
  nextStep: () => void;
  previousStep: () => void;
  user: any;
  countries: any[];
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  transferData,
  updateTransferData,
  rates,
  getCommission,
  t,
  formatNumber,
  nextStep,
  previousStep,
  user,
  countries
}) => {
  const countriesList = countries || [];
  const currentSender = (transferData.originCountry === 'RU' || !transferData.originCountry) 
    ? { code: 'RU', currency: 'RUB', name: 'Russie' }
    : countriesList.find((c: any) => c.code === transferData.originCountry);

  const currentRecipient = (transferData.destinationCountry === 'RU')
    ? { code: 'RU', currency: 'RUB', name: 'Russie' }
    : countriesList.find((c: any) => c.code === transferData.destinationCountry);

  // Use currency from database, fallback to transferData if not found
  const fromCurrency = currentSender?.currency || transferData.originCurrency || (transferData.originCountry === 'RU' ? 'RUB' : 'XAF');
  const toCurrency = currentRecipient?.currency || transferData.currency || (transferData.destinationCountry === 'RU' ? 'RUB' : 'XAF');

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

  // For multi-recipients (Bulk)
  const totalSendAmount = transferData.isBulk 
    ? (transferData.bulkRecipients?.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0) || 0)
    : sendAmount;
    
  const totalCommission = transferData.isBulk
    ? (transferData.bulkRecipients?.reduce((acc: number, r: any) => {
        return acc + getCommission(
          Number(r.amount), 
          transferData.transferType, 
          transferData.destinationCountry, 
          r.operator,
          fromCurrency
        );
      }, 0) || 0)
    : commissionFee;

  const finalTotalToPay = totalSendAmount + totalCommission;
  const finalTotalReceiveAmount = totalSendAmount * rate;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-[0.5mm]">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={previousStep}
          className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-600 hover:text-brand hover:border-brand transition-all active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-[#1D1B20] tracking-tight">{t('verify_details') || 'Vérifier les détails'}</h2>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Flag to Flag Header */}
        <div className="bg-[#661489]/5 p-6 border-b border-slate-100 flex flex-col items-center">
          <div className="flex items-center gap-6 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-md">
                <img 
                  src={fromCurrency === 'RUB' ? 'https://flagcdn.com/w160/ru.png' : `https://flagcdn.com/w160/${(transferData.originCountry || 'cm').toLowerCase()}.png`} 
                  className="w-full h-full object-cover" 
                  alt="" 
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white px-2 py-0.5 rounded-md text-[10px] font-black shadow-sm border border-slate-100">
                {fromCurrency}
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#661489] border border-slate-50">
                <ArrowRight size={20} />
              </div>
            </div>

            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-md">
                <img 
                  src={toCurrency === 'RUB' ? 'https://flagcdn.com/w160/ru.png' : `https://flagcdn.com/w160/${(transferData.destinationCountry || 'sn').toLowerCase()}.png`} 
                  className="w-full h-full object-cover" 
                  alt="" 
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white px-2 py-0.5 rounded-md text-[10px] font-black shadow-sm border border-slate-100">
                {toCurrency}
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-3xl font-black text-slate-900">{formatNumber(finalTotalReceiveAmount, toCurrency)}</p>
            <p className="text-sm font-bold text-slate-500 mt-1">
              {transferData.isBulk 
                ? t('bulk_transfer_to_count', { count: transferData.bulkRecipients?.length }) || `${transferData.bulkRecipients?.length} bénéficiaires`
                : transferData.recipientName}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Recipient Details */}
          {!transferData.isBulk && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={10} /> {t('recipient') || 'Destinataire'}
                </p>
                <p className="font-bold text-slate-900 truncate">{transferData.recipientName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Smartphone size={10} /> {t('operator') || 'Opérateur'}
                </p>
                <p className="font-bold text-slate-900 truncate">
                  {transferData.recipientOperator || transferData.selectedOperator || 'N/A'}
                </p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Phone size={10} /> {t('phone_number') || 'Numéro de téléphone'}
                </p>
                <p className="font-bold text-slate-900">{transferData.recipientPhone || transferData.beneficiaryAccount}</p>
              </div>
            </div>
          )}

          {/* Breakdown Table */}
          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('payment_summary') || 'Récapitulatif du paiement'}</p>
            <div className="bg-slate-50 rounded-[24px] p-6 space-y-4 border border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">{t('you_send_summary') || 'Vous envoyez'}</span>
                <span className="font-bold text-slate-900">{formatNumber(totalSendAmount, fromCurrency)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">{t('exchange_rate_label')}</span>
                <span className="font-bold text-[#661489]">1 {fromCurrency} = {rate} {toCurrency}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">{t('transfer_fee')}</span>
                <span className="font-bold text-slate-900">{formatNumber(totalCommission, fromCurrency)}</span>
              </div>
              
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-900 font-black uppercase text-xs">{t('total_to_pay')}</span>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#661489]">{formatNumber(finalTotalToPay, fromCurrency)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Narration */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center text-brand">
                <Pencil size={16} />
              </div>
              <span className="font-black text-slate-900 uppercase text-xs tracking-widest">{t('narration')} (facultatif)</span>
            </div>
            <textarea
              value={transferData.narration || ''}
              onChange={e => updateTransferData({ narration: e.target.value })}
              placeholder={t('narration_placeholder') || 'Ex: Anniversaire, Cadeau, Loyer...'}
              rows={3}
              className="w-full p-4 rounded-2xl border-2 border-slate-100 focus:border-[#661489] outline-none text-slate-900 font-bold bg-slate-50 transition-all resize-none"
            />
          </div>

          {/* Delivery Note */}
          <div className="bg-[#F5E8FF] rounded-2xl p-4 flex items-center gap-3 border border-[#661489]/10">
            <Clock className="text-[#661489]" size={18} />
            <p className="text-[11px] text-[#661489] font-bold">
              {t('delivery_note') || 'Généralement livré en moins de 10 minutes'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-4">
        <button
          onClick={nextStep}
          className="w-full px-8 py-5 rounded-full font-black transition-all flex items-center justify-center gap-3 bg-[#661489] text-white shadow-xl shadow-[#661489]/20"
        >
          {t('next')} <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};


