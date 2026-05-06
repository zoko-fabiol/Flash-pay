import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  Globe, 
  ShieldCheck, 
  LogOut, 
  AlertTriangle,
  Menu,
  X,
  Gift,
  Bell,
  ChartNoAxesCombined,
  Lock,
  Webhook,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminLayout: React.FC = () => {
  const { logout, profile } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Tableau de Bord' },
    { to: '/admin/users', icon: Users, label: 'Utilisateurs' },
    { to: '/admin/queue', icon: History, label: 'Queue Transactions' },
    { to: '/admin/kyc', icon: ShieldCheck, label: 'Validation KYC' },
    { to: '/admin/countries', icon: Globe, label: 'Pays & Opérateurs' },
    { to: '/admin/partners', icon: Gift, label: 'Partenaires' },
    { to: '/admin/settings/exchange-rates', icon: Settings, label: 'Taux de Change' },
    { to: '/admin/settings/commissions', icon: Settings, label: 'Commissions' },
    { to: '/admin/problems', icon: AlertTriangle, label: 'Signalements' },
    { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { to: '/admin/analytics', icon: ChartNoAxesCombined, label: 'Analytics' },
    { to: '/admin/security/2fa', icon: Lock, label: 'Sécurité 2FA' },
    { to: '/admin/webhooks', icon: Webhook, label: 'Webhooks' },
  ];

  return (
    <div className="flex h-screen bg-bg-dark text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        bg-card-dark border-r border-border-dark flex flex-col transition-all duration-300
      `}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold text-white">F</div>
              <span className="font-bold text-xl tracking-tight text-white">Flash Pay <span className="text-brand">Admin</span></span>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
                ${isActive 
                  ? 'bg-brand/10 text-brand border border-brand/20 shadow-[0_0_15px_rgba(0,178,200,0.1)]' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
              `}
            >
              <item.icon size={22} />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border-dark">
          {isSidebarOpen && (
            <div className="flex items-center gap-3 px-3 py-3 mb-4 bg-slate-800/50 rounded-xl">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-slate-300">
                {profile?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">{profile?.email || 'Admin'}</p>
                <p className="text-xs text-slate-500">Super Admin</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`
              flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-all
              ${!isSidebarOpen && 'justify-center'}
            `}
          >
            <LogOut size={22} />
            {isSidebarOpen && <span className="font-medium">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="h-16 border-b border-border-dark bg-card-dark/50 backdrop-blur-sm sticky top-0 z-10 px-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">
            {navItems.find(item => window.location.pathname.includes(item.to))?.label || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
             {/* Notification Bell, Search, etc */}
             <div className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full border border-green-500/20">
               SYSTÈME EN LIGNE
             </div>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
