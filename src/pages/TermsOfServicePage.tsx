import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white p-6 md:p-12">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 font-bold mb-8 hover:text-slate-800 transition"
      >
        <ChevronLeft size={20} /> {t('back')}
      </button>

      <div className="max-w-3xl mx-auto prose prose-slate">
        <h1 className="text-3xl font-black text-slate-900 mb-6">{t('terms_of_use')}</h1>
        <p className="text-slate-500 mb-4 italic">{t('last_updated')}</p>
        
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">{t('terms_section1_title')}</h2>
          <p className="text-slate-600 leading-relaxed">
            {t('terms_section1_content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">{t('terms_section2_title')}</h2>
          <p className="text-slate-600 leading-relaxed">
            {t('terms_section2_content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">{t('terms_section3_title')}</h2>
          <p className="text-slate-600 leading-relaxed">
            {t('terms_section3_content')}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">{t('terms_section4_title')}</h2>
          <p className="text-slate-600 leading-relaxed">
            {t('terms_section4_content')}
          </p>
        </section>
      </div>
    </div>
  );
};
