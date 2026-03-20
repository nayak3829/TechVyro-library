'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Bell, Users, Zap, Gift } from 'lucide-react';

export function WhatsAppPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if already shown in this session
    if (typeof window !== 'undefined' && sessionStorage.getItem('whatsapp_popup_shown')) {
      return;
    }
    
    const timer = setTimeout(() => {
      // Check if video player is open (z-50 element with fixed positioning)
      const videoPlayer = document.querySelector('.fixed.inset-0.z-50.bg-black');
      if (videoPlayer) {
        // Don't show popup when video is playing
        return;
      }
      setIsOpen(true);
      setHasShown(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('whatsapp_popup_shown', 'true');
      }
      setTimeout(() => setIsAnimating(true), 50);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setIsAnimating(false);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 500);
  };

  const handleJoin = () => {
    window.open('https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37', '_blank');
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4" 
      style={{ perspective: '1200px' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop with gradient - clicking does nothing */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-black/90 via-black/85 to-emerald-950/60 backdrop-blur-xl transition-opacity duration-500 pointer-events-none ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-[calc(100vw-2rem)] sm:max-w-sm transition-all duration-700 ease-out pointer-events-auto ${
          isClosing ? 'scale-0 rotate-12 opacity-0' : ''
        }`}
        style={{
          transform: isAnimating 
            ? 'rotateX(0deg) scale(1)' 
            : 'rotateX(-15deg) scale(0.9)',
          opacity: isAnimating ? 1 : 0,
          transformStyle: 'preserve-3d',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Outer glow ring */}
        <div 
          className={`absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#25D366] via-emerald-400 to-[#128C7E] opacity-0 blur-xl transition-opacity duration-700 ${isAnimating ? 'opacity-40' : ''}`}
        />
        
        {/* Main card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-white/10 shadow-2xl">
          
          {/* Animated top gradient bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#25D366] via-emerald-400 to-[#128C7E] animate-gradient-x" />
          
          {/* Inner content */}
          <div className="relative px-5 sm:px-8 pt-8 sm:pt-10 pb-6 sm:pb-8">
            
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-[#25D366]/20 hover:border-[#25D366]/50 transition-all duration-300 hover:rotate-90"
              aria-label="Close popup"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge */}
            <div 
              className={`flex justify-center mb-5 transition-all duration-500 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
              style={{ transitionDelay: '100ms' }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-medium">
                <Bell className="w-3 h-3" />
                Official Channel
              </span>
            </div>

            {/* WhatsApp Icon */}
            <div 
              className={`flex justify-center mb-4 sm:mb-5 transition-all duration-500 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
              style={{ transitionDelay: '200ms' }}
            >
              <div className="relative">
                {/* Pulse ring */}
                <div className={`absolute inset-0 w-16 h-16 sm:w-20 sm:h-20 bg-[#25D366] rounded-2xl transition-all duration-1000 ${isAnimating ? 'animate-ping opacity-20' : 'opacity-0'}`} />
                
                {/* Icon container */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-2xl flex items-center justify-center shadow-lg shadow-[#25D366]/40 rotate-3 hover:rotate-0 transition-transform duration-300">
                  <svg 
                    viewBox="0 0 24 24" 
                    className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-current"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Brand Name */}
            <h2 
              className={`text-center text-2xl sm:text-3xl font-bold mb-2 transition-all duration-500 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '300ms' }}
            >
              <span style={{ color: '#ef4444' }}>Tech</span>
              <span style={{ color: '#ffffff' }}>Vyro</span>
            </h2>

            {/* Subtitle */}
            <p 
              className={`text-[#25D366] text-center text-sm font-medium mb-4 transition-all duration-500 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '350ms' }}
            >
              WhatsApp Channel
            </p>

            {/* Description */}
            <p 
              className={`text-gray-400 text-center mb-6 leading-relaxed text-sm transition-all duration-500 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '400ms' }}
            >
              Get exclusive access to secret websites, tools & tech updates directly on WhatsApp.
            </p>

            {/* Features Grid */}
            <div 
              className={`grid grid-cols-3 gap-2 mb-6 transition-all duration-500 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '450ms' }}
            >
              <div className="flex flex-col items-center gap-1.5 bg-white/5 rounded-lg p-2.5 border border-white/10">
                <div className="h-7 w-7 rounded-full bg-[#25D366]/20 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-[#25D366]" />
                </div>
                <span className="text-[10px] text-gray-400 text-center">Fast Updates</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 bg-white/5 rounded-lg p-2.5 border border-white/10">
                <div className="h-7 w-7 rounded-full bg-[#25D366]/20 flex items-center justify-center">
                  <Gift className="w-3.5 h-3.5 text-[#25D366]" />
                </div>
                <span className="text-[10px] text-gray-400 text-center">Free PDFs</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 bg-white/5 rounded-lg p-2.5 border border-white/10">
                <div className="h-7 w-7 rounded-full bg-[#25D366]/20 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-[#25D366]" />
                </div>
                <span className="text-[10px] text-gray-400 text-center">Community</span>
              </div>
            </div>

            {/* Join Button */}
            <button
              onClick={handleJoin}
              className={`group w-full py-3.5 px-6 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[#25D366]/30 hover:-translate-y-0.5 active:translate-y-0 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: '500ms' }}
            >
              <span className="flex items-center justify-center gap-2">
                Join Channel Now
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            {/* Member count */}
            <p 
              className={`text-center text-xs text-gray-500 mt-4 transition-all duration-500 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: '550ms' }}
            >
              Join 10K+ members already in the channel
            </p>
          </div>
        </div>
      </div>
      
      {/* CSS Animation for gradient bar */}
      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
