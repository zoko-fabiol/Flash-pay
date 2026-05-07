import React, { useState } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  Users, 
  ShieldCheck, 
  Settings,
  LogOut,
  Globe,
  Bell,
  Menu,
  X,
  CreditCard,
  AlertTriangle,
  Search,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AdminLayout: React.FC = () => {
  const { logout, user: currentUser } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Vue d\'ensemble' },
    { path: '/admin/queue', icon: History, label: 'Transactions', desc: 'Flux financier' },
    { path: '/admin/users', icon: Users, label: 'Clients', desc: 'Base de données' },
    { path: '/admin/kyc', icon: ShieldCheck, label: 'Validation KYC', desc: 'Vérification' },
    { path: '/admin/countries', icon: Globe, label: 'Gestion Réseau', desc: 'Pays & Opérateurs' },
    { path: '/admin/settings/commissions', icon: Settings, label: 'Frais & Comms', desc: 'Tarification' },
    { path: '/admin/settings/exchange-rates', icon: TrendingUp, label: 'Taux & Limites', desc: 'Configuration' },
    { path: '/admin/problems', icon: AlertTriangle, label: 'Incidents', desc: 'Support' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Déconnexion réussie');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF7FF] flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-white border-b border-[#E7E0EB] p-4 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6750A4] rounded-[12px] flex items-center justify-center shadow-lg shadow-[#6750A4]/20">
            <CreditCard className="text-white" size={20} />
          </div>
          <span className="text-xl font-black text-[#1D1B20] tracking-tighter">FLASH PAY <span className="text-[#6750A4]">AD</span></span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-3 bg-[#F3EDF7] text-[#1D1B20] rounded-full active:scale-90 transition-all"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-[#1D1B20]/40 backdrop-blur-sm z-[150] transition-all"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-[300px] bg-white border-r border-[#E7E0EB] z-[200] transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          {/* Logo Section */}
          <div className="hidden lg:flex items-center gap-4 mb-10 px-2">
            <div className="w-12 h-12 bg-[#6750A4] rounded-[16px] flex items-center justify-center shadow-xl shadow-[#6750A4]/20">
              <CreditCard className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#1D1B20] tracking-tight leading-none">FLASH PAY</h1>
              <span className="text-[10px] font-black text-[#6750A4] tracking-[0.3em] uppercase opacity-60">Admin Portal</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => `
                  group flex items-center gap-4 px-4 py-3.5 rounded-[20px] transition-all relative overflow-hidden
                  ${isActive 
                    ? 'bg-[#EADDFF] text-[#21005D]' 
                    : 'text-[#49454F] hover:bg-[#F3EDF7] hover:text-[#1D1B20]'}
                `}
              >
                <div className={`p-2.5 rounded-[12px] transition-colors ${location.pathname === item.path ? 'bg-[#6750A4] text-white' : 'bg-transparent text-[#49454F] group-hover:bg-[#EADDFF]/50'}`}>
                   <item.icon size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm leading-none mb-1">{item.label}</span>
                  <span className="text-[9px] font-medium opacity-50 uppercase tracking-wider">{item.desc}</span>
                </div>
                {location.pathname === item.path && (
                  <div className="absolute right-4 w-1.5 h-1.5 bg-[#6750A4] rounded-full" />
                )}
              </NavLink>
            ))}
          </nav>

          {/* Footer Sidebar */}
          <div className="mt-auto pt-8 border-t border-[#E7E0EB]">
            <div className="bg-[#F3EDF7] p-4 rounded-[24px] mb-6 flex items-center gap-3">
               <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#6750A4] font-black shadow-sm">
                 {currentUser?.email?.charAt(0).toUpperCase()}
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-xs font-black text-[#1D1B20] truncate">{currentUser?.email}</p>
                 <p className="text-[9px] font-bold text-[#6750A4] uppercase tracking-widest">Administrateur</p>
               </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 text-[#B3261E] font-black uppercase text-[10px] tracking-widest hover:bg-[#F9DEDC]/50 rounded-[20px] transition-all"
            >
              <LogOut size={18} /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto">
        {/* Header Content */}
        <header className="hidden lg:flex h-20 items-center justify-between px-10 bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b border-[#E7E0EB]">
           <div className="m3-search w-96">
             <Search size={18} className="text-[#49454F]" />
             <input type="text" placeholder="Rechercher une transaction, un client..." className="bg-transparent border-none outline-none text-sm font-medium w-full" />
           </div>
           
           <div className="flex items-center gap-4">
             <button className="p-3 bg-white text-[#49454F] rounded-full hover:bg-[#F3EDF7] transition-all relative shadow-sm border border-[#E7E0EB]">
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#B3261E] rounded-full border-2 border-white"></span>
             </button>
             <div className="h-8 w-px bg-[#E7E0EB]"></div>
             <div className="flex items-center gap-3 pl-2">
                <div className="text-right">
                  <p className="text-xs font-black text-[#1D1B20]">Support Flash Pay</p>
                  <p className="text-[10px] font-bold text-[#6750A4] uppercase tracking-widest">En ligne</p>
                </div>
                <div className="w-10 h-10 bg-[#EADDFF] rounded-[12px] flex items-center justify-center text-[#21005D]">
                   <ShieldCheck size={20} />
                </div>
             </div>
           </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
