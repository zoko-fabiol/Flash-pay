import React from 'react';
import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';

interface Tab { path: string; label: string; icon: ComponentType<any>; featured?: boolean }

const Footer: React.FC<{ tabs: Tab[]; isActive: (path: string) => boolean }> = ({ tabs, isActive }) => {
  return (
    <nav className="fixed bottom-4 left-1/2 z-50 transform -translate-x-1/2 w-[92%] max-w-3xl lg:hidden">
      <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(69,34,143,0.08)] border border-[#F0E9FF] px-3 py-2">
        <div className="grid grid-cols-5 gap-1 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            if (tab.featured) {
              return (
                <div key={tab.path} className="flex items-center justify-center -mt-6">
                  <Link to={tab.path} className={`flex items-center justify-center rounded-full transition-transform ${active ? 'bg-gradient-to-br from-[#7d49df] to-[#5f2fc4] text-white shadow-[0_18px_40px_rgba(98,54,204,0.28)]' : 'bg-white text-slate-400 shadow-[0_6px_16px_rgba(0,0,0,0.06)]' } w-16 h-16`}>
                    <Icon size={22} />
                  </Link>
                </div>
              );
            }

            return (
              <Link key={tab.path} to={tab.path} className={`flex flex-col items-center justify-center py-2 px-1 text-[11px] font-semibold ${active ? 'text-[#6236CC]' : 'text-slate-500'}`}>
                <span className={`mb-1 flex h-10 w-10 items-center justify-center rounded-full ${active ? 'bg-[#6236CC]/10' : 'bg-transparent'}`}>
                  <Icon size={18} />
                </span>
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Footer;
