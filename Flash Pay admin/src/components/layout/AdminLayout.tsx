import React, { useState, type ComponentType } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import {
  DashboardProIcon,
  HistoryProIcon,
  UsersProIcon,
  KycProIcon,
  SettingsProIcon,
  LogoutProIcon,
  NetworkProIcon,
  BellProIcon,
  MenuProIcon,
  CloseProIcon,
  CreditCardProIcon,
  ProblemsProIcon,
  SearchProIcon,
  TrendingProIcon,
  MessagesProIcon,
  ShieldProIcon,
} from '../../components/ui/ProIcons';
import { useAuth } from '../../context/AuthContext';
import { canAccessAdminSection, mergeAdminPermissions } from '../../lib/adminAccess';
import type { AdminSectionKey } from '../../types';
import toast from 'react-hot-toast';
import { useAdminNotifications } from '../../context/AdminNotificationContext';
import { useNavigate } from 'react-router-dom';

const AdminLayout: React.FC = () => {
  const { logout, user: currentUser, profile } = useAuth();
  const { unreadCount } = useAdminNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const permissions = mergeAdminPermissions(profile?.adminPermissions);

  const menuItems: Array<{ path: string; icon: ComponentType<any>; label: string; desc: string; section: AdminSectionKey }> = [
    { path: '/dashboard', icon: DashboardProIcon, label: 'Dashboard', desc: 'Vue d\'ensemble', section: 'dashboard' as AdminSectionKey },
    { path: '/queue', icon: HistoryProIcon, label: 'Transactions', desc: 'Flux financier', section: 'queue' as AdminSectionKey },
    { path: '/users', icon: UsersProIcon, label: 'Clients', desc: 'Base de données', section: 'users' as AdminSectionKey },
    { path: '/kyc', icon: KycProIcon, label: 'Validation KYC', desc: 'Vérification', section: 'kyc' as AdminSectionKey },
    { path: '/countries', icon: NetworkProIcon, label: 'Gestion Réseau', desc: 'Pays & Opérateurs', section: 'countries' as AdminSectionKey },
    { path: '/messages', icon: MessagesProIcon, label: 'Messages', desc: 'Diffusion', section: 'notifications' as AdminSectionKey },
    { path: '/settings/commissions', icon: SettingsProIcon, label: 'Frais & Comms', desc: 'Tarification', section: 'settings' as AdminSectionKey },
    { path: '/settings/exchange-rates', icon: TrendingProIcon, label: 'Taux & Limites', desc: 'Configuration', section: 'settings' as AdminSectionKey },
    { path: '/settings/access-control', icon: KycProIcon, label: 'Accès Admin', desc: 'Rôles & mails', section: 'settings' as AdminSectionKey },
    { path: '/problems', icon: ProblemsProIcon, label: 'Incidents', desc: 'Support', section: 'problems' as AdminSectionKey },
  ].filter((item) => (profile?.adminRole === 'super') || canAccessAdminSection(profile, item.section));

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
      <div className="lg:hidden bg-white border-b border-[#E7E0EB] p-4 flex justify-between items-center sticky top-0 z-[100] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#470B37] rounded-[12px] flex items-center justify-center shadow-lg shadow-[#470B37]/20">
            <CreditCardProIcon className="text-white" size={20} />
          </div>
          <span className="text-xl font-black text-[#1D1B20] tracking-tighter">
            FLASH PAY <span className="text-[#470B37]">AD</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/notifications')}
            className="p-3 bg-[#F3EDF7] text-[#49454F] rounded-full active:scale-90 transition-all relative"
          >
            <BellProIcon size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#B3261E] rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-3 bg-[#F3EDF7] text-[#1D1B20] rounded-full active:scale-90 transition-all"
          >
            {isSidebarOpen ? <CloseProIcon size={20} /> : <MenuProIcon size={20} />}
          </button>
        </div>
      </div>

      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-[#1D1B20]/40 backdrop-blur-sm z-[150] transition-all"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 w-[300px] bg-white border-r border-[#E7E0EB] z-[200] transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          <div className="hidden lg:flex items-center gap-4 mb-10 px-2">
            <div className="w-12 h-12 bg-[#470B37] rounded-[16px] flex items-center justify-center shadow-xl shadow-[#470B37]/20">
              <CreditCardProIcon className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#1D1B20] tracking-tight leading-none">FLASH PAY</h1>
              <span className="text-[10px] font-black text-[#470B37] tracking-[0.3em] uppercase opacity-60">Admin Portal</span>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }: { isActive: boolean }) => `
                  group flex items-center gap-4 px-4 py-3.5 rounded-[20px] transition-all relative overflow-hidden
                  ${isActive
                    ? 'bg-[#EADDFF] text-[#21005D]'
                    : 'text-[#49454F] hover:bg-[#F3EDF7] hover:text-[#1D1B20]'}
                `}
              >
                <div className={`p-2.5 rounded-[12px] transition-colors ${location.pathname === item.path ? 'bg-[#470B37] text-white' : 'bg-transparent text-[#49454F] group-hover:bg-[#EADDFF]/50'}`}>
                  <item.icon size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm leading-none mb-1">{item.label}</span>
                  <span className="text-[9px] font-medium opacity-50 uppercase tracking-wider">{item.desc}</span>
                </div>
                {location.pathname === item.path && (
                  <div className="absolute right-4 w-1.5 h-1.5 bg-[#470B37] rounded-full" />
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-8 border-t border-[#E7E0EB]">
            <div className="bg-[#F3EDF7] p-4 rounded-[24px] mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#470B37] font-black shadow-sm">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-[#1D1B20] truncate">{currentUser?.email}</p>
                <p className="text-[9px] font-bold text-[#470B37] uppercase tracking-widest">
                              {profile?.adminRole === 'restricted' ? 'Accès restreint' : profile?.adminRole === 'email-only' ? 'Notification seulement' : 'Administrateur complet'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 text-[#B3261E] font-black uppercase text-[10px] tracking-widest hover:bg-[#F9DEDC]/50 rounded-[20px] transition-all"
            >
              <LogoutProIcon size={18} /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto">
        <header className="hidden lg:flex h-20 items-center justify-between px-10 bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b border-[#E7E0EB]">
          <div className="m3-search w-96">
            <SearchProIcon size={18} className="text-[#49454F]" />
            <input type="text" placeholder="Rechercher une transaction, un client..." className="bg-transparent border-none outline-none text-sm font-medium w-full" />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/notifications')}
              className="p-3 bg-white text-[#49454F] rounded-full hover:bg-[#F3EDF7] transition-all relative shadow-sm border border-[#E7E0EB]"
              title={`${unreadCount} notifications non lues`}
            >
              <BellProIcon size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#B3261E] rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>
            <div className="h-8 w-px bg-[#E7E0EB]"></div>
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right">
                <p className="text-xs font-black text-[#1D1B20]">Support Flash Pay</p>
                <p className="text-[10px] font-bold text-[#470B37] uppercase tracking-widest">
                  {permissions.receiveOrderEmails ? 'Notifications actives' : 'Notifications désactivées'}
                </p>
              </div>
              <div className="w-10 h-10 bg-[#EADDFF] rounded-[12px] flex items-center justify-center text-[#21005D]">
                <ShieldProIcon size={20} />
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
