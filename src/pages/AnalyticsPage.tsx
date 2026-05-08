import React from 'react';
import { Layout } from '../components/Layout';
import { BarChart3, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const AnalyticsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-20 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="premium-card p-12 text-center space-y-8 overflow-hidden relative group">
          {/* Animated Background Elements */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />

          <div className="relative space-y-6">
            <div className="w-24 h-24 bg-primary/5 rounded-[32px] flex items-center justify-center text-primary mx-auto shadow-sm border border-primary/10 relative overflow-hidden group-hover:scale-110 transition-transform duration-500">
               <BarChart3 size={48} className="relative z-10" />
               <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full">
                <Sparkles size={12} />
                <span>Nouveauté</span>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Analyses & Statistiques</h1>
              <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                Suivez vos dépenses et optimisez vos transferts avec des outils d'analyse avancés. Bientôt disponible sur Flash Pay.
              </p>
            </div>

            <div className="pt-8">
               <div className="h-2 w-full max-w-[200px] bg-slate-100 rounded-full mx-auto overflow-hidden">
                  <div className="h-full w-2/3 bg-primary rounded-full animate-progress-flow" />
               </div>
               <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Développement en cours • 65%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { title: "Rapports Mensuels", desc: "Visualisez l'évolution de vos transferts chaque mois." },
            { title: "Répartition par Pays", desc: "Découvrez vos destinations de transfert les plus fréquentes." }
          ].map((feature, i) => (
            <div key={i} className="premium-card p-6 border-slate-50 group hover:border-primary/20 transition-all">
              <p className="font-bold text-slate-900 mb-1">{feature.title}</p>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};
