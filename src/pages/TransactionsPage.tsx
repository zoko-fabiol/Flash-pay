import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { db } from '../services/firebase';
import { useLanguage } from '../context/LanguageContext';
import { Loading } from '../components/UI';

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
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{t('history_title')}</h1>
          <p className="text-slate-600">{t('history_desc')}</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {(['all', 'completed', 'pending', 'failed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                filter === status
                  ? 'bg-brand text-white shadow-md shadow-brand/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {t(`filter_${status}`)}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        {loading ? (
          <Loading />
        ) : filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-[28px] p-12 text-center border border-[#eadfff] shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📭</div>
            <p className="text-slate-900 font-bold text-lg mb-1">{t('no_transactions')}</p>
            <p className="text-slate-500">{t('no_transactions_filter')}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTransactions.map(tx => {
              const logoUrl = getOperatorLogo(tx);
              return (
              <button
                key={tx.id}
                onClick={() => navigate(`/transactions/${tx.id}`)}
                className="bg-white p-5 rounded-[28px] border border-[#eadfff] hover:border-brand/30 hover:shadow-[0_18px_45px_rgba(98,54,204,0.10)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5 group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-xl bg-brand/5 text-brand border border-brand/10 font-black shrink-0 overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      tx.recipientName?.charAt(0) || '?'
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-lg">{tx.recipientName || t('unknown_recipient')}</div>
                    <div className="text-sm text-slate-500 font-medium">
                      {tx.recipientPhone || tx.recipientAccount || tx.beneficiaryAccount || t('unknown_number')} • {getCountryName(tx)}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end gap-2 border-t border-slate-100 sm:border-0 pt-4 sm:pt-0 mt-2 sm:mt-0">
                  <div className="text-left sm:text-right">
                    <div className="font-black text-xl text-slate-900">{formatNumber(tx.amount, tx.currency)}</div>
                    {tx.fee > 0 && <div className="text-xs font-bold text-rose-500">{t('fees')}: {formatNumber(tx.fee, 'XAF')}</div>}
                  </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      {tx.isBulk && (
                        <span className="px-2 py-0.5 bg-brand/10 text-brand text-[9px] font-black rounded uppercase tracking-tighter">
                          {tx.bulkRecipients?.length || 0} Destinataires
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                        {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString('fr-FR') : new Date(tx.createdAt?.seconds ? tx.createdAt.seconds * 1000 : tx.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest ${getStatusClass(tx.status)}`}>
                        {getStatusLabel(tx.status)}
                      </span>
                    </div>
                </div>
              </button>
            )})}
          </div>
        )}
      </div>
    </Layout>
  );
};
