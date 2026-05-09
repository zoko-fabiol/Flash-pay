import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
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

    const q = query(collection(db, 'transactions'), where('userId', '==', user.id), limit(100));
    const unsubT = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      // Sort by createdAt descending
      data.sort((a, b) => {
        const t1 = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0) || 0;
        const t2 = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) || 0;
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
        <div className="px-2 space-y-2">
          <h1 className="text-5xl font-bold text-slate-900 tracking-tight">{t('history_title')}</h1>
          <p className="text-slate-500 font-medium text-sm tracking-wide">{t('history_desc')}</p>
        </div>

        {/* Filters - Modern Style */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-2">
          {(['all', 'completed', 'pending', 'failed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
                filter === status
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
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
          <div className="mx-2 premium-card p-20 text-center">
            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">📭</div>
            <p className="text-slate-900 font-bold text-2xl tracking-tight mb-2">{t('no_transactions')}</p>
            <p className="text-slate-400 font-medium">{t('no_transactions_filter')}</p>
          </div>
        ) : (
          <div className="grid gap-4 px-2">
            {filteredTransactions.map(tx => {
              const logoUrl = getOperatorLogo(tx);
              const isBulk = tx.isBulk || (tx.bulkRecipients && tx.bulkRecipients.length > 0);
              const displayName = isBulk 
                ? (tx.bulkRecipients && tx.bulkRecipients.length > 0 
                    ? `${tx.bulkRecipients[0].name.split(' ')[0]} ${t('and_others', { count: tx.bulkRecipients.length - 1 })}`
                    : t('multiple_transfer'))
                : (tx.recipientName || t('unknown_recipient'));
              
              const displayPhone = isBulk 
                ? t('beneficiaries_count', { count: tx.bulkRecipients?.length || 0 })
                : (tx.recipientPhone || tx.recipientAccount || tx.beneficiaryAccount || t('unknown_number'));

              return (
                <button
                  key={tx.id}
                  onClick={() => navigate(`/transactions/${tx.id}`)}
                  className={`group relative flex flex-col gap-6 rounded-3xl border bg-white p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 lg:flex-row lg:items-center lg:justify-between ${
                    isBulk 
                      ? 'border-primary/30' 
                      : 'border-slate-50 shadow-sm'
                  }`}
                >
                    <div className="flex items-center gap-5">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/5 border border-slate-50 shadow-sm transition-transform duration-500 group-hover:scale-110">
                        {logoUrl ? (
                          <img src={logoUrl} alt="logo" className="h-full w-full object-contain p-2" />
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1 text-left">
                        <h4 className="truncate text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-primary">
                          {displayName}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <span className="truncate">{displayPhone}</span>
                          <span className="h-1 w-1 shrink-0 rounded-full bg-slate-200" />
                          <span className="truncate">{getCountryName(tx)}</span>
                        </div>
                      </div>
                    </div>
                  
                  <div className="flex flex-1 flex-row items-end justify-between border-t border-slate-50 pt-4 lg:flex-col lg:items-end lg:justify-center lg:border-t-0 lg:pt-0">
                    <div className="space-y-1 text-left lg:text-right">
                      <div className="text-3xl font-bold tracking-tight text-slate-900">
                        {formatNumber(tx.amount, tx.currency)}
                      </div>
                      {tx.fee > 0 && (
                        <div className="text-[10px] font-bold uppercase tracking-widest text-rose-500/60">
                          +{formatNumber(tx.fee, 'RUB')} {t('fees')}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                        {tx.createdAt?.toDate 
                          ? tx.createdAt.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) 
                          : new Date(tx.createdAt?.seconds ? tx.createdAt.seconds * 1000 : tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                      <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest shadow-sm transition-colors ${getStatusClass(tx.status)}`}>
                        {getStatusLabel(tx.status)}
                      </div>
                    </div>
                  </div>

                  {isBulk && (
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Users size={80} className="text-primary" />
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
