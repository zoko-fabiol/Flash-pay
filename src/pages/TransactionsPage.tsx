import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { db } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';
import { Loading } from '../components/UI';
import { Users } from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { user } = useAuth();
  const { t, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    const unsubC = onSnapshot(collection(db, 'countries'), (s) => setCountries(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    if (!user) return;

    const q = query(collection(db, 'transactions'), where('userId', '==', user.id));
    const unsubT = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      // Sort by createdAt descending
      data.sort((a, b) => {
        const t1 = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || a.createdAt || 0;
        const t2 = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || b.createdAt || 0;
        return t2 - t1;
      });
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to transactions:', error);
      setLoading(false);
    });

    return () => {
      unsubC();
      unsubT();
    };
  }, [user]);

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['pending', 'proof_received', 'confirmed', 'flagged_problem'].includes(t.status);
    return t.status === filter;
  });

  const getStatusLabel = (status: string) => {
    return t(`status_${status.toLowerCase()}`);
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      proof_received: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-indigo-100 text-indigo-700',
      completed: 'bg-emerald-100 text-emerald-700',
      failed: 'bg-rose-100 text-rose-700',
      flagged_problem: 'bg-orange-100 text-orange-700',
      cancelled: 'bg-slate-100 text-slate-700',
    };

    return classes[status] || classes.pending;
  };

  const getOperatorLogo = (tx: any) => {
    if (!tx.recipientOperator) return null;
    
    // Try with explicit code first
    const code = tx.destinationCountry || tx.originCountry;
    if (code) {
      const c = countries.find(c => c.code === code);
      const op = c?.operators?.find((o: any) => o.name === tx.recipientOperator);
      if (op?.logo) return op.logo;
    }
    
    // Fallback: search in all countries for this operator name
    for (const c of countries) {
      const op = c.operators?.find((o: any) => o.name === tx.recipientOperator);
      if (op?.logo) return op.logo;
    }
    
    return null;
  };

  const getCountryName = (tx: any) => {
    const code = tx.destinationCountry || tx.originCountry;
    
    if (code) {
      if (code === 'RU') return t('russia');
      const country = countries.find(c => c.code === code);
      if (country) return country.name; // Countries from DB are in French for now, but I could add keys
    }
    
    // Legacy inference by phone number
    const phone = tx.recipientPhone || tx.recipientAccount || tx.beneficiaryAccount || '';
    if (phone.startsWith('+7') || phone.startsWith('7')) return t('russia');
    
    if (phone.length === 9 && phone.startsWith('6')) return t('cameroon');
    if (phone.startsWith('237') || phone.startsWith('+237')) return t('cameroon');

    return code || t('unknown_country');
  };

  return (
    <Layout>
      <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="px-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2 sm:text-5xl">{t('history_title')}</h1>
          <p className="text-slate-500 font-bold uppercase text-[11px] tracking-[0.2em] opacity-70">{t('history_desc')}</p>
        </div>

        {/* Filters - High Contrast M3 Style */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-2">
          {(['all', 'completed', 'pending', 'failed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-sm ${
                filter === status
                  ? 'bg-[#6750A4] text-white shadow-xl shadow-[#6750A4]/20'
                  : 'bg-[#F3EDF7] text-[#6750A4] hover:bg-[#EADDFF]'
              }`}
            >
              {t(`filter_${status}`)}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="py-20 flex justify-center"><Loading /></div>
        ) : filteredTransactions.length === 0 ? (
          <div className="mx-2 bg-white rounded-[40px] p-16 text-center border border-[#eadfff] shadow-xl shadow-slate-900/5">
            <div className="w-24 h-24 bg-[#F3EDF7] rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">📭</div>
            <p className="text-slate-900 font-black text-2xl tracking-tight mb-2">{t('no_transactions')}</p>
            <p className="text-slate-400 font-medium">{t('no_transactions_filter')}</p>
          </div>
        ) : (
          <div className="grid gap-6 px-2">
            {filteredTransactions.map(tx => {
              const logoUrl = getOperatorLogo(tx);
              const isBulk = tx.isBulk || (tx.bulkRecipients && tx.bulkRecipients.length > 0);
              const displayName = isBulk 
                ? (tx.bulkRecipients && tx.bulkRecipients.length > 0 
                    ? `${tx.bulkRecipients[0].name.split(' ')[0]} et d'autres`
                    : "Transfert Multiple")
                : (tx.recipientName || t('unknown_recipient'));
              
              const displayPhone = isBulk 
                ? `${tx.bulkRecipients?.length || 0} bénéficiaires`
                : (tx.recipientPhone || tx.recipientAccount || tx.beneficiaryAccount || t('unknown_number'));

              return (
                <button
                  key={tx.id}
                  onClick={() => navigate(`/transactions/${tx.id}`)}
                  className={`bg-white p-6 sm:p-8 rounded-[40px] border transition-all duration-500 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group text-left relative overflow-hidden ${
                    isBulk 
                      ? 'border-[#6236CC]/30 bg-gradient-to-br from-white via-white to-[#F3EDF7]/40 shadow-2xl shadow-[#6236CC]/10' 
                      : 'border-[#eadfff] hover:border-[#6236CC]/40 hover:shadow-2xl hover:shadow-[#6236CC]/15 shadow-xl shadow-slate-900/5'
                  }`}
                >
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center text-2xl text-[#6236CC] border border-slate-100 font-black shrink-0 overflow-hidden shadow-sm group-hover:scale-110 transition-transform duration-500">
                      {logoUrl ? (
                        <img src={logoUrl} alt="logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <div className="w-full h-full bg-[#F3EDF7] flex items-center justify-center">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-xl tracking-tight mb-1 group-hover:text-[#6236CC] transition-colors">{displayName}</div>
                      <div className="text-[11px] text-slate-400 font-black uppercase tracking-[0.1em] opacity-80 flex items-center gap-2">
                        {displayPhone}
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        {getCountryName(tx)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 relative z-10 border-t border-slate-50 lg:border-0 pt-6 lg:pt-0">
                    <div className="text-left lg:text-right">
                      <div className="font-black text-3xl text-slate-900 tracking-tighter mb-1">
                        {formatNumber(tx.amount, tx.currency)}
                      </div>
                      {tx.fee > 0 && (
                        <div className="inline-flex px-2 py-0.5 bg-rose-50 text-rose-500 text-[10px] font-black rounded-lg border border-rose-100 uppercase tracking-widest">
                          {t('fees')}: {formatNumber(tx.fee, 'RUB')}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1.5 opacity-60">
                          {tx.createdAt?.toDate 
                            ? tx.createdAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) 
                            : new Date(tx.createdAt?.seconds ? tx.createdAt.seconds * 1000 : tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-widest shadow-sm border border-current/10 ${getStatusClass(tx.status)}`}>
                          {getStatusLabel(tx.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Decorative element for Bulk */}
                  {isBulk && (
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Users size={80} className="text-[#6236CC]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};
