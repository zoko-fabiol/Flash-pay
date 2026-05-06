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
  MapPin
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

const StatCard = ({ title, value, change, icon: Icon, trend, color = "brand" }: any) => (
  <div className="bg-card-dark border border-border-dark p-6 rounded-3xl transition-all hover:border-brand/30 shadow-lg shadow-black/20">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 bg-${color}/10 rounded-2xl text-${color}`}>
        <Icon size={24} />
      </div>
      {change && change !== '-' && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {change}%
        </div>
      )}
    </div>
    <h3 className="text-slate-400 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-white mt-1 tracking-tight">{value}</p>
  </div>
);

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
    // Stats for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const qToday = query(
      collection(db, 'transactions'),
      where('createdAt', '>=', Timestamp.fromDate(startOfDay))
    );

    const unsubToday = onSnapshot(qToday, (snapshot) => {
      const txs = snapshot.docs.map(doc => doc.data() as Transaction);
      let volumeEur = 0;
      let volumeRub = 0;
      
      txs.forEach(tx => {
        if (tx.currency === 'EUR') volumeEur += tx.amount;
        if (tx.currency === 'RUB') volumeRub += tx.amount;
      });
      
      setStats(prev => ({
        ...prev,
        todayTransactions: txs.length,
        totalVolumeEur: volumeEur,
        totalVolumeRub: volumeRub
      }));
    });

    // Recent Transactions for Activity Widget
    const qRecent = query(
      collection(db, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(4)
    );
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Transaction));
      setRecentTransactions(txs);
      
      // Calculate Popular Routes from recent history (rough sample)
      const routes: Record<string, number> = {};
      txs.forEach(t => {
        const route = `${t.fromCountry} → ${t.toCountry}`;
        routes[route] = (routes[route] || 0) + 1;
      });
      const sorted = Object.entries(routes)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      setPopularRoutes(sorted);
    });

    // Total Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStats(prev => ({
        ...prev,
        activeUsers: snapshot.size
      }));
    });

    // Alerts (Problem Reports)
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

    // Chart Data (Last 7 days dynamic)
    const qChart = query(
      collection(db, 'transactions'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubChart = onSnapshot(qChart, (snapshot) => {
      const txs = snapshot.docs.map(doc => doc.data() as Transaction);
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const counts: Record<string, number> = {};
      
      // Initialize last 7 days
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
    <div className="space-y-8 pb-12">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Transactions Aujourd'hui" 
          value={stats.todayTransactions} 
          icon={CreditCard} 
          trend="up" 
        />
        <StatCard 
          title="Volume EUR (24h)" 
          value={`${stats.totalVolumeEur.toLocaleString()} €`} 
          icon={DollarSign} 
          trend="up" 
          color="emerald"
        />
        <StatCard 
          title="Volume RUB (24h)" 
          value={`${stats.totalVolumeRub.toLocaleString()} ₽`} 
          icon={TrendingUp} 
          trend="up" 
          color="amber"
        />
        <StatCard 
          title="Utilisateurs Totaux" 
          value={stats.activeUsers} 
          icon={Users} 
          trend="up" 
          color="brand"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-card-dark border border-border-dark p-8 rounded-3xl shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-bold text-white">Flux de Transactions</h2>
              <p className="text-slate-400 text-sm">Volume hebdomadaire en unités cumulées</p>
            </div>
          </div>
          <div className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00B2C8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00B2C8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                  itemStyle={{ color: '#00B2C8' }}
                />
                <Area type="monotone" dataKey="value" stroke="#00B2C8" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts / Activity */}
        <div className="bg-card-dark border border-border-dark p-8 rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">Alertes & Urgences</h2>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">
                <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={40} strokeWidth={1} />
                <p className="text-slate-400 text-sm font-medium">Tout est sous contrôle.</p>
                <p className="text-slate-600 text-xs mt-1">Aucun signalement en attente.</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="flex gap-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl hover:bg-rose-500/20 transition-all cursor-pointer">
                  <div className="text-rose-500 shrink-0">
                    <AlertCircle size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-bold">{(alert.type || 'unknown').replace('_', ' ').toUpperCase()}</p>
                    <p className="text-rose-400/80 text-xs mt-1 line-clamp-2">{alert.description}</p>
                    <div className="flex justify-between items-center mt-3">
                       <p className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Clock size={10} /> {asDate((alert as any).createdAt)?.toLocaleTimeString() || '-'}
                      </p>
                      <ChevronRight size={14} className="text-rose-500" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Popular Routes */}
        <div className="bg-card-dark border border-border-dark p-8 rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MapPin className="text-brand" size={20} />
            Trajets Populaires
          </h2>
          <div className="space-y-5">
            {popularRoutes.length === 0 ? (
              <p className="text-slate-500 text-sm italic">En attente de données...</p>
            ) : (
              popularRoutes.map((route, i) => (
                <div key={i} className="group cursor-default">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-white group-hover:text-brand transition-colors">{route.name}</span>
                    <span className="text-xs text-slate-500 font-mono">{route.count} transferts</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand transition-all duration-1000 shadow-[0_0_10px_rgba(0,178,200,0.5)]" 
                      style={{ width: `${(route.count / (recentTransactions.length || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-card-dark border border-border-dark p-8 rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="text-brand" size={20} />
            Activité Récente
          </h2>
          <div className="space-y-4">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 p-3 hover:bg-slate-800/30 rounded-2xl transition-all border border-transparent hover:border-slate-700">
                <div className="w-10 h-10 bg-brand/10 text-brand rounded-full flex items-center justify-center font-bold">
                  {tx.toCountry?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">#{String(tx.id || '').substring(0, 8) || 'N/A'}</p>
                  <p className="text-xs text-slate-500 truncate">{tx.fromCountry} → {tx.toCountry} • {tx.operator}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{tx.amount.toLocaleString()} {tx.currency}</p>
                  <p className={`text-[10px] font-bold ${
                    tx.status === 'completed' ? 'text-emerald-500' : 
                    tx.status === 'pending' ? 'text-amber-500' : 'text-slate-500'
                  }`}>
                    {String(tx.status || 'unknown').toUpperCase()}
                  </p>
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
