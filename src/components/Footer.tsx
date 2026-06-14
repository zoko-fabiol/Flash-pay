import React from 'react';
import { Link } from 'react-router-dom';
import type { ComponentType } from 'react';

interface Tab { path: string; label: string; icon: ComponentType<any>; featured?: boolean }

const Footer: React.FC<{ tabs: Tab[]; isActive: (path: string) => boolean }> = ({ tabs, isActive }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div
        className="px-3 pt-3 rounded-t-[32px] footer-safe-bottom border-t"
        style={{
          background: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-nav)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="grid grid-cols-5 gap-1 items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);
            if (tab.featured) {
              return (
                <div key={tab.path} className="flex flex-col items-center justify-center -mt-12">
                  <Link 
                    to={tab.path} 
                    className={`flex items-center justify-center rounded-full transition-all w-20 h-20 hover:scale-110 active:scale-90 border-4 ${
                      active 
                        ? 'bg-[#6344B6] text-white shadow-lg shadow-[#6344B6]/30' 
                        : 'bg-[#efe6ff] text-[#6344B6] dark:bg-[#2A2344] dark:text-[#EDE8FF] shadow-premium'
                    }`}
                    style={{ borderColor: 'var(--bg-surface)' }}
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
                className={`flex flex-col items-center justify-center transition-all ${active ? 'text-primary' : ''}`}
                style={active ? {} : { color: 'var(--text-muted)' }}
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
