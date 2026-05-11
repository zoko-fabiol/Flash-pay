import React, { useState, useEffect } from 'react';
import { X, Plus, BookUser, ChevronRight, CheckCircle2, ChevronLeft, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BulkRecipientStepProps {
  countries: any[];
  t: (key: string, params?: any) => string;
  previousStep: () => void;
  nextStep: () => void;
  updateTransferData: (data: any) => void;
  transferData: any;
  formatNumber: (num: number, currency: string) => string;
  savedContacts: any[];
}

export const BulkRecipientStep: React.FC<BulkRecipientStepProps> = ({ 
  countries, 
  t, 
  previousStep, 
  nextStep, 
  updateTransferData, 
  transferData, 
  formatNumber, 
  savedContacts 
}) => {
  const [recipients, setRecipients] = useState<any[]>(transferData.bulkRecipients || [{ name: '', phone: '', amount: 0, operator: '' }]);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const selectedCountry = countries.find((c: any) => c.code === transferData.destinationCountry);

  const totalDistributed = recipients.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const targetAmount = Number(transferData.amount || 0);
  const isAmountMatching = Math.abs(totalDistributed - targetAmount) < 0.01;
  const isAllFieldsFilled = recipients.every(r => r.name.length > 2 && r.phone.length >= 8 && r.amount > 0);
  const isAllValid = isAllFieldsFilled && isAmountMatching;

  // Auto-detect operators on mount for existing recipients
  useEffect(() => {
    if (selectedCountry) {
      const updated = recipients.map(r => {
        if (!r.operator && r.phone) {
          const phone = r.phone.replace(/\D/g, '');
          const op = selectedCountry.operators?.find((o: any) => 
            o.prefixes?.some((p: string) => phone.startsWith(p))
          );
          if (op) return { ...r, operator: op.name };
        }
        return r;
      });
      setRecipients(updated);
    }
  }, [selectedCountry]);

  const addRecipient = () => setRecipients([...recipients, { name: '', phone: '', amount: 0, operator: '' }]);
  
  const removeRecipient = (index: number) => {
    if (recipients.length > 1) {
      const newRecipients = recipients.filter((_, i) => i !== index);
      setRecipients(newRecipients);
    }
  };

  const updateRecipient = (index: number, data: any) => {
    const newRecipients = [...recipients];
    newRecipients[index] = { ...newRecipients[index], ...data };
    
    // Auto-detect operator if phone changed
    const currentPhone = newRecipients[index].phone;
    if (currentPhone && selectedCountry) {
      const op = selectedCountry.operators?.find((o: any) => {
        const phone = currentPhone.replace(/\D/g, '');
        return o.prefixes?.some((p: string) => phone.startsWith(p));
      });
      if (op) {
        newRecipients[index].operator = op.name;
      }
    }
    
    setRecipients(newRecipients);
  };

  const handleNext = () => {
    updateTransferData({ bulkRecipients: recipients });
    nextStep();
  };

  const onSelectFromContacts = (index: number) => {
    setActiveRowIndex(index);
  };

  const onContactPicked = (contact: any) => {
    if (activeRowIndex !== null) {
      updateRecipient(activeRowIndex, {
        name: contact.name || contact.recipientName,
        phone: contact.phone || contact.recipientPhone,
        operator: contact.operator || contact.recipientOperator || ''
      });
      setActiveRowIndex(null);
      toast.success(t('contact_selected'));
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-black text-[#1D1B20] tracking-tight">{t('bulk_recipients_list')}</h2>
        <p className="text-[#49454F] mt-3 font-medium text-lg">{t('bulk_recipients_desc')}</p>
      </div>
      
      {/* Summary Bar - Premium Design */}
      <div className="mb-10 bg-white rounded-[40px] border border-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className={`p-8 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all ${isAmountMatching ? 'bg-emerald-50/30' : 'bg-[#661489]/5'}`}>
          <div className="space-y-1 text-center sm:text-left">
            <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isAmountMatching ? 'text-emerald-600' : 'text-[#661489]'}`}>
              {isAmountMatching ? 'Distribution terminée ✓' : 'Répartition du montant'}
            </p>
            <div className="flex items-baseline justify-center sm:justify-start gap-2">
              <span className="text-3xl font-black text-slate-900">{formatNumber(totalDistributed, 'RUB')}</span>
              <span className="text-lg font-bold text-slate-400">/ {formatNumber(targetAmount, 'RUB')}</span>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-3">
            {!isAmountMatching ? (
              <div className={`px-5 py-2.5 rounded-2xl border flex items-center gap-2 shadow-sm ${totalDistributed > targetAmount ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${totalDistributed > targetAmount ? 'bg-rose-500' : 'bg-amber-500'}`} />
                <span className="text-xs font-black uppercase tracking-wider">
                  {totalDistributed > targetAmount 
                    ? `Excès : ${formatNumber(totalDistributed - targetAmount, 'RUB')}`
                    : `Manque : ${formatNumber(targetAmount - totalDistributed, 'RUB')}`}
                </span>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in duration-500">
                <CheckCircle2 size={28} />
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-slate-100 w-full relative">
          <div 
            className={`h-full transition-all duration-700 ease-out ${isAmountMatching ? 'bg-emerald-500' : (totalDistributed > targetAmount ? 'bg-rose-500' : 'bg-[#661489]')}`}
            style={{ width: `${Math.min(100, (totalDistributed / targetAmount) * 100)}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {recipients.map((r, i) => (
          <div key={i} className="bg-white rounded-[40px] border border-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.06)] p-6 sm:p-10 space-y-6 relative group overflow-hidden">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#661489]/10 flex items-center justify-center text-[#661489] font-black">
                    {i + 1}
                  </div>
                  <span className="font-black text-slate-900 uppercase text-xs tracking-widest">{t('recipient')}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onSelectFromContacts(i)}
                    className="p-3 rounded-2xl bg-slate-50 text-slate-500 hover:bg-[#661489]/10 hover:text-[#661489] transition-all"
                    title={t('choose_saved_contact')}
                  >
                    <BookUser size={20} />
                  </button>
                  {recipients.length > 1 && (
                    <button onClick={() => removeRecipient(i)} className="p-3 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                      <X size={20} />
                    </button>
                  )}
                </div>
             </div>

              <div className="grid gap-6">
                <div>
                  <input
                    type="text"
                    value={r.name}
                    onChange={e => updateRecipient(i, { name: e.target.value })}
                    placeholder={t('recipient_name')}
                    className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-[#661489] outline-none text-slate-900 font-bold bg-slate-50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="tel"
                      value={r.phone}
                      onChange={e => updateRecipient(i, { phone: e.target.value })}
                      placeholder={t('mobile_number')}
                      className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-[#661489] outline-none text-slate-900 font-bold bg-slate-50 transition-all"
                    />
                    {r.operator && (
                      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl w-fit border border-emerald-100/50">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[9px] font-black uppercase tracking-wider">{r.operator}</span>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={r.amount || ''}
                      onChange={e => updateRecipient(i, { amount: parseFloat(e.target.value) || 0 })}
                      placeholder={t('amount')}
                      className="w-full p-5 rounded-2xl border-2 border-slate-100 focus:border-[#661489] outline-none text-slate-900 font-bold bg-slate-50 transition-all pr-16"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-400">RUB</span>
                  </div>
                </div>
              </div>
          </div>
        ))}
        
        <button 
          onClick={addRecipient}
          className="w-full p-8 rounded-[40px] border-4 border-dashed border-slate-100 text-slate-300 font-black flex flex-col items-center justify-center gap-4 hover:border-[#661489]/20 hover:text-[#661489] hover:bg-[#661489]/5 transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#661489]/10">
            <Plus size={32} />
          </div>
          <span className="text-lg tracking-tight">{t('add_another_recipient')}</span>
        </button>
      </div>

      {/* Contact Picker Modal for Bulk */}
      {activeRowIndex !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">{t('my_contacts')}</h3>
              <button onClick={() => setActiveRowIndex(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
              {savedContacts.length === 0 ? (
                <div className="text-center py-12">
                  <BookUser className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-500 font-medium">{t('no_saved_contacts')}</p>
                </div>
              ) : (
                savedContacts.map((contact: any) => (
                  <button 
                    key={contact.id} 
                    onClick={() => onContactPicked(contact)}
                    className="w-full p-4 rounded-2xl border border-slate-100 hover:border-[#661489] hover:bg-[#661489]/5 flex items-center gap-4 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-[#661489]/10 group-hover:text-[#661489] transition-colors font-bold">
                      {(contact.name || contact.recipientName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{contact.name || contact.recipientName}</p>
                      <p className="text-xs text-slate-500 font-medium">{contact.phone || contact.beneficiaryAccount || contact.recipientPhone}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-[#661489] transition-colors" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons for Bulk */}
      <div className="mt-12 flex flex-col-reverse gap-4 sm:flex-row">
        <button onClick={previousStep} className="w-full px-8 py-5 rounded-full border-2 border-slate-200 text-slate-500 font-black hover:bg-slate-50 transition-all flex items-center justify-center gap-3 sm:flex-1">
          <ChevronLeft size={24} /> {t('back')}
        </button>
        <button 
          onClick={handleNext}
          disabled={!isAllValid}
          className="w-full px-8 py-5 rounded-full font-black transition-all flex items-center justify-center gap-3 bg-brand text-white shadow-xl shadow-brand/20 disabled:opacity-40 disabled:bg-slate-300 sm:flex-[2]"
        >
          {t('next')} <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

