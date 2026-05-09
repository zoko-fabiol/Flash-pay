import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  DollarSign, 
  Globe, 
  Activity,
  ArrowUpRight,
  Filter,
  Download,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { collection, query, onSnapshot, Timestamp, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Transaction, ExchangeRate } from '../../types';

const COLORS = ['#6750A4', '#9B89C9', '#EADDFF', '#21005D', '#49454F', '#79747E'];

const AnalyticsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [globalStats, setGlobalStats] = useState({ rub: 0, xaf: 0, count: 0 });
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | 'this_year'>('30d');

  useEffect(() => {
    // All-time global totals
    const qGlobal = query(collection(db, 'transactions'));
    const unsubGlobal = onSnapshot(qGlobal, (snapshot) => {
      let rub = 0;
      let xaf = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Transaction;
        if (data.currency === 'RUB') rub += data.amount;
        else if (data.currency === 'XAF') xaf += data.amount;
      });
      setGlobalStats({ rub, xaf, count: snapshot.size });
    });

    const qRates = query(collection(db, 'exchange_rates'));
    const unsubRates = onSnapshot(qRates, (snapshot) => {
      setRates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExchangeRate)));
    });

    const now = new Date();
    let start = new Date();
    if (timeRange === '30d') start.setDate(now.getDate() - 30);
    else if (timeRange === '90d') start.setDate(now.getDate() - 90);
    else if (timeRange === 'this_year') start = new Date(now.getFullYear(), 0, 1);

    const q = query(
      collection(db, 'transactions'),
      where('createdAt', '>=', Timestamp.fromDate(start))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubGlobal();
      unsubRates();
    };
  }, [timeRange]);

  // Aggregates
  const stats = useMemo(() => {
    const totalVolumeRUB = transactions.reduce((acc, tx) => acc + (tx.currency === 'RUB' ? tx.amount : 0), 0);
    const totalVolumeXAF = transactions.reduce((acc, tx) => acc + (tx.currency === 'XAF' ? tx.amount : 0), 0);
    const completed = transactions.filter(t => t.status === 'completed').length;
    const successRate = transactions.length > 0 ? (completed / transactions.length) * 100 : 0;
    
    // Process Operators
    const ops: Record<string, number> = {};
    transactions.forEach(t => {
      let op = t.operator || t.selectedOperator;
      // If it's a Russian transaction but operator is missing, call it 'Russie'
      if (!op && (t.toCountry === 'RU' || t.fromCountry === 'RU' || t.currency === 'RUB')) {
        op = 'Russie';
      }
      op = op || 'Inconnu';
      ops[op] = (ops[op] || 0) + 1;
    });
    const operatorData = Object.entries(ops)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Process Countries
    const countries: Record<string, number> = {};
    transactions.forEach(t => {
      const c = t.toCountry || t.destinationCountry || 'Autre';
      countries[c] = (countries[c] || 0) + (t.currency === 'RUB' ? t.amount : t.amount / 10); // Simplified normalization
    });
    const countryData = Object.entries(countries)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Process Time Series (Daily Volume)
    const timeSeries: Record<string, { rub: number, xaf: number }> = {};
    transactions.forEach(t => {
      const date = t.createdAt instanceof Timestamp ? t.createdAt.toDate() : new Date(t.createdAt as any);
      const day = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      if (!timeSeries[day]) timeSeries[day] = { rub: 0, xaf: 0 };
      if (t.currency === 'RUB') timeSeries[day].rub += t.amount;
      else timeSeries[day].xaf += t.amount;
    });
    const chartData = Object.entries(timeSeries).map(([name, vals]) => ({ name, ...vals }));

    return { totalVolumeRUB, totalVolumeXAF, successRate, operatorData, countryData, chartData, totalCount: transactions.length };
  }, [transactions]);

  const combinedStats = useMemo(() => {
    const rubToXaf = rates.find(r => r.from === 'RUB' && r.to === 'XAF')?.rate || 10;
    const xafToRub = rates.find(r => r.from === 'XAF' && r.to === 'RUB')?.rate || 0.1;
    
    return {
      totalInRub: globalStats.rub + (globalStats.xaf * xafToRub),
      totalInXaf: globalStats.xaf + (globalStats.rub * rubToXaf)
    };
  }, [globalStats, rates]);

  const generatePDF = () => {
    const t_toast = toast.loading('Génération du rapport PDF...');
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Header
      pdf.setFillColor(103, 80, 164); // #6750A4
      pdf.rect(0, 0, pageWidth, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FLASH PAY - ANALYTICS', pageWidth / 2, 22, { align: 'center' });
      pdf.setFontSize(9);
      pdf.text(`Rapport genere le ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, 32, { align: 'center' });

      // KPIs
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(13);
      pdf.text('RESUME DES INDICATEURS CLES', 20, 55);
      pdf.setDrawColor(220, 220, 220);
      pdf.line(20, 58, pageWidth - 20, 58);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const volRub = `Volume Global: ${stats.totalVolumeRUB.toLocaleString('en-US').replace(/,/g, ' ')} RUB`;
      const volXaf = `Volume Mobile: ${stats.totalVolumeXAF.toLocaleString('en-US').replace(/,/g, ' ')} XAF`;
      
      pdf.text(volRub, 25, 70);
      pdf.text(volXaf, 25, 80);
      pdf.text(`Taux de Succes: ${stats.successRate.toFixed(1)}%`, 25, 90);
      pdf.text(`Total Transactions: ${stats.totalCount}`, 25, 100);
      pdf.text(`Destinations Actives: ${stats.countryData.length}`, 25, 110);

      // Insights
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RESUME STRATEGIQUE', 20, 130);
      pdf.line(20, 133, pageWidth - 20, 133);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const insight1 = `Meilleur Operateur: ${stats.operatorData[0]?.name || 'N/A'} (${stats.operatorData[0]?.value || 0} tx)`;
      const insight2 = `Destination Principale: ${stats.countryData[0]?.name || 'N/A'}`;
      const insight3 = `Statut Systeme: ${stats.successRate > 90 ? 'Stable' : 'Frictions detectees'}`;
      
      pdf.text(insight1, 25, 145);
      pdf.text(insight2, 25, 155);
      pdf.text(insight3, 25, 165);

      // Visual Chart - Distribution des flux (moved down)
      pdf.setFillColor(234, 221, 255); // #EADDFF
      pdf.rect(20, 175, pageWidth - 40, 30, 'F');
      pdf.setTextColor(103, 80, 164);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DISTRIBUTION DES FLUX (RUB vs XAF)', pageWidth / 2, 185, { align: 'center' });
      
      const rubRatio = stats.totalVolumeRUB / (stats.totalVolumeRUB + (stats.totalVolumeXAF * 10) || 1);
      pdf.setFillColor(103, 80, 164);
      pdf.rect(30, 190, (pageWidth - 60) * rubRatio, 8, 'F');
      pdf.setFillColor(155, 137, 201);
      pdf.rect(30 + (pageWidth - 60) * rubRatio, 190, (pageWidth - 60) * (1 - rubRatio), 8, 'F');

      // Distribution Table
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DISTRIBUTION PAR OPERATEUR', 20, 220);
      pdf.line(20, 223, pageWidth - 20, 223);

      let y = 235;
      stats.operatorData.forEach((op, index) => {
        // Visual Bar
        const barWidth = (op.value / (stats.totalCount || 1)) * (pageWidth - 60);
        pdf.setFillColor(243, 237, 247);
        pdf.rect(25, y - 5, pageWidth - 50, 12, 'F');
        pdf.setFillColor(103, 80, 164);
        pdf.rect(25, y - 5, barWidth, 12, 'F');

        pdf.setTextColor(op.value / stats.totalCount > 0.4 ? 255 : 30);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(op.name, 30, y + 3);
        
        pdf.setTextColor(30);
        pdf.text(`${op.value} transactions`, pageWidth - 65, y + 3);
        y += 15;
      });

      // Footer
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(8);
      pdf.text('Flash Pay Business Intelligence - Confidentiel', pageWidth / 2, 285, { align: 'center' });

      pdf.save(`FlashPay_Analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Rapport PDF généré !', { id: t_toast });
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la génération du PDF', { id: t_toast });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-[#6750A4] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 text-[#49454F] font-black uppercase text-[10px] tracking-widest">Calcul des indicateurs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight">Analytics & Performances</h2>
          <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Exploration des données et flux monétaires</p>
        </div>
        
        <div className="flex items-center gap-3 bg-[#F3EDF7] p-1.5 rounded-[24px] border border-[#E7E0EB] shadow-sm">
           {[
             { id: '30d', label: '30 Jours' },
             { id: '90d', label: '90 Jours' },
             { id: 'this_year', label: 'Année 2024' }
           ].map(range => (
             <button 
              key={range.id}
              onClick={() => setTimeRange(range.id as any)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range.id ? 'bg-[#6750A4] text-white shadow-md' : 'text-[#49454F] hover:bg-white'}`}
             >
               {range.label}
             </button>
           ))}
        </div>
      </div>

      {/* Global All-Time Totals Banner */}
      <div className="bg-gradient-to-r from-[#6750A4] to-[#21005D] rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <Globe size={300} strokeWidth={1} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/10 rounded-lg"><Activity size={20} /></div>
            <h3 className="text-sm font-black uppercase tracking-[0.3em] opacity-80">Cumul Total Historique (Tous Temps)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Volume Total RU</p>
              <h4 className="text-3xl font-black tracking-tight">{globalStats.rub.toLocaleString()} <span className="text-sm opacity-40">RUB</span></h4>
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Volume Total FCFA</p>
              <h4 className="text-3xl font-black tracking-tight">{globalStats.xaf.toLocaleString()} <span className="text-sm opacity-40">XAF</span></h4>
            </div>
            <div className="sm:border-l sm:border-white/10 sm:pl-10">
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Combina (Estimation)</p>
              <h4 className="text-3xl font-black tracking-tight text-emerald-300">
                {combinedStats.totalInRub.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-sm opacity-60 text-white">RUB</span>
              </h4>
              <p className="text-[9px] font-bold opacity-60 mt-1 italic">Soit env. {combinedStats.totalInXaf.toLocaleString(undefined, { maximumFractionDigits: 0 })} FCFA</p>
            </div>
            <div className="lg:text-right">
              <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Transactions</p>
              <h4 className="text-3xl font-black tracking-tight">{globalStats.count}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="m3-card-elevated group">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-[#EADDFF] text-[#21005D] rounded-2xl group-hover:scale-110 transition-transform shadow-sm"><DollarSign size={20} /></div>
               <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><TrendingUp size={12} /> +14%</div>
            </div>
            <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest">Volume Global (RUB)</p>
            <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight mt-1">{stats.totalVolumeRUB.toLocaleString()} ₽</h3>
         </div>

         <div className="m3-card-elevated group">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-[#F3EDF7] text-[#6750A4] rounded-2xl group-hover:scale-110 transition-transform shadow-sm"><Activity size={20} /></div>
               <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle2 size={12} /> {stats.successRate.toFixed(1)}%</div>
            </div>
            <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest">Taux de Succès</p>
            <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight mt-1">{stats.totalCount} <span className="text-sm opacity-40">Orders</span></h3>
         </div>

         <div className="m3-card-elevated group">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-[#E7E0EB] text-[#49454F] rounded-2xl group-hover:scale-110 transition-transform shadow-sm"><CreditCard size={20} /></div>
            </div>
            <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest">Volume Mobile Money</p>
            <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight mt-1">{stats.totalVolumeXAF.toLocaleString()} <span className="text-sm opacity-40">FCFA</span></h3>
         </div>

         <div className="m3-card-elevated group">
            <div className="flex justify-between items-start mb-4">
               <div className="p-3 bg-[#EADDFF] text-[#21005D] rounded-2xl group-hover:scale-110 transition-transform shadow-sm"><Globe size={20} /></div>
            </div>
            <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest">Pays Actifs</p>
            <h3 className="text-2xl font-black text-[#1D1B20] tracking-tight mt-1">{stats.countryData.length} <span className="text-sm opacity-40">Destinations</span></h3>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Time Series Chart */}
        <div className="lg:col-span-2 m3-card-elevated !p-8">
           <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-[#EADDFF] text-[#21005D] rounded-lg shadow-sm"><TrendingUp size={18} /></div>
                 <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Courbe de Croissance</h3>
              </div>
              <button className="p-2 text-[#49454F] hover:bg-[#F3EDF7] rounded-full transition-all"><Download size={18} /></button>
           </div>
           
           <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="colorRub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6750A4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6750A4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E7E0EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#49454F'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 900, fill: '#49454F'}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: '1px solid #E7E0EB', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '15px' }}
                    labelStyle={{ fontWeight: 900, color: '#1D1B20', marginBottom: '10px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  <Area name="Volume RUB" type="monotone" dataKey="rub" stroke="#6750A4" strokeWidth={4} fillOpacity={1} fill="url(#colorRub)" animationDuration={2000} />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Operator Distribution */}
        <div className="m3-card-elevated !p-8">
           <div className="flex items-center gap-3 mb-10">
              <div className="p-2 bg-[#F3EDF7] text-[#6750A4] rounded-lg shadow-sm"><Activity size={18} /></div>
              <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Répartition Opérateurs</h3>
           </div>
           
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.operatorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {stats.operatorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
           </div>
           
           <div className="space-y-4 mt-6">
              {stats.operatorData.map((op, i) => (
                <div key={op.name} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                      <span className="text-[11px] font-bold text-[#1D1B20] uppercase tracking-tight">{op.name}</span>
                   </div>
                   <span className="text-[11px] font-black text-[#6750A4]">{op.value} tx</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* Country Performance */}
         <div className="m3-card-elevated !p-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="p-2 bg-[#EADDFF] text-[#21005D] rounded-lg shadow-sm"><Globe size={18} /></div>
              <h3 className="text-xl font-black text-[#1D1B20] tracking-tight">Performance par Pays</h3>
            </div>
            
            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={stats.countryData} layout="vertical" margin={{ left: 20 }}>
                   <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E7E0EB" />
                   <XAxis type="number" hide />
                   <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={40} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 900, fill: '#1D1B20'}}
                   />
                   <Tooltip 
                    cursor={{fill: '#F3EDF7'}}
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                   />
                   <Bar dataKey="value" fill="#6750A4" radius={[0, 10, 10, 0]} barSize={20} animationDuration={1500} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Health Check / Quick Insights */}
         <div className="m3-card-elevated !p-8 bg-gradient-to-br from-[#6750A4] to-[#21005D] text-white">
            <h3 className="text-2xl font-black tracking-tight mb-8">Résumé Stratégique</h3>
            
            <div className="space-y-8">
               <div className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0"><TrendingUp size={24} /></div>
                  <div>
                     <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Meilleure Performance</p>
                     <p className="text-lg font-bold">L'opérateur {stats.operatorData[0]?.name || '...'} domine le marché avec {stats.operatorData[0]?.value || 0} transactions sur cette période.</p>
                  </div>
               </div>

               <div className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0"><Globe size={24} /></div>
                  <div>
                     <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Hub Logistique</p>
                     <p className="text-lg font-bold">La destination {stats.countryData[0]?.name || '...'} représente votre plus gros volume de flux monétaires sortants.</p>
                  </div>
               </div>

               <div className="flex gap-6 items-start">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0"><Activity size={24} /></div>
                  <div>
                     <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Stabilité Réseau</p>
                     <p className="text-lg font-bold">Votre taux de complétion est de {stats.successRate.toFixed(1)}%. {stats.successRate > 90 ? 'Le système est extrêmement stable.' : 'Quelques frictions détectées dans le tunnel.'}</p>
                  </div>
               </div>
            </div>

            <div className="mt-12 pt-12 border-t border-white/10">
               <button onClick={generatePDF} className="w-full py-4 bg-white text-[#6750A4] rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">Générer Rapport PDF</button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
