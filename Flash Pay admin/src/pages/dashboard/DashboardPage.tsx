import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Activity,
  ArrowRight
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { collection, query, where, onSnapshot, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Transaction, ProblemReport } from '../../types';

const asDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const StatCard = ({ title, value, change, icon: Icon, trend }: any) => {
  return (
    <div className="m3-card-elevated group relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
        <Icon size={120} />
      </div>
      <div className="flex justify-between items-start mb-6">
        <div className="p-4 bg-[#F3EDF7] text-[#6750A4] rounded-[20px] group-hover:scale-110 transition-transform duration-500 shadow-sm border border-[#E7E0EB]">
          <Icon size={24} strokeWidth={2.5} />
        </div>
        {change && change !== '-' && (
          <div className={`flex items-center gap-1 text-[9px] font-black px-2.5 py-1.5 rounded-full shadow-sm ${trend === 'up' ? 'bg-[#E8DEF8] text-[#1D192B]' : 'bg-[#F9DEDC] text-[#B3261E]'}`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {change}%
          </div>
        )}
      </div>
      <h3 className="text-[#49454F] text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</h3>
      <p className="text-3xl font-black text-[#1D1B20] tracking-tighter">{value}</p>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    todayTransactions: 0,
    totalVolumeEur: 0,
    totalVolumeRub: 0,
    activeUsers: 0
  });
  const [alerts, setAlerts] = useState<ProblemReport[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<{name: string, count: number}[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const qToday = query(
      collection(db, 'transactions'),
      where('createdAt', '>=', Timestamp.fromDate(startOfDay))
    );

    const unsubToday = onSnapshot(qToday, (snapshot) => {
      const txs = snapshot.docs.map(doc => doc.data() as Transaction);
      let volumeXaf = 0;
      let volumeRub = 0;
      
      txs.forEach(tx => {
        if (tx.currency === 'XAF') volumeXaf += tx.amount;
        if (tx.currency === 'RUB') volumeRub += tx.amount;
      });
      
      setStats(prev => ({
        ...prev,
        todayTransactions: txs.length,
        totalVolumeEur: volumeXaf,
        totalVolumeRub: volumeRub
      }));
    });

    const qRecent = query(
      collection(db, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Transaction));
      setRecentTransactions(txs);
      
      const routes: Record<string, number> = {};
      txs.forEach(t => {
        const route = `${t.fromCountry || 'RU'} → ${t.toCountry || 'AF'}`;
        routes[route] = (routes[route] || 0) + 1;
      });
      const sorted = Object.entries(routes)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      setPopularRoutes(sorted);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStats(prev => ({
        ...prev,
        activeUsers: snapshot.size
      }));
    });

    const qAlerts = query(collection(db, 'problem_reports'), where('status', '==', 'pending'));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      const alertRows = snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) } as ProblemReport))
        .sort((a, b) => {
          const at = asDate((a as any).createdAt)?.getTime() || 0;
          const bt = asDate((b as any).createdAt)?.getTime() || 0;
          return bt - at;
        })
        .slice(0, 3);
      setAlerts(alertRows);
    });

    const qChart = query(
      collection(db, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubChart = onSnapshot(qChart, (snapshot) => {
      const txs = snapshot.docs.map(doc => doc.data() as Transaction);
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const counts: Record<string, number> = {};
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        counts[days[d.getDay()]] = 0;
      }

      txs.forEach(tx => {
        const date = asDate((tx as any).createdAt);
        if (!date) return;
        const dayName = days[date.getDay()];
        if (counts[dayName] !== undefined) {
          counts[dayName]++;
        }
      });

      const formattedData = Object.entries(counts).map(([name, value]) => ({ name, value }));
      setChartData(formattedData);
    });

    return () => {
      unsubToday();
      unsubRecent();
      unsubUsers();
      unsubAlerts();
      unsubChart();
    };
  }, []);

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Quick Stats Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
           <h2 className="text-3xl font-black text-[#1D1B20] tracking-tight">Tableau de Bord</h2>
           <p className="text-[#49454F] text-xs font-black uppercase tracking-[0.2em] mt-2">Suivi global des opérations Flash Pay</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#E7E0EB] shadow-sm">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-black uppercase tracking-widest text-[#1D1B20]">Système Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          title="Transactions (24h)" 
          value={stats.todayTransactions} 
          icon={CreditCard} 
          trend="up"
          change="12"
        />
        <StatCard 
          title="Volume XAF" 
          value={`${stats.totalVolumeEur.toLocaleString()}`} 
          icon={DollarSign} 
          trend="up"
          change="8"
        />
        <StatCard 
          title="Volume RUB" 
          value={`${stats.totalVolumeRub.toLocaleString()} ₽`} 
          icon={TrendingUp} 
          trend="up" 
          change="5"
        />
        <StatCard 
          title="Total Clients" 
          value={stats.activeUsers} 
          icon={Users} 
          trend="up" 
          change="2"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 m3-card-elevated">
          <div className="flex justify-between items-center mb-10">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-[#EADDFF] text-[#21005D] rounded-lg shadow-sm"><Activity size={18} /></div>
                <h2 className="text-xl font-black text-[#1D1B20] tracking-tight">Flux Hebdomadaire</h2>
              </div>
              <p className="text-[#49454F] text-[9px] font-black uppercase tracking-widest ml-11 opacity-60">Volume des transactions par jour</p>
            </div>
            <button className="m3-btn-tonal !py-2 !px-4 text-[9px] uppercase tracking-widest">Détails <ArrowRight size={14} /></button>
          </div>
          
          <div className="h-[350px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6750A4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6750A4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#E7E0EB" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#49454F" 
                  fontSize={10} 
                  fontWeight={900} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={15}
                  tickFormatter={(val) => val.toUpperCase()}
                />
                <YAxis 
                  stroke="#49454F" 
                  fontSize={10} 
                  fontWeight={900} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-15} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FEF7FF', border: '1px solid #E7E0EB', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px' }}
                  labelStyle={{ fontWeight: 900, color: '#1D1B20', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase' }}
                  itemStyle={{ color: '#6750A4', fontWeight: 800, fontSize: '14px' }}
                  cursor={{ stroke: '#6750A4', strokeWidth: 2, strokeDasharray: '5 5' }}
                />
                <Area type="monotone" dataKey="value" stroke="#6750A4" strokeWidth={5} fillOpacity={1} fill="url(#colorValue)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts / Activity Feed */}
        <div className="m3-card-elevated flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-[#F9DEDC] text-[#B3261E] rounded-lg shadow-sm"><AlertCircle size={18} /></div>
            <h2 className="text-xl font-black text-[#1D1B20] tracking-tight">Signalaments (Live)</h2>
          </div>
          
          <div className="space-y-5 flex-1">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[#F3EDF7]/30 rounded-[32px] border-2 border-dashed border-[#E7E0EB]">
                <div className="w-16 h-16 bg-white text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <CheckCircle2 size={32} />
                </div>
                <p className="text-[#1D1B20] text-sm font-black uppercase tracking-tight">R.A.S</p>
                <p className="text-[#49454F] text-[10px] font-bold uppercase mt-1 opacity-60">Aucun litige en attente</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="group p-5 bg-[#FEF7FF] border border-[#E7E0EB] rounded-[28px] hover:bg-[#F9DEDC]/20 hover:border-[#F9DEDC] transition-all cursor-pointer relative overflow-hidden shadow-sm">
                  <div className="flex gap-4 relative z-10">
                    <div className="text-[#B3261E] shrink-0 p-2 bg-white rounded-xl shadow-sm"><AlertCircle size={20} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1D1B20] text-[10px] font-black uppercase tracking-[0.2em]">{(alert.type || 'Inconnu').replace('_', ' ')}</p>
                      <p className="text-[#49454F] text-xs mt-1 font-bold line-clamp-2 leading-relaxed">{alert.description}</p>
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#E7E0EB]">
                         <p className="text-[#49454F] text-[9px] font-black flex items-center gap-1.5 uppercase opacity-40">
                          <Clock size={12} /> {asDate((alert as any).createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '-'}
                        </p>
                        <ChevronRight className="ml-auto text-[#49454F]/30 group-hover:text-[#B3261E] group-hover:translate-x-1 transition-all" size={16} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <button className="w-full mt-8 m3-btn-tonal !py-4 uppercase text-[10px] tracking-widest">Voir tous les incidents</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Popular Routes Visualization */}
        <div className="m3-card-elevated">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-[#EADDFF] text-[#21005D] rounded-lg shadow-sm"><MapPin size={18} /></div>
            <h2 className="text-xl font-black text-[#1D1B20] tracking-tight">Axes Stratégiques</h2>
          </div>
          
          <div className="space-y-8">
            {popularRoutes.length === 0 ? (
              <p className="text-center py-10 text-[#49454F] text-xs font-bold uppercase opacity-40 tracking-widest italic">Analyse des flux mondiaux...</p>
            ) : (
              popularRoutes.map((route, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-end mb-3 px-1">
                    <span className="text-sm font-black text-[#1D1B20] uppercase tracking-tighter">{route.name}</span>
                    <span className="text-[10px] text-[#6750A4] font-black uppercase tracking-widest">{route.count} transferts</span>
                  </div>
                  <div className="h-4 bg-[#F3EDF7] rounded-full overflow-hidden p-0.5 border border-[#E7E0EB]">
                    <div 
                      className="h-full bg-gradient-to-r from-[#6750A4] to-[#9B89C9] rounded-full transition-all duration-1000 shadow-lg shadow-[#6750A4]/20" 
                      style={{ width: `${Math.max(10, (route.count / (recentTransactions.length || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Feed Feed */}
        <div className="m3-card-elevated">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-[#F3EDF7] text-[#6750A4] rounded-lg shadow-sm"><Clock size={18} /></div>
            <h2 className="text-xl font-black text-[#1D1B20] tracking-tight">Activité Récente</h2>
          </div>
          
          <div className="space-y-4">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-[#F3EDF7]/50 rounded-[28px] transition-all border border-transparent hover:border-[#E7E0EB] group cursor-pointer shadow-sm bg-white/50">
                <div className="w-12 h-12 bg-[#EADDFF] text-[#21005D] rounded-[18px] flex items-center justify-center font-black text-sm shadow-inner group-hover:scale-110 transition-transform">
                  {tx.toCountry?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#1D1B20] truncate tracking-tight uppercase">#{String(tx.id || '').substring(0, 10)}</p>
                  <p className="text-[9px] font-black text-[#6750A4] truncate uppercase mt-0.5 tracking-widest opacity-60">{tx.fromCountry || 'RU'} ➔ {tx.toCountry || 'AF'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-[#1D1B20]">{tx.amount.toLocaleString()} <span className="text-[10px] opacity-40">{tx.currency}</span></p>
                  <div className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 px-2.5 py-1 rounded-full shadow-sm ${
                    tx.status === 'completed' ? 'bg-[#E8DEF8] text-[#1D192B]' : 
                    tx.status === 'pending' ? 'bg-[#ECE6F0] text-[#49454F]' : 'bg-[#F9DEDC] text-[#B3261E]'
                  }`}>
                    {String(tx.status || 'En attente').replace('_', ' ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
