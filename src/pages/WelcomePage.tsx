import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Globe, Loader } from 'lucide-react';
import { deviceService } from '../services/deviceService';

const slides = [
  {
    id: 1,
    image: '/onboarding_1.jpg',
    imageEn: '/onboarding_1_en.jpg',
    bgColor: 'bg-[#FDF4EB]', 
  },
  {
    id: 2,
    image: '/onboarding_2.jpg',
    imageEn: '/onboarding_2_en.jpg',
    bgColor: 'bg-[#FDF4EB]', 
  },
  {
    id: 3,
    image: '/onboarding_3.jpg',
    imageEn: '/onboarding_3_en.jpg',
    bgColor: 'bg-[#FDF4EB]', 
  }
];

export const WelcomePage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    // Redirect if desktop
    const isMobile = deviceService.getMobileOperatingSystem() !== 'unknown';
    if (!isMobile) {
        navigate('/login');
        return;
    }

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className={`h-screen w-full relative overflow-hidden font-sans transition-colors duration-1000 ${slides[currentSlide].bgColor}`}>
      
      {/* Background Slides - Full Screen */}
      <div className="absolute inset-0 z-0">
        {slides.map((slide, index) => (
          <div 
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img 
              src={language === 'en' && (slide as any).imageEn ? (slide as any).imageEn : slide.image} 
              alt=""
              className="w-full h-full object-cover object-center" 
            />
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      <div className="relative h-full flex flex-col z-10 pointer-events-none">
        
        {/* Header */}
        <div className="pt-8 px-8 flex justify-end pointer-events-auto">
          <button 
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/60 backdrop-blur-xl rounded-full border border-white/40 text-slate-800 text-xs font-bold shadow-sm active:scale-95 transition-all"
          >
            <Globe size={14} className="text-[#6344B6]" />
            {language === 'fr' ? 'Français' : 'English'}
            <span className="opacity-40 ml-1">▼</span>
          </button>
        </div>

        <div className="flex-1" />

        {/* Footer Area */}
        <div className="px-6 pb-12 space-y-4 pointer-events-auto">
          {/* Pagination */}
          <div className="flex justify-center gap-2 mb-10">
            {slides.map((_, index) => (
              <div 
                key={index}
                className={`h-2 transition-all duration-500 rounded-full border-2 ${
                  index === currentSlide ? 'w-10 bg-white border-white' : 'w-2 bg-transparent border-white/40'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loadingGoogle}
              className="w-full flex items-center justify-center gap-3 py-4.5 bg-white rounded-full font-bold text-slate-800 shadow-xl active:scale-95 transition-all text-sm"
            >
              {loadingGoogle ? (
                <Loader size={20} className="animate-spin text-[#6344B6]" />
              ) : (
                <>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                  {t('google_signup')}
                </>
              )}
            </button>

            <button
              onClick={() => navigate('/signup')}
              className="w-full py-4.5 bg-white/10 backdrop-blur-md border-2 border-white rounded-full font-bold text-white shadow-lg active:scale-95 transition-all text-sm"
            >
              {t('create_account')}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/30"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="bg-transparent px-3 text-white font-black">{t('or')}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-2 text-white font-black text-sm hover:text-white/80 transition-colors tracking-tight"
            >
              {t('signin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
