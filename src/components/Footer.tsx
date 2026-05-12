import React from 'react';
import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';

interface Tab { path: string; label: string; icon: ComponentType<any>; featured?: boolean }

const Footer: React.FC<{ tabs: Tab[]; isActive: (path: string) => boolean }> = ({ tabs, isActive }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] px-3 pt-3 pb-1 border-t border-slate-100 rounded-t-[32px]">
        <div className="grid grid-cols-5 gap-1 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            if (tab.featured) {
              return (
                <div key={tab.path} className="flex flex-col items-center justify-center -mt-12">
                  <Link 
                    to={tab.path} 
                    className={`flex items-center justify-center rounded-full transition-all ${active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white text-primary shadow-premium' } w-20 h-20 hover:scale-110 active:scale-90 border-4 border-white`}
                    aria-label={tab.label}
                  >
                    <Icon size={32} />
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
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${active ? 'bg-primary/10' : 'bg-transparent'}`}>
                  <Icon size={24} />
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
