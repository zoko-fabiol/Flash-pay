import React from 'react';
import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';

interface Tab { path: string; label: string; icon: ComponentType<any>; featured?: boolean }

const Footer: React.FC<{ tabs: Tab[]; isActive: (path: string) => boolean }> = ({ tabs, isActive }) => {
  return (
    <nav className="fixed bottom-6 left-1/2 z-50 transform -translate-x-1/2 w-[92%] max-w-3xl lg:hidden">
      <div className="glass-effect rounded-[32px] shadow-glass px-3 py-3 border border-white/40">
        <div className="grid grid-cols-5 gap-1 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            if (tab.featured) {
              return (
                <div key={tab.path} className="flex flex-col items-center justify-center -mt-10">
                  <Link 
                    to={tab.path} 
                    className={`flex items-center justify-center rounded-full transition-all ${active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white text-slate-400 shadow-sm' } w-14 h-14 hover:scale-110 active:scale-90 border-4 border-white`}
                    aria-label={tab.label}
                  >
                    <Icon size={24} />
                  </Link>

                </div>
              );
            }

            return (
              <Link 
                key={tab.path} 
                to={tab.path} 
                className={`flex flex-col items-center justify-center transition-all ${active ? 'text-primary' : 'text-slate-400'}`}
                aria-label={tab.label}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${active ? 'bg-primary/5' : 'bg-transparent'}`}>
                  <Icon size={20} />
                </div>
                <span className={`text-[10px] mt-1 font-bold`}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Footer;
